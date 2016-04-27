'use strict';
var View = require('./View');
var _console = require('../console');

class ConsoleView extends View{

	constructor(className, models, settings){
		super(className, models, settings);
		this.on('clear', () => _console.clear() );
		_console.on('focus', (focus) => this.emit('focus', focus) );
		_console.on('open-file', (fileName, focus) => this.emit('open-file', fileName, focus) );
		
		this.on('openNotification', this.openNotification);
		this.on('closeNotification', this.closeNotification);
		this.on('warn', function(warning){
			_console.warn(warning);
		});
	}
	
	openNotification(data){
		if (!funcKey[data.func]) console.log(data.func);
		_console.notify(funcKey[data.func], data.timestamp);
	}
	closeNotification(data){
		if (data.error){
			_console.reject(' '+data.error, data.timestamp);
		} else {
			_console.fulfill(' done', data.timestamp);
		}
	}
	
	// model events
	// syntax
	_syntaxLog(log, data){
		if (this.settings.fullSyntaxCheckOutput){
			_console.log(log);
		}
	}
	_syntaxError(log, data){
		if (parseInt(this.settings.getKey('IDESettings').verboseErrors)){
			for (let line of log){
				_console.warn(line.split(' ').join('&nbsp;'));
			}
		}
	}
	_F_allErrors(errors, data){
	//console.log(data);
		_console.newErrors(errors);
	}
	
	// build
	_buildLog(log, data){
		//if (this.settings.fullBuildOutput){
			_console.log(log);
		//}
	}
	
	// bela
	_belaLog(log, data){
		_console.log(log);
	}
	
	_building(status){
		if (status){
			_console.notify('Building project...', 'build-notification', true);
		} else {
			_console.fulfill(' done', 'build-notification', true);
		}
	}
	_running(status){
		if (status){
			_console.notify('Running project...', 'run-notification', true);
		} else {
			_console.fulfill(' done', 'run-notification', true);
		}
	}
	
	_CPU(data){
		if (parseInt(this.settings.getKey('IDESettings').cpuMonitoringVerbose) && data.bela != 0){
			_console.log(data.bela.split(' ').join('&nbsp;'));
		}
	}
	
	_IDESettings(settings){
		_console.setConsoleDelete(parseInt(settings.consoleDelete));
	}

	
}

module.exports = ConsoleView;

var funcKey = {
	'openProject'	: 'Opening project...',
	'newProject'	: 'Creating project...',
	'saveAs'		: 'Saving project...',
	'deleteProject'	: 'Deleting project...',
	'cleanProject'	: 'Cleaning project...',
	'openFile'		: 'Opening file...',
	'newFile'		: 'Creating file...',
	'uploadFile'	: 'Uploading file...',
	'renameFile'	: 'Renaming file...',
	'deleteFile'	: 'Deleting file...',
	'init'			: 'Initialising..'
};