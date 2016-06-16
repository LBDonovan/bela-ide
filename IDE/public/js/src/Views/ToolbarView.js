var View = require('./View');

class ToolbarView extends View {
	
	constructor(className, models){
		super(className, models);

		this.$elements.on('click', (e) => this.buttonClicked($(e.currentTarget), e));
		
		this.on('disconnected', () => {
			$('#run').removeClass('spinning');
		});
		
		$('#run')
			.mouseover(function() {
				$('#control-text-1').html('<p>Run</p>');
			})
			.mouseout(function() {
				$('#control-text-1').html('');
			});
		
		$('#stop')
			.mouseover(function() {
				$('#control-text-1').html('<p>Stop</p>');
			})
			.mouseout(function() {
				$('#control-text-1').html('');
			});

		$('#new-tab')
			.mouseover(function() {
				$('#control-text-2').html('<p>New Tab</p>');
			})
			.mouseout(function() {
				$('#control-text-2').html('');
			});
		
		$('#download')
			.mouseover(function() {
				$('#control-text-2').html('<p>Download project</p>');
			})
			.mouseout(function() {
				$('#control-text-2').html('');
			});

		$('#console')
			.mouseover(function() {
				$('#control-text-3').html('<p>Clear console</p>');
			})
			.mouseout(function() {
				$('#control-text-3').html('');
			});
		
		$('#scope')
			.mouseover(function() {
				$('#control-text-3').html('<p>Open scope</p>');
			})
			.mouseout(function() {
				$('#control-text-3').html('');
			});
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
	__running(status){
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
	__checkingSyntax(status){
		if (status){
			$('#status').css('background', 'url("images/toolbar.png") -210px 35px').prop('title', 'checking syntax...');
		} else {
			//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
		}
	}
	__allErrors(errors){
		//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout); 
		if (errors.length){
			$('#status').css('background', 'url("images/toolbar.png") -175px 35px').prop('title', 'syntax errors found');
		} else {
			$('#status').css('background', 'url("images/toolbar.png") -140px 35px').prop('title', 'syntax check clear');
		}
	}
	
	_CPU(data){

		var ide = data.syntaxCheckProcess + data.buildProcess + data.node + data.gdb;
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
	
	_cpuMonitoring(value){
		if (parseInt(value))
			$('#ide-cpu, #bela-cpu').css('visibility', 'visible');
		else
			$('#ide-cpu, #bela-cpu').css('visibility', 'hidden');
	}
	
	_debugBelaRunning(status){
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
	_debugRunning(status){
		if (!status && $('#run').hasClass('spinning'))  $('#run').removeClass('spinning');
	}
	
}

module.exports = ToolbarView;