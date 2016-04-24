'use strict';
var EventEmitter = require('events').EventEmitter;
var $ = require('jquery-browserify');

// module variables
var numElements = 0, maxElements = 200;

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
		if (numElements++ > maxElements) clear();
		if (onClick) el.on('click', onClick);
		return el;
	}

	// log an unhighlighted message to the console
	log(text){
		var msgs = text.split('\n');
		for (let i=0;  i<msgs.length; i++){
			if (msgs[i] !== ''){
				this.print(msgs[i], 'log');
			}
		}
		this.scroll();
	}
	
	// log a positive notification to the console
	// if persist is not true, the notification will be removed quickly
	// otherwise it will just fade
	/*notify(notice, persist){
	
		var el = print(notice, 'notify', null, dismiss);

		if (IDE.getSetting('consoleAnimations')){
			setTimeout(function(){
				if (persist){
					el.addClass('beaglert-console-faded');
				} else {
					el.addClass('beaglert-console-collapsed');
					setTimeout(function(){
						if ($.contains($element, el)){
							$element.removeChild(el);
						}
					}, 500);
				}
			}, 1000);
		}
		
		scroll();
	}*/
	
	// force the console to scroll to the bottom
	scroll(){
		setTimeout(() => this.parent.scrollTop = this.parent.scrollHeight, 0);
	}
	
};

module.exports = new Console();

// gracefully remove a console element after an event ((this) must be bound to the element)
function dismiss(){
	if (IDE.getSetting('consoleAnimations')) $(this).addClass('beaglert-console-collapsed');
	setTimeout(() => {
		if ($.contains(parent, this)){
			$(this).remove();
			numElements -= 1;
		}
	}, 500);
}