#include <BeagleRT.h> 
#include <cmath>
#include <WriteFile.h>

float gPhase1, gPhase2;
float gFrequency1, gFrequency2;
float gInverseSampleRate;

WriteFile file1;
WriteFile file2;

bool setup(BeagleRTContext *context, void *userData)
{
	gInverseSampleRate = 1.0/context->audioSampleRate;
	file1.init("out1.m"); //set the file name to write to
	file1.setHeader("myvar=[\n"); //set a line to be printed at the beginning of the file
	file1.setFooter("];\n"); //set a line to be printed at the end of the file
	file1.setEcho(true); // enable echo to the console (as well as to the file)
	file1.setFormat("%.5f %.10f %f\n"); // set the format that you want to use for your output. Please use %f only (with modifiers)
	file2.init("out2.m");
	file2.setHeader("input=[\n");
	file2.setFooter("];\n");
	file2.setEcho(false);
	file2.setFormat("%f\n");
	gPhase1 = 0.0;
	gPhase2 = 0.0;

	gFrequency1 = 200.0;
	gFrequency2 = 201.0;
	return true; 
}

void render(BeagleRTContext *context, void *userData)
{
	static int count = 0;
	if((count&16383) == 0){
    	file2.log(context->audioIn, context->audioFrames); //write the input buffer every so often
	}
	for(unsigned int n = 0; n < context->audioFrames; n++) {
	    float chn1 = sinf(gPhase1);
	    float chn2 = sinf(gPhase2);
	    gPhase1 += 2.0 * M_PI * gFrequency1 * gInverseSampleRate;
	    gPhase2 += 2.0 * M_PI * gFrequency2 * gInverseSampleRate;
		if(gPhase1 > 2.0 * M_PI)
			gPhase1 -= 2.0 * M_PI;
		if(gPhase2 > 2.0 * M_PI)
			gPhase2 -= 2.0 * M_PI;
		if( (count&511) == 0){
			file1.log(chn1);
			file1.log(chn2);
			file1.log(count);
		}
		count++;
	}
}

// cleanup_render() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in initialise_render().

void cleanup(BeagleRTContext *context, void *userData)
{
    
}
