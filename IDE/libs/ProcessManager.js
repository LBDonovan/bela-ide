'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var treeKill = require('tree-kill');

// child processes
var syntaxCheckProcess = require('./IDEProcesses').syntax;
syntaxCheckProcess.on('started', (data) => console.log('syntaxCheckProcess: started') );
syntaxCheckProcess.on('stdout', (data) => console.log('syntaxCheckProcess: stdout') );
syntaxCheckProcess.on('stderr', (data) => console.log('syntaxCheckProcess: stderr') );
syntaxCheckProcess.on('cancelled', (data) => console.log('syntaxCheckProcess: cancelled') );
syntaxCheckProcess.on('finished', (data) => console.log('syntaxCheckProcess: finished', data) );

var buildProcess = require('./IDEProcesses').build;
buildProcess.on('started', (data) => console.log('buildProcess: started') );
buildProcess.on('stdout', (data) => console.log('buildProcess: stdout') );
buildProcess.on('stderr', (data) => console.log('buildProcess: stderr') );
buildProcess.on('cancelled', (data) => console.log('buildProcess: cancelled') );
buildProcess.on('finished', (data) => console.log('buildProcess: finished', data) );

var belaProcess = require('./IDEProcesses').bela;
belaProcess.on('started', (data) => console.log('belaProcess: started') );
belaProcess.on('stdout', (data) => console.log('belaProcess: stdout') );
belaProcess.on('stderr', (data) => console.log('belaProcess: stderr') );
belaProcess.on('cancelled', (data) => console.log('belaProcess: cancelled') );
belaProcess.on('finished', (data) => console.log('belaProcess: finished', data) );

var childProcesses = {syntaxCheckProcess, buildProcess};

class ProcessManager extends EventEmitter {
	
	constructor(){
		super();
	}
	
	upload(project, upload){
	console.log('checkSyntax', this.checkingSyntax());
		if (this.checkingSyntax()){
			syntaxCheckProcess.kill().queue(function(){
				syntaxCheckProcess.execute(project, upload);
			});
		} else if(this.building()){
			buildProcess.kill().queue(function(){
				syntaxCheckProcess.execute(project, upload);
			});
		} else {
			this.emptyAllQueues();
			syntaxCheckProcess.execute(project, upload);
		}
		
		return syntaxCheckProcess;
		
	}
	
	build(project){
	console.log('build', this.building());
		if (this.checkingSyntax()){
			syntaxCheckProcess.kill().queue(function(){
				buildProcess.execute(project);
			});
		} else if(this.building()){
			buildProcess.kill().queue(function(){
				buildProcess.execute(project);
			});
		} else {
			this.emptyAllQueues();
			buildProcess.execute(project);
		}
		
		return buildProcess;
	
	}
	
	run(project){
		this.build(project).queue(function(){
			belaProcess.execute(project);
		});
	}
	
	stop(project){
		for (let proc in childProcesses){
			childProcesses[proc].kill();
		}
		this.emptyAllQueues();
	}
	
	checkingSyntax(){
		return syntaxCheckProcess.active;
	}
	
	building(){
		return buildProcess.active;
	}
	
	emptyAllQueues(){
		for (let proc in childProcesses){
			childProcesses[proc].emptyQueue();
		}
	}
	
	/*newProcess(data){
		if (running){
			queuedProcess = data;
			this.killProcess();
		} else {
			this.startProcess(data);
			running = true;
		}
	}
	
	startProcess(data){
	
		var func;
		
		if (data.checkSyntax){
			data.target = 'syntax';
			func = 'buildProcess';
		} else {
			running = false;
			return;
		}
		
		_co(this, func, data)
			.finally( () => {
			
				running = false;
				
				if (PID) console.log('finished');
					else console.log('killed');
				
				if (queuedProcess) this.newProcess(queuedProcess);
				queuedProcess = undefined;
				
			});
	}
	
	*buildProcess(data){
	
		if (data.newFile && data.fileData) {
			data = yield _co(ProjectManager, 'uploadFile', data);
			console.log('uploaded');
			if (queuedProcess) {
				console.log('stopping after upload');
				return Promise.resolve();
			}
		}
		
		var childProcess = spawn('make', ['--no-print-directory', '-C', makePath,  data.target,  'PROJECT='+data.currentProject]);
		
		console.log('spawing', childProcess.pid);
		
		running = true;
		PID = childProcess.pid;
		
		childProcess.stdout.setEncoding('utf8');
		childProcess.stderr.setEncoding('utf8');
 
		childProcess.stdout.on('data', (data) => this.emit('stdout', data) );
		childProcess.stderr.on('data', (data) => this.emit('stderr', data) );
		
		return new Promise((resolve, reject) => {
		
			//childProcess.on('exit', (code, signal) => console.log('exit', childProcess.pid, code, signal) );
			childProcess.on('close', (code, signal) => {
				console.log('close', childProcess.pid, code, signal);
				resolve('resolved '+childProcess.pid);
			});
			childProcess.on('error', (err) => {
				console.log('error', childProcess.pid, err);
				this.emit('error', err);
			});
			
		});
		
	}
	
	killProcess(){
		// sends SIGTERM signal to process, returns promise
		if (PID) {
			console.log('killing', PID);
			treeKill(PID, 'SIGTERM');
			PID = undefined;
		}
	}*/
	
};

module.exports = new ProcessManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}