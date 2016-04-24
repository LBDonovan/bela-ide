'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var treeKill = require('tree-kill');

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
		for (let proc in childProcesses){
			childProcesses[proc].on('started', () => this.emit('status', this.getStatus()) );
			childProcesses[proc].on('cancelled', () => this.emit('status', this.getStatus()) );
			childProcesses[proc].on('finished', () => this.emit('status', this.getStatus()) );
		}
		
		// syntax events
		syntaxCheckProcess.on('stdout', (data) => this.emit('status', {syntaxLog: data}) );
		//syntaxCheckProcess.on('stderr', (data) => this.emit('status', {syntaxLog: data}) );
		syntaxCheckProcess.on('finished', (data) => { if (data.stderr.length) this.emit('status', {syntaxError: data.stderr}) });
		
		// build events
		buildProcess.on('stdout', (data) => this.emit('status', {buildLog: data}) );
		//buildProcess.on('stderr', (data) => this.emit('status', {buildLog: data}) );
		buildProcess.on('finished', (data) => {if (data.stderr.length) this.emit('status', {syntaxError: data.stderr}) });
		
		// bela events
		belaProcess.on('stdout', (data) => this.emit('status', {belaLog: data}) );
		belaProcess.on('stderr', (data) => this.emit('status', {belaLog: data}) );
		belaProcess.on('finished', (data) => this.emit('status', {belaResult: data}) );
		
	}
	
	emptyAllQueues(){
		for (let proc in childProcesses){
			childProcesses[proc].emptyQueue();
		}
	}
	
	
	
};

module.exports = new ProcessManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}