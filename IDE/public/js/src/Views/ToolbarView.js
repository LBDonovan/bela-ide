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
	_F_running(status){
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
	_F_checkingSyntax(status){
		if (status){
			$('#status').css('background', 'url("images/toolbar.png") -210px 35px');
		} else {
			//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
		}
	}
	_F_allErrors(errors){
		//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout); 
		if (errors.length){
			$('#status').css('background', 'url("images/toolbar.png") -175px 35px');
		} else {
			$('#status').css('background', 'url("images/toolbar.png") -140px 35px');
		}
	}
	
	_CPU(data){
	
		var ide = data.syntaxCheckProcess + data.buildProcess + data.node;
		var bela = 0;
		
		if (data.bela != 0){
		
			// extract the data from the output
			var lines = data.bela.split('\n');
			var taskData = [], output = [];
			for (var j=0; j<lines.length; j++){
				taskData.push([]);
				lines[j] = lines[j].split(' ');
				for (var k=0; k<lines[j].length; k++){
					if (lines[j][k]){
						taskData[j].push(lines[j][k]);
					}
				}
			}
				
			for (var j=0; j<taskData.length; j++){
				if (taskData[j].length){
					var proc = {
						'name'	: taskData[j][7],
						'cpu'	: taskData[j][6],
						'msw'	: taskData[j][2],
						'csw'	: taskData[j][3]
					};
					// ignore uninteresting data
					if (proc && proc.name && proc.name !== 'ROOT' && proc.name !== 'NAME' && proc.name !== 'IRQ29:'){
						output.push(proc);
					}
				}
			}
	
			for (var j=0; j<output.length; j++){
				if (output[j].cpu){
					bela += parseFloat(output[j].cpu);
				}
			}
				
		
		}

		$('#ide-cpu').html('IDE: '+ide.toFixed(1)+'%');
		$('#bela-cpu').html('Bela: '+bela.toFixed(1)+'%');
	}
	
}

module.exports = ToolbarView;