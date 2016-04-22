'use strict';
// This code handles the main bit of the IDE, including the websocket, global settings, and sub-modules

// node_modules
var Promise = require('bluebird');
Promise.config({cancellation: true});
var fs = Promise.promisifyAll(require('fs-extra'));
var exec = require('child_process').exec;

// sub_modules
var ProjectManager = require('./ProjectManager');
var ProcessManager = require('./ProcessManager');
var server = require('./fileServer');

// module variables - only accesible from this file
var allSockets;
var IDESettings;
var currentProject;
var belaPath = '/root/BeagleRT/';
var childPromise = Promise.resolve();
var childProcess;

// constructor function for IDE object
function IDE(){

	console.log('starting IDE');

	// setup the projects and examples objects
	// then load the global settings and start the IDE
	Promise.all([ProjectManager.listProjects(), ProjectManager.listExamples()])
		.then(() => fs.readJsonAsync('./settings.json'))
		.catch((error) => {
			console.log('settings.json error', error, error.stack);
			console.log('creating default settings');
			// if there is an error loading the settings object, create a new default one
			return defaultSettings();
		})
		.then(setSettings)
		.then(() => {

			// start serving the IDE
			server.start(3000);
	
			// open websocket in namespace /IDE
			var io = require('socket.io')(server.http);
			allSockets = io.of('/IDE');
			allSockets.on('connection', socketConnected);
			
		});
	
}

// export a singleton IDE object
module.exports = new IDE();

function reportError(error){
	console.error(error, error.stack.split('\n'));
	return;
}

function socketConnected(socket){
	
	// send project lists and settings to the browser
	Promise.join(ProjectManager.listProjects(), ProjectManager.listExamples(),
		(projectList, exampleList) => {
			socket.emit('init', projectList, exampleList, IDESettings.project, IDESettings);
		});
	
	// listen for messages
	socketEvents(socket);

}

// listen for all websocket messages
function socketEvents(socket){

	// set the time on the bbb
	socket.on('set-time', (time) => {
		exec('date '+time, console.log);
	});
	
	// project events
	socket.on('project-event', (data) => {
	
		console.log('project-event', data);

		if ((!data.currentProject && !data.newProject) || !data.func) {
			console.log('bad', data);
			return;
		}

		co(ProjectManager, data.func, data)
			.then(setProject)
			.then((result) => socket.emit('project-data', result) )
			.catch((error) => {
				console.log(error, error.stack.split('\n'), error.toString());
				socket.emit('report-error', error.toString() );
			});
			
	});
	
	// process events
	socket.on('process-event', (data) => {
	
		//console.log('process-event');
		
		if (!data.currentProject){
			console.log('bad', data);
			return;
		}
		
		ProcessManager.newProcess(data);

	});

}


ProcessManager.on('stdout', (data) => console.log('stdout') );
ProcessManager.on('stderr', (data) => console.log('stderr') );
ProcessManager.on('closed', (data) => {
	if (data.childProcess && data.childProcess.spawnargs && data.childProcess.spawnargs[4]){
		console.log('closed', data.childProcess.pid);//data.childProcess.spawnargs[4]);
	}
});
ProcessManager.on('error', (error) => {
	//console.error('child process error:', error.message, error.code);
	if (error.childProcess && error.childProcess.spawnargs && error.childProcess.spawnargs[4]){
		console.log('error', error.childProcess.pid);//error.childProcess.spawnargs[4]);
	}
});

// module functions - only accesible from this file

function co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}

// create the default IDE settings object
function defaultSettings(){
	return {
		'project'				: undefined,
		'liveAutocompletion'	: true,
		'liveSyntaxChecking'	: true,
		'verboseErrors'			: false,
		'cpuMonitoring'			: true,
		'cpuMonitoringVerbose'	: false,
		'ackUpload'				: false,
		'removeNotifications'	: true,
		'consoleAnimations'		: true,
		'consoleDelete'			: true,
		'useGit'				: true,
		'gitAutostage'			: true,
		'debugMode'				: false
	};
}

// save the IDE settings and set the open project
function setSettings(settings){
	//console.log('setting settings:', settings);
	IDESettings = settings;
	return setProject({currentProject: settings.project})
}

// change the open project and save the settings JSON
function setProject(data){
	if (!data) return;
	IDESettings.project = data.currentProject;
	return fs.writeJsonAsync('./settings.json', IDESettings)
		.then( () => data )
		.catch((error) => console.log('unable to save IDE settings JSON', error, error.stack));
}

