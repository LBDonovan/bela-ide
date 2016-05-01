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
	_variables(variables){
	
		for (var i=0; i<variables.length; i++){
			var li = $('<li></li>');
			var table = $('<table></table>').appendTo(li);
			$('<td></td>').html(variables[i].type).addClass('debuggerType').appendTo(table);
			$('<td></td>').html(variables[i].key).addClass('debuggerName').appendTo(table);
			$('<td></td>').html(variables[i].value).addClass('debuggerValue').appendTo(table);
			li.attr('id', variables[i].name).appendTo($('#expList'));
			if (variables[i].numchild && variables[i].children.length){
				addChildVariables(li, variables[i]);
			}
		}
		
		prepareList();
	}
	
	setStatus(value){
		$('#debuggerStatus').html(value);
	}
	setLocation(value){
		$('#debuggerLocation').html(value);
	}
}

module.exports = DebugView;

function prepareList() {
    $('#expList').find('li:has(ul)').each(function(){
    	var $this = $(this);
    	if (!$this.hasClass('collapsed')){
    		$this.click( function(event) {
				$(this).toggleClass('expanded');
				$(this).children('ul').toggle('fast');
				return false;
			})
			.addClass('collapsed')
			.children('ul').hide();
    	}
    });
    
};

function addChildVariables(parent, variable){
	var ul = $('<ul></ul>').appendTo(parent);
	for (var i=0; i<variable.children.length; i++){
		var name = variable.children[i].name.split('.');
		if (name.length) name = name[name.length-1];
		var li = $('<li></li>');
		var table = $('<table></table>').appendTo(li);
		$('<td></td>').html(variable.children[i].type).addClass('debuggerType').appendTo(table);
		$('<td></td>').html(name).addClass('debuggerName').appendTo(table);
		$('<td></td>').html(variable.children[i].value).addClass('debuggerValue').appendTo(table);
		li.attr('id', variable.children[i].name).appendTo(ul);
		if (variable.children[i].numchild && variable.children[i].children && variable.children[i].children.length){
			addChildVariables(li, variable.children[i]);
		}
	}
}








