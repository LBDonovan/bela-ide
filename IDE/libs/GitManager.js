'use strict';
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var exec = require('child_process').exec;

var belaPath = '/root/Bela/';

module.exports = {
	
	repoExists(project){
		return fs.statAsync(belaPath+'projects/'+project+'/.git')
			.then( stat => true )
			.catch( err => false );
	},
	
	*init(data){
		if (yield this.repoExists(data.project)) throw new Error('repo already exists');
		
		// init the repo
		data.command = 'init';
		data = yield this.execute(data);
		
		// create the .gitignore file, ignoring settings.json, the build/ folder and the binary
		yield fs.outputFileAsync(belaPath+'projects/'+data.project+'/.gitignore', 'settings.json\nbuild/*\n'+data.project, 'utf-8');
		
		// add all files to the repo
		data.command = 'add -A';
		data = yield this.execute(data);
		
		// first commit
		data.command = 'commit -am "first commit"';
		data = yield this.execute(data);
		
		return yield _co(this, 'info', data);
	},
	
	*info(data){
		data.repoExists = yield this.repoExists(data.project);
		if (data.repoExists){
			var commits = yield this.execute({command: "log --all --pretty=oneline --format='%s, %ar %H' --graph", project: data.project});
			data.commits = commits.stdout;
			var currentCommit = yield this.execute({command: "log -1 --format='%H'", project: data.project});
			data.currentCommit = currentCommit.stdout
			var branches = yield this.execute({command: "branch", project: data.project});
			data.branches = branches.stdout;
		}
		return data;
	},
	
	execute(data){
		return new Promise( (resolve, reject) => {			
			exec('git '+data.command, {cwd: belaPath+'projects/'+data.project+'/'}, (err, stdout, stderr) => {
			console.log(data.command, stdout, stderr);
				if (err) reject(err);
				
				if (data.stdout) 
					data.stdout += stdout ? ('\n' + stdout) : '';
				else 
					data.stdout = stdout;
					
				if (data.stderr) 
					data.stderr += stderr ? ('\n' + stderr) : '';
				else 
					data.stderr = stderr;
					
				resolve(data);
			});
		});
	}
	
};

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}