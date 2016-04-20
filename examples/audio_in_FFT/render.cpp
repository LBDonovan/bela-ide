/*
 * render.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */


#include <BeagleRT.h>
#include <rtdk.h>
#include <NE10.h>					// neon library
#include <cmath>

int gFFTSize;
float gFFTScaleFactor = 0;

int gReadPointer = 0;
int gWritePointer = 0;

// FFT vars
ne10_fft_cpx_float32_t* timeDomainIn;
ne10_fft_cpx_float32_t* timeDomainOut;
ne10_fft_cpx_float32_t* frequencyDomain;
ne10_fft_cfg_float32_t cfg;

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
	gFFTSize = *(int *)userData;
	gFFTScaleFactor = 1.0f / (float)gFFTSize;

	timeDomainIn = (ne10_fft_cpx_float32_t*) NE10_MALLOC (gFFTSize * sizeof (ne10_fft_cpx_float32_t));
	timeDomainOut = (ne10_fft_cpx_float32_t*) NE10_MALLOC (gFFTSize * sizeof (ne10_fft_cpx_float32_t));
	frequencyDomain = (ne10_fft_cpx_float32_t*) NE10_MALLOC (gFFTSize * sizeof (ne10_fft_cpx_float32_t));
	cfg = ne10_fft_alloc_c2c_float32 (gFFTSize);

	memset(timeDomainOut, 0, gFFTSize * sizeof (ne10_fft_cpx_float32_t));

	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BeagleRTContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		timeDomainIn[gReadPointer].r = (ne10_float32_t) ((context->audioIn[n*context->audioChannels] +
															context->audioIn[n*context->audioChannels+1]) * 0.5);
		timeDomainIn[gReadPointer].i = 0;

		if(++gReadPointer >= gFFTSize)
		{
			//FFT
			ne10_fft_c2c_1d_float32_neon (frequencyDomain, timeDomainIn, cfg->twiddles, cfg->factors, gFFTSize, 0);

			//Do frequency domain stuff

			//IFFT
			ne10_fft_c2c_1d_float32_neon (timeDomainOut, frequencyDomain, cfg->twiddles, cfg->factors, gFFTSize, 1);

			gReadPointer = 0;
			gWritePointer = 0;
		}

		for(unsigned int channel = 0; channel < context->audioChannels; channel++)
			context->audioOut[n * context->audioChannels + channel] = (float) timeDomainOut[gWritePointer].r * gFFTScaleFactor;
		gWritePointer++;
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{
	NE10_FREE(timeDomainIn);
	NE10_FREE(timeDomainOut);
	NE10_FREE(frequencyDomain);
	NE10_FREE(cfg);
}
