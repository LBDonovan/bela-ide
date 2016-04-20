    /*
 *
 * Andrew McPherson and Victor Zappi
 * Queen Mary, University of London
 */

#include <BeagleRT.h>
#include <Utilities.h>
#include <cmath>
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
	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numAnalogFrames
// will be 0.

void render(BeagleRTContext *context, void *userData)
/*
we assume that gNumAnalogChannels=8, numAnalogFrames==8 and  numDigitalFrames==numAudioFrames
 * */
{
  /*
  * TODO: as an exercise, you will need to set the pin mode before writing or reading the digital pins.
  */
	if((context->audioSampleCount&31)==0){ //every 32 frames...
        //ANALOG channels
		analogWriteFrame(context, 0, 0, analogReadFrame(context, 0,0));
		// read the input0 at frame0  and write it to output0 frame0. Using analogWrite will fill the rest of the buffer with the same value
                                            // The value at the last frame will persist through the successive buffers until is set again.
                                            // This effectively is a pass-through with downsampling by 32 times
        analogWriteFrame(context, 0, 3, 1.0);  // write 1.0 to channel3 from frame0 to the end of the buffer
        analogWriteFrame(context, 4, 3, 0.1);  // write 0.1  to channel3 from frame4 to the end of the buffer
        analogWriteFrameOnce(context, 6, 3, 0.2); //write 0.2 to channel3 only on frame 6
        //this buffer for channel 3 will look like this:  1 1 1 1 0.1 0.1 0.2 0.1 
        //the next buffers for channel 3 will be filled up with 0.1 ....
        //DIGITAL channels
        digitalWriteFrame(context, 0, P8_07, GPIO_HIGH); //sets all the frames  to HIGH for channel 0
        digitalWriteFrameOnce(context, 4, P8_07, GPIO_LOW); //only frame 4 will be LOW  for channel 0
        // in this buffer the frames of channel 0 will look like this: 1 1 1 1 0 1 1 1 ...... 1 
        // in the next buffer each frame of channel 0 will be initialized to 1 (the last value of this buffer)
        digitalWriteFrame(context, 0, P8_08, GPIO_HIGH);
        digitalWriteFrame(context, 2, P8_08, GPIO_LOW);
        digitalWriteFrame(context, 4, P8_08, GPIO_HIGH);
        digitalWriteFrame(context, 5, P8_08, GPIO_LOW);
        pinModeFrame(context, 0, P9_16, GPIO_INPUT); // set channel 10 to input
        // in this buffer the frames of channel 1 will look like this: 1 1 0 0 1 0 0 0 .... 0
        // in the next buffer each frame of channel 1 will be initialized to 0 (the last value of this buffer)
	}
	for(unsigned int n=0; n<context->audioFrames; n++){
		for(unsigned int c=0; c<context->audioChannels; c++){
			context->audioOut[n*context->audioChannels + c]=context->audioIn[n*context->audioChannels + c];
		}
        //use digital channels 2-8 to create a 7 bit binary counter
        context->digital[n]=context->digital[n] & (~0b111111100); // set to zero (GPIO_OUTPUT) the bits in the lower word
        context->digital[n]=context->digital[n] & ((~0b111111100<<16) | 0xffff ); //initialize to zero the bits in the higher word (output value)
        context->digital[n]=context->digital[n] | ( ((context->audioSampleCount&0b1111111)<<(16+2)) ) ;  // set the bits in the higher word to the desired output value, keeping the lower word unchanged
        digitalWriteFrame(context, n, P8_29, digitalReadFrame(context, n, P8_30)); // echo the input from from channel 15 to channel 14
        digitalWriteFrame(context, n, P8_28, digitalReadFrame(context, n, P9_16)); // echo the input from from channel 10 to channel 13
        pinModeFrame(context, 0, P8_30, 0); //set channel 15 to input
	}

	for(unsigned int n=0; n<context->analogFrames; n++){
    	analogWriteFrame(context, n, 1, (context->audioSampleCount&8191)/8192.0); // writes a single frame. channel 1 is a ramp that follows gCountFrames
    	analogWriteFrame(context, n, 2, analogReadFrame(context, n, 2)); // writes a single frame. channel2 is just a passthrough
//		rt_printf("Analog out frame %d :",n);
//		for(int c=0; c<gNumAnalogChannels; c++)
//			rt_printf("%.1f ",analogOut[n*gNumAnalogChannels + c]);
//		rt_printf("\n");
	}
	return;

}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{
	// Nothing to do here
}
