'use strict';
var View = require('./View');
var _console = require('../console');

class ConsoleView extends View{

	constructor(className, models, settings){
		super(className, models, settings);
	}
	
	// model events
	// syntax
	_checkingSyntax(status){
		/*if (status){
			_console.log('checking syntax');
		} else {
			_console.log('not checking syntax');
		}*/
	}
	_syntaxLog(log, data){
		if (this.settings.fullSyntaxCheckOutput){
			_console.log(log);
		}
	}
	_syntaxResult(result, data){
		//_console.log('result stdout:', result.stdout, 'stderr', result.stderr);
	}
	
	// build
	_building(status){
		/*if (status){
			_console.log('building');
		} else {
			_console.log('not building');
		}*/
	}
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
	_running(status){
		/*if (status){
			_console.log('running');
		} else {
			_console.log('not running');
		}*/
	}
	_belaLog(log, data){
		_console.log(log);
	}
	_belaResult(result, data){
		//console.log(result.stdout);
		//console.log(result.stderr);
	}
}

module.exports = ConsoleView;