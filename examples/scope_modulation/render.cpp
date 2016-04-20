#include <BeagleRT.h>
#include <cmath>
#include <newScope.h>

newScope scope;

float gInverseSampleRate;

float ampFrequency = 400.0;
float ampPhase;

float ampLFOFrequency = 40;
float ampLFOPhase;

float fmRange = 1000.0;
float fmOffset = 200.0;


bool setup(BeagleRTContext *context, void *userData)
{

	gInverseSampleRate = 1.0 / context->audioSampleRate;
	ampPhase = 0.0;
	ampLFOPhase = 0.0;
	
	scope.setup(4, context->analogSampleRate);

	return true;
}

void render(BeagleRTContext *context, void *userData)
{

	for(unsigned int n = 0; n < context->audioFrames; n++) {
	    
	    float pot1 = context->analogIn[n*context->analogChannels + 0];  // AM depth
	    float pot2 = context->analogIn[n*context->analogChannels + 1];  // FM depth
	    
	    
	    float ampLFO = sinf(ampLFOPhase);
		float amp = sinf(ampPhase);
		
		// amplitude modulation
		float ampOut = (1 - pot1*(ampLFO*0.5+0.5)) * amp;
		
		// frequency modulation
		ampFrequency = (ampLFO*0.5+0.5) * (fmRange*pot2) + fmOffset;
		
		ampPhase += 2.0 * M_PI * ampFrequency * gInverseSampleRate;
		if(ampPhase > 2.0 * M_PI)
			ampPhase -= 2.0 * M_PI;
		ampLFOPhase += 2.0 * M_PI * (ampLFOFrequency) * gInverseSampleRate;
		if(ampLFOPhase > 2.0 * M_PI)
			ampLFOPhase -= 2.0 * M_PI;
	
		scope.log(pot1, pot2, ampOut/2.0, ampLFO);
		
		context->audioOut[n*context->audioChannels + 0] = ampOut;
		context->audioOut[n*context->audioChannels + 1] = ampOut;

	}
}

void cleanup(BeagleRTContext *context, void *userData)
{

}
