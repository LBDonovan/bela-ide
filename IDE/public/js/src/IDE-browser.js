// IDE controller
module.exports = {};

var Model = require('./Models/Model');

// set up models
models = {};
models.project = new Model();
models.settings = new Model();
models.status = new Model();

// set up views
// tab view
var tabView = require('./Views/TabView');
tabView.on('change', () => editorView.emit('resize') );

// project view
var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project]);
projectView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	console.log(event, data);
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
var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.settings]);
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
var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.settings, models.status]);
toolbarView.on('process-event', (event) => {
	socket.emit('process-event', {
		event,
		currentProject	: models.project.getKey('currentProject')
	});
});

// console view
var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.settings], models.settings);


// setup socket
var socket = io('/IDE');

// socket events
socket.on('report-error', (error) => console.error(error) );

socket.on('init', (projectList, exampleList, currentProject, settings) => {
	models.project.setData({projectList, exampleList, currentProject});
	socket.emit('project-event', {func: 'openProject', currentProject})
	models.settings.setData(settings);
	//console.log(projectList, exampleList, currentProject, settings);
	
	socket.emit('set-time', getDateString());
});

socket.on('project-data', (data) => {
	models.project.setData(data);
	//console.log(data);
});

socket.on('status', (status) => {
	models.status.setData(status);
	//console.log('status', status)
});







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






