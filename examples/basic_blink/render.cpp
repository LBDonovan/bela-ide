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
    pinModeFrame(context, 0, P8_07, OUTPUT);
	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numAnalogFrames
// will be 0.

/* basic_blink
* Connect an LED in series with a 470ohm resistor between P8_07 and ground.
* The LED will blink every @interval seconds.
*/

void render(BeagleRTContext *context, void *userData)
{
  static int count=0; //counts elapsed samples
  float interval=0.5; //how often to toggle the LED (in seconds)
  static int status=GPIO_LOW;
	for(unsigned int n=0; n<context->digitalFrames; n++){
    if(count==context->digitalSampleRate*interval){ //if enough samples have elapsed
      count=0; //reset the counter
    // status=digitalReadFrame(context, 0, P8_07);
      if(status==GPIO_LOW) { //toggle the status
          digitalWriteFrame(context, n, P8_07, status); //write the status to the LED
          status=GPIO_HIGH;
      }
      else {
          digitalWriteFrame(context, n, P8_07, status); //write the status to the LED
          status=GPIO_LOW;
      }
    }
    count++;
  }
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BeagleRTContext *context, void *userData)
{
	// Nothing to do here
}
