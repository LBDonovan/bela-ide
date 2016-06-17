'use strict';
var View = require('./View');
var _console = require('../console');

var verboseDebugOutput = false;

var shellCWD = '~';

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
		this.history = [];
		this.historyIndex = 0;
		this.inputFocused = false;
		
		this.form.addEventListener('submit', (e) => {
			e.preventDefault();
			
			this.history.push(this.input.value);
			this.historyIndex = 0;
		
			this.emit('input', this.input.value);
			this.emit('log', shellCWD + ' ' + this.input.value);
			this.input.value = '';
		});
	
		this.input.addEventListener('focus', () => {
			this.inputFocused = true;
		});
		this.input.addEventListener('blur', () => {
			this.inputFocused = false;
		});
		window.addEventListener('keydown', (e) => {
			if (this.inputFocused && e.keyIdentifier === 'Up'){
				if (this.history[this.history.length - ++this.historyIndex]){
					this.input.value = this.history[this.history.length - this.historyIndex];
				} else {
					this.historyIndex -= 1;
				}
			} else if (this.inputFocused && e.keyIdentifier === 'Down'){
				if (--this.historyIndex === 0){
					this.input.value = '';
				} else if (this.history[this.history.length - this.historyIndex]){
					this.input.value = this.history[this.history.length - this.historyIndex];
				} else {
					this.historyIndex += 1;
				}	
			}
		});
		
		this.on('cwd', cwd => {
			console.log('cwd', cwd);
			shellCWD = 'root@arm ' + cwd.replace('/root', '~') + '#';
			$('#beaglert-consoleInput-pre').html(shellCWD);
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
	
	connect(){
		$('#console-disconnect').remove();
		_console.unblock();
	}
	disconnect(){
		console.log('disconnected');
		_console.warn('You have been disconnected from the Bela IDE and any more changes you make will not be saved. Please check your USB connection and reboot your BeagleBone', 'console-disconnect');
		_console.block();
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