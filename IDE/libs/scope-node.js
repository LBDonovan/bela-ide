'use strict';
var scopeOSC = require('./scope-osc');

var scopeConnected = false;
var settings = {
	connected		: {type: 'integer', value: 0},
	numChannels		: {type: 'integer', value: 2},
	sampleRate		: {type: 'float', value: 44100},
	frameWidth		: {type: 'integer', value: 1280},
	triggerMode		: {type: 'integer', value: 0},
	triggerChannel	: {type: 'integer', value: 0},
	triggerDir		: {type: 'integer', value: 0},
	triggerLevel	: {type: 'float', value: 0},
	xOffset			: {type: 'integer', value: 0},
	upSampling		: {type: 'integer', value: 1},
	downSampling	: {type: 'integer', value: 1},
	holdOff			: {type: 'float', value: 20}
}

var UDP_RECIEVE = 8677;

var scope = {
	
	init(io){	
		
		// setup the websockets
		this.webSocket = io.of('/BelaScope');
		this.workerSocket = io.of('/BelaScopeWorker');
		
		this.webSocket.on('connection', (socket) => this.browserConnected(socket) );
		this.workerSocket.on('connection', (socket) => this.workerConnected(socket) );
		
		// setup the OSC server
		scopeOSC.init();
		scopeOSC.on('scope-setup', (args) => this.scopeConnected(args) );
		
	},
	
	scopeConnected(args){
		
		if (args[0].type === 'integer' && args[1].type === 'float'){
			settings.numChannels = args[0];
			settings.sampleRate = args[1];
		} else {
			console.log('bad setup message args', args);
			return;
		}
		
		console.log('scope connected');
		scopeConnected = true;
		console.log(settings);
		
		scopeOSC.sendSetupReply(settings);
			
	},
	
	browserConnected(socket){
		console.log('scope browser connected');
		
		// send the settings to the browser
		socket.emit('init', settings);
		
		// tell the scope that the browser is connected
		settings.connected.value = 1;
		if (scopeConnected)
			scopeOSC.sendSetting('connected', settings.connected);
			
		socket.on('disconnect', () => {
			console.log('scope browser disconnected');
			// tell the scope that the browser is connected
			settings.connected.value = 0;
			if (scopeConnected)
				scopeOSC.sendSetting('connected', settings.connected);
		});
		
		socket.on('settings-event', (key, value) => {
			if (settings[key]){
				if (key === 'upSampling' || key === 'downSampling') {
					this[key]();
					return;
				}
				if (settings[key].type === 'integer') value = parseInt(value);
				else if (settings[key].type === 'float') value = parseFloat(value);
				settings[key].value = value;
				if (scopeConnected)
					scopeOSC.sendSetting(key, settings[key]);
			} else {
				console.log('bad settings-event', key, value);
			}
		});
		
	},
	
	upSampling(){
		if (settings.downSampling.value > 1){
			settings.downSampling.value -= 1;
			this.webSocket.emit('settings', {downSampling: settings.downSampling});
			if (scopeConnected)
				scopeOSC.sendSetting('downSampling', settings['downSampling']);
		} else {
			settings.upSampling.value += 1;
			this.webSocket.emit('settings', {upSampling: settings.upSampling});
			if (scopeConnected)
				scopeOSC.sendSetting('upSampling', settings['upSampling']);
		}
	},
	downSampling(){
		if (settings.upSampling.value > 1){
			settings.upSampling.value -= 1;
			this.webSocket.emit('settings', {upSampling: settings.upSampling});
			if (scopeConnected)
				scopeOSC.sendSetting('upSampling', settings['upSampling']);
		} else {
			settings.downSampling.value += 1;
			this.webSocket.emit('settings', {downSampling: settings.downSampling});
			if (scopeConnected)
				scopeOSC.sendSetting('downSampling', settings['downSampling']);
		}
	},
	
	workerConnected(socket){
		socket.emit('hi');
	}
	
};

module.exports = scope;

/*
// status flags
var clientConnected = false;
var scopeSetup = false;

// variables from bela
var numChannels, sampleRate;

// variables from browser
var frameWidth = 1280;
var triggerMode = 0;
var triggerLevel = 0;
var triggerChannel = 0;
var xOffset = 0;
var triggerDir = 0;

// websocket connection to browser
var socket;
var workerSocket;

// UDP socket to receive raw scope data from bela scope
var scopeUDP = dgram.createSocket('udp4');
scopeUDP.bind(UDP_RECIEVE, '127.0.0.1');

// echo raw scope data over websocket to browser
scopeUDP.on('message', function(buffer){
	workerSocket.emit('buffer', buffer);
});

// UDP socket to send and receive OSC messages from bela scope
var oscUdp = dgram.createSocket('udp4');
oscUdp.bind(OSC_RECIEVE, '127.0.0.1');

oscUdp.on('message', function(message, rinfo) {

	var msg = osc.fromBuffer(message);

	if (msg.address === '/setup-scope'){
	
		console.log('setup recieved');
		console.log('scope running with '+msg.args[0].value+' channels at '+msg.args[1].value);
					
		numChannels = msg.args[0].value;
		sampleRate = msg.args[1].value;
		
		var conArg;
		if (clientConnected){
			console.log('sending scope setup');
			socket.emit('scope-setup', { numChannels: numChannels, sampleRate: sampleRate });
			scopeSetup = true;
			conArg = "true";
		} else {
			conArg = "false";
		}
		
		var buf = osc.toBuffer({
			address: "/scope-setup-reply",
			args: [
				{
					type: conArg,
					value: clientConnected
				},
				{
					type: "integer",
					value: frameWidth
				},
				{
					type: "integer",
					value: triggerMode
				},
				{
					type: "integer",
					value: triggerChannel
				},
				{
					type: "float",
					value: triggerLevel
				},
				{
					type: "integer",
					value: xOffset
				},
				{
					type: "integer",
					value: triggerDir
				}
			]
		});
		oscUdp.send(buf, 0, buf.length, OSC_SEND, '127.0.0.1', function(err, bytes) {
			if (err) throw err;
			console.log("scope: sent setup reply");
		});
		
		
		
		
	}
});

module.exports = function(io){	
	
	socket = io.of('/BeagleRTScope');
	workerSocket = io.of('/BeagleRTScopeWorker');
	
	//socket vs sock?
	
	socket.on('connection', function(sock){
	
		console.log('scope socket connected');
		//if (!scopeSetup){
			sock.emit('scope-setup', { numChannels: numChannels, sampleRate: sampleRate });
		//}
		
		sock.on('holdOff', function(holdOff){
			var buf = osc.toBuffer({
				address: "/scope-hold-off",
				args: [
					{
						type: "float",
						value: holdOff
					}
				]
			});
			sendOSC(buf);
		});
		
		sock.on('xOffset', function(value){
			var buf = osc.toBuffer({
				address: "/scope-x-offset",
				args: [
					{
						type: "integer",
						value: value
					}
				]
			});
			sendOSC(buf);
		});
		
		sock.on('triggerDir', function(value){
			var buf = osc.toBuffer({
				address: "/scope-trigger-direction",
				args: [
					{
						type: "integer",
						value: value
					}
				]
			});
			sendOSC(buf);
		});
		
		sock.on('triggerLevel', function(value){
			var buf = osc.toBuffer({
				address: "/scope-trigger-level",
				args: [
					{
						type: "float",
						value: value
					}
				]
			});
			sendOSC(buf);
		});
		
		sock.on('triggerChannel', function(value){
			var buf = osc.toBuffer({
				address: "/scope-trigger-channel",
				args: [
					{
						type: "integer",
						value: value
					}
				]
			});
			sendOSC(buf);
		});
		
		sock.on('triggerMode', function(value){
			var buf = osc.toBuffer({
				address: "/scope-trigger-mode",
				args: [
					{
						type: "integer",
						value: value
					}
				]
			});
			sendOSC(buf);
		});
		
		sock.on('sampling', function(value){
			var buf = osc.toBuffer({
				address: "/scope-sampling",
				args: [
					{
						type: "integer",
						value: value.upSampling
					},
					{
						type: "integer",
						value: value.downSampling
					}
				]
			});
			sendOSC(buf);
		});
		
		sock.on('oneShot', function(){
			var buf = osc.toBuffer({
				address: "/scope-one-shot"
			});
			sendOSC(buf);
		});
	
		sock.on('settings', function(data){
		
			console.log('recieved settings');
			
			clientConnected = true;
			
			frameWidth = data.frameWidth;
			triggerMode = data.triggerMode;
			triggerLevel = data.triggerLevel;
			triggerChannel = data.triggerChannel;
			xOffset = data.xOffset;
			triggerDir = data.triggerDir;
							
			var buf = osc.toBuffer({
				address: "/scope-settings",
				args: [
					{
						type: "integer",
						value: frameWidth
					},
					{
						type: "integer",
						value: triggerMode
					},
					{
						type: "integer",
						value: triggerChannel
					},
					{
						type: "float",
						value: triggerLevel
					},
					{
						type: "integer",
						value: xOffset
					},
					{
						type: "integer",
						value: triggerDir
					}
				]
			});
			oscUdp.send(buf, 0, buf.length, OSC_SEND, '127.0.0.1', function(err, bytes) {
				if (err) throw err;
				console.log("scope: sent new connection event");
			});
			
		});	
	});
	
};

function sendOSC(buf){
	oscUdp.send(buf, 0, buf.length, OSC_SEND, '127.0.0.1', function(err, bytes) {
		if (err) throw err;
	});
}*/

