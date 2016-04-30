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
	
		this.project = project;
	
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
			this.emit('status', {gdbLog: "GDB closed RET="+return_code});
			console.log('closed', this.process);
		});
		
		// GDB output
		this.process.on('gdb', (data) => this.emit('status', {gdbLog: 'GDB> '+data}) );
		
		// Application output
		this.process.on('app', (data) => this.emit('status', {belaLog: data}) );
		
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
		
		this.emit('status', {running: false, status: 'setting breakpoints'});
		
		yield this.setBreakpoints(breakpoints);
		
		this.emit('status', {running: true});
		
		yield this.command('run').then( (state) => this.stopped(state) );
		
	}
	
	stopped(state){
		this.emit('status', {running: false});
		return new Promise((resolve, reject) => {
		
			// parse the reason for the halt
			var reason = state.status.reason;
			if (reason === 'signal-received'){
				reason = reason+' '+state.status['signal-name']+' '+state.status['signal-meaning'];
			}
			if (reason) this.emit('status', {reason});
		
			// check the frame data is valid && we haven't fallen off the end of the render function
			if (!state.status || !state.status.frame){
				reject('bad frame data');
			}
			if (state.status.frame.func === 'PRU::loop(rt_intr_placeholder*, void*)'){
				reject('debugger out of range');
			}
			
			
		
			// parse the location of the halt
			var path = state.status.frame.file.split('/');
			var file = path[path.length-1];
			var line = state.status.frame.line;
			//var frameAddr = state.status.frame.addr;
			console.log('stopped, file '+file+' line '+line);
			
			this.emit('status', { project: this.project, file, line });
			
			resolve();
		
		})
		.catch(function(e){
			console.error(e);
			console.log(state);
			if (e === 'debugger out of range'){
				console.log('debugger out of range', state);
				setTimeout(function(){
					self.cont('continue');
				}, 100);
				//self.cont('continue');
			} else {
				console.log('debugger-stopped', 'unable to parse debugger state after halt', e);
			}
		});
	}
	
	setBreakpoints(breakpoints){
		return new Promise.mapSeries(breakpoints, (breakpoint) => this.command('breakInsert', {location: breakpoint.file+':'+(breakpoint.line+1)}) );
	}
	
	// commands
	debugContinue(){
		this.emit('status', {running: true, status: 'continuing to next breakpoint'});
		this.command('continue').then( (state) => this.stopped(state) );
	}
	debugStep(){
		this.emit('status', {running: true, status: 'stepping'});
		this.command('step').then( (state) => this.stopped(state) );
	}
	debugNext(){
		this.emit('status', {running: true, status: 'stepping over'});
		this.command('next').then( (state) => this.stopped(state) );
	}
	
}

module.exports = new DebugManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}