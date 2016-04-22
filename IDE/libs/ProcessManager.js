'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var treeKill = require('tree-kill');

var ProjectManager = require('./ProjectManager');

var makePath = '/root/BeagleRT/IDE/';

var PID;
var running = false;
var queuedProcess;

class ProcessManager extends EventEmitter {
	
	constructor(){
		super();
	}
	
	newProcess(data){
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
	}
	
};

module.exports = new ProcessManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}