'use strict';
var Promise = require('bluebird');
var ChildProcess = require('./ChildProcess');
var ProjectManager = require('./ProjectManager');
var execSync = require('child_process').execSync;

var belaPath = '/root/BeagleRT/';
var makePath = belaPath+'IDE/';
var projectPath = belaPath+'projects/';

class SyntaxCheckProcess extends ChildProcess{
	
	constructor(){
		super('make', ['--no-print-directory', '-C', makePath,  'syntax',  'PROJECT=']);
	}
	
	execute(project, upload){
		if (this.active) return;
		
		this.args[this.args.length-1] = 'PROJECT='+project;
		
		if (upload && upload.newFile && upload.fileData){

			this.active = true;
			
			_co(ProjectManager, 'uploadFile', upload)
				.then( () => {

					this.active = false;
					if (this.next) {
						this.dequeue();
					} else {
						this.project = project;
						this.start();
					}
				})
				.catch( (err) => this.emit('upload-error', err) );
				
		} else {

			this.project = project;
			this.start();
			
		}
	}
	
}

class buildProcess extends ChildProcess{

	constructor(){
		super('make', ['--no-print-directory', '-C', makePath,  'all',  'PROJECT=']);
	}
	
	execute(project){
		if (this.active) return;
		this.args[this.args.length-1] = 'PROJECT='+project;
		this.project = project;
		this.start();
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