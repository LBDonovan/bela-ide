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
		if (parseInt(this.settings.getKey('verboseErrors'))){
			for (let line of log){
				_console.warn(line.split(' ').join('&nbsp;'));
			}
		}
	}
	__allErrors(errors, data){
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
		if (parseInt(this.settings.getKey('cpuMonitoringVerbose')) && data.bela != 0){
			_console.log(data.bela.split(' ').join('&nbsp;'));
		}
	}
	
	_consoleDelete(value){
		_console.setConsoleDelete(parseInt(value));
	}
	
	_reason(reason){
		_console.notify(reason, 'reason', false);
		if (reason === 'exited')
			_console.reject('', 'reason', true);
		else 
			_console.fulfill('', 'reason', false);
	}
	_gdbLog(data){
		console.log(data);
	}
	_belaLog(data){
		_console.log(data);
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
	'init'			: 'Initialising...'
};