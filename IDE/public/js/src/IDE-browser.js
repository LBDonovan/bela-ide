// IDE controller
module.exports = {};

var Model = require('./Models/Model');

// set up models
models = {};
models.project = new Model();
models.settings = new Model();
models.status = new Model();
models.error = new Model();
 
// set up views
// tab view
var tabView = require('./Views/TabView');
tabView.on('change', () => editorView.emit('resize') );

// settings view
var settingsView = new (require('./Views/SettingsView'))('settingsManager', [models.project, models.settings]);
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
	//console.log(event, data);
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
	socket.emit(event, data);
});

// editor view
var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.error, models.settings], models.settings);
editorView.on('change', (fileData) => {
	socket.emit('process-event', {
		event			: 'upload',
		currentProject	: models.project.getKey('currentProject'),
		newFile			: models.project.getKey('fileName'),
		fileData,
		checkSyntax		: models.settings.getKey('liveSyntaxChecking')
	});
});

// toolbar view
var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status]);
toolbarView.on('process-event', (event) => {
	socket.emit('process-event', {
		event,
		currentProject	: models.project.getKey('currentProject')
	});
});
toolbarView.on('clear-console', () => consoleView.emit('clear') );

// console view
var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.project, models.error], models.settings);
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

// setup socket
var socket = io('/IDE');

// socket events
socket.on('report-error', (error) => console.error(error) );

socket.on('init', (data) => {
	//console.log(data);
	models.project.setData({projectList: data[0], exampleList: data[1], currentProject: data[2].project});
	socket.emit('project-event', {func: 'openProject', currentProject: data[2].project})
	models.settings.setKey('IDESettings', data[2]);
	
	//models.project.print();
	//models.settings.print();
	
	socket.emit('set-time', getDateString());
});

socket.on('project-data', (data) => {
	models.project.setData(data);
	models.settings.setData(data.settings);
	//models.settings.print();
});

socket.on('status', (status) => {
	models.status.setData(status, true);
	//console.log('status', status)
});

socket.on('project-settings-data', (settings) =>  models.settings.setData(settings) );
socket.on('IDE-settings-data', (settings) =>   models.settings.setKey('IDESettings', settings) );

// model events
// build errors
models.status.on('change', (data, changedKeys) => {
	if (changedKeys.indexOf('syntaxError') !== -1){
		parseErrors(data.syntaxError);
	}
});

// file / project changed
models.project.on('change', (data, changedKeys) => {
	if (changedKeys.indexOf('currentProject') !== -1 || changedKeys.indexOf('fileName') !== -1){
		$('title').html(data.fileName+', '+data.currentProject);
	}
});

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
	
	models.error.setKey('allErrors', errors, true);
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






