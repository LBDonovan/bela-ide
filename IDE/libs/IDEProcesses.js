'use strict';
var Promise = require('bluebird');
var ChildProcess = require('./ChildProcess');
var ProjectManager = require('./ProjectManager');
var pusage = Promise.promisifyAll(require('pidusage'));
var pgrep = require('pgrep');
var fs = Promise.promisifyAll(require('fs-extra'));

var belaPath = '/root/BeagleRT/';
var makePath = belaPath+'IDE/';
var projectPath = belaPath+'projects/';

class SyntaxCheckProcess extends ChildProcess{
	
	constructor(){
		super('make', ['--no-print-directory', '-C', makePath,  'syntax',  'PROJECT=']);
	}
	
	execute(project, upload, checkSyntax){
		if (this.active) return;
		
		this.args[this.args.length-1] = 'PROJECT='+project;
		
		if (upload && upload.newFile && upload.fileData){

			this.active = true;

			_co(ProjectManager, 'uploadFile', upload)
				.then( () => {

					this.active = false;
					if (this.next) {
						this.dequeue();
					} else if (checkSyntax) {
						this.project = project;
						this.start();
					} else {
						this.closed();
					}
				})
				.catch( (err) => this.emit('upload-error', err) );
				
		} else if (checkSyntax) {
			this.project = project;
			this.start();
			
		} else {
			this.closed();
		}
	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		var makeCPU;
		return super.CPU()
			.then((cpu) => {
				makeCPU = cpu;
				return pgrep.exec({
					name: 'cc1plus'
				});
			})
			.then(pusage.statAsync)
			.then((stat) => {
				return makeCPU + stat.cpu;
			})
			.catch((e) => {
				console.log('error calculating cpu', this.command);
				return Promise.resolve(makeCPU);
			});
	}
}

class buildProcess extends ChildProcess{

	constructor(){
		super('make', ['--no-print-directory', '-C', makePath,  'all',  'PROJECT=']);
	}
	
	execute(project, debug){
		if (this.active) return;
		
		if (debug) 
			this.args[3] = 'debug';
		else
			this.args[3] = 'all';
			
		this.args[4] = 'PROJECT='+project;
		this.project = project;
		this.start();
		this.buildError = false;
		this.childProcess.stderr.on('data', (data) => {
			// separate errors from warnings in the stderr of g++
			var lines = data.split('\n');
			for (let line of lines){
				// do not count warnings as buildErrors
				// this allows the executable to be built and run even with warnings
				line = line.split(':');
				if (line.length > 4){
					if (line[3] === ' error' || line[3] === ' fatal error'){
						this.buildError = true;
					} else if (line[3] === ' warning'){
						console.log('warning');
					}
				}
			}
		});
	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		var makeCPU;
		return super.CPU()
			.then((cpu) => {
				makeCPU = cpu;
				return pgrep.exec({
					name: 'cc1plus'
				});
			})
			.then(pusage.statAsync)
			.then((stat) => {
				return makeCPU + stat.cpu;
			})
			.catch((e) => {
				console.log('error calculating cpu', this.command);
				return Promise.resolve(makeCPU);
			});
	}

}

class belaProcess extends ChildProcess{

	constructor(){
		super('stdbuf');
	}
	
	execute(project){
	
		if (this.active) return;
		this.active = true;
		
		_co(ProjectManager, 'getCLArgs', project)
			.then( (CLArgs) => {
				this.active = false;
				if (this.next) {
					this.dequeue();
				} else {
					this.args = ['-i0', '-o0', '-e0', projectPath+project+'/'+project];
					for (let key in CLArgs) {
						if (key[0] === '-' && key[1] === '-'){
							this.args.push(key+'='+CLArgs[key]);
						} else {
							this.args.push(key+CLArgs[key]);
						}
					}
					this.opts = {cwd: projectPath+project+'/'};
					this.project = project;
					this.start();
				}
			})
			.catch( (err) => this.emit('upload-error', err) );

	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		return fs.readFileAsync('/proc/xenomai/stat', 'utf8');
	}
}

module.exports = {
	syntax	: new SyntaxCheckProcess(),
	build	: new buildProcess(),
	bela	: new belaProcess()
}

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}