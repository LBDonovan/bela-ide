'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var ngdbmi = require('./ngdbmi');
var util = require('util');

var ProjectManager = require('./ProjectManager');
var projectPath = '/root/BeagleRT/projects/';
var print_debug = true;

class DebugManager extends EventEmitter {
	
	constructor(){
		super();
		this.running = false;
	}
	
	// start the debugger
	run(project, breakpoints){
	
		this.project = project;
		this.variables = [];
		
		_co(ProjectManager, 'getCLArgs', project)
			.then( (CLArgs) => {
				
				var args = ' ';
				
				for (let key in CLArgs) {
					if (key[0] === '-' && key[1] === '-'){
						args += (key+'='+CLArgs[key]+' ');
					} else {
						args += (key+CLArgs[key]+' ');
					}
				}

				// launch the process by giving ngdbmi the path to the project's binary
				this.process = new ngdbmi(projectPath+project+'/'+project+args);
				
				this.running = true;
				this.emit('status', {debugRunning: true});
		
				this.registerHandlers();
		
				_co(this, 'start', breakpoints);
			
			});
		
	}
	
	// kill the debugger
	stop(){
		if (this.running)
			this.process.command('exit');
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
			this.running = false;
			this.emit('status', {
				gdbLog			: 'Debugger closed with code '+return_code+' '+signal, 
				debugStatus		: 'inactive', 
				debugRunning	: false
			});
		});
		
		// GDB output
		this.process.on('gdb', (data) => this.emit('status', {gdbLog: 'GDB> '+data}) );
		
		// Application output
		this.process.on('app', (data) => this.emit('status', {debugBelaLog: data}) );
		
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
		
		this.emit('status', {
			debugBelaRunning	: false, 
			debugStatus			: 'setting breakpoints'
		});
		
		yield this.setBreakpoints(breakpoints);
		
		this.emit('status', {
			debugBelaRunning	: true, 
			debugStatus			: 'running'
		});
		
		var state = yield this.command('run');
		
		if (!this.stopped(state))
			throw('er');

		var localVariables = yield this.getLocals();
		
		if (localVariables.length){
			yield _co(this, 'createVariables', localVariables);
			this.emit('variables', this.project, localVariables);
		}

		//console.log(util.inspect(this.variables, false, null));
		
		this.emit('status', {debugBelaRunning: false, debugStatus: 'idle'});
	}
	
	stopped(state){
		
		// parse the reason for the halt
		var reason = state.status.reason;
		if (reason === 'signal-received'){
			reason = reason+' '+state.status['signal-name']+' '+state.status['signal-meaning'];
		}
		if (reason) this.emit('status', {debugReason: reason});
	
		// check the frame data is valid && we haven't fallen off the end of the render function
		if (!state.status || !state.status.frame){
			console.log('bad frame data');
			return false;
		}
		if (state.status.frame.func === 'PRU::loop(rt_intr_placeholder*, void*)'){
			console.log('debugger out of range');
			setTimeout(() => this.debugContinue(), 100);
			return false;
		}

		// parse the location of the halt
		var path = state.status.frame.file.split('/');
		var file = path[path.length-1];
		var line = state.status.frame.line;
		//var frameAddr = state.status.frame.addr;
		console.log('stopped, file '+file+' line '+line);
		
		this.emit('status', { 
			debugProject	: this.project,
			debugFile		: file,
			debugLine		: line,
			debugReason		: reason
		});
		
		return true;

	}
	
	setBreakpoints(breakpoints){
		return new Promise.mapSeries(breakpoints, (breakpoint) => this.command('breakInsert', {location: breakpoint.file+':'+(breakpoint.line+1)}) );
	}
	
	getLocals(){
			
		this.emit('status', {debugStatus: 'getting local variables'});
		
		return this.command('stackListVariables', {skip: false, print: 2})
			.then((state) => {
				if (!state.status || (state.status.variables === undefined) )
					throw new Error('bad stackListVariables state');
				
				return state.status.variables;
			})
			.catch(function(e){
				console.error(e, e.stack.split('\n'));
				//IDE.reportError('getLocals', 'unable to list local variables', e);
			});
		
	}
	
	// creates gdbmi variable objects for each top-level variable passed to it
	// recursively lists children with listChildren
	// implemented with coroutines to avoid stack overflows
	*createVariables(variables){

		for (let variable of variables){
		
			console.log('STATUS: creating variable', variable);
						
			var state = yield this.command('varCreate', {'name': '-', 'frame': '*', 'expression': variable.name});
			if (!state.status){
				throw new Error('bad varCreate return state');
			}
			
			// save the variable's state
			if (state.status.name){
				variable.key = variable.name;
				variable.name = state.status.name;
			}
			if (state.status.value)
				variable.value = state.status.value;
			if (state.status.type)
				variable.type = state.status.type;
			if (state.status.numchild)
				variable.numchild = parseInt(state.status.numchild);
			
			if (variable.numchild) {
				//console.log('STATUS: variable created, listing children', variable);
				variable = yield _co(this, 'listChildren', variable);
			}// else
				//console.log('STATUS: variable created, no children', variable);
			
		}
		
		return Promise.resolve();
		
	}
	
	// recursively lists children of variables
	*listChildren(variable){
	
		//console.log('STATUS: listing children of', variable.name);
		
		// list the children of the variable, and save them in an array variable.children
		var state = yield this.command('varListChildren', {'print': 1, 'name': variable.name});
		variable.children = state.status.children;
		//console.log(state.status.children);
		
		// iterate over the array of children and check if THEY have children themselves
		for (let child of variable.children){
			child.numchild = parseInt(child.numchild);
			//console.log('CHILD', child);
			
			// skip char variables for now - they sometimes cause parse errors in ngdmi
			if (child.type && child.type.indexOf('char') !== -1){
				//console.log('CHAR', child.name);
			} else if (child.numchild){
			
				// if the child has children, recursively call this.listChildren on it as a coroutine
				// so we wait for it to be finished before proceeding
				var grandchild = yield _co(this, 'listChildren', child);
				//console.log('GRANDCHILD', grandchild);
			}
		}
		
		return variable;
	}
	
	// execute a command (usually continue, step or next) and check if any
	// local variables have been changed
	*update(command){
		var state = yield this.command(command);
		if (!this.stopped(state))
			throw('er');
		
		var localVariables = yield this.getLocals();
		
		if (localVariables.length){
			yield _co(this, 'createVariables', localVariables);
			this.emit('variables', this.project, localVariables);
		}
		
		this.emit('status', {debugBelaRunning: false, debugStatus: 'idle'});
		
	}
	

	// commands
	debugContinue(){
		this.emit('status', {
			debugBelaRunning	: true,
			debugStatus		: 'continuing to next breakpoint'
		});
		_co(this, 'update', 'continue');
	}
	debugStep(){
		this.emit('status', {
			debugBelaRunning	: true,
			debugStatus		: 'stepping'
		});
		_co(this, 'update', 'step');
	}
	debugNext(){
		this.emit('status', {
			debugBelaRunning	: true,
			debugStatus		: 'stepping over'
		});
		_co(this, 'update', 'next');
	}
	exec(command){
		this.process.wrapper.write(command+'\n');
	}
	
}

module.exports = new DebugManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}