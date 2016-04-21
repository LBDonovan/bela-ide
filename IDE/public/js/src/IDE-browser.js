// IDE controller
module.exports = {};

var Model = require('./Models/Model');

// set up models
models = {};
models.project = new Model();
models.settings = new Model();

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
		currentProject	: models.project.getKey('currentProject'),
		newFile			: models.project.getKey('fileName'),
		fileData,
		checkSyntax		: models.settings.getKey('liveSyntaxChecking')
	});
});

// setup socket
var socket = io('/IDE');

// socket events
socket.on('report-error', (error) => console.error(error) );

socket.on('init', (projectList, exampleList, currentProject, settings) => {
	models.project.setData({projectList, exampleList, currentProject});
	socket.emit('project-event', {func: 'openProject', currentProject})
	models.settings.setData(settings);
	console.log(projectList, exampleList, currentProject, settings);
});

socket.on('project-data', (data) => {
	models.project.setData(data);
	console.log(data);
});














