var EventEmitter = require('events').EventEmitter;
var $ = require('jquery-browserify');

class View extends EventEmitter{

	constructor(CSSClassName, models){
		super();
		this.className = CSSClassName;
		this.models = models;
		this.$elements = $('.'+CSSClassName);
		this.$parents = $('.'+CSSClassName+'-parent');
		
		if (models){
			for (var i=0; i<models.length; i++){
				models[i].on('change', (data, changedKeys) => {
					this.modelChanged(data, changedKeys);
				});
			}
		}
		
		this.$elements.filter('select').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.$elements.filter('button').on('click', (e) => this.buttonClicked($(e.currentTarget), e));
		
	}
	
	modelChanged(data, changedKeys){
		for (let value of changedKeys){
			if (this['_'+value]){
				this['_'+value](data[value], data);
			}
		}
	}
	
	selectChanged(element, e){}
	buttonClicked(element, e){}
	
	printElements(){
		console.log('elements:', this.$elements, 'parents:', this.$parents);
	}
		
}

module.exports = View;