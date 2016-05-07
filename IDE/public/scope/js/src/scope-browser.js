'use strict';

// worker
var worker = new Worker("js/scope-worker.js");

// models
var Model = require('./Model');
var settings = new Model();

// views
var controlView = new (require('./ControlView'))('scopeControls', [settings]);
var backgroundView = new (require('./BackgroundView'))('scopeBG', [settings]);
var channelView = new (require('./ChannelView'))('channelView', [settings]);

// socket
var socket = io('/BelaScope');

// view events
controlView.on('settings-event', (key, value) => {
	socket.emit('settings-event', key, value);
});
channelView.on('channelConfig', (channelConfig) => {
	worker.postMessage({
		event			: 'channelConfig',
		channelConfig
	});
});

// socket events
socket.on('settings', (newSettings) => {
	if (newSettings.frameWidth) newSettings.frameWidth.value = window.innerWidth;
	newSettings.frameHeight = window.innerHeight;
	settings.setData(newSettings);
	//console.log(newSettings);
	//settings.print();
});

// model events
settings.on('set', (data, changedKeys) => {
	if (changedKeys.indexOf('frameWidth') !== -1){
		var xTimeBase = Math.max(Math.floor(1000*(data.frameWidth.value/8)/data.sampleRate.value), 1);
		settings.setKey('xTimeBase', xTimeBase);
		socket.emit('settings-event', 'frameWidth', data.frameWidth.value)
	} else {
		worker.postMessage({
			event		: 'settings',
			settings	: data
		});
	}
});

// window events
$(window).on('resize', () => {
	settings.setKey('frameWidth', {type: 'integer', value: window.innerWidth});
	settings.setKey('frameHeight', window.innerHeight);
});

// plotting
{
	
	let canvas = document.getElementById('scope');
	let ctx = canvas.getContext('2d');
	ctx.lineWidth = 2;
	
	let width, height, numChannels, channelConfig = [];
	settings.on('change', (data, changedKeys) => {
		if (changedKeys.indexOf('frameWidth') !== -1 || changedKeys.indexOf('frameHeight') !== -1){
			canvas.width = window.innerWidth;
			width = canvas.width;
			canvas.height = window.innerHeight;
			height = canvas.height;
		}
		if (changedKeys.indexOf('numChannels') !== -1){
			numChannels = data.numChannels.value;
		}
	});
	channelView.on('channelConfig', (config) => channelConfig = config );
	
	let frame, length, plot = false;

	worker.onmessage = function(e) {
		frame = e.data;
		length = Math.floor(frame.length/numChannels);
		plot = true; 
	};
	
	function plotLoop(){
		requestAnimationFrame(plotLoop);
		
		if (plot){
		
			plot = false;
			ctx.clearRect(0, 0, width, height);
			//console.log('plotting');
			
			for (var i=0; i<numChannels; i++){

				ctx.strokeStyle = channelConfig[i].color;
	
				ctx.beginPath();
				ctx.moveTo(0, frame[i*length]);	
				
				for (var j=1; j<length; j++){
					ctx.lineTo(j, frame[j+i*length]);
				}
	
				ctx.stroke();
		
			}
		
		} /*else {
			console.log('not plotting');
		}*/
	}
	plotLoop();
	
	let saveCanvasData =  document.getElementById('saveCanvasData');		
	saveCanvasData.addEventListener('click', function(){

		let downSampling = settings.getKey('downSampling').value;
		let upSampling = settings.getKey('upSampling').value;
		let sampleRate = settings.getKey('sampleRate').value;
		
		let out = "data:text/csv;charset=utf-8,";
		
		for (let i=0; i<length; i++){
			out += i*downSampling/(upSampling * sampleRate);
			for (let j=0; j<numChannels; j++){
				out += ','+ ( ( 1 - frame[j*length + i] / (height/2) ) * channelConfig[j].yAmplitude - channelConfig[j].yOffset );
			}
			out += '\n';
		}

		this.href = encodeURI(out);
	});
	
}









