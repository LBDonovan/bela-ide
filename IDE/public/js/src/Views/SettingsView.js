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
			this[func](func, key, $element.val());
		}
	}
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	setProjectSetting(func, key, value){
		this.emit('project-settings', {func, key, value});
	}
	restoreDefaultCLArgs(func){
		this.emit('project-settings', {func});
	}
	
	setIDESetting(func, key, value){
		this.emit('IDE-settings', {func, key, value});
	}
	restoreDefaultIDESettings(func){
		this.emit('IDE-settings', {func});
	}
	
	// model events
	_CLArgs(data){
		for (let key in data){
			this.$elements.filterByData('key', key).val(data[key]);
		}
	}
	_IDESettings(data){
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