/*
 * render.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */


#include <BeagleRT.h>
#include <Utilities.h>
#include <rtdk.h>
#include <cmath>

float gPhase;
float gInverseSampleRate;
int gAudioFramesPerAnalogFrame;

// These settings are carried over from main.cpp
// Setting global variables is an alternative approach
// to passing a structure to userData in setup()

extern int gSensorInputFrequency;
extern int gSensorInputAmplitude;

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
	if(context->analogFrames == 0 || context->analogFrames > context->audioFrames) {
		rt_printf("Error: this example needs analog enabled, with 4 or 8 channels\n");
		return false;
	}

	gAudioFramesPerAnalogFrame = context->audioFrames / context->analogFrames;
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;

	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BeagleRTContext *context, void *userData)
{
	float frequency = 440.0;
	float amplitude = 0.8;

	// There are twice as many audio frames as matrix frames since audio sample rate
	// is twice as high

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		if(!(n % gAudioFramesPerAnalogFrame)) {
			// Even audio samples: update frequency and amplitude from the matrix
			frequency = map(analogReadFrame(context, n/gAudioFramesPerAnalogFrame, gSensorInputFrequency), 0, 1, 100, 1000);
			amplitude = analogReadFrame(context, n/gAudioFramesPerAnalogFrame, gSensorInputAmplitude);
		}

		float out = amplitude * sinf(gPhase);

		for(unsigned int channel = 0; channel < context->audioChannels; channel++)
			context->audioOut[n * context->audioChannels + channel] = out;

		gPhase += 2.0 * M_PI * frequency * gInverseSampleRate;
		if(gPhase > 2.0 * M_PI)
			gPhase -= 2.0 * M_PI;
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{

}
