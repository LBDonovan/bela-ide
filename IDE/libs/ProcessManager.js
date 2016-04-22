'use strict';
// node modules
var Promise = require('bluebird');
var spawn = require('child_process').spawn;

var ProjectManager = require('./ProjectManager');

var makePath = '/root/BeagleRT/IDE/';

var running = false;
var proc;

module.exports = {

	*process(data){

		if (data.currentProject && data.newFile && data.fileData) {
			data = yield _co(ProjectManager, 'uploadFile', data);
			console.log('uploaded');
		}
	
		if (data.checkSyntax){
			console.log('check dat syntax', data.currentProject);
			return yield _co(this, 'checkSyntax', data.currentProject);
		}
	
	},
	
	*checkSyntax(currentProject){
		
		if (running){
			console.log('running', proc);
		} else {

			proc = spawn('make', ['--no-print-directory', '-C', makePath,  'syntax',  'PROJECT='+currentProject]);
			
			proc.stdout.setEncoding('utf8');
			proc.stderr.setEncoding('utf8');
			proc.stdout.on('data', console.log );
			proc.stderr.on('data', console.log );
			proc.on('close', (code) => console.log('syntax check ended', code) );

		}
		
	}
	
}; 

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}