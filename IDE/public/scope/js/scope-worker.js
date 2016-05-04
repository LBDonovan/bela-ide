//importScripts('../../js/socket.io.js');

//console.log('hi');
/*
// values from browser
var frameLength = 1280;
var y0 = 154.5;
var upSampling = 1;
var downSampling = 1;
var triggerDir = 1;
var triggerLevel = 0;

var xOffset = 0;
var channelConfig = [];

// values from bela
var numChannels = 1;
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
		frameLength = e.data.frameLength;///upSampling);*/
		/*if (frameLength > sampleRate){
			frameLength = sampleRate;
		}*/
		/*triggerDir = e.data.triggerDir;
		triggerLevel = e.data.triggerLevel;
		xOffset = Math.round(e.data.xOffset*sampleRate/1000);
		numChannels = e.data.numChannels;
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
	
	if (floatArray.length <= numChannels*frameLength){
	
		for (var i=0; i<numChannels; i++){
			for (var j=0; j<frameLength; j++){
				var index = i*frameLength + j;
				floatArray[index] = ( y0 * (1 - (channelConfig[i].yOffset+floatArray[index])/channelConfig[i].yAmplitude)  );
			}
		}
		
		postMessage(floatArray, [floatArray.buffer]);
		
	} else {
	
		console.log('frame dropped');
		
	}

});
*/
