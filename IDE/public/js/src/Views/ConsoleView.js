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
		this.on('warn', function(warning, id){
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
	'newProject'	: 'Creating project',
	'saveAs'		: 'Saving project',
	'deleteProject'	: 'Deleting project',
	'cleanProject'	: 'Cleaning project',
	'openFile'		: 'Opening file',
	'newFile'		: 'Creating file',
	'uploadFile'	: 'Uploading file',
	'renameFile'	: 'Renaming file',
	'deleteFile'	: 'Deleting file',
	'init'			: 'Initialising'
};