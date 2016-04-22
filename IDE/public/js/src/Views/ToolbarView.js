var View = require('./View');

class ToolbarView extends View {
	
	constructor(className, models){
		super(className, models);
		this.$elements.filter('span').on('click', (e) => this.buttonClicked($(e.currentTarget), e));
	}
	
	// UI events
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	run(func){
		this.emit('process-event', func);
	}
	
	stop(func){
		this.emit('process-event', func);
	}
	
	// model events
	
}

module.exports = ToolbarView;