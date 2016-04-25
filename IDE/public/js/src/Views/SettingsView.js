var View = require('./View');

class SettingsView extends View {
	
	constructor(className, models){
		super(className, models);
		this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));
	}
	
	selectChanged($element, e){
		var data = $element.data();
		var func = data.func;
		var key = data.key;
		if (func && this[func]){
			this[func](key, $element.val());
		}
	}
	
	projectSettings(key, value){
		this.emit('project-settings', {key, value});
	}
	
	// model events
	_CLArgs(data){
		console.log(data);
		for (let key in data){
			this.$elements.filterByData('key', key).val(data[key]);
		}
	}
}

module.exports = SettingsView;

$.fn.filterByData = function(prop, val) {
    return this.filter(
        function() { return $(this).data(prop)==val; }
    );
}