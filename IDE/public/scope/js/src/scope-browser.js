'use strict';

// models
var Model = require('./Model');
var settings = new Model();

// views
var controlView = new (require('./ControlView'))('scopeControls', [settings]);
controlView.on('settings-event', (key, value) => {
	socket.emit('settings-event', key, value);
});

// setup socket
var socket = io('/BelaScope');

socket.on('settings', (newSettings) => {
	settings.setData(newSettings);
	//console.log(newSettings);
	//settings.print();
});