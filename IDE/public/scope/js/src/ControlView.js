'use strict';
var View = require('./View');

class ControlView extends View{

	constructor(className, models){
		super(className, models);
		$('#controlsButton').click(() => this.$parents.toggleClass('hidden') );
			
	}
	
	// UI events
	selectChanged($element, e){
		this.emit('settings-event', $element.data().key, $element.val());
	}
	inputChanged($element, e){
		this.emit('settings-event', $element.data().key, $element.val());
	}
	buttonClicked($element, e){
		this.emit('settings-event', $element.data().key);
	}
	
	// settings model events
	_triggerMode(value){
		console.log('triggerMode', value);
	}
	
	
}

module.exports = ControlView;
