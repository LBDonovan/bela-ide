var View = require('./View');

class SettingsView extends View {
	
	constructor(className, models, settings){
		super(className, models, settings);
		//this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.settings.on('change', (data) => this._IDESettings(data) );
		this.$elements.filterByData = function(prop, val) {
			return this.filter(
				function() { return $(this).data(prop)==val; }
			);
		}
		
		$('#runOnBoot').on('change', () => {
			if ($('#runOnBoot').val()) 
				this.emit('run-on-boot', $('#runOnBoot').val());
		});
		
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
	inputChanged($element, e){
		var data = $element.data();
		var func = data.func;
		var key = data.key;
		var type = $element.prop('type');
		if (type === 'number' || type === 'text'){
			if (func && this[func]){
				this[func](func, key, $element.val());
			}
		} else if (type === 'checkbox'){
			if (func && this[func]){
				this[func](func, key, $element.is(':checked') ? 1 : 0);
			}
		}
	}
	
	setCLArg(func, key, value){
		this.emit('project-settings', {func, key, value});
	}
	restoreDefaultCLArgs(func){
		this.emit('project-settings', {func});
	}
	
	setIDESetting(func, key, value){
	console.log(func, key, value);
		this.emit('IDE-settings', {func, key, value: value});
	}
	restoreDefaultIDESettings(func){
		this.emit('IDE-settings', {func});
	}
	
	// model events
	_CLArgs(data){
		var fullString = '';
		for (let key in data){
			this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
			fullString += ((key === 'user') ? '' : key)+data[key]+' ';
		}
		$('#C_L_ARGS').val(fullString);
	}
	_IDESettings(data){
		for (let key in data){
			this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
		}
	}
	_breakpoints(value, keys){
		this.emit('project-settings', {func: 'setBreakpoints', value});
	}
	_projectList(projects, data){

		var $projects = $('#runOnBoot');
		$projects.empty();
		
		// add an empty option to menu and select it
		$('<option></option>').attr({'value': '', 'selected': 'selected'}).html('--select--').appendTo($projects);
		
		// add a 'none' option
		$('<option></option>').attr('value', 'none').html('none').appendTo($projects);

		// fill project menu with projects
		for (let i=0; i<projects.length; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				$('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
			}
		}

		
	}
}

module.exports = SettingsView;