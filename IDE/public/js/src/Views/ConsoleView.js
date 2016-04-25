'use strict';
var View = require('./View');
var _console = require('../console');

class ConsoleView extends View{

	constructor(className, models, settings){
		super(className, models, settings);
		this.on('clear', () => _console.clear() );
	}
	
	// model events
	// syntax
	_syntaxLog(log, data){
		if (this.settings.fullSyntaxCheckOutput){
			_console.log(log);
		}
	}
	_allErrors(errors){
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