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

/* basic_button
* - connect an LED in series with a 470ohm resistor between P8_07 and ground.
* - connect a 1k resistor to P9_03 (+3.3V), 
* - connect the other end of the resistor to both a button and P8_08
* - connect the other end of the button to ground.
* The program will read the button and make the LED blink when the button is pressed.
*/

void render(BeagleRTContext *context, void *userData)
{
	for(unsigned int n=0; n<context->digitalFrames; n++){
    pinModeFrame(context, 0, P8_08, INPUT);
    int status=digitalReadFrame(context, 0, P8_08); //read the value of the button
    pinModeFrame(context, 0, P8_07, OUTPUT);
    digitalWriteFrame(context, n, P8_07, status); //write the status to the LED
  }
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{
	// Nothing to do here
}
