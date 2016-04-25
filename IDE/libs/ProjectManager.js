'use strict';
// node modules
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));

// private variables
// paths
var belaPath = '/root/BeagleRT/';
var projectPath = belaPath+'projects/';
var examplePath = belaPath+'examples/';
var newProjectPath = examplePath+'minimal';

//files
var blockedFiles = ['build', 'settings.json'];
var exampleTempProject = 'exampleTempProject';

// public functions
module.exports = {
	
	// returns array of project names
	listProjects: function(){
		return fs.readdirAsync(projectPath)
			.catch((err) => console.error(err));
	},
	listExamples(){
		return fs.readdirAsync(examplePath)
			.catch((err) => console.error(err));
	},

	// functions called directly over websocket
	// project & example events
	*openProject(data){
		data.fileList = yield _listFiles(data.currentProject);
		data.settings = yield _getSettings(data.currentProject);
		data.fileName = data.settings.fileName;
		return yield _co(this, 'openFile', data);
	},
	
	*openExample(data){
		yield fs.emptyDirAsync(projectPath+exampleTempProject);
		yield fs.copyAsync(examplePath+data.currentProject, projectPath+exampleTempProject);
		data.currentProject = exampleTempProject;
		return yield _co(this, 'openProject', data);
	},
	
	*newProject(data){
		yield fs.copyAsync(newProjectPath, projectPath+data.newProject, {clobber: true});
		data.projectList = yield this.listProjects();
		data.currentProject = data.newProject;
		data.newProject = undefined;
		return yield _co(this, 'openProject', data);
	},
	
	*saveAs(data){
		yield fs.copyAsync(projectPath+data.currentProject, projectPath+data.newProject);
		data.projectList = yield this.listProjects();
		data.currentProject = data.newProject;
		data.newProject = undefined;
		return yield _co(this, 'openProject', data);
	},
	
	*deleteProject(data){
		yield fs.removeAsync(projectPath+data.currentProject);
		data.projectList = yield this.listProjects();
		console.log(data.projectList);
		for (let proj of data.projectList){
			//console.log(proj, (proj === undefined), (proj === 'undefined'), (proj !== exampleTempProject));
			if ((proj) && (proj !== 'undefined') && (proj !== exampleTempProject)){
				data.currentProject = proj;
				return yield _co(this, 'openProject', data);
			}
		}
		data.currentProject = undefined;
		data.fileName = undefined;
		data.fileData = '';
		data.fileList = [];
		return data;
	},
	
	*cleanProject(data){
		yield fs.removeAsync(projectPath+data.currentProject+'/build/*');
		yield fs.removeAsync(projectPath+data.currentProject+'/'+data.currentProject);
		return data;
	},
	
	// file events
	*openFile(data){
		data.fileData = yield fs.readFileAsync(projectPath+data.currentProject+'/'+data.fileName, 'utf8');
		yield Promise.coroutine(_setFile)(data);
		return data;
			/*.catch((error) => {
				console.log(error);
				if (error.code === 'ENOENT'){
					fileName = 'render.cpp';
					return fs.readFileAsync(this.Path()+'/render.cpp', 'utf8');
				} else {
					throw error;
				}
			});*/
	},
	
	*newFile(data){
		yield fs.outputFileAsync(projectPath+data.currentProject+'/'+data.newFile, '/***** '+data.newFile+' *****/\n');
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileList = yield _listFiles(data.currentProject);
		data.focus = {line: 2, column: 1};
		return yield _co(this, 'openFile', data);
	},
	
	*uploadFile(data){
		yield fs.outputFileAsync(projectPath+data.currentProject+'/'+data.newFile, data.fileData);
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileList = yield _listFiles(data.currentProject);
		return data;
	},
	
	*renameFile(data){
		yield fs.moveAsync(projectPath+data.currentProject+'/'+data.fileName, projectPath+data.currentProject+'/'+data.newFile);
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileList = yield _listFiles(data.currentProject);
		return yield _co(this, 'openFile', data);
	},
	
	*deleteFile(data){
		yield fs.removeAsync(projectPath+data.currentProject+'/'+data.fileName);
		data.fileList = yield _listFiles(data.currentProject);
		if (data.fileList.length){
			data.fileName = data.fileList[0];
			return yield _co(this, 'openFile', data);
		}
		data.fileName = '';
		data.fileData = '';
		return data;
	}
}


// private functions
// save the last opened file
function *_setFile(data){
	var settings = yield _getSettings()
	settings.fileName = data.fileName;
	return yield _saveSettings(settings, data);
}

// return the project settings
function _getSettings(projectName){
	return fs.readJSONAsync(projectPath+projectName+'/settings.json')
		.catch((error) => {
			//console.log('settings.json error', error, error.stack);
			console.log('creating default settings');
			// if there is an error loading the settings object, create a new default one
			return _defaultSettings();
		})
}

// save the project settings
function _saveSettings(settings, data){
	//console.log('saving settings in', projectPath+data.currentProject);
	return fs.outputJSONAsync(projectPath+data.currentProject+'/settings.json', settings)
		.then( () => settings )
		.catch( (e) => console.log(e) );
}

// list all files in project, excluding blocked & hidden files or directories
function _listFiles(projectName){
	return fs.readdirAsync(projectPath+projectName)
		.filter((fileName) => {
			if (fileName && fileName[0] && fileName[0] !== '.' && fileName !== projectName && blockedFiles.indexOf(fileName) === -1) return fileName;
		});
}

// create default project settings
function _defaultSettings(){
	var CLArgs = CLArgs = {
		"-p": "16",		// audio buffer size
		"-C": "8",		// no. analog channels
		"-B": "16",		// no. digital channels
		"-H": "-6",		// headphone level (dB)
		"-N": "1",		// use analog
		"-G": "1",		// use digital
		"-M": "0", 		// mute speaker
		"-D": "0",		// dac level
		"-A": "-6", 	// adc level
		"-R": "9998",	// recieve port
		"-T": "9999", 	// transmit port
		"-S": "127.0.0.1", // server
		"--pga-gain-left": "16",
		"--pga-gain-right": "16",
		"user": ''		// user-defined clargs
	};
	return {
		"fileName"		: "render.cpp",
		CLArgs,
		"breakpoints"	: []
	};
}

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}




