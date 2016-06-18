'use strict';
// node modules
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var fileType = require('file-type');

var git = require('./GitManager');

// private variables
// paths
var belaPath = '/root/Bela/';
var projectPath = belaPath+'projects/';
var examplePath = belaPath+'examples/';
var newProjectPath = examplePath+'minimal';

//files
var blockedFiles = ['build', 'settings.json'];
var exampleTempProject = 'exampleTempProject';
var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];
var resourceIndeces = ['pd', 'txt', 'json', 'xml'];
//var editableExtensions = [...sourceIndeces, ...headerIndeces, ...resourceIndeces];
var editableExtensions = sourceIndeces.concat(headerIndeces, resourceIndeces);

var resourceData = 'This file type cannot be viewed in the IDE';

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
		var settings = yield _getSettings(data.currentProject);
		for (let key in settings){
			data[key] = settings[key];
		}
		if (!data.gitData) data.gitData = {};
		data.gitData.currentProject = data.currentProject;
		data.gitData = yield _co(git, 'info', data.gitData);
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
		yield fs.removeAsync(projectPath+data.newProject+'/'+data.currentProject);
		data.projectList = yield this.listProjects();
		data.currentProject = data.newProject;
		data.newProject = undefined;
		return yield _co(this, 'openProject', data);
	},
	
	*deleteProject(data){
		yield fs.removeAsync(projectPath+data.currentProject);
		data.projectList = yield this.listProjects();
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
		// data.newFile is the name of the file to be opened
		// data.fileName will be set to the name of the file opened
		// data.currentProject is the project
	
		if (!data.newFile) data.newFile = data.fileName || '';
		var projectDir = projectPath + data.currentProject + '/';
		
		// check the extension
		var ext;
		if (data.newFile.split && data.newFile.indexOf('.') !== -1)
			ext = data.newFile.split('.').pop();
			
		console.log('opening file with extension', ext);
		
		// if the file can be displayed by the IDE, load it as a string
		if (ext && editableExtensions.indexOf(ext) !== -1){
		
			yield fs.readFileAsync(projectDir + data.newFile, 'utf8')
				.then( fileData => {
				
					// newFile was opened succesfully
					console.log('opened', data.newFile);
											
					// return the data
					data.fileData = fileData;
					data.readOnly = false;
					data.fileName = data.newFile;
					data.newFile = undefined;
					data.fileType = ext;
					
				})
				.catch( e => {
				
					// newFile was not opened succesfully
					console.log('could not open file', data.newFile);
					console.log(e.toString());
					
					// return an error
					data.error = 'Could not open file '+data.newFile;
					data.fileData = '';
					data.readOnly = true;
					data.newFile = undefined;
					data.fileName = undefined;
					data.fileType = undefined;
					
				});
				
		} else {
			// either the file has no extension, or it's extension is not allowed by the IDE
			// load the file as a buffer and try and find what type it is
			
			yield fs.readFileAsync(projectDir + data.newFile)
				.then( fileData => {
				
					// newFile was opened succesfully
					console.log('opened', data.newFile);
					
					// attempt to get its type
					let fileTypeData = fileType(fileData);
					console.log('guessed filetype:', fileTypeData);
					
					if (fileTypeData && fileTypeData.mime.indexOf('image') !== -1){
					
						// the file is an image, and can be opened
						data.fileData = fileData;
						data.fileType = fileTypeData.mime;
						
					} else {
					
						// can't tell what the file is
						data.fileData = resourceData;
						data.fileType = undefined;
						
					}
					
					// return the data
					data.readOnly = true;
					data.fileName = data.newFile;
					data.newFile = undefined;
					
				})
				.catch( e => {
				
					// newFile was not opened succesfully
					console.log('could not open file', data.newFile);
					console.log(e.toString());
					
					// return an error
					data.error = 'Could not open file '+data.newFile;
					data.fileData = '';
					data.readOnly = true;
					data.newFile = undefined;
					data.fileName = undefined;
					data.fileType = undefined;
					
				});
		}
		
		yield Promise.coroutine(_setFile)(data);
		return data;
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
		return yield _co(this, 'openFile', data);
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
	},
	
	*setBreakpoints(data){
		var settings = yield _getSettings(data.currentProject);
		settings.breakpoints = data.value;
		return yield _saveSettings(settings, data);
	},
	
	*setCLArg(data){
		var settings = yield _getSettings(data.currentProject);
		settings.CLArgs[data.key] = data.value;
		return yield _saveSettings(settings, data);
	},
	
	*restoreDefaultCLArgs(data){
		var oldSettings = yield _getSettings(data.currentProject);
		var newSettings = _defaultSettings();
		newSettings.fileName = oldSettings.fileName;
		newSettings.breakpoints = oldSettings.breakpoints;
		return yield _saveSettings(newSettings, data);
	},
	
	*getCLArgs(project){
		var settings = yield _getSettings(project);
		return settings.CLArgs;
	},
	
	listFiles(project){
		return _listFiles(project);
	}
}


// private functions
function *loadData(filePath, backupFilePath, encoding){
	// if the file at filePath exists, open it. Otherwise open the file at backupFilePath
	var file = yield _fileExists(filePath) ? filePath : backupFilePath;
	return yield fs.readFileAsync(file, encoding);
}

function fileExists(file){
	return new Promise((resolve, reject) => {
		fs.stat(file, function(err, stats){
			if (err || !stats.isFile()) resolve(false);
			else resolve(true);
		});
	});
}

// save the last opened file
function *_setFile(data){
	var settings = yield _getSettings(data.currentProject)
	settings.fileName = data.fileName;
	return yield _saveSettings(settings, data);
}

// return the project settings
function _getSettings(projectName){
	return fs.readJSONAsync(projectPath+projectName+'/settings.json')
		.catch((error) => {
			//console.log('settings.json error', error, error.stack);
			console.log('could not find settings.json in project folder, creating default project settings');
			// if there is an error loading the settings object, create a new default one
			return _saveSettings(_defaultSettings(), {currentProject: projectName});
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




