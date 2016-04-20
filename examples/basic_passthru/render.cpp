/*
 * render.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */


#include <BeagleRT.h>
#include <Utilities.h>
#include <rtdk.h>

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
	// Nothing to do here...

	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BeagleRTContext *context, void *userData)
{
	// Simplest possible case: pass inputs through to outputs
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		for(unsigned int ch = 0; ch < context->audioChannels; ch++)
			context->audioOut[n * context->audioChannels + ch] = context->audioIn[n * context->audioChannels + ch];
	}

	// Same with matrix, only if matrix is enabled
	if(context->analogFrames != 0) {
		for(unsigned int n = 0; n < context->analogFrames; n++) {
			for(unsigned int ch = 0; ch < context->analogChannels; ch++) {
				// Two equivalent ways to write this code
				// The long way, using the buffers directly:
				// context->analogOut[n * context->analogChannels + ch] = context->analogIn[n * context->analogChannels + ch];

				// Or using the macros:
				analogWriteFrame(context, n, ch, analogReadFrame(context, n, ch));
			}
		}
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{

}
