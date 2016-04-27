'use strict';
// This code handles the main bit of the IDE, including the websocket, global settings, and sub-modules

// node_modules
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var exec = require('child_process').exec;

// sub_modules
var ProjectManager = require('./ProjectManager');
var ProcessManager = require('./ProcessManager');
var server = require('./fileServer');

// module variables - only accesible from this file
var allSockets;
var belaPath = '/root/BeagleRT/';

// settings
var cpuMonitoring = false;

// constructor function for IDE object
function IDE(){

	console.log('starting IDE');
	
	// start serving the IDE
	server.start(3000);

	// open websocket in namespace /IDE
	var io = require('socket.io')(server.http);
	allSockets = io.of('/IDE');
	allSockets.on('connection', socketConnected);
	
	// CPU monitoring
	setInterval(function(){
		if (!cpuMonitoring) return;
		co(ProcessManager, 'checkCPU')
			.then((output) => allSockets.emit('cpu-usage', output));
	}, 1000);
	
}

// export a singleton IDE object
module.exports = new IDE();

function reportError(error){
	console.error(error, error.stack.split('\n'));
	return;
}

function socketConnected(socket){
	
	// send project lists and settings to the browser
	Promise.all([ProjectManager.listProjects(), ProjectManager.listExamples(), SettingsManager.getSettings()])
		.then( (result) => socket.emit('init', result) );
	
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

		if ((!data.currentProject && !data.newProject) || !data.func || !ProjectManager[data.func]) {
			console.log('bad project-event', data);
			return;
		}

		co(ProjectManager, data.func, data)
			.then((result) => {
			
				// send result to the tab that asked for it
				socket.emit('project-data', result);
				
				// send relevant info to any other tabs
				if (result.currentProject){
					if (result.projectList){
						socket.broadcast.emit('project-list', result.currentProject, result.projectList);
					}
					if (result.fileList){
						socket.broadcast.emit('file-list', result.currentProject, result.fileList);
					}
					SettingsManager.setIDESetting({key: 'project', value: result.currentProject});
				}
			})
			.catch((error) => {
				console.log(error, error.stack.split('\n'), error.toString());
				//socket.emit('report-error', error.toString() );
				data.error = error.toString();
				socket.emit('project-data', data);
			});
			
	});
	
	// project settings
	socket.on('project-settings', (data) => {
	
		if (!data.currentProject || !data.func || !ProjectManager[data.func]) {
			console.log('bad project-settings', data);
			return;
		}
		
		co(ProjectManager, data.func, data)
			.then((result) => {
				allSockets.emit('project-settings-data', data.currentProject, result);
			})
			.catch((error) => {
				console.log(error, error.stack.split('\n'), error.toString());
				socket.emit('report-error', error.toString() );
			});
	});
	
	// process events
	socket.on('process-event', (data) => {
	
		console.log('process-event');
		
		if (!data || !data.currentProject || !data.event || !ProcessManager[data.event]){
			console.log('bad process-event', data);
			return;
		}

		if (data.event === 'upload' && data.fileData){
			// notify other browser tabs that the file has been updated
			socket.broadcast.emit('file-changed', data.currentProject, data.newFile);
		}
		
		ProcessManager[data.event](data.currentProject, data);

	});
	
	// IDE settings
	socket.on('IDE-settings', (data) => {
	
		if (!data.func || !SettingsManager[data.func]) {
			console.log('bad IDE-settings', data);
			return;
		}

		SettingsManager[data.func](data)
			.then((result) => {
				allSockets.emit('IDE-settings-data', result);
			})
			.catch((error) => {
				console.log(error, error.stack.split('\n'), error.toString());
				socket.emit('report-error', error.toString() );
			});
	});

}


/*ProcessManager.on('stdout', (data) => console.log('stdout') );
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
});*/
ProcessManager.on('status', (status, project) => allSockets.emit('status', project, status) );
ProcessManager.on('broadcast-status', (status) => allSockets.emit('status', status) );

// module functions - only accesible from this file
function co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}

// global settings
var SettingsManager = {

	// create the default IDE settings object
	defaultSettings(){
		return {
			'project'				: undefined,
			'liveAutocompletion'	: 1,
			'liveSyntaxChecking'	: 1,
			'verboseErrors'			: 0,
			'cpuMonitoring'			: 1,
			'cpuMonitoringVerbose'	: 0,
			'ackUpload'				: 0,
			'removeNotifications'	: 1,
			'consoleAnimations'		: 1,
			'consoleDelete'			: 1,
			'useGit'				: 1,
			'gitAutostage'			: 1,
			'debugMode'				: 0
		};
	},

	// load the IDE settings JSON from disk
	getSettings(){
		//console.log('reading settings');
		// load the global settings
		return fs.readJsonAsync('./settings.json')
			.catch((error) => {
				console.log('global settings.json error', error, error.stack);
				console.log('creating default global settings');
				// if there is an error loading the settings object, create a new default one
				return this.defaultSettings();
			});
	},

	// save the IDE settings JSON
	setSettings(settings){
	
		cpuMonitoring = parseInt(settings.cpuMonitoring);
		
		return fs.writeJsonAsync('./settings.json', settings)
			.then( () => settings )
			.catch((error) => console.log('unable to save IDE settings JSON', error, error.stack));
	},

	// change a single settings parameter and save the settings JSON
	setIDESetting(data){
		if (!data || !data.key || !data.value) return;
		return this.getSettings()
			.then((settings) => {
				settings[data.key] = data.value;
				return this.setSettings(settings);
			});
	},
	
	restoreDefaultIDESettings(data){
		return this.getSettings()
			.then((oldSettings) => {
				var newSettings = this.defaultSettings();
				newSettings.project = oldSettings.project;
				return this.setSettings(newSettings);
			});
	}

};

/*// record the compiler's CPU usage
function cc1plusCPU(callback){

	// lookup the PID of the compiler's process
	exec('pgrep cc1plus', function(err, stdout) {
	
		if (err) console.log('pgrep '+err);

		// record the compiler's CPU usage
		if (stdout){
			pusage.stat(stdout.trim(), function(err, stat) {
				if (err) console.log('pusage cc1plus '+err);
				if (!err && stat){
					callback(null, {'name': 'compiler', 'value': stat.cpu});
				} else {
					callback(null, {'name': 'compiler', 'value': 0});
				}
			});
		} else {
			callback(null, {'name': 'compiler', 'value': 0});
		}
		
	});
}

function CPUbyPID(pid){
	return pusage(pid)
		.then((stat) => stat.cpu);
}*/

