/*
 * render.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */


#include <BeagleRT.h>
#include <Utilities.h>
#include <cmath>
#include <GPIOcontrol.h>

#define NUMBER_OF_SEGMENTS	10

// Two levels of audio: one follows current value, the other holds
// peaks for longer
float gAudioLocalLevel = 0, gAudioPeakLevel = 0;

// Decay rates for detecting levels
float gLocalDecayRate = 0.99, gPeakDecayRate = 0.999;

// Thresholds for LEDs: set in setup()
float gThresholds[NUMBER_OF_SEGMENTS + 1];

// High-pass filter on the input
float gLastX[2] = {0};
float gLastY[2] = {0};

// These coefficients make a high-pass filter at 5Hz for 44.1kHz sample rate
double gB0 = 0.99949640;
double gB1 = -1.99899280;
double gB2 = gB0;
double gA1 = -1.99899254;
double gA2 = 0.99899305;

// setup() is called once before the audio rendering starts.
// Use it to perform any initialisation and allocation which is dependent
// on the period size or sample rate.
//
// userData holds an opaque pointer to a data structure that was passed
// in from the call to initAudio().
//
// Return true on success; returning false halts the program.

bool setup(BeagleRTContext *context, void *userData)
{	
	// This project makes the assumption that the audio and digital
	// sample rates are the same. But check it to be sure!
	if(context->audioFrames != context->digitalFrames) {
		rt_printf("Error: this project needs the audio and digital sample rates to be the same.\n");
		return false;
	}
	
	// Initialise threshold levels in -3dB steps. One extra for efficiency in render()
	// Level = 10^(dB/20)
	for(int i = 0; i < NUMBER_OF_SEGMENTS + 1; i++) {
		gThresholds[i] = powf(10.0f, (-1.0 * (NUMBER_OF_SEGMENTS - i)) * .05);
	}
	
	for(int i = 0; i < NUMBER_OF_SEGMENTS; i++)
		pinModeFrame(context, 0, i, OUTPUT);

	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BeagleRTContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Get average of audio input channels
		float sample = 0;
		for(unsigned int ch = 0; ch < context->audioChannels; ch++) {
			context->audioOut[n * context->audioChannels + ch] = 
				context->audioIn[n * context->audioChannels + ch];
			sample += context->audioIn[n * context->audioChannels + ch];
		}
		
		// Do DC-blocking on the sum
		float out = gB0 * sample + gB1 * gLastX[0] + gB2 * gLastX[1]
						- gA1 * gLastY[0] - gA2 * gLastY[1];

		gLastX[1] = gLastX[0];
		gLastX[0] = sample;
		gLastY[1] = gLastY[0];
		gLastY[0] = out;
		
		out = fabsf(out / (float)context->audioChannels);
		
		// Do peak detection: fast-responding local level
		if(out > gAudioLocalLevel)
			gAudioLocalLevel = out;
		else
			gAudioLocalLevel *= gLocalDecayRate;
		
		// Do peak detection: slow-responding peak level
		if(out > gAudioPeakLevel)
			gAudioPeakLevel = out;
		else {
			// Make peak decay slowly by only multiplying
			// every few samples
			if(((context->audioSampleCount + n) & 31) == 0)
				gAudioPeakLevel *= gPeakDecayRate;
		}	
		// LED bargraph on digital outputs 0-9
		for(int led = 0; led < NUMBER_OF_SEGMENTS; led++) {
			// All LEDs up to the local level light up. The LED
			// for the peak level also remains lit.
			int state = LOW;
				
			if(gAudioLocalLevel > gThresholds[led])
				state = HIGH;
			else if(gAudioPeakLevel > gThresholds[led] && gAudioPeakLevel <= gThresholds[led + 1])
				state = HIGH;
			
			// Write LED
			digitalWriteFrameOnce(context, n, led, state);
		}
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{

}
