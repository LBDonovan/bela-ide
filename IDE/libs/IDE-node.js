'use strict';
// This code handles the main bit of the IDE, including the websocket, global settings, and sub-modules

// node_modules
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

// sub_modules
var ProjectManager = require('./ProjectManager');
var ProcessManager = require('./ProcessManager');
var DebugManager = require('./DebugManager');
var server = require('./fileServer');
var scope = require('./scope-node');
var GitManager = require('./GitManager');
var TerminalManager = require('./TerminalManager');

// module variables - only accesible from this file
var allSockets;
var belaPath = '/root/Bela/';
var startupScript = '/root/Bela_startup.sh';

// settings
var cpuMonitoring = false;

// constructor function for IDE object
function IDE(){

	console.log('starting IDE');
	
	// start serving the IDE
	server.start(80);

	// open websocket in namespace /IDE
	var io = require('socket.io')(server.http);
	allSockets = io.of('/IDE');
	allSockets.on('connection', socketConnected);
	
	// CPU & project monitoring
	setInterval(function(){
	
		ProjectManager.listProjects()
			.then( result => allSockets.emit('project-list', undefined, result) );
		
		if (!cpuMonitoring) return;
		co(ProcessManager, 'checkCPU')
			.then( output => allSockets.emit('cpu-usage', output) );
			
	}, 1000);
	
	// scope
	scope.init(io);
	
	// shell
	TerminalManager.init();
	
}

// export a singleton IDE object
module.exports = new IDE();

function reportError(error){
	console.error(error, error.stack.split('\n'));
	return;
}

function socketConnected(socket){
	
	// send init info to browser
	Promise.all([
		ProjectManager.listProjects(), 
		new Promise.coroutine(ProjectManager.listExamples)(), 
		SettingsManager.getSettings(),
		runOnBootProject()
	]).then( result => {
		result.push(ProcessManager.getStatus());
		socket.emit('init', result)
	});
	
	// listen for messages
	socketEvents(socket);
	
	// refresh the shell location
	TerminalManager.pwd();
	
	// check the run-on-boot project
	//runOnBootProject( project => socket.emit('run-on-boot-project', project) );

}

// listen for all websocket messages
function socketEvents(socket){

	// set the time on the bbb
	socket.on('set-time', (time) => exec('date -s "'+time+'"') );
	
	// project events
	socket.on('project-event', (data) => {
	
		//console.log('project-event', data);

		if ((!data.currentProject && !data.newProject) || !data.func || !ProjectManager[data.func]) {
			console.log('bad project-event', data);
			//if (data.func === 'openProject') socket.emit('project-data', data);
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
				console.log(error);
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
	
		//console.log('process-event', data);
		
		if (!data || !data.currentProject || !data.event || !ProcessManager[data.event]){
			console.log('bad process-event', data);
			return;
		}

		if (data.event === 'upload' && data.fileData){
			// notify other browser tabs that the file has been updated
			socket.broadcast.emit('file-changed', data.currentProject, data.newFile);
		}
		
		ProcessManager[data.event](data.currentProject, data);
		
		/*if (data.event === 'stop'){
			socket.emit('stop-reply', data);
		}*/

	});
	
	// IDE settings
	socket.on('IDE-settings', (data) => {
	console.log('IDE-settings', data);
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
	
	// debugger
	socket.on('debugger-event', (func, args) => {
	//console.log(DebugManager, func, DebugManager[func]);
		if (DebugManager[func])
			DebugManager[func](args);
	});
	
	// git
	socket.on('git-event', data => {
	
		if (!data.currentProject || !data.func || !GitManager[data.func]) {
			console.log('bad git-event', data);
			return;
		}
				
		//console.log('git-event', data);
		
		co(GitManager, data.func, data)
			.then ( result => {
			//console.log(result);
				return co(ProjectManager, 'openProject', {
					currentProject	: result.currentProject,
					timestamp		: result.timestamp,
					gitData			: result
				});
			})
			.then( result => {
			
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
			.catch( error => {
				console.log(error, error.stack.split('\n'), error.toString());
				//socket.emit('report-error', error.toString() );
				data.error = error.toString();
				socket.emit('project-data', {gitData: data, timestamp: data.timestamp});
				socket.emit('report-error', error.toString() );
			});

	});
	
	// file list refresh
	socket.on('list-files', project => {
		ProjectManager.listFiles(project)
			.then( list => socket.emit('file-list', project, list) );
	});
	
	// run-on-boot
	socket.on('run-on-boot', project => {
		var args;
		if (project === 'none'){
			args = ['nostartup'];
		} else {
			args = ['startup', 'PROJECT='+project]; 
		}
		var proc = spawn('make', args, {cwd: belaPath});
		proc.stdout.setEncoding('utf-8');
		proc.stderr.setEncoding('utf-8');
		proc.stdout.on('data', data => socket.emit('run-on-boot-log', data) );
		proc.stderr.on('data', data => socket.emit('run-on-boot-log', data) );
		proc.on('close', () => socket.emit('run-on-boot-log', 'done') );
	});
	
	// shell
	socket.on('sh-command', cmd => TerminalManager.execute(cmd) );
	socket.on('sh-tab', cmd => TerminalManager.tab(cmd) );

}

ProcessManager.on('status', (status, project) => allSockets.emit('status', project, status) );
ProcessManager.on('broadcast-status', (status) => allSockets.emit('status', status) );

DebugManager.on('status', (status) =>  allSockets.emit('debugger-data', status) );
DebugManager.on('variables', (project, variables) =>  allSockets.emit('debugger-variables', project, variables) );
DebugManager.on('error', (err) => allSockets.emit('report-error', err) );

TerminalManager.on('shell-event', (evt, data) => allSockets.emit('shell-event', evt, data) );

// module functions - only accesible from this file
function co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}

// global settings
var SettingsManager = {

	// create the default IDE settings object
	defaultSettings(){
		return {
			'project'				: 'basic',
			'liveAutocompletion'	: 1,
			'liveSyntaxChecking'	: 1,
			'verboseErrors'			: 0,
			'cpuMonitoring'			: 1,
			'cpuMonitoringVerbose'	: 0,
			'consoleDelete'			: 1,
			'verboseDebug'			: 0,
			'useGit'				: 1,
			'gitAutostage'			: 1
		};
	},

	// load the IDE settings JSON from disk
	getSettings(){
		//console.log('reading settings');
		// load the global settings
		return fs.readJsonAsync('./settings.json')
			.catch((error) => {
				//console.log('global settings.json error', error, error.stack);
				console.log('could not find global settings.json, creating default global settings');
				// if there is an error loading the settings object, create a new default one
				return this.setSettings(this.defaultSettings());
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
		if (!data || !data.key || data.value===undefined) return;
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

function runOnBootProject(){
	// parse Bela_startup.sh
	return fs.readFileAsync(startupScript, 'utf-8')
		.then( file => {
			var project;
			var lines = file.split('\n');
			if (lines[5] === '# Run on startup disabled -- nothing to do here'){
				project = 'none';
			} else {
				project = lines[5].trim().split(' ')[6].split('/').pop();
			}
			return project;
		})
		.catch( e => console.log('run-on-boot error', e) );
}

process.on('uncaughtException', (err) => {
	console.log('uncaughtException');
	throw err;
});
// catch SIGTERM which occasionally gets thrown when cancelling the syntax check. Dunno why, it's kind of a problem.
process.on('SIGTERM', () => {
  console.log('!!!!!!!!!!!!!!!!! Got SIGTERM !!!!!!!!!!!!!!!!!!!', process.pid);
  //allSockets.emit('report-error', 'recieved SIGTERM'); 
});

