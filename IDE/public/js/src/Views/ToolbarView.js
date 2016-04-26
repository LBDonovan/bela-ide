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
	
	clearConsole(){
		this.emit('clear-console');
	}
	
	// model events
	_running(status){
		if (status){
			if (!$('#run').hasClass('spinning')){
				$('#run').addClass('spinning');
			}
		} else {
			if ($('#run').hasClass('spinning')){
				$('#run').removeClass('spinning');
			}
		}
	}
	_checkingSyntax(status){
		if (status){
			$('#status').css('background', 'url("images/toolbar.png") -210px 35px');
		} else {
			//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
		}
	}
	_allErrors(errors){
		//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout); 
		if (errors.length){
			$('#status').css('background', 'url("images/toolbar.png") -175px 35px');
		} else {
			$('#status').css('background', 'url("images/toolbar.png") -140px 35px');
		}
	}
	
}

module.exports = ToolbarView;