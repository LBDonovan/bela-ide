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
		this.variables = [];
	
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
		
		var state = yield this.command('run');
		
		if (!this.stopped(state))
			throw('er');

		var newVariables = yield this.getLocals();
		
		if (newVariables.length) yield this.createVariables(newVariables);
	}
	
	stopped(state){

		this.emit('status', {running: false});
		
		// parse the reason for the halt
		var reason = state.status.reason;
		if (reason === 'signal-received'){
			reason = reason+' '+state.status['signal-name']+' '+state.status['signal-meaning'];
		}
		if (reason) this.emit('status', {reason});
	
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
		
		this.emit('status', { project: this.project, file, line });
		
		return true;

	}
	
	setBreakpoints(breakpoints){
		return new Promise.mapSeries(breakpoints, (breakpoint) => this.command('breakInsert', {location: breakpoint.file+':'+(breakpoint.line+1)}) );
	}
	
	getLocals(){
			
		this.emit('status', {status: 'getting local variables'});
		
		return this.command('stackListVariables', {skip: false, print: 2})
			.then((state) => {
				if (!state.status || (state.status.variables === undefined) ){
					throw new Error('bad stackListVariables state');
				}
				
				var variables = state.status.variables;

				var newVariables = [];

				for (let i=0; i<variables.length; i++){
				
					// needed to ensure arrays don't get duplicated
					if (variables[i].value === undefined && variables[i].type.indexOf('[') !== -1){
						variables[i].value = variables[i].type.split(' ').pop();
					}
				
					var exists = false;
					for (let j=0; j<this.variables.length; j++){
						if (variables[i].name === this.variables[j].key && variables[i].type === this.variables[j].type && (variables[i].value === undefined || variables[i].value === this.variables[j].value)){
							exists = true;
							console.log(variables[i].name+' already exists, not adding');
							console.log(variables[i]);
						}
					}
					if (!exists){
						console.log(variables[i].name+' does not exist, now adding');
						console.log(variables[i]);
						newVariables.push(new Variable(variables[i], this.process));
					}
					
				}
				
				return newVariables;
				
			})
			.catch(function(e){
				console.error(e, e.stack.split('\n'));
				//IDE.reportError('getLocals', 'unable to list local variables', e);
			});
		
	}
	
	// calls create() on each new variable, creating a gdb mi variable object for it
	// probably needs to be redone with promise.all, or something?
	// will bring down node if there is an error within variable.create()
	createVariables(newVariables){
			
		return new Promise.mapSeries(newVariables, (variable) => {
			return variable.create();
		})
		.then(() => {

			// append the new variables to the main variables array
			Array.prototype.push.apply(this.variables, newVariables)
			
			// send the new variables to the browser
			this.emit('variables', this.project, newVariables);
		});
		
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

// class for describing top-level gdb mi variable objects
class Variable {
	
	constructor(variable, process){
	
		this.key = variable.name;
		this.type = variable.type;
		this.process = process;
	
		if (this.type.indexOf('*') !== -1){
			this.pointer = true;
		} else {
			this.pointer = false;
		}
	
		this.value = variable.value;
	
		this.children = [];	
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

	create(){
		
		return this.command('varCreate', {'name': '-', 'frame': '*', 'expression': this.key})
			.then( (state) => {
				if (!state.status){
					throw new Error('bad varCreate return state');
				}
				
				// save the variable's state
				if (state.status.name){
					this.name = state.status.name;
				}
				if (state.status.value){
					this.value = state.status.value;
				}
				if (state.status.type){
					this.type = state.status.type;
				}
				if (state.status.numchild){
					this.numchild = state.status.numchild;
				}
				
				// if the variable has children, list them and their children recursively
				return this.listChildren([this]);
				
			})
			.catch(function(e){
				console.error(e, e.stack.split('\n'));
				//IDE.reportError('variable.create', 'unable to create variable object', e);
			});
		
	}
	
	listChildren(parents){

		return new Promise.mapSeries(parents, (parent) => {
			parent.numChildren = parseInt(parent.numchild);
			if (!parent.numChildren || (parent.type && parent.type.indexOf('char') !== -1)){
				console.log('CHAR!', parent.name, parent.type);
				return;
			}
			console.log('listing children', parent.name);
//if (parent.type && parent.type.indexOf('char') !== -1) console.log('CHAR', parent.name);
			return this.command('varListChildren', {'print': 1, 'name': parent.name})
				.then((state) => {
					parent.children = state.status.children;
					return this.listChildren(parent.children);
				});
		});
	
	}
	
}
