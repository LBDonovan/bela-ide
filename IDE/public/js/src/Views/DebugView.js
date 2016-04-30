var View = require('./View');

class DebugView extends View {
	
	constructor(className, models){
		super(className, models);
	}
	
	// UI events
	buttonClicked($element, e){
		this.emit('debugger-event', $element.data().func);
	}

	// model events
	_running(value, data){
		if (!value){
			this.setStatus('stopped');
		} else {
			this.setLocation('');
		}
	}
	_status(value, data){
		if (value) this.setStatus(value);
	}
	_reason(value){
		this.setStatus($('#debuggerStatus').html()+', '+value);
	}
	_line(line, data){
		var location = '';
		if (data.file)
			location += data.file+', line ';
		
		if (data.line)
			location += data.line;
		
		this.setLocation(data.file+', line '+data.line);
	}
	
	setStatus(value){
		$('#debuggerStatus').html(value);
	}
	setLocation(value){
		$('#debuggerLocation').html(value);
	}
}

module.exports = DebugView;