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
		var key = $element.data().key;
		var value = $element.val();
		this.emit('settings-event', key, value);
		this.$elements.filterByData('key', key).val(value);
	}
	buttonClicked($element, e){
		this.emit('settings-event', $element.data().key);
	}
	
	// settings model events
	modelChanged(data, changedKeys){
		for (let key of changedKeys){
			if (key === 'upSampling' || key === 'downSampling'){
				this['_'+key](data[key], data);
			} else {
				this.$elements.filterByData('key', key).val(data[key].value);
			}
		}
	}
	
	_upSampling(value, data){
		$('.xTime-display').html(data.downSampling.value/data.upSampling.value/data.sampleRate.value);
	}
	_downSampling(value, data){
		$('.xTime-display').html(data.downSampling.value/data.upSampling.value/data.sampleRate.value);
	}
	
	
}

module.exports = ControlView;

$.fn.filterByData = function(prop, val) {
    return this.filter(
        function() { return $(this).data(prop)==val; }
    );
}