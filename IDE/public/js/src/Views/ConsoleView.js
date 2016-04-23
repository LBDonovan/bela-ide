'use strict';
var View = require('./View');

class ConsoleView extends View{
	constructor(className, models){
		super(className, models);
	}
	
	// model events
	_checkingSyntax(status){
		if (status){
			console.log('checking syntax');
		} else {
			console.log('not checking syntax');
		}
	}
	_building(status){
		if (status){
			console.log('building');
		} else {
			console.log('not building');
		}
	}
	_running(status){
		if (status){
			console.log('running');
		} else {
			console.log('not running');
		}
	}
}

module.exports = ConsoleView;