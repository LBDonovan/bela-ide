var View = require('./View');
var popup = require('../popup');

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
		
		// build the popup content
		popup.title('Restoring default project settings');
		popup.subtitle('Are you sure you wish to continue? Your current project settings will be lost!');
		
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('project-settings', {func});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');

	}
	
	setIDESetting(func, key, value){
	console.log(func, key, value);
		this.emit('IDE-settings', {func, key, value: value});
	}
	restoreDefaultIDESettings(func){
		
		// build the popup content
		popup.title('Restoring default IDE settings');
		popup.subtitle('Are you sure you wish to continue? Your current IDE settings will be lost!');
		
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('IDE-settings', {func});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');
		
	}
	
	shutdownBBB(){
	
		// build the popup content
		popup.title('Shutting down Bela');
		popup.subtitle('Are you sure you wish to continue? The BeagleBone will shutdown gracefully, and the IDE will disconnect.');
		
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('halt');
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');
	
	}
	aboutPopup(){
		
		// build the popup content
		popup.title('About Bela');
		popup.subtitle('LLLLow LLLLLatency');
		
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			popup.hide();
		});
				
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');
		
	}
	updateBela(){
	
		// build the popup content
		popup.title('Updating Bela');
		popup.subtitle('Please select the update zip archive');
		
		var form = [];
		form.push('<input id="popup-update-file" type="file">');
		form.push('</br>');
		form.push('<button type="submit" class="button popup-upload">Upload</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');

		/*popup.form.prop({
			action	: 'updates',
			method	: 'get',
			enctype	: 'multipart/form-data'
		});*/
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			
			e.preventDefault();
			
			var file = popup.find('input[type=file]').prop('files')[0];
			if (file && file.type === 'application/zip'){
			
				this.emit('warning', 'beginning the update - this may take several minutes');
				this.emit('warning', 'the browser may become unresponsive and will temporarily disconnect');
				this.emit('warning', 'do not use the IDE during the update process!');
				
				var reader = new FileReader();
				reader.onload = (ev) => this.emit('upload-update', {name: file.name, file: ev.target.result} );
				reader.readAsArrayBuffer(file);
				
			} else {
			
				this.emit('warning', 'not a valid update zip archive');
				
			}
			
			popup.hide();
			
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
				
		popup.show();
		
	}
	
	// model events
	_CLArgs(data){
		var args = '';
		for (let key in data) {

			// set the input element
			this.$elements.filterByData('key', key).val(data[key]).prop('checked', (data[key] == 1));
			
			// fill in the full string
			if (key[0] === '-' && key[1] === '-'){
				args += key+'='+data[key]+' ';
			} else if (key === 'user'){
				args += data[key];
			} else if (key !== 'make'){
				args += key+data[key]+' ';
			}
		}

		$('#C_L_ARGS').val(args);
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
		$('<option></option>').html('--select--').appendTo($projects);
		
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