'use strict';
var Promise = require('bluebird');
var ChildProcess = require('./ChildProcess');
var ProjectManager = require('./ProjectManager');

var makePath = '/root/BeagleRT/IDE/';

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
						this.start();
					}
				})
				.catch( (err) => this.emit('upload-error', err) );
				
		} else {

			this.start();
			
		}
	}
	
}

class buildProcess extends ChildProcess{

	constructor(){
		super('make', ['--no-print-directory', '-C', makePath,  'syntax',  'PROJECT=']);
	}
	
	execute(project){
		if (this.active) return;
		this.args[this.args.length-1] = 'PROJECT='+project;
		this.start();
	}

}

module.exports = {
	syntax	: new SyntaxCheckProcess(),
	build	: new buildProcess()
}

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}