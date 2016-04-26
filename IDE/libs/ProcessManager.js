'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var treeKill = require('tree-kill');
var pusage = Promise.promisifyAll(require('pidusage'));

// child processes
var syntaxCheckProcess = require('./IDEProcesses').syntax;
var buildProcess = require('./IDEProcesses').build;
var belaProcess = require('./IDEProcesses').bela;

var childProcesses = {syntaxCheckProcess, buildProcess, belaProcess};

class ProcessManager extends EventEmitter {
	
	constructor(){
		super();
		this.processEvents(childProcesses);
	}
	
	// process functions
	upload(project, upload){

		if (this.checkingSyntax()){
			syntaxCheckProcess.kill().queue(function(){
				syntaxCheckProcess.execute(project, upload, upload.checkSyntax);
			});
		} else if(this.building()){
			buildProcess.kill().queue(function(){
				syntaxCheckProcess.execute(project, upload, upload.checkSyntax);
			});
		} else {
			this.emptyAllQueues();
			syntaxCheckProcess.execute(project, upload, upload.checkSyntax);
		}
		
		return syntaxCheckProcess;
		
	}
	
	build(project){
	//console.log('build', this.building());
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
	
	stop(){
		for (let proc in childProcesses){
			childProcesses[proc].kill();
		}
		this.emptyAllQueues();
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
			var status = this.getStatus();
			status.syntaxError = data.stderr;
			this.emit('status', syntaxCheckProcess.project, status);
		});
		syntaxCheckProcess.on('finished', (data) => {
			var status = this.getStatus();
			status.syntaxError = data.stderr;
			this.emit('status', syntaxCheckProcess.project, status);
		});
		
		// build events
		buildProcess.on('started', () => this.emit('status', buildProcess.project, this.getStatus()) );
		buildProcess.on('stdout', (data) => this.emit('status', buildProcess.project, {buildLog: data}) );
		//buildProcess.on('stderr', (data) => this.emit('status', {buildLog: data}) );
		buildProcess.on('cancelled', (data) => {
			var status = this.getStatus();
			status.syntaxError = data.stderr;
			this.emit('status', buildProcess.project, status);
		});
		buildProcess.on('finished', (data) => {
			var status = this.getStatus();
			status.syntaxError = data.stderr;
			this.emit('status', buildProcess.project, status);
		});
		//buildProcess.on('finished', (data) => {if (data.stderr.length) this.emit('status', buildProcess.project, {syntaxError: data.stderr}) });

		
		// bela events
		belaProcess.on('started', () => this.emit('broadcast-status', this.getStatus()) );
		belaProcess.on('stdout', (data) => this.emit('broadcast-status', {belaLog: data}) );
		belaProcess.on('stderr', (data) => this.emit('broadcast-status', {belaLogErr: data}) );
		belaProcess.on('cancelled', () => this.emit('broadcast-status', this.getStatus()) );
		belaProcess.on('finished', (data) => {
			var status = this.getStatus();
			status.belaResult = data;
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
		return output;
	}
	
};

module.exports = new ProcessManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}