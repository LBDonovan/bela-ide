// IDE controller
module.exports = {};

var Model = require('./Models/Model');

// set up models
models = {};
models.project = new Model();
models.settings = new Model();
models.status = new Model();
models.error = new Model();
models.debug = new Model();
 
// set up views
// tab view
var tabView = require('./Views/TabView');
tabView.on('change', () => editorView.emit('resize') );

// settings view
var settingsView = new (require('./Views/SettingsView'))('settingsManager', [models.project, models.settings], models.settings);
settingsView.on('project-settings', (data) => {
	data.currentProject = models.project.getKey('currentProject');
	//console.log('project-settings', data);
	socket.emit('project-settings', data);
});
settingsView.on('IDE-settings', (data) => {
	data.currentProject = models.project.getKey('currentProject');
	//console.log('IDE-settings', data);
	socket.emit('IDE-settings', data);
});

// project view
var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project]);
projectView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// file view
var fileView = new (require('./Views/FileView'))('fileManager', [models.project]);
fileView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	if (!data.fileName && models.project.getKey('fileName')){
		data.fileName = models.project.getKey('fileName');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// editor view
var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.error, models.settings, models.debug], models.settings);
editorView.on('change', (fileData) => {
	socket.emit('process-event', {
		event			: 'upload',
		currentProject	: models.project.getKey('currentProject'),
		newFile			: models.project.getKey('fileName'),
		fileData,
		checkSyntax		: parseInt(models.settings.getKey('liveSyntaxChecking'))
	});
});
editorView.on('breakpoint', (line) => {
	var breakpoints = models.project.getKey('breakpoints');
	for (let i=0; i<breakpoints.length; i++){
		if (breakpoints[i].line === line && breakpoints[i].file === models.project.getKey('fileName')){
			models.project.spliceFromKey('breakpoints', i);
			return;
		}
	}
	models.project.pushIntoKey('breakpoints', {
		line,
		file: models.project.getKey('fileName')
	});
	//console.log('after', breakpoints);
	//models.project.setKey('breakpoints', breakpoints);
});

// toolbar view
var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status, models.settings, models.debug]);
toolbarView.on('process-event', (event) => {
	var breakpoints;
	if (parseInt(models.settings.getKey('debugMode'))) breakpoints = models.project.getKey('breakpoints')
	socket.emit('process-event', {
		event,
		currentProject	: models.project.getKey('currentProject'),
		debug			: parseInt(models.settings.getKey('debugMode')),
		breakpoints
	});
});
toolbarView.on('clear-console', () => consoleView.emit('clear') );

// console view
var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.project, models.error, models.settings, models.debug], models.settings);
consoleView.on('focus', (focus) =>  models.project.setKey('focus', focus) );
consoleView.on('open-file', (fileName, focus) => {
	var data = {
		func: 'openFile',
		fileName, 
		focus, 
		currentProject: models.project.getKey('currentProject')
	};
	socket.emit('project-event', data);
});

// debugger view
var debugView = new (require('./Views/DebugView'))('debugger', [models.debug, models.settings, models.project]);
debugView.on('debugger-event', (func) => socket.emit('debugger-event', func) );

// setup socket
var socket = io('/IDE');

// socket events
socket.on('report-error', (error) => console.error(error) );

socket.on('init', (data) => {
	//console.log(data);
	var timestamp = performance.now()
	socket.emit('project-event', {func: 'openProject', currentProject: data[2].project, timestamp})	
	consoleView.emit('openNotification', {func: 'init', timestamp});
	
	models.project.setData({projectList: data[0], exampleList: data[1], currentProject: data[2].project});
	models.settings.setData(data[2]);
	
	//models.project.print();
	//models.settings.print();
	
	socket.emit('set-time', getDateString());
});

// project events
socket.on('project-data', (data) => {
	consoleView.emit('closeNotification', data)
	models.project.setData(data);
	//models.settings.setData(data.settings);
	//models.project.print();
});
socket.on('project-list', (project, list) =>  {
	if (list.indexOf(models.project.getKey('currentProject')) === -1){
		// this project has just been deleted
		console.log('project-list', 'openProject');
		socket.emit('project-event', {func: 'openProject', currentProject: project});
	}
	models.project.setKey('projectList', list);
});
socket.on('file-list', (project, list) => {
	if (project === models.project.getKey('currentProject')){
		if (list.indexOf(models.project.getKey('fileName')) === -1){
			// this file has just been deleted
			console.log('file-list', 'openProject');
			socket.emit('project-event', {func: 'openProject', currentProject: project});
		}
		models.project.setKey('fileList', list);
	}
});
socket.on('file-changed', (project, fileName) => {
	if (project === models.project.getKey('currentProject') && fileName === models.project.getKey('fileName')){
		console.log('file changed!');
		models.project.setKey('readOnly', true);
		models.project.setKey('fileData', 'This file has been edited in another window. Reopen the file to continue');
		//socket.emit('project-event', {func: 'openFile', currentProject: project, fileName: fileName});
	}
});

socket.on('status', (status, project) => {
	if (project === models.project.getKey('currentProject') || project === undefined){
		models.status.setData(status);
		//console.log('status', status);
	}
});

socket.on('project-settings-data', (project, settings) => {
	//console.log('project-settings-data', settings);
	if (project === models.project.getKey('currentProject'))
		models.project.setData(settings);
});
socket.on('IDE-settings-data', (settings) => models.settings.setData(settings) );

socket.on('cpu-usage', (data) => models.status.setKey('CPU', data) );

socket.on('disconnect', () => {
	consoleView.emit('warn', 'You have been disconnected from the Bela IDE and any more changes you make will not be saved. Please check your USB connection and reboot your BeagleBone');
	models.project.setKey('readOnly', true);
});

socket.on('debugger-data', (data) => {
	if ((data.project === undefined || data.project === models.project.getKey('currentProject')) && 
		(data.file === undefined || data.file === models.project.getKey('fileName'))){
		//console.log(data);
		models.debug.setData(data);
	}
});
socket.on('debugger-variables', (project, variables) => {
	if (project === models.project.getKey('currentProject')){
		models.debug.setKey('variables', variables);
	}
});

// model events
// build errors
models.status.on('set', (data, changedKeys) => {
	if (changedKeys.indexOf('syntaxError') !== -1){
		parseErrors(data.syntaxError);
	}
});


// history
{
	let lastState = {}, poppingState = true;
	
	// file / project changed
	models.project.on('change', (data, changedKeys) => {
		if (changedKeys.indexOf('currentProject') !== -1 || changedKeys.indexOf('fileName') !== -1){
			var state = {file: data.fileName, project: data.currentProject};
			if (state.project !== lastState.project || state.file !== lastState.file){
				$('title').html(data.fileName+', '+data.currentProject);
				if (!poppingState){
					//console.log('push', state);
					history.pushState(state, null, null);
				}
				poppingState = false
				lastState = state;
			}
		}
	});

	// load previously open file / project when browser's back button is clicked
	window.addEventListener('popstate', function(e) {
		if (e.state){
			console.log('opening project '+e.state.project+' file '+e.state.file);
			var data = {
				currentProject	: e.state.project,
				fileName		: e.state.file,
				func			: 'openFile',
				timestamp 		: performance.now()
			};
			consoleView.emit('openNotification', data);
			socket.emit('project-event', data);
			poppingState = true;
		}
	});
}

// local functions
// parse errors from g++
function parseErrors(data){

	var errors = [];
	for (let i=0; i<data.length; i++){

		// ignore errors which begin with 'make'
		if (data[i].length > 1 && data[i].slice(0,4) !== 'make'){
	
			var msg = data[i].split('\n');
		
			for (let j=0; j<msg.length; j++){
		
				var str = msg[j].split(':');
				//console.log(str);
				// str[0] -> file name + path
				// str[1] -> row number
				// str[2] -> column number
				// str[3] -> type of error
				// str[4+] > error message
			
				if (str[3] === ' error'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "error"
					});
				} else if (str[3] == ' fatal error'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "error"
					});
				} else if (str[3] == ' warning'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "warning"
					});
				} else {
					//console.log('rejected error string: '+str);
				}
			}
		}
	}

	// if no gcc errors have been parsed correctly, but make still thinks there is an error
	// error will contain string 'make: *** [<path>] Error 1'
	if (!errors.length && (data.indexOf('make: *** ') !== -1) && (data.indexOf('Error 1') !== -1)){
		errors.push({
			text: data,
			type: 'error'
		});
	}
	
	var currentFileErrors = [], otherFileErrors = [];
	for (let err of errors){
		if (!err.file || err.file === models.project.getKey('fileName')){
			err.currentFile = true;
			currentFileErrors.push(err);
		} else {
			err.currentFile = false;
			err.text = 'In file '+err.file+': '+err.text;
			otherFileErrors.push(err);
		}
	}
	
	models.error.setKey('allErrors', errors);
	models.error.setKey('currentFileErrors', currentFileErrors);
	models.error.setKey('otherFileErrors', otherFileErrors);

}

function getDateString(){

	var str = '';
	
	// get browser's system's time
	var date = new Date();
	
	// format into string suitable for linux date command
	var month = date.getMonth() + 1;
	if (month < 10){
		str += '0'+month;
	} else {
		str += month;
	}
	
	var day = date.getDate();
	if (day < 10){
		str += '0'+day;
	} else {
		str += day;
	}
	
	var hour = date.getHours();
	if (hour < 10){
		str += '0'+hour;
	} else {
		str += hour;
	}
	
	var minutes = date.getMinutes();
	if (minutes < 10){
		str += '0'+minutes;
	} else {
		str += minutes;
	}
	
	str += date.getFullYear();
	
	str += '.';
	
	var seconds = date.getSeconds();
	if (seconds < 10){
		str += '0'+seconds;
	} else {
		str += seconds;
	}
	
	return str;
	
}






