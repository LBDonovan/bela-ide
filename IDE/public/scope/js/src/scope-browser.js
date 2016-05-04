'use strict';

// worker
var worker = new Worker("js/scope-worker.js");

// models
var Model = require('./Model');
var settings = new Model();

// views
var controlView = new (require('./ControlView'))('scopeControls', [settings]);
controlView.on('settings-event', (key, value) => {
	socket.emit('settings-event', key, value);
});

var backgroundView = new (require('./BackgroundView'))('scopeBG', [settings]);
/*controlView.on('settings-event', (key, value) => {
	socket.emit('settings-event', key, value);
});*/

// setup socket
var socket = io('/BelaScope');

socket.on('init', (newSettings) => {
	newSettings.frameWidth.value = window.innerWidth;
	settings.setData(newSettings);
});

socket.on('settings', (newSettings) => {
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
	}
});

// window events
$(window).on('resize', () => {
	settings.setKey('frameWidth', {type: 'integer', value: window.innerWidth});
});