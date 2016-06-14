'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var treeKill = require('tree-kill');
var pusage = Promise.promisifyAll(require('pidusage'));
var fs = Promise.promisifyAll(require('fs-extra'));

var DebugManager = require('./DebugManager');

var belaPath = '/root/Bela/';
var makePath = belaPath;
var projectPath = belaPath+'projects/';

// child processes
var syntaxCheckProcess = require('./IDEProcesses').syntax;
var buildProcess = require('./IDEProcesses').build;
var belaProcess = require('./IDEProcesses').bela;
var stopProcess = require('./IDEProcesses').stop;

// {syntaxCheckProcess, buildProcess, belaProcess} = require('./IDEProcesses');

var childProcesses = {syntaxCheckProcess, buildProcess, belaProcess};

class ProcessManager extends EventEmitter {
	
	constructor(){
		super();
		this.processEvents(childProcesses);
	}
	
	// process functions
	upload(project, data){
	
		this.emptyAllQueues();
		
		if (data.currentProject && data.newFile && data.fileData){
			fs.outputFileAsync(projectPath+data.currentProject+'/'+data.newFile, data.fileData)
				.then( () => {
					if (data.checkSyntax) this.checkSyntax(project)
				});
		} else {
			if (data.checkSyntax) this.checkSyntax(project);
		}
		
		return syntaxCheckProcess;
		
	}
	
	checkSyntax(project){
	
		if (this.checkingSyntax()){
			syntaxCheckProcess.kill().queue(function(){
				syntaxCheckProcess.start(project);
			});
		} else if(this.building()){
			buildProcess.kill().queue(function(){
				syntaxCheckProcess.start(project);
			});
		} else {
			this.emptyAllQueues();
			syntaxCheckProcess.start(project);
		}
	
	}
	
	build(project){
	//console.log('build', data);
		if(this.running()){
			stopProcess.start().queue(function(){
				buildProcess.start(project);
			});
		} else if (this.checkingSyntax()){
			syntaxCheckProcess.kill().queue(function(){
				buildProcess.start(project);
			});
		} else if(this.building()){
			buildProcess.kill().queue(function(){
				buildProcess.start(project);
			});
		} else {
			this.emptyAllQueues();
			buildProcess.start(project);
		}
		
		return buildProcess;
	
	}
	
	run(project, data){
	
		this.emptyAllQueues();

		if (this.running()){
			belaProcess
				.queue(function(){
					buildProcess.start(project)
						.queue(function(){
							belaProcess.start(project);
						});
				});
			stopProcess.start();
		} else if (this.building()){
			buildProcess.kill()
				.queue(function(){
					buildProcess.start(project)
						.queue(function(){
							belaProcess.start(project);
						});
				});
		} else if (this.checkingSyntax()){
			syntaxCheckProcess.kill()
				.queue(function(){
					buildProcess.start(project)
						.queue(function(){
							belaProcess.start(project);
						});
				});
		} else {
			buildProcess.start(project)
				.queue(function(){
					belaProcess.start(project);
				});
		}
	}
	
	stop(project, data){
		if (this.checkingSyntax()) syntaxCheckProcess.kill();
		if (this.building()) buildProcess.kill();
		stopProcess.start();
			
		this.emptyAllQueues();
		
		if (data.debug) 
			DebugManager.stop();
	}
	
	// status events
	checkingSyntax(){
		return syntaxCheckProcess.active;
	}
	
	building(){
		return buildProcess.active;
	}
	
	running(){
		return belaProcess.active;
	}
	
	getStatus(){
		return {
			checkingSyntax	: this.checkingSyntax(),
			building		: this.building(),
			running			: this.running()
		};	
	}
	
	// utility functions
	processEvents(childProcesses){
		
		// status events
		/*for (let proc in childProcesses){
			childProcesses[proc].on('started', () => this.emit('status', childProcesses[proc].project, this.getStatus()) );
			childProcesses[proc].on('cancelled', () => this.emit('status', childProcesses[proc].project, this.getStatus()) );
			childProcesses[proc].on('finished', () => this.emit('status', childProcesses[proc].project, this.getStatus()) );
		}*/
		
		// syntax events
		syntaxCheckProcess.on('started', () => this.emit('status', syntaxCheckProcess.project, this.getStatus()) );
		syntaxCheckProcess.on('stdout', (data) => this.emit('status', syntaxCheckProcess.project, {syntaxLog: data}) );
		syntaxCheckProcess.on('cancelled', (data) => {
		console.log('cancelled');
			var status = this.getStatus();
			status.syntaxError = data.stderr;
			this.emit('status', data.project, status);
		});
		syntaxCheckProcess.on('finished', (data) => {
			var status = this.getStatus();
			status.syntaxError = data.stderr;
			this.emit('status', data.project, status);
		});
		
		// build events
		buildProcess.on('started', () => this.emit('status', buildProcess.project, this.getStatus()) );
		buildProcess.on('stdout', (data) => this.emit('status', buildProcess.project, {buildLog: data}) );
		//buildProcess.on('stderr', (data) => this.emit('status', {buildLog: data}) );
		buildProcess.on('cancelled', (data) => {
		
			var status = this.getStatus();
			status.syntaxError = data.stderr;
			this.emit('status', data.project, status);
		});
		buildProcess.on('finished', (data) => {
			var status = this.getStatus();
			status.syntaxError = data.stderr;
			this.emit('status', data.project, status);
		});
		//buildProcess.on('finished', (data) => {if (data.stderr.length) this.emit('status', buildProcess.project, {syntaxError: data.stderr}) });

		
		// bela events
		belaProcess.on('started', () => this.emit('broadcast-status', this.getStatus()) );
		belaProcess.on('stdout', (data) => this.emit('broadcast-status', {belaLog: data}) );
		belaProcess.on('stderr', (data) => this.emit('broadcast-status', {belaLogErr: data}) );
		belaProcess.on('cancelled', (data) => {
		console.log('cancelled');
			var status = this.getStatus();
			status.belaResult = data;
			this.emit('broadcast-status', status);
		});
		belaProcess.on('finished', (data) => {
		console.log('finished');
			var status = this.getStatus();
			status.belaResult = data;
			console.log(status);
			this.emit('broadcast-status', status);
		});
		
	}
	
	emptyAllQueues(){
		for (let proc in childProcesses){
			childProcesses[proc].emptyQueue();
		}
	}
	
	*checkCPU(){
		var output = {};
		//console.log(this);
		output.syntaxCheckProcess = yield syntaxCheckProcess.CPU();
		output.buildProcess = yield buildProcess.CPU();
		output.bela = yield belaProcess.CPU();
		output.node = (yield pusage.statAsync(process.pid)).cpu;
		output.gdb = yield DebugManager.CPU();
		return output;
	}
	
};

module.exports = new ProcessManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}