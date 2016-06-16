(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// IDE controller
module.exports = {};

var Model = require('./Models/Model');

// set up models
var models = {};
models.project = new Model();
models.settings = new Model();
models.status = new Model();
models.error = new Model();
models.debug = new Model();
models.git = new Model();

// hack to prevent first status update causing wrong notifications
models.status.setData({running: false, building: false});
 
// set up views
// tab view
var tabView = require('./Views/TabView');
tabView.on('change', () => editorView.emit('resize') );

// settings view
var settingsView = new (require('./Views/SettingsView'))('settingsManager', [models.project, models.settings], models.settings);
settingsView.on('project-settings', (data) => {
	data.currentProject = models.project.getKey('currentProject');
	//console.log('project-settings', data);
	socket.emit('project-settings', data);
});
settingsView.on('IDE-settings', (data) => {
	data.currentProject = models.project.getKey('currentProject');
	//console.log('IDE-settings', data);
	socket.emit('IDE-settings', data);
});

// project view
var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project]);
projectView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// file view
var fileView = new (require('./Views/FileView'))('fileManager', [models.project]);
fileView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	if (!data.fileName && models.project.getKey('fileName')){
		data.fileName = models.project.getKey('fileName');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// editor view
var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.error, models.settings, models.debug], models.settings);
editorView.on('change', (fileData) => {
	socket.emit('process-event', {
		event			: 'upload',
		currentProject	: models.project.getKey('currentProject'),
		newFile			: models.project.getKey('fileName'),
		fileData,
		checkSyntax		: parseInt(models.settings.getKey('liveSyntaxChecking'))
	});
});
editorView.on('breakpoint', (line) => {
	var breakpoints = models.project.getKey('breakpoints');
	for (let i=0; i<breakpoints.length; i++){
		if (breakpoints[i].line === line && breakpoints[i].file === models.project.getKey('fileName')){
			socket.emit('debugger-event', 'removeBreakpoint', breakpoints[i]);
			models.project.spliceFromKey('breakpoints', i);
			return;
		}
	}
	var newBreakpoint = {
		line,
		file: models.project.getKey('fileName')
	};
	socket.emit('debugger-event', 'addBreakpoint', newBreakpoint);
	models.project.pushIntoKey('breakpoints', newBreakpoint);
	//console.log('after', breakpoints);
	//models.project.setKey('breakpoints', breakpoints);
});

// toolbar view
var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status, models.settings, models.debug]);
toolbarView.on('process-event', (event) => {
	var breakpoints;
	if (models.debug.getKey('debugMode')) breakpoints = models.project.getKey('breakpoints');
	var data = {
		event,
		currentProject	: models.project.getKey('currentProject'),
		debug			: models.debug.getKey('debugMode'),
		breakpoints
	};
	//data.timestamp = performance.now();
	if (event === 'stop') consoleView.emit('openProcessNotification', 'Stopping Bela...');
	socket.emit('process-event', data);
});
toolbarView.on('clear-console', () => consoleView.emit('clear') );

// console view
var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.project, models.error, models.settings, models.debug], models.settings);
consoleView.on('focus', (focus) =>  models.project.setKey('focus', focus) );
consoleView.on('open-file', (fileName, focus) => {
	var data = {
		func: 'openFile',
		fileName, 
		focus, 
		currentProject: models.project.getKey('currentProject')
	};
	socket.emit('project-event', data);
});
consoleView.on('input', (value) => {
	if (value){
		var val = value.split(' ')
		var command = val.splice(0, 1);
		if (command[0] === 'gdb' && models.debug.getKey('debugMode')) socket.emit('debugger-event', 'exec', val.join(' '));
	}
});

// debugger view
var debugView = new (require('./Views/DebugView'))('debugger', [models.debug, models.settings, models.project]);
debugView.on('debugger-event', (func) => socket.emit('debugger-event', func) );
debugView.on('debug-mode', (status) => models.debug.setKey('debugMode', status) );

// documentation view
var documentationView = new (require('./Views/DocumentationView'))

// git view
var gitView = new (require('./Views/GitView'))('gitManager', [models.git]);
gitView.on('git-event', data => {
	data.currentProject = models.project.getKey('currentProject');
	socket.emit('git-event', data);
});
gitView.on('console', text => consoleView.emit('log', text) );

// setup socket
var socket = io('/IDE');

// socket events
socket.on('report-error', (error) => consoleView.emit('warn', error.message || error) );

socket.on('init', (data) => {
	
	$('#console-disconnect').remove();
	
	//console.log(data);
	var timestamp = performance.now()
	socket.emit('project-event', {func: 'openProject', currentProject: data[2].project, timestamp})	
	consoleView.emit('openNotification', {func: 'init', timestamp});
	
	models.project.setData({projectList: data[0], exampleList: data[1], currentProject: data[2].project});
	models.settings.setData(data[2]);
	
	//models.project.print();
	//models.settings.print();
	
	socket.emit('set-time', getDateString());
	
	documentationView.emit('init');
	
});

// project events
socket.on('project-data', (data) => {
	var debug;
	if (data.debug){
		debug = data.debug
		data.debug = undefined;
	}
	consoleView.emit('closeNotification', data);
	models.project.setData(data);
	if (debug){
		models.debug.setData(debug);
	}
	if (data.gitData) models.git.setData(data.gitData);
	console.log(data, data.gitData);
	//models.settings.setData(data.settings);
	//models.project.print();
});
socket.on('stop-reply', (data) => {
	consoleView.emit('closeNotification', data);
});
socket.on('project-list', (project, list) =>  {
	if (list.indexOf(models.project.getKey('currentProject')) === -1){
		// this project has just been deleted
		console.log('project-list', 'openProject');
		socket.emit('project-event', {func: 'openProject', currentProject: project});
	}
	models.project.setKey('projectList', list);
});
socket.on('file-list', (project, list) => {
	if (project === models.project.getKey('currentProject')){
		if (list.indexOf(models.project.getKey('fileName')) === -1){
			// this file has just been deleted
			console.log('file-list', 'openProject');
			socket.emit('project-event', {func: 'openProject', currentProject: project});
		}
		models.project.setKey('fileList', list);
	}
});
socket.on('file-changed', (project, fileName) => {
	if (project === models.project.getKey('currentProject') && fileName === models.project.getKey('fileName')){
		console.log('file changed!');
		models.project.setKey('readOnly', true);
		models.project.setKey('fileData', 'This file has been edited in another window. Reopen the file to continue');
		//socket.emit('project-event', {func: 'openFile', currentProject: project, fileName: fileName});
	}
});

socket.on('status', (status, project) => {
	if (project === models.project.getKey('currentProject') || project === undefined){
		models.status.setData(status);
		//console.log('status', status);
	}
});

socket.on('project-settings-data', (project, settings) => {
	//console.log('project-settings-data', settings);
	if (project === models.project.getKey('currentProject'))
		models.project.setData(settings);
});
socket.on('IDE-settings-data', (settings) => models.settings.setData(settings) );

socket.on('cpu-usage', (data) => models.status.setKey('CPU', data) );

socket.on('disconnect', () => {
	consoleView.disconnect();
	models.project.setKey('readOnly', true);
});

socket.on('debugger-data', (data) => {
//console.log('b', data.debugProject, models.project.getKey('currentProject'), data.debugFile, models.project.getKey('fileName'));
	if (data.debugProject === undefined || data.debugProject === models.project.getKey('currentProject')){ 
		//(data.debugFile === undefined || data.debugFile === models.project.getKey('fileName'))){
		var debugFile = data.debugFile;
		if (debugFile && debugFile !== models.project.getKey('fileName')){
			//console.log(debugFile);
			var newData = {
				func			: 'openFile',
				currentProject	: models.project.getKey('currentProject'),
				fileName		: models.project.getKey('fileName'),
				newFile			: debugFile,
				timestamp		: performance.now(),
				debug			: {debugLine: data.debugLine, debugFile}
			};
			consoleView.emit('openNotification', newData);
			socket.emit('project-event', newData);
		} else {
			//console.log(data);
			models.debug.setData(data);
		}
	}
});
socket.on('debugger-variables', (project, variables) => {
	if (project === models.project.getKey('currentProject')){
		models.debug.setKey('variables', variables);
	}
});

/*socket.on('git-reply', (project, data) => {
	if (project === models.project.getKey('currentProject')){
		models.git.setData(data);
	}
});*/

// model events
// build errors
models.status.on('set', (data, changedKeys) => {
	if (changedKeys.indexOf('syntaxError') !== -1){
		parseErrors(data.syntaxError);
	}
});
// debug mode
models.debug.on('change', (data, changedKeys) => {
	if (changedKeys.indexOf('debugMode') !== -1){
		//console.log(!data.debugMode, models.debug.getKey('debugRunning'));
		if (!data.debugMode && models.debug.getKey('debugRunning')) socket.emit('debugger-event', 'stop');
		var data = {
			func			: 'cleanProject',
			currentProject	: models.project.getKey('currentProject'),
			timestamp		: performance.now()
		};
		consoleView.emit('openNotification', data);
		socket.emit('project-event', data);
	}
});


// history
{
	let lastState = {}, poppingState = true;
	
	// file / project changed
	models.project.on('change', (data, changedKeys) => {
		if (changedKeys.indexOf('currentProject') !== -1 || changedKeys.indexOf('fileName') !== -1){
			var state = {file: data.fileName, project: data.currentProject};
			if (state.project !== lastState.project || state.file !== lastState.file){
				$('title').html(data.fileName+', '+data.currentProject);
				if (!poppingState){
					//console.log('push', state);
					history.pushState(state, null, null);
				}
				poppingState = false
				lastState = state;
			}
		}
	});

	// load previously open file / project when browser's back button is clicked
	window.addEventListener('popstate', function(e) {
		if (e.state){
			console.log('opening project '+e.state.project+' file '+e.state.file);
			var data = {
				currentProject	: e.state.project,
				fileName		: e.state.file,
				func			: 'openFile',
				timestamp 		: performance.now()
			};
			consoleView.emit('openNotification', data);
			socket.emit('project-event', data);
			poppingState = true;
		}
	});
}

// local functions
// parse errors from g++
function parseErrors(data){
//console.log('parsing', data, data.split('\n'));
	data = data.split('\n');
	
	var errors = [];
	for (let i=0; i<data.length; i++){

		// ignore errors which begin with 'make'
		if (data[i].length > 1 && data[i].slice(0,4) !== 'make'){
	
			var msg = data[i].split('\n');
		
			for (let j=0; j<msg.length; j++){
		
				var str = msg[j].split(':');
				//console.log(str);
				// str[0] -> file name + path
				// str[1] -> row number
				// str[2] -> column number
				// str[3] -> type of error
				// str[4+] > error message
			
				if (str[3] === ' error'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "error"
					});
				} else if (str[3] == ' fatal error'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "error"
					});
				} else if (str[3] == ' warning'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "warning"
					});
				} else {
					//console.log('rejected error string: '+str);
					if (str[2] && str[2].indexOf('linker') !== -1){
						console.log('linker error');
						consoleView.emit('warn', 'linker error detected, set verbose build output in settings for details');
					}
				}
			}
		}
	}

	// if no gcc errors have been parsed correctly, but make still thinks there is an error
	// error will contain string 'make: *** [<path>] Error 1'
	if (!errors.length && (data.indexOf('make: *** ') !== -1) && (data.indexOf('Error 1') !== -1)){
		errors.push({
			text: data,
			type: 'error'
		});
	}
	
	var currentFileErrors = [], otherFileErrors = [];
	for (let err of errors){
		if (!err.file || err.file === models.project.getKey('fileName')){
			err.currentFile = true;
			currentFileErrors.push(err);
		} else {
			err.currentFile = false;
			err.text = 'In file '+err.file+': '+err.text;
			otherFileErrors.push(err);
		}
	}
	
	models.error.setKey('allErrors', errors);
	models.error.setKey('currentFileErrors', currentFileErrors);
	models.error.setKey('otherFileErrors', otherFileErrors);
	
	models.error.setKey('verboseSyntaxError', data);

}

function getDateString(){

	var str = '';
	
	// get browser's system's time
	var date = new Date();
	
	// format into string suitable for linux date command
	var month = date.getMonth() + 1;
	if (month < 10){
		str += '0'+month;
	} else {
		str += month;
	}
	
	var day = date.getDate();
	if (day < 10){
		str += '0'+day;
	} else {
		str += day;
	}
	
	var hour = date.getHours();
	if (hour < 10){
		str += '0'+hour;
	} else {
		str += hour;
	}
	
	var minutes = date.getMinutes();
	if (minutes < 10){
		str += '0'+minutes;
	} else {
		str += minutes;
	}
	
	str += date.getFullYear();
	
	str += '.';
	
	var seconds = date.getSeconds();
	if (seconds < 10){
		str += '0'+seconds;
	} else {
		str += seconds;
	}
	
	return str;
	
}







},{"./Models/Model":2,"./Views/ConsoleView":3,"./Views/DebugView":4,"./Views/DocumentationView":5,"./Views/EditorView":6,"./Views/FileView":7,"./Views/GitView":8,"./Views/ProjectView":9,"./Views/SettingsView":10,"./Views/TabView":11,"./Views/ToolbarView":12}],2:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;

class Model extends EventEmitter{

	constructor(data){
		super();
		var _data = data || {};
		this._getData = () => _data;
	}
	
	getKey(key){
		return this._getData()[key];
	}
	
	setData(newData){
		if (!newData) return;
		var newKeys = [];
		for (let key in newData){
			if (!_equals(newData[key], this._getData()[key], false)){
				newKeys.push(key);
				this._getData()[key] = newData[key];
			}
		}
		if (newKeys.length) {
			//console.log('changed setdata');
			this.emit('change', this._getData(), newKeys);
		}
		this.emit('set', this._getData(), Object.keys(newData));
	}
	
	setKey(key, value){
		if (!_equals(value, this._getData()[key], false)){
			this._getData()[key] = value;
			//console.log('changed setkey');
			this.emit('change', this._getData(), [key]);
		}
		this.emit('set', this._getData(), [key]);
	}
	
	pushIntoKey(key, value){
		this._getData()[key].push(value);
		this.emit('change', this._getData(), [key]);
		this.emit('set', this._getData(), [key]);
	}
	
	spliceFromKey(key, index){
		this._getData()[key].splice(index, 1);
		this.emit('change', this._getData(), [key]);
		this.emit('set', this._getData(), [key]);
	}
	
	print(){
		console.log(this._getData());
	}
	
}

module.exports = Model;

function _equals(a, b, log){
	if (log) console.log('a:', a, 'b:', b);
	if (a instanceof Array && b instanceof Array){
		if (log) console.log('arrays', 'a:', a, 'b:', b, (a.length === b.length), a.every( function(element, index){ return _equals(element, b[index], log) }));
		return ( (a.length === b.length) && a.every( function(element, index){ return _equals(element, b[index], log) }) );
	} else if (a instanceof Object && b instanceof Object){
		if (log) console.log('objects', 'a:', a, 'b:', b);
		for (let c in a){ 
			if (log) console.log('a[c]:', a[c], 'b[c]:', b[c], 'c:', c);
			if (!_equals(a[c], b[c], log)) return false;
		}
		return true;
	} else {
		if (log) console.log('a:', a, 'b:', b, Object.is(a, b), (a === b));
		return Object.is(a, b);
	}
}
	
	
	
	
	
	
	
},{"events":16}],3:[function(require,module,exports){
'use strict';
var View = require('./View');
var _console = require('../console');

var verboseDebugOutput = false;

class ConsoleView extends View{

	constructor(className, models, settings){
		super(className, models, settings);		
		
		this.on('clear', () => _console.clear() );
		_console.on('focus', (focus) => this.emit('focus', focus) );
		_console.on('open-file', (fileName, focus) => this.emit('open-file', fileName, focus) );
		
		this.on('openNotification', this.openNotification);
		this.on('closeNotification', this.closeNotification);
		this.on('openProcessNotification', this.openProcessNotification);

		this.on('log', text => _console.log(text));
		this.on('warn', function(warning, id){
			console.log(warning);
			_console.warn(warning, id);
		});
		
		this.form = document.getElementById('beaglert-consoleForm');
		this.input = document.getElementById('beaglert-consoleInput');
		
		// console command line input events
		this.form.addEventListener('submit', (e) => {
			e.preventDefault();
			this.emit('input', this.input.value);
			this.input.value = '';
		});
	}
	
	openNotification(data){
		if (!funcKey[data.func]) console.log(data.func);
		var output = funcKey[data.func];
		if (data.newProject || data.currentProject) output += ' '+(data.newProject || data.currentProject);
		if (data.newFile || data.fileName) output += ' '+(data.newFile || data.fileName);
		_console.notify(output+'...', data.timestamp);
	}
	closeNotification(data){
		if (data.error){
			_console.reject(' '+data.error, data.timestamp);
		} else {
			_console.fulfill(' done', data.timestamp);
		}
	}
	
	openProcessNotification(text){
		var timestamp = performance.now();
		_console.notify(text, timestamp);
		_console.fulfill('', timestamp, false);
	}
	
	disconnect(){
		console.log('disconnected');
		_console.warn('You have been disconnected from the Bela IDE and any more changes you make will not be saved. Please check your USB connection and reboot your BeagleBone', 'console-disconnect');
	}
	
	// model events
	// syntax
	_syntaxLog(log, data){
		if (this.settings.fullSyntaxCheckOutput){
			_console.log(log);
		}
	}
	__verboseSyntaxError(log, data){
		if (parseInt(this.settings.getKey('verboseErrors'))){
			for (let line of log){
				_console.log(line.split(' ').join('&nbsp;'));
			}
		}
	}
	__allErrors(errors, data){
	//console.log(data);
		_console.newErrors(errors);
	}
	
	// build
	_buildLog(log, data){
	//console.log(log, data);
		//if (this.settings.fullBuildOutput){
			_console.log(log);
		//}
	}
	
	// bela
	__belaLog(log, data){
		_console.log(log);
	}
	
	_building(status, data){
		var timestamp = performance.now();
		if (status){
			_console.notify('Building project...', timestamp, true);
			_console.fulfill('', timestamp, true);
		} else {
			_console.notify('Build finished', timestamp, true);
			_console.fulfill('', timestamp, true);
		}
	}
	_running(status, data){
		var timestamp = performance.now();
		if (status){
			_console.notify('Running project...', timestamp, true);
			_console.fulfill('', timestamp, true);
		} else {
			_console.notify('Bela stopped', timestamp, true);
			if (data && data.belaResult && data.belaResult.signal && data.belaResult.signal !== 'undefined'){
				_console.reject(' with signal '+data.belaResult.signal, timestamp, true);
			} else {
				_console.fulfill('', timestamp, true);
			}
		}
	}
	
	_CPU(data){
		if (parseInt(this.settings.getKey('cpuMonitoringVerbose')) && data.bela != 0){
			_console.log(data.bela.split(' ').join('&nbsp;'));
		}
	}
	
	_consoleDelete(value){
		_console.setConsoleDelete(parseInt(value));
	}
	_verboseDebug(value){
		verboseDebugOutput = parseInt(value);
	}
	
	__debugReason(reason){
		console.log('reason', reason);
		var timestamp = performance.now();
		_console.notify(reason, timestamp, true);
		if (reason === 'exited' || reason === 'exited-signalled')
			_console.reject('', timestamp, true);
		else 
			_console.fulfill('', timestamp, false);
	}
	_debugSignal(signal){
		console.log('signal', signal);
		var timestamp = performance.now();
		_console.notify(signal, timestamp, true);
		_console.reject('', timestamp, true);
	}
	_gdbLog(data){
		if (verboseDebugOutput) _console.log(data);
		else console.log(data);
	}
	__debugBelaLog(data){
		_console.log(data);
	}

	
}

module.exports = ConsoleView;

var funcKey = {
	'openProject'	: 'Opening project',
	'openExample'	: 'Opening example',
	'newProject'	: 'Creating project',
	'saveAs'		: 'Saving project',
	'deleteProject'	: 'Deleting project',
	'cleanProject'	: 'Cleaning project',
	'openFile'		: 'Opening file',
	'newFile'		: 'Creating file',
	'uploadFile'	: 'Uploading file',
	'renameFile'	: 'Renaming file',
	'deleteFile'	: 'Deleting file',
	'init'			: 'Initialising',
	'stop'			: 'Stopping'
};
},{"../console":14,"./View":13}],4:[function(require,module,exports){
var View = require('./View');

class DebugView extends View {
	
	constructor(className, models){
		super(className, models);
		this._debugMode(false);
	}
	
	// UI events
	selectChanged($element, e){
		var data = $element.data();
		var func = data.func;
		if (func && this[func]){
			this[func]($element.val());
		}
	}
	buttonClicked($element, e){
		this.setLocation('');
		this.emit('debugger-event', $element.data().func);
	}
	debugMode(status){
		this.emit('debug-mode', (status==true));
	}
	
	// model events
	_debugMode(status){
		if (!status){
			this.$parents.find('button').prop('disabled', 'disabled');
		}
	}
	// debugger process has started or stopped
	_debugRunning(status){
		this.clearVariableList();
		this.clearBacktrace();
		this.$parents.find('button').prop('disabled', 'disabled');
		if (!status) this.setLocation('n/a');
	}
	// debugger is doing something
	_debugBelaRunning(status){
		if (!status){
			this.$parents.find('button:not(#debugInterrupt)').prop('disabled', '');
			$('#expList, #backtraceList').removeClass('debuggerOutOfScope');
		} else {
			this.$parents.find('button:not(#debugInterrupt)').prop('disabled', 'disabled');
			$('#expList, #backtraceList').addClass('debuggerOutOfScope');
		}
	}
	_debugInterruptable(status){
		if (status) $('#debugInterrupt').prop('disabled', '');
		else $('#debugInterrupt').prop('disabled', 'disabled');
	}
	_debugStatus(value, data){
		if (value) this.setStatus(value);
	}
	_debugReason(value){
		this.setStatus($('#debuggerStatus').html()+', '+value);
	}
	_debugLine(line, data){
		var location = '';
		if (data.debugFile)
			location += data.debugFile+', line ';
		
		if (data.debugLine)
			location += data.debugLine;
		
		this.setLocation(location);
	}
	_variables(variables){
		console.log(variables);
		this.clearVariableList();
		for (let variable of variables){
			this.addVariable($('#expList'), variable);
		}
		prepareList();
	}
	_backtrace(trace){
		this.clearBacktrace();
		for (let item of trace){
			$('<li></li>').text(item).appendTo($('#backtraceList'));
		}
	}
	
	// utility methods
	setStatus(value){
		$('#debuggerStatus').html(value);
	}
	setLocation(value){
		$('#debuggerLocation').html(value);
	}
	clearVariableList(){
		$('#expList').empty();
	}
	clearBacktrace(){
		$('#backtraceList').empty();
	}
	addVariable(parent, variable){
		var name;
		if (variable.key) 
			name = variable.key;
		else {
			name = variable.name.split('.');
			if (name.length) name = name[name.length-1];
		}
		//console.log('adding variable', name, variable);
		var li = $('<li></li>');
		var table = $('<table></table>').appendTo(li);
		$('<td></td>').text(variable.type).addClass('debuggerType').appendTo(table);
		$('<td></td>').text(name).addClass('debuggerName').appendTo(table);
		var valTD = $('<td></td>').text(variable.value).addClass('debuggerValue').appendTo(table);
		li.attr('id', variable.name).appendTo(parent);
		if (variable.numchild && variable.children && variable.children.length){
			var ul = $('<ul></ul>').appendTo(li);
			for (let child of variable.children){
				this.addVariable(ul, child);
			}
		}
		if (variable.value == undefined){
			li.addClass('debuggerOutOfScope');
			valTD.text('out of scope');
		}
	}
}

module.exports = DebugView;

function prepareList() {
    $('#expList').find('li:has(ul)').each(function(){
    	var $this = $(this);
    	if (!$this.hasClass('collapsed')){
    		$this.click( function(event) {
				$(this).toggleClass('expanded');
				$(this).children('ul').toggle('fast');
				return false;
			})
			.addClass('collapsed')
			.children('ul').hide();
    	}
    });
    
};










},{"./View":13}],5:[function(require,module,exports){
var View = require('./View');

var apiFuncs = ['setup', 'render', 'cleanup', 'Bela_createAuxiliaryTask', 'Bela_scheduleAuxiliaryTask'];

class DocumentationView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.on('init', this.init);
	}
	
	init(){
		
		// The API
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=Bela_8h",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				for (let item of apiFuncs){
					var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains('+item+'))'), 'APIDocs'+counter);
					li.appendTo($('#APIDocs'));
					counter += 1;
				}
			}
		});
		
		// The Audio Context
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=structBelaContext",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'contextDocs'+counter);
					li.appendTo($('#contextDocs'));
					counter += 1;
				});
			}
		});
		
		// Utilities
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=Utilities_8h",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'utilityDocs'+counter);
					li.appendTo($('#utilityDocs'));
					counter += 1;
				});
			}
		});
		
	}
	
}

module.exports = DocumentationView;

function createlifrommemberdef($xml, id){
	var li = $('<li></li>');
	li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
	li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html($xml.find('name').html()));
	
	var content = $('<div></div>');
	
	// title
	content.append($('<h2></h2>').html( $xml.find('definition').html() + $xml.find('argsstring').html() ));
	
	// subtitle
	content.append($('<h3></h3>').html( $xml.find('briefdescription > para').html() || '' ));
	
	// main text
	content.append($('<p></p>').html( $xml.find('detaileddescription > para').html() || '' ));

	li.append(content);
	return li;
}
},{"./View":13}],6:[function(require,module,exports){
var View = require('./View');
var Range = ace.require('ace/range').Range;

const uploadDelay = 50;

var uploadBlocked = false;
var currentFile;

class EditorView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.editor = ace.edit('editor');
		ace.require("ace/ext/language_tools");
		
		// set syntax mode
		this.editor.session.setMode('ace/mode/c_cpp');
		this.editor.$blockScrolling = Infinity;
		
		// set theme
		this.editor.setTheme("ace/theme/github");
		
		// autocomplete settings
		this.editor.setOptions({
			enableBasicAutocompletion: true,
			enableLiveAutocompletion: false,
			enableSnippets: true
		});
		
		// this function is called when the user modifies the editor
		this.editor.session.on('change', (e) => {
			//console.log('upload', !uploadBlocked);
			if (!uploadBlocked) this.editorChanged();
		});
		
		// set/clear breakpoints when the gutter is clicked
		this.editor.on("guttermousedown", (e) => { 
			var target = e.domEvent.target; 
			if (target.className.indexOf("ace_gutter-cell") == -1) 
				return; 
			if (!this.editor.isFocused()) 
				return; 
			if (e.clientX > 25 + target.getBoundingClientRect().left) 
				return; 

			var row = e.getDocumentPosition().row;

			this.emit('breakpoint', row);

			e.stop();

		});
		
		this.on('resize', () => this.editor.resize() );
		
	}
	
	editorChanged(){
		clearTimeout(this.uploadTimeout);
		this.uploadTimeout = setTimeout( () => this.emit('change', this.editor.getValue()), uploadDelay );
	}
	
	// model events
	// new file saved
	_fileData(data, opts){
	
		if (data instanceof ArrayBuffer){
			//console.log('arraybuffer');
			try{
				data = String.fromCharCode.apply(null, new Uint8Array(data));
			}
			catch(e){
				console.log(e);
				return;
			}
		}
		
		// block upload
		uploadBlocked = true;
		
		// put the file into the editor
		this.editor.session.setValue(data, -1);
		
		// unblock upload
		uploadBlocked = false;

		// force a syntax check
		this.emit('change');
	
		// focus the editor
		this._focus(opts.focus);
		
	}
	// editor focus has changed
	_focus(data){

		if (data && data.line !== undefined && data.column !== undefined)
			this.editor.gotoLine(data.line, data.column);
			
		this.editor.focus();
	}
	// syntax errors in current file have changed
	_currentFileErrors(errors){

		// clear any error annotations on the ace editor
		this.editor.session.clearAnnotations();

		if (errors.length >= 1){		
			// errors exist!
			// annotate the errors in this file
			this.editor.session.setAnnotations(errors);
						
		}
	}	
	// autocomplete settings have changed
	_liveAutocompletion(status){
	//console.log(status, (parseInt(status) === 1));
		this.editor.setOptions({
			enableLiveAutocompletion: (parseInt(status) === 1)
		});
	}
	// readonly status has changed
	_readOnly(status){
		if (status){
			this.editor.setReadOnly(true);
		} else {
			this.editor.setReadOnly(false);
		}
	}
	// a new file has been opened
	_fileName(name, data){
		currentFile = name;
		this.__breakpoints(data.breakpoints, data);
	}
	// breakpoints have been changed
	__breakpoints(breakpoints, data){
		//console.log('setting breakpoints', breakpoints);
		this.editor.session.clearBreakpoints();
		for (let breakpoint of breakpoints){
			if (breakpoint.file === data.fileName){
				this.editor.session.setBreakpoint(breakpoint.line);
			}
		}
	}
	// debugger highlight line has changed
	__debugLine(line, data){
	console.log(line, data.debugFile, currentFile);
		this.removeDebuggerMarker();
		
		// add new marker at line
		if (line && data.debugFile === currentFile){
			this.editor.session.addMarker(new Range(line-1, 0, line-1, 1), "breakpointMarker", "fullLine");
			this.editor.gotoLine(line, 0);
		}
	}
	// debugger process has started or stopped
	_debugRunning(status){
		if (!status){
			this.removeDebuggerMarker();
		}
	}
	_debugBelaRunning(status){
		if (status){
			this.removeDebuggerMarker();
		}
	}
	
	removeDebuggerMarker(){
		var markers = this.editor.session.getMarkers();
		
		// remove existing marker
		Object.keys(markers).forEach( (key,index) => {
			if (markers[key].clazz === 'breakpointMarker'){
				this.editor.session.removeMarker(markers[key].id);
			}
		});
	}
}

module.exports = EditorView;
},{"./View":13}],7:[function(require,module,exports){
var View = require('./View');

var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];

class FileView extends View {
	
	constructor(className, models){
		super(className, models);
		
		// hack to upload file
		$('#uploadFileInput').on('change', (e) => {
			for (let file of e.target.files){
				var reader = new FileReader();
				reader.onload = (ev) => this.emit('message', 'project-event', {func: 'uploadFile', newFile: file.name, fileData: ev.target.result} );
				reader.readAsArrayBuffer(file);
			}
		});
		
		// drag and drop file upload on editor
		$('#editor').on('dragenter dragover drop', (e) => {
			e.stopPropagation();
			if (e.type === 'drop'){
				for (let file of e.originalEvent.dataTransfer.files){
					var reader = new FileReader();
					reader.onload = (ev) => this.emit('message', 'project-event', {func: 'uploadFile', newFile: file.name, fileData: ev.target.result} );
					reader.readAsArrayBuffer(file);
				}
			}
			return false;
		});
	
	}
	
	// UI events
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	newFile(func){
		var name = prompt("Enter the name of the new file");
		if (name !== null){
			this.emit('message', 'project-event', {func, newFile: name})
		}
	}
	uploadFile(func){
		$('#uploadFileInput').trigger('click');
	}
	renameFile(func){
		var name = prompt("Enter the new name of the file");
		if (name !== null){
			this.emit('message', 'project-event', {func, newFile: name})
		}
	}
	deleteFile(func){
		var cont = confirm("This can't be undone! Continue?");
		if (cont){
			this.emit('message', 'project-event', {func})
		}
	}
	openFile(e){
		this.emit('message', 'project-event', {func: 'openFile', newFile: $(e.currentTarget).html()})
	}
	
	// model events
	_fileList(files, data){

		var $files = $('#fileList')
		$files.empty();

		var headers = [];
		var sources = [];
		var resources = [];
		
		for (let i=0; i<files.length; i++){
			
			let ext = files[i].split('.')[1];
			
			if (sourceIndeces.indexOf(ext) !== -1){
				sources.push(files[i]);
			} else if (headerIndeces.indexOf(ext) !== -1){
				headers.push(files[i]);
			} else if (files[i]){
				resources.push(files[i]);
			}
			
		}
		
		headers.sort();
		sources.sort();
		resources.sort();
				
		if (headers.length){
			$('<li></li>').html('Headers:').appendTo($files);
		}
		for (let i=0; i<headers.length; i++){
			$('<li></li>').addClass('sourceFile').html(headers[i]).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (sources.length){
			$('<li></li>').html('Sources:').appendTo($files);
		}
		for (let i=0; i<sources.length; i++){
			$('<li></li>').addClass('sourceFile').html(sources[i]).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (resources.length){
			$('<li></li>').html('Resources:').appendTo($files);
		}
		for (let i=0; i<resources.length; i++){
			$('<li></li>').addClass('sourceFile').html(resources[i]).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (data && data.fileName) this._fileName(data.fileName);
	}
	_fileName(file, data){

		// select the opened file in the file manager tab
		$('.selectedFile').removeClass('selectedFile');
		$('#fileList>li').each(function(){
			if ($(this).html() === file){
				$(this).addClass('selectedFile');
			}
		});
		
		if (data && data.currentProject){
			// set download link
			$('#downloadFileLink').attr('href', '/download?project='+data.currentProject+'&file='+file);
		}
	}
	
}

module.exports = FileView;
},{"./View":13}],8:[function(require,module,exports){
'use strict';
var View = require('./View');

class GitView extends View{

	constructor(className, models, settings){
		super(className, models, settings);		

		/*this.form = document.getElementById('beaglert-consoleForm');
		this.input = document.getElementById('beaglert-consoleInput');
		
		// console command line input events
		this.form.addEventListener('submit', (e) => {
			e.preventDefault();
			this.emit('input', this.input.value);
			this.input.value = '';
		});*/
	}
	
	buttonClicked($element, e){
		var func = $element.data().func;
		if (this[func]){
			this[func]();
			return;
		}
		var command = $element.data().command;
		this.emit('git-event', {func, command});
	}
	
	selectChanged($element, e){
		this.emit('git-event', {
			func: 'command',
			command: 'checkout ' + ($("option:selected", $element).data('hash') || $("option:selected", $element).val())
		});
	}
	
	commit(){
		var message = prompt('enter a commit message');
		this.emit('git-event', {func: 'command', command: 'commit -am "'+message+'"'});
	}
	branch(){
		var message = prompt('enter a name for the new branch');
		this.emit('git-event', {func: 'command', command: 'checkout -b '+message});
	}
	
	_repoExists(exists){
		console.log('REPO', exists);
		if (exists){
			$('#repo').css('display', 'block');
			$('#noRepo').css('display', 'none');
		} else {
			$('#repo').css('display', 'none');
			$('#noRepo').css('display', 'block');
		}
	}
	__commits(commits, git){

		var commits = commits.split('\n');
		var current = git.currentCommit.trim();
		var branches = git.branches.split('\n');
		
		// fill commits menu
		var $commits = $('#commits');
		$commits.empty();

		var commit, hash, opt;
		for (var i=0; i<commits.length; i++){
			commit = commits[i].split(' ');
			if (commit.length > 2){
				hash = commit.pop().trim();
				opt = $('<option></option>').html(commit.join(' ')).data('hash', hash).appendTo($commits);
				if (hash === current){
					$(opt).attr('selected', 'selected');
				}
			} else {
				//$('<option></option>').html(commit).appendTo($commits);
				if (commit !== ['']) console.log('skipped commit', commit);
			}
		}
		
		// fill branches menu
		var $branches = $('#branches');
		$branches.empty();
		
		for (var i=0; i<branches.length; i++){
			if (branches[i]){
				opt = $('<option></option>').html(branches[i]).appendTo($branches);
				if (branches[i][0] === '*'){
					$(opt).attr('selected', 'selected');
				}
			}
		}
	}
	__stdout(text){
		this.emit('console', text);
	}
	__stderr(text){
		this.emit('console', text);
	}
	
}

module.exports = GitView;

},{"./View":13}],9:[function(require,module,exports){
var View = require('./View');

class ProjectView extends View {
	
	constructor(className, models){
		super(className, models);
	}
	
	// UI events
	selectChanged($element, e){
		//console.log($element.prop('id'));
		//if ($element.prop('id') === 'projects'){
			this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.val()})
		//} else if ($element.prop('id') === 'examples'){
			//this.emit('message', 'example-event', {func: $element.data().func, example: $element.val()})
		//}
	}
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	newProject(func){
		var name = prompt("Enter the name of the new project");
		if (name !== null){
			this.emit('message', 'project-event', {func, newProject: name})
		}
	}
	saveAs(func){
		var name = prompt("Enter the name of the new project");
		if (name !== null){
			this.emit('message', 'project-event', {func, newProject: name})
		}
	}
	deleteProject(func){
		var cont = confirm("This can't be undone! Continue?");
		if (cont){
			this.emit('message', 'project-event', {func})
		}
	}
	cleanProject(func){
		this.emit('message', 'project-event', {func});
	}
	
	// model events
	_projectList(projects, data){

		var $projects = $('#projects');
		$projects.empty();
		
		// add an empty option to menu and select it
		var opt = $('<option></option>').attr({'value': '', 'selected': 'selected'}).html('--Projects--').appendTo($projects);

		// fill project menu with projects
		for (let i=0; i<projects.length; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				var opt = $('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
			}
		}
		
		if (data && data.currentProject) this._currentProject(data.currentProject);
		
	}
	_exampleList(examples){
	
		var $examples = $('#examples');
		$examples.empty();
		
		// add an empty option to menu and select it
		var opt = $('<option></option>').attr({'value': '', 'selected': 'selected'}).html('--Examples--').appendTo($examples);
		
		// fill project menu with examples
		for (let i=0; i<examples.length; i++){
			if (examples[i] && examples[i] !== 'undefined' && examples[i] !== 'exampleTempProject' && examples[i][0] !== '.'){
				var opt = $('<option></option>').attr('value', examples[i]).html(examples[i]).appendTo($examples);
			}
		}
		
	}
	_currentProject(project){
	
		// unselect currently selected project
		$('#projects').find('option').filter(':selected').attr('selected', '');
		
		if (project === 'exampleTempProject'){
			// select no project
			$('#projects').val($('#projects > option:first').val())
		} else {
			// select new project
			$('#projects option[value="'+project+'"]').attr('selected', 'selected');
			// unselect currently selected example
			$('#examples').val($('#examples > option:first').val())
		}
		
		// set download link
		$('#downloadLink').attr('href', '/download?project='+project);
	}
	
}

module.exports = ProjectView;
},{"./View":13}],10:[function(require,module,exports){
var View = require('./View');

class SettingsView extends View {
	
	constructor(className, models, settings){
		super(className, models, settings);
		//this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.settings.on('change', (data) => this._IDESettings(data) );
		this.$elements.filterByData = function(prop, val) {
			return this.filter(
				function() { return $(this).data(prop)==val; }
			);
		}
	}
	
	selectChanged($element, e){
		var data = $element.data();
		var func = data.func;
		var key = data.key;
		if (func && this[func]){
			this[func](func, key, $element.val());
		}
	}
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	inputChanged($element, e){
		var data = $element.data();
		var func = data.func;
		var key = data.key;
		var type = $element.prop('type');
		if (type === 'number' || type === 'text'){
			if (func && this[func]){
				this[func](func, key, $element.val());
			}
		} else if (type === 'checkbox'){
			if (func && this[func]){
				this[func](func, key, $element.is(':checked') ? 1 : 0);
			}
		}
	}
	
	setCLArg(func, key, value){
		this.emit('project-settings', {func, key, value});
	}
	restoreDefaultCLArgs(func){
		this.emit('project-settings', {func});
	}
	
	setIDESetting(func, key, value){
	console.log(func, key, value);
		this.emit('IDE-settings', {func, key, value: value});
	}
	restoreDefaultIDESettings(func){
		this.emit('IDE-settings', {func});
	}
	
	// model events
	_CLArgs(data){
		var fullString = '';
		for (let key in data){
			this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
			fullString += ((key === 'user') ? '' : key)+data[key]+' ';
		}
		$('#C_L_ARGS').val(fullString);
	}
	_IDESettings(data){
		for (let key in data){
			this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
		}
	}
	_breakpoints(value, keys){
		this.emit('project-settings', {func: 'setBreakpoints', value});
	}
}

module.exports = SettingsView;
},{"./View":13}],11:[function(require,module,exports){
var View = require('./View');

// private variables
var _tabsOpen = false;

class TabView extends View {
	
	constructor(){
	
		super('tab');

		// open/close tabs 
		$('#flexit').on('click', () => {
			//console.log("CLICKY");
			if (_tabsOpen){
				this.closeTabs();
			} else {
				this.openTabs();
			}
		});

		$('label').on('click', (e) => {
			if (!_tabsOpen){
				this.openTabs();
				e.stopPropagation();
			}
		});
		
		// golden layout
		var layout = new GoldenLayout({
			settings:{
				hasHeaders: false,
				constrainDragToContainer: true,
				reorderEnabled: false,
				selectionEnabled: false,
				popoutWholeStack: false,
				blockedPopoutsThrowError: true,
				closePopoutsOnUnload: true,
				showPopoutIcon: false,
				showMaximiseIcon: false,
				showCloseIcon: false
			},
			dimensions: {
				borderWidth: 5,
				minItemHeight: 10,
				minItemWidth: 10,
				headerHeight: 20,
				dragProxyWidth: 300,
				dragProxyHeight: 200
			},
			labels: {
				close: 'close',
				maximise: 'maximise',
				minimise: 'minimise',
				popout: 'open in new window'
			},
			content: [{
				type: 'column',
				content: [{
					type:'row',
					content: [{
						type:'component',
						componentName: 'Editor',
					}]
				}, {
					type:'component',
					componentName: 'Console',
					height: 25
				}]
			}]
		});
		layout.registerComponent( 'Editor', function( container, componentState ){
			container.getElement().append($('#innerContent'));
		});
		layout.registerComponent( 'Console', function( container, componentState ){
			container.getElement().append($('#beaglert-console'));
		});
		
		layout.init();
		layout.on('initialised', () => this.emit('change') );
		layout.on('stateChanged', () => this.emit('change') );
		
		$(window).on('resize', () => {
			if (_tabsOpen){
				this.openTabs();
			} else {
				this.closeTabs();
			}
		});
		
	}
	
	openTabs(){
		$('#editor').css('right', '500px');
		$('#right').css('left', window.innerWidth - 500 + 'px');
		_tabsOpen = true;
		this.emit('change');
		$('#tab-0').addClass('open');
	}

	closeTabs(){
		$('#editor').css('right', '60px');
		$('#right').css('left', window.innerWidth - 60 + 'px');
		_tabsOpen = false;
		this.emit('change');
		$('#tab-0').removeClass('open');
	}
	
}

module.exports = new TabView();
},{"./View":13}],12:[function(require,module,exports){
var View = require('./View');

class ToolbarView extends View {
	
	constructor(className, models){
		super(className, models);
		console.log(this.$elements);
		this.$elements.on('click', (e) => this.buttonClicked($(e.currentTarget), e));
		
		$('#run')
			.mouseover(function() {
				$('#control-text-1').html('<p>Run</p>');
			})
			.mouseout(function() {
				$('#control-text-1').html('');
			});
		
		$('#stop')
			.mouseover(function() {
				$('#control-text-1').html('<p>Stop</p>');
			})
			.mouseout(function() {
				$('#control-text-1').html('');
			});

		$('#new-tab')
			.mouseover(function() {
				$('#control-text-2').html('<p>New Tab</p>');
			})
			.mouseout(function() {
				$('#control-text-2').html('');
			});
		
		$('#download')
			.mouseover(function() {
				$('#control-text-2').html('<p>Download project</p>');
			})
			.mouseout(function() {
				$('#control-text-2').html('');
			});

		$('#console')
			.mouseover(function() {
				$('#control-text-3').html('<p>Clear console</p>');
			})
			.mouseout(function() {
				$('#control-text-3').html('');
			});
		
		$('#scope')
			.mouseover(function() {
				$('#control-text-3').html('<p>Open scope</p>');
			})
			.mouseout(function() {
				$('#control-text-3').html('');
			});
	}
	
	// UI events
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	run(func){
		this.emit('process-event', func);
	}
	
	stop(func){
		this.emit('process-event', func);
	}
	
	clearConsole(){
		this.emit('clear-console');
	}
	
	// model events
	__running(status){
		if (status){
			if (!$('#run').hasClass('spinning')){
				$('#run').addClass('spinning');
			}
		} else {
			if ($('#run').hasClass('spinning')){
				$('#run').removeClass('spinning');
			}
		}
	}
	__checkingSyntax(status){
		if (status){
			$('#status').css('background', 'url("images/toolbar.png") -210px 35px');
		} else {
			//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
		}
	}
	__allErrors(errors){
		//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout); 
		if (errors.length){
			$('#status').css('background', 'url("images/toolbar.png") -175px 35px');
		} else {
			$('#status').css('background', 'url("images/toolbar.png") -140px 35px');
		}
	}
	
	_CPU(data){

		var ide = data.syntaxCheckProcess + data.buildProcess + data.node + data.gdb;
		var bela = 0;
		
		if (data.bela != 0){
		
			// extract the data from the output
			var lines = data.bela.split('\n');
			var taskData = [], output = [];
			for (var j=0; j<lines.length; j++){
				taskData.push([]);
				lines[j] = lines[j].split(' ');
				for (var k=0; k<lines[j].length; k++){
					if (lines[j][k]){
						taskData[j].push(lines[j][k]);
					}
				}
			}
				
			for (var j=0; j<taskData.length; j++){
				if (taskData[j].length){
					var proc = {
						'name'	: taskData[j][7],
						'cpu'	: taskData[j][6],
						'msw'	: taskData[j][2],
						'csw'	: taskData[j][3]
					};
					// ignore uninteresting data
					if (proc && proc.name && proc.name !== 'ROOT' && proc.name !== 'NAME' && proc.name !== 'IRQ29:'){
						output.push(proc);
					}
				}
			}
	
			for (var j=0; j<output.length; j++){
				if (output[j].cpu){
					bela += parseFloat(output[j].cpu);
				}
			}
				
		
		}

		$('#ide-cpu').html('IDE: '+ide.toFixed(1)+'%');
		$('#bela-cpu').html('Bela: '+bela.toFixed(1)+'%');
	}
	
	_cpuMonitoring(value){
		if (parseInt(value))
			$('#ide-cpu, #bela-cpu').css('visibility', 'visible');
		else
			$('#ide-cpu, #bela-cpu').css('visibility', 'hidden');
	}
	
	_debugBelaRunning(status){
		if (status){
			if (!$('#run').hasClass('spinning')){
				$('#run').addClass('spinning');
			}
		} else {
			if ($('#run').hasClass('spinning')){
				$('#run').removeClass('spinning');
			}
		}
	}
	_debugRunning(status){
		if (!status && $('#run').hasClass('spinning'))  $('#run').removeClass('spinning');
	}
	
}

module.exports = ToolbarView;
},{"./View":13}],13:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;

class View extends EventEmitter{

	constructor(CSSClassName, models, settings){
		super();
		this.className = CSSClassName;
		this.models = models;
		this.settings = settings;
		this.$elements = $('.'+CSSClassName);
		this.$parents = $('.'+CSSClassName+'-parent');
		
		if (models){
			for (var i=0; i<models.length; i++){
				models[i].on('change', (data, changedKeys) => {
					this.modelChanged(data, changedKeys);
				});
				models[i].on('set', (data, changedKeys) => {
					this.modelSet(data, changedKeys);
				});
			}
		}
		
		this.$elements.filter('select').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.$elements.filter('input').on('input', (e) => this.inputChanged($(e.currentTarget), e));
		this.$elements.filter('input[type=checkbox]').on('change', (e) => this.inputChanged($(e.currentTarget), e));
		this.$elements.filter('button').on('click', (e) => this.buttonClicked($(e.currentTarget), e));
		
	}
	
	modelChanged(data, changedKeys){
		for (let value of changedKeys){
			if (this['_'+value]){
				this['_'+value](data[value], data, changedKeys);
			}
		}
	}
	modelSet(data, changedKeys){
		for (let value of changedKeys){
			if (this['__'+value]){
				this['__'+value](data[value], data, changedKeys);
			}
		}
	}
	
	selectChanged(element, e){}
	buttonClicked(element, e){}
	
	printElements(){
		console.log('elements:', this.$elements, 'parents:', this.$parents);
	}
		
}

module.exports = View;
},{"events":16}],14:[function(require,module,exports){
'use strict';
var EventEmitter = require('events').EventEmitter;
//var $ = require('jquery-browserify');

// module variables
var numElements = 0, maxElements = 200, consoleDelete = true;

class Console extends EventEmitter {

	constructor(){
		super();
		this.$element = $('#beaglert-consoleWrapper');
		this.parent = document.getElementById('beaglert-console');
	}
	
	print(text, className, id, onClick){
		var el = $('<div></div>').addClass('beaglert-console-'+className).appendTo(this.$element);
		if (id) el.prop('id', id);
		$('<span></span>').html(text).appendTo(el);
		if (numElements++ > maxElements) this.clear(numElements/4);
		if (onClick) el.on('click', onClick);
		return el;
	}

	// log an unhighlighted message to the console
	log(text){
		var msgs = text.split('\n');
		for (let i=0;  i<msgs.length; i++){
			if (msgs[i] !== '' && msgs[i] !== ' '){
				this.print(msgs[i], 'log');
			}
		}
		this.scroll();
	}
	// log a warning message to the console
	warn(text, id){
		var msgs = text.split('\n');
		for (let i=0;  i<msgs.length; i++){
			if (msgs[i] !== ''){
				this.print(msgs[i], 'warning', id, function(){ 
					var $el = $(this);
					$el.addClass('beaglert-console-collapsed');
					$el.on('transitionend', () => {
						if ($el.hasClass('beaglert-console-collapsed')){
							$el.remove();
						} else {
							$el.addClass('beaglert-console-collapsed');
						}
					});
				});
			}
		}
		this.scroll();
	}
	
	newErrors(errors){
	
		$('.beaglert-console-ierror, .beaglert-console-iwarning').remove();
		
		for (let err of errors){
		
			// create the element and add it to the error object
			var div = $('<div></div>').addClass('beaglert-console-i'+err.type)
			
			// create the link and add it to the element
			var anchor = $('<a></a>').html(err.text).appendTo(div);
			
			div.appendTo(this.$element);
			
			if (err.currentFile){
				div.on('click', () => this.emit('focus', {line: err.row+1, column: err.column-1}) );
			} else {
				div.on('click', () => this.emit('open-file', err.file, {line: err.row+1, column: err.column-1}) );
			}
			
		}
		this.scroll();
	}
	
	// log a positive notification to the console
	// if persist is not true, the notification will be removed quickly
	// otherwise it will just fade
	notify(notice, id){
		$('#'+id).remove();
		var el = this.print(notice, 'notify', id);
		this.scroll();
		return el;
	}
	
	fulfill(message, id, persist){
		var el = document.getElementById(id);
		//if (!el) el = this.notify(message, id);
		var $el = $(el);
		$el.appendTo(this.$element);//.removeAttr('id');
		$el.html($el.html()+message);
		setTimeout( () => $el.addClass('beaglert-console-faded'), 500);
		if (!persist){
			$el.on('transitionend', () => {
				if ($el.hasClass('beaglert-console-collapsed')){
					$el.remove();
				} else {
					$el.addClass('beaglert-console-collapsed');
				}
			});
		}
	}
	
	reject(message, id, persist){
		var el = document.getElementById(id);
		//if (!el) el = this.notify(message, id);
		var $el = $(el);
		$el.appendTo(this.$element);//.removeAttr('id');
		$el.html($el.html()+message);
		$el.addClass('beaglert-console-rejectnotification');
		setTimeout( () => $el.removeClass('beaglert-console-rejectnotification').addClass('beaglert-console-faded'), 500);
		$el.on('click', () => $el.addClass('beaglert-console-collapsed').on('transitionend', () => $el.remove() ));
	}
	
	// clear the console
	clear(number){
		if (!consoleDelete) return;
		if (number){
			$("#beaglert-consoleWrapper > div:lt("+parseInt(number)+")").remove();
			numElements -= parseInt(number);
		} else {
			$('#beaglert-consoleWrapper > div').remove();
			numElements = 0;
		}
	}
	
	// force the console to scroll to the bottom
	scroll(){
		setTimeout((() => this.parent.scrollTop = this.parent.scrollHeight), 0);
	}
	
	setConsoleDelete(to){
		consoleDelete = to;
	}
	
};

module.exports = new Console();

// gracefully remove a console element after an event ((this) must be bound to the element)
/*function dismiss(){
	if (IDE.getSetting('consoleAnimations')) $(this).addClass('beaglert-console-collapsed');
	setTimeout(() => {
		if ($.contains(parent, this)){
			$(this).remove();
			numElements -= 1;
		}
	}, 500);
}*/
},{"events":16}],15:[function(require,module,exports){
//var $ = require('jquery-browserify');
var IDE;

$(() => {
	IDE = require('./IDE-browser');
});


},{"./IDE-browser":1}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[15])


//# sourceMappingURL=bundle.js.map
