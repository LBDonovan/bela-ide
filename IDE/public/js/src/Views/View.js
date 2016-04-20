var EventEmitter = require('events').EventEmitter;
var $ = require('jquery-browserify');

// private variables

class View extends EventEmitter{

	constructor(CSSClassName){
		super();
		this.className = CSSClassName;
		this.$elements = $('.'+CSSClassName);
		this.$parents = $('.'+CSSClassName+'-parent');
	}
	
	printElements(){
		console.log('elements:', this.$elements, 'parents:', this.$parents);
	}
		
}

module.exports = View;