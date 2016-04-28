'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var ngdbmi = require('./ngdbmi');

var projectPath = '/root/BeagleRT/projects/';
var print_debug = true;

class DebugManager extends EventEmitter {
	
	constructor(){
		super();
	}
	
	run(project, breakpoints){
	
		// launch the process by giving ngdbmi the path to the project's binary
		this.process = new ngdbmi(projectPath+project+'/'+project);
		
		this.registerHandlers();
		
		_co(this, 'start', breakpoints);
		
	}
	
	// listen to ngdbmi process events
	registerHandlers(){

		// Notify event
		this.process.on("notify", function( state ){
			console.log( "//-------------------NOTIFY----------------//" );
			console.log( JSON.stringify(state, null, "\t") );
			console.log( "//-----------------------------------------//" );
		});
		
		// Gdb close event
		this.process.on("close", (return_code, signal) => {
			console.log( "GDB closed RET=" + return_code );
			//self.running = false;
			//self.socket.emit('stopped', self.project, return_code);
		});
		
	}
	
	// process ngdbmi command, return a promise
	command(cmd, opts){

		return new Promise( (resolve, reject) => {
	
			this.process.command(cmd, (state) => {
		
				if (print_debug){
					console.log( "//---------------------"+cmd+"-----------------//" );
					console.log( JSON.stringify(state, null, "\t") );
					console.log( "//-----------------------------------------//" );
				}

				resolve(JSON.parse(JSON.stringify(state)));
		
			}, opts);
		
		});

	}
	
	*start(breakpoints){
		
		yield this.setBreakpoints(breakpoints);
		
	}
	
	setBreakpoints(breakpoints){
		console.log('setting breakpoints', breakpoints);
		return new Promise.mapSeries(breakpoints, (breakpoint) => this.command('breakInsert', {location: breakpoint.file+':'+(breakpoint.line+1)}) );
	}
	
}

module.exports = new DebugManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}