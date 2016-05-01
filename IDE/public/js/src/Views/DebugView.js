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
	// debugger process has started or stopped
	_debugRunning(status){
		this.clearVariableList();
		if (!status) this.setLocation('n/a');
	}
	_debugStatus(value, data){
		if (value) this.setStatus(value);
	}
	_debugReason(value){
		this.setStatus($('#debuggerStatus').html()+', '+value);
	}
	_debugLine(line, data){
		var location = '';
		if (data.debugFile)
			location += data.debugFile+', line ';
		
		if (data.debugLine)
			location += data.debugLine;
		
		this.setLocation(location);
	}
	_variables(variables){
		console.log(variables);
		this.clearVariableList();
		for (let variable of variables){
			this.addVariable($('#expList'), variable);
		}
		prepareList();
	}
	
	// utility methods
	setStatus(value){
		$('#debuggerStatus').html(value);
	}
	setLocation(value){
		$('#debuggerLocation').html(value);
	}
	clearVariableList(){
		$('#expList').empty();
	}
	addVariable(parent, variable){
		var name;
		if (variable.key) 
			name = variable.key;
		else {
			name = variable.name.split('.');
			if (name.length) name = name[name.length-1];
		}
		//console.log('adding variable', name, variable);
		var li = $('<li></li>');
		var table = $('<table></table>').appendTo(li);
		$('<td></td>').html(variable.type).addClass('debuggerType').appendTo(table);
		$('<td></td>').html(name).addClass('debuggerName').appendTo(table);
		var valTD = $('<td></td>').html(variable.value).addClass('debuggerValue').appendTo(table);
		li.attr('id', variable.name).appendTo(parent);
		if (variable.numchild && variable.children && variable.children.length){
			var ul = $('<ul></ul>').appendTo(li);
			for (let child of variable.children){
				this.addVariable(ul, child);
			}
		}
		if (variable.value == undefined){
			li.addClass('debuggerOutOfScope');
			valTD.html('out of scope');
		}
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

/*function addChildVariables(parent, variable){
	
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
}*/








