#include <BeagleRT.h>
#include <cmath>
#include <newScope.h>

float gFrequency = 40.0;
float gPhase;
float gInverseSampleRate;

newScope scope;

bool setup(BeagleRTContext *context, void *userData)
{

	scope.setup(3, context->analogSampleRate);

	gInverseSampleRate = 1.0 / context->analogSampleRate;
	gPhase = 0.0;

	return true;
}


void render(BeagleRTContext *context, void *userData)
{

	for(unsigned int n = 0; n < context->analogFrames; n++) {
		float out = 0.8f * sinf(gPhase);
		float out2 = 0.8f * sinf(gPhase - M_PI/2);
		float out3 = 0.8f * sinf(gPhase + M_PI/2);
		//float out4 = 0.8f * sinf(gPhase - 2*M_PI/3);
		//float out5 = 0.8f * sinf(gPhase + 2*M_PI/3);
		gPhase += 2.0 * M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > 2.0 * M_PI)
			gPhase -= 2.0 * M_PI;
			
		scope.log(out, out2, out3);

		//for(unsigned int channel = 0; channel < context->audioChannels; channel++)
		//	context->audioOut[n * context->audioChannels + channel] = context->audioIn[n * context->audioChannels + channel];
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{

}
