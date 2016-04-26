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
	}
	
	openNotification(data){
		if (!funcKey[data.func]) console.log(data.func);
		_console.notify(funcKey[data.func], data.timestamp);
	}
	closeNotification(data){
		_console.fulfill(' done', data.timestamp);
	}
	
	// model events
	// syntax
	_syntaxLog(log, data){
		if (this.settings.fullSyntaxCheckOutput){
			_console.log(log);
		}
	}
	_allErrors(errors, data){
	//console.log(data);
		_console.newErrors(errors);
	}
	
	// build
	_buildLog(log, data){
		//if (this.settings.fullBuildOutput){
			_console.log(log);
		//}
	}
	_buildResult(result, data){
		if (this.settings.verboseBuildErrors){
			_console.log(result.stderr);
		}
	}
	
	// bela
	_belaLog(log, data){
		_console.log(log);
	}
	_belaResult(result, data){
		//_console.log(result.stdout);
		//_console.log(result.stderr);
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
	'deleteFile'	: 'Deleting file...'
};