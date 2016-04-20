// IDE controller
module.exports = {};

var Model = require('./Models/Model');

var editor = ace.edit('editor');

// set up models
var models = {};
models.project = new Model();
models.settings = new Model();

// set up views
// tab view
var tabView = require('./Views/TabView');
tabView.on('change', () => editor.resize() );

// project view
var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project]);
projectView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	socket.emit(event, data);
});

// setup socket
var socket = io('/IDE');

// socket events
socket.on('init', (projectList, exampleList, currentProject, settings) => {
	models.project.setData({projectList, exampleList, currentProject});
	models.settings.setData(settings);
});

socket.on('project-data', (data) => {
	models.project.setData(data);
	models.project.print();
});














