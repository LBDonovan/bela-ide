'use strict';
var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;
var treeKill = require('tree-kill');
var Promise = require('bluebird');
var pusage = Promise.promisifyAll(require('pidusage'));

class ChildProcess extends EventEmitter{

	constructor(cmd, args, opts){
		super();
		this.active = false;
		this.command = cmd;
		this.args = args;
		this.opts = opts;
		this.stdout = [];
		this.stderr = [];
	}
	
	execute(){
		if (this.active) return;
		this.start();
	}
	
	start(){
	
		if (this.active) return;
		this.active = true;
		
		this.stdout = [];
		this.stderr = [];
		
		this.emit('started');
		
		var childProcess = spawn(this.command, this.args, this.opts);
	//console.log('spawning', this.command, this.args, this.opts, childProcess.pid);
		this.pid = childProcess.pid;
		
		childProcess.stdout.setEncoding('utf8');
		childProcess.stderr.setEncoding('utf8');
 
		childProcess.stdout.on('data', (data) => {
			this.stdout.push(data);
			this.emit('stdout', data);
		});
		childProcess.stderr.on('data', (data) => {
			this.stderr.push(data);
			this.emit('stderr', data);
		});
		
		//childProcess.on('exit', (code, signal) => console.log('exit', childProcess.pid, code, signal) );
		childProcess.on('close', (code, signal) => {
			//console.log('close', childProcess.pid, code, signal);
			var stdout = this.stdout;
			var stderr = this.stderr;
			if (this.dying){
				this.closed();
				this.emit('cancelled', {stdout, stderr, signal: (signal || 'undefined')});
			} else {
				this.closed();
				this.emit('finished', {stdout, stderr, signal: (signal || 'undefined')});
			}
			
			if (this.next) this.dequeue(stderr);
		});
		childProcess.on('error', (err) => {
			console.log('error', childProcess.pid, err);
			this.emit('error', err);
			this.closed();
			if (this.next) this.dequeue(err);
		});
		
		this.childProcess = childProcess;
		
	}
	
	kill(){
		if (this.pid) {
			//console.log('killing', this.pid);
			this.dying = true;
			treeKill(this.pid, 'SIGTERM');
			this.pid = undefined;
		}
		return this;
	}
	
	queue(next){
		//console.log('queueing');
		this.next = next;
	}
	
	dequeue(err){
		var next = this.next;
		this.next = undefined;
		next(err);
	}
	
	emptyQueue(){
		this.next = undefined;
	}
	
	closed(){
		this.stdout = [];
		this.stderr = [];
		this.active = false;
		this.dying = false;
	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		//console.log(this.active, this.pid);
		return pusage.statAsync(this.pid)
			.then((stat) => stat.cpu )
			.catch((e) => {
				console.log('error calculating cpu', this.command);
				return Promise.resolve(0);
			});
	}
		
}
	
module.exports = ChildProcess;
	
	
	
	
	
	
	