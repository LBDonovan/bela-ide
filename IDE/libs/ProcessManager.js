'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var treeKill = require('tree-kill');

// child processes
var syntaxCheckProcess = require('./IDEProcesses').syntax;
/*syntaxCheckProcess.on('started', (data) => {console.log('syntaxCheckProcess: started') );
syntaxCheckProcess.on('stdout', (data) => console.log('syntaxCheckProcess: stdout') );
syntaxCheckProcess.on('stderr', (data) => console.log('syntaxCheckProcess: stderr') );
syntaxCheckProcess.on('cancelled', (data) => console.log('syntaxCheckProcess: cancelled') );
syntaxCheckProcess.on('finished', (data) => console.log('syntaxCheckProcess: finished', data) );*/

var buildProcess = require('./IDEProcesses').build;
/*buildProcess.on('started', (data) => console.log('buildProcess: started') );
buildProcess.on('stdout', (data) => console.log('buildProcess: stdout') );
buildProcess.on('stderr', (data) => console.log('buildProcess: stderr') );
buildProcess.on('cancelled', (data) => console.log('buildProcess: cancelled') );
buildProcess.on('finished', (data) => console.log('buildProcess: finished', data) );*/

var belaProcess = require('./IDEProcesses').bela;
/*belaProcess.on('started', (data) => console.log('belaProcess: started') );
belaProcess.on('stdout', (data) => console.log('belaProcess: stdout') );
belaProcess.on('stderr', (data) => console.log('belaProcess: stderr') );
belaProcess.on('cancelled', (data) => console.log('belaProcess: cancelled') );
belaProcess.on('finished', (data) => console.log('belaProcess: finished', data) );*/

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
	
	// utility events
	processEvents(childProcesses){
		
		// status events
		for (let proc in childProcesses){
			childProcesses[proc].on('started', () => this.emit('status', this.getStatus()) );
			childProcesses[proc].on('cancelled', () => this.emit('status', this.getStatus()) );
			childProcesses[proc].on('finished', () => this.emit('status', this.getStatus()) );
		}
		
		// syntax events
		
		
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