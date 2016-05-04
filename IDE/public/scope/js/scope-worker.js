importScripts('../../socket.io/socket.io.js');

var settings = {}, channelConfig = [];

var socket = io('/BelaScopeWorker');

onmessage = function(e){
	if (!e.data || !e.data.event) return;
	if (e.data.event === 'settings'){
		settings = e.data.settings;
	} else if (e.data.event === 'channelConfig'){
		channelConfig = e.data.channelConfig;
		//console.log(channelConfig);
	}
}

socket.on('buffer', function(buf){

	var floatArray = new Float32Array(buf);
	console.log("recieved buffer of length "+floatArray.length);
	
	if (floatArray.length <= settings.numChannels.value*settings.frameWidth.value){
	
		for (var i=0; i<settings.numChannels.value; i++){
			for (var j=0; j<settings.frameWidth.value; j++){
				var index = i*settings.frameWidth.value + j;
				floatArray[index] = ( (settings.frameHeight/2) * (1 - (channelConfig[i].yOffset+floatArray[index])/channelConfig[i].yAmplitude)  );
			}
		}
		
		postMessage(floatArray, [floatArray.buffer]);
		
	} else {
	
		console.log('frame dropped');
		
	}

});
/*
// values from browser
var settings.frameWidth.value = 1280;
var y0 = 154.5;
var upSampling = 1;
var downSampling = 1;
var triggerDir = 1;
var triggerLevel = 0;

var xOffset = 0;
var channelConfig = [];

// values from bela
var settings.numChannels.value = 1;
var sampleRate = 44100;
var dt = 1000/sampleRate;

onmessage = function(e) {
	if (e.data.type === 'config'){
		console.log(e.data);
		y0 = e.data.y0;
		sampleRate = e.data.sampleRate;
		dt = 1000/sampleRate;
		upSampling = e.data.upSampling;
		downSampling = e.data.downSampling;
		settings.frameWidth.value = e.data.settings.frameWidth.value;///upSampling);*/
		/*if (settings.frameWidth.value > sampleRate){
			settings.frameWidth.value = sampleRate;
		}*/
		/*triggerDir = e.data.triggerDir;
		triggerLevel = e.data.triggerLevel;
		xOffset = Math.round(e.data.xOffset*sampleRate/1000);
		settings.numChannels.value = e.data.settings.numChannels.value;
		tc = e.data.triggerChannel;
		triggerMode = e.data.triggerMode;
		channelConfig = e.data.channelConfig;

		if (triggerMode === 'oneShot'){
			triggerMode = 'normal';
		}
		console.log(channelConfig);
	}
}

var scopeSocket = io('/BeagleRTScopeWorker');
var IDESocket = io('/BeagleRTIDE');
scopeSocket.on('connect', function(){
	console.log('web worker scope socket connected');
});
IDESocket.on('connect', function(){
	console.log('web worker IDE socket connected');
});


scopeSocket.on('buffer', function(buf){

	var floatArray = new Float32Array(buf);
	//console.log("recieved buffer of length "+floatArray.length);
	
	if (floatArray.length <= settings.numChannels.value*settings.frameWidth.value){
	
		for (var i=0; i<settings.numChannels.value; i++){
			for (var j=0; j<settings.frameWidth.value; j++){
				var index = i*settings.frameWidth.value + j;
				floatArray[index] = ( y0 * (1 - (channelConfig[i].yOffset+floatArray[index])/channelConfig[i].yAmplitude)  );
			}
		}
		
		postMessage(floatArray, [floatArray.buffer]);
		
	} else {
	
		console.log('frame dropped');
		
	}

});
*/
