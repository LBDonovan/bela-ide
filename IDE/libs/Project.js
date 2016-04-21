'use strict';
// node modules
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));

// module variables
var belaPath = '/root/BeagleRT/';
var blockedFiles = ['build', 'settings.json'];
var exampleTempProject = 'exampleTempProject';

var projects = {};

class Project {

	constructor(name){
		this.Path = () => belaPath+'projects/'+name;
		this.Name = () => name;
	}
	
	// create default project settings
	static defaultSettings(){
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
	static co(obj, func, args){
		return Promise.coroutine(obj[func]).bind(obj)(args);
	}
	
	// instantiates any new projects and adds them to projects object
	// returns array of project names
	static listProjects(){
		return fs.readdirAsync(belaPath+'projects/')
		.map((projectName) => {
			if (projectName && !projects[projectName] && projectName[0] !== '.'){
				projects[projectName] = new Project(projectName);
			}
			return projectName;
		})
		.catch((err) => console.error(err));
	}
	
	static get projects(){
		return projects;
	}
	
	// functions called directly over websocket
	*openProject(data){
		data.fileList = yield this.listFiles();
		data.settings = yield this.getSettings();
		data.fileName = data.settings.fileName;
		return yield Project.co(this, 'openFile', data);
	}
	*openFile(data){
		data.fileData = yield fs.readFileAsync(this.Path()+'/'+data.fileName, 'utf8');
		yield Project.co(this, 'setFile', data.fileName);
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
	}
	*saveAs(data){
		yield fs.copyAsync(this.Path(), belaPath+'projects/'+data.newProject);
		data.projectList = yield Project.listProjects();
		data.currentProject = data.newProject;
		data.newProject = undefined;
		return yield Project.co(projects[data.currentProject], 'openProject', data);
	}
	
	// internal functions
	// save the last opened file
	*setFile(fileName){
		var settings = yield this.getSettings()
		settings.fileName = fileName;
		return yield this.saveSettings(settings);
	}
	
	// return the project settings
	getSettings(){
		return fs.readJSONAsync(this.Path()+'/settings.json')
			.catch((error) => {
				//console.log('settings.json error', error, error.stack);
				console.log('creating default settings');
				// if there is an error loading the settings object, create a new default one
				return Project.defaultSettings();
			})
	}
	
	// save the project settings
	saveSettings(settings){
		return fs.outputJSONAsync(this.Path()+'/settings.json', settings)
			.then( () => settings )
			.catch( (e) => console.log(e) );
	}
	
	// list all files in project, excluding blocked & hidden files or directories
	listFiles(){
		return fs.readdirAsync(this.Path())
			.filter((fileName) => {
				if (fileName && fileName[0] && fileName[0] !== '.' && fileName !== this.Name() && blockedFiles.indexOf(fileName) === -1) return fileName;
			});
	}
}

class Example extends Project {

	constructor(name){
		super();
		this.Path = () => belaPath+'examples/'+name;
	}

	*openExample(){
		yield fs.emptyDirAsync(belaPath+'projects/'+exampleTempProject);
		return yield fs.copyAsync(this.Path(), belaPath+'projects/'+exampleTempProject, {clobber: true});
	}
	
	*newProject(data){
		return yield fs.copyAsync(this.Path(), belaPath+'projects/'+data.newProject, {clobber: true});
	}
	
}

module.exports = {Project, Example};






