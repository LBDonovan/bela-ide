/*
 * render.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */


#include <BeagleRT.h>
#include <cmath>

#define ANALOG_LOW	(2048.0 / 65536.0)
#define ANALOG_HIGH (50000.0 / 65536.0)

const int gDACPinOrder[] = {6, 4, 2, 0, 1, 3, 5, 7};

uint64_t gLastErrorFrame = 0;
uint32_t gEnvelopeSampleCount = 0;
float gEnvelopeValue = 0.5;
float gEnvelopeDecayRate = 0.9995;

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
	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BeagleRTContext *context, void *userData)
{
	static float phase = 0.0;
	static int sampleCounter = 0;
	static int invertChannel = 0;
	float frequency = 0;

	// Play a sine wave on the audio output
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		context->audioOut[2*n] = context->audioOut[2*n + 1] = gEnvelopeValue * sinf(phase);

		// If one second has gone by with no error, play one sound, else
		// play another
		if(context->audioSampleCount + n - gLastErrorFrame > 44100) {
			gEnvelopeValue *= gEnvelopeDecayRate;
			gEnvelopeSampleCount++;
			if(gEnvelopeSampleCount > 22050) {
				gEnvelopeValue = 0.5;
				gEnvelopeSampleCount = 0;
			}
			frequency = 880.0;
		}
		else {
			gEnvelopeValue = 0.5;
			frequency = 220.0;
		}

		phase += 2.0 * M_PI * frequency / 44100.0;
		if(phase >= 2.0 * M_PI)
			phase -= 2.0 * M_PI;
	}

	for(unsigned int n = 0; n < context->analogFrames; n++) {
		// Change outputs every 512 samples
		if(sampleCounter < 512) {
			for(int k = 0; k < 8; k++) {
				if(k == invertChannel)
					context->analogOut[n*8 + gDACPinOrder[k]] = ANALOG_HIGH;
				else
					context->analogOut[n*8 + gDACPinOrder[k]] = 0;
			}
		}
		else {
			for(int k = 0; k < 8; k++) {
				if(k == invertChannel)
					context->analogOut[n*8 + gDACPinOrder[k]] = 0;
				else
					context->analogOut[n*8 + gDACPinOrder[k]] = ANALOG_HIGH;
			}
		}

		// Read after 256 samples: input should be low
		if(sampleCounter == 256) {
			for(int k = 0; k < 8; k++) {
				if(k == invertChannel) {
					if(context->analogIn[n*8 + k] < ANALOG_HIGH) {
						rt_printf("FAIL [output %d, input %d] -- output HIGH input %f (inverted)\n", gDACPinOrder[k], k, context->analogIn[n*8 + k]);
						gLastErrorFrame = context->audioSampleCount + n;
					}
				}
				else {
					if(context->analogIn[n*8 + k] > ANALOG_LOW) {
						rt_printf("FAIL [output %d, input %d] -- output LOW --> input %f\n", gDACPinOrder[k], k, context->analogIn[n*8 + k]);
						gLastErrorFrame = context->audioSampleCount + n;
					}
				}
			}
		}
		else if(sampleCounter == 768) {
			for(int k = 0; k < 8; k++) {
				if(k == invertChannel) {
					if(context->analogIn[n*8 + k] > ANALOG_LOW) {
						rt_printf("FAIL [output %d, input %d] -- output LOW input %f (inverted)\n", gDACPinOrder[k], k, context->analogIn[n*8 + k]);
						gLastErrorFrame = context->audioSampleCount + n;
					}
				}
				else {
					if(context->analogIn[n*8 + k] < ANALOG_HIGH) {
						rt_printf("FAIL [output %d, input %d] -- output HIGH input %f\n", gDACPinOrder[k], k, context->analogIn[n*8 + k]);
						gLastErrorFrame = context->audioSampleCount + n;
					}
				}
			}
		}

		if(++sampleCounter >= 1024) {
			sampleCounter = 0;
			invertChannel++;
			if(invertChannel >= 8)
				invertChannel = 0;
		}
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{

}
