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

// Set range for analog outputs designed for driving LEDs
const float kMinimumAmplitude = (1.5 / 5.0);
const float kAmplitudeRange = 1.0 - kMinimumAmplitude;

float gFrequency;
float gPhase;
float gInverseSampleRate;

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
	// Retrieve a parameter passed in from the initAudio() call
	gFrequency = *(float *)userData;

	if(context->analogFrames == 0) {
		rt_printf("Error: this example needs the matrix enabled\n");
		return false;
	}

	gInverseSampleRate = 1.0 / context->analogSampleRate;
	gPhase = 0.0;

	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BeagleRTContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->analogFrames; n++) {
		// Set LED to different phase for each matrix channel
		float relativePhase = 0.0;
		for(unsigned int channel = 0; channel < context->analogChannels; channel++) {
			float out = kMinimumAmplitude + kAmplitudeRange * 0.5f * (1.0f + sinf(gPhase + relativePhase));

			analogWriteFrame(context, n, channel, out);

			// Advance by pi/4 (1/8 of a full rotation) for each channel
			relativePhase += M_PI * 0.25;
		}

		gPhase += 2.0 * M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > 2.0 * M_PI)
			gPhase -= 2.0 * M_PI;
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{

}
