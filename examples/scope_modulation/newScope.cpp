#include <newScope.h>
#include <OSCServer.h>
#include <BeagleRT.h>
#include <UdpClient.h>

extern OSCServer OSC;

newScope* thisScope;

#define SCOPE_UDP_PORT 8677
UdpClient udp;

bool lTriggering;

// aux task functions - they have to be global because aux task
// member functions can be accessed through thisScope, a pointer to the most recently defined scope instance

void send_scope_udp(){
    udp.send(&(thisScope->outBuffer[0]), thisScope->outBuffer.size()*sizeof(float));
    thisScope->sendingScopeUDP = false;
    thisScope->failedSendCount = 0;
}

// call the trigger function
void trigger_aux_task(){
    //rt_printf("trigger aux task\n");
    thisScope->trigger();
}

newScope::newScope(){
    thisScope = this;
}

void newScope::start(bool now){
    
    channelWidth = frameWidth * FRAMES_STORED;
    
    // data is held in a buffer of channelWidth*numChannels floats, with the first channelWidth samples being channel1, the second channel 2 etc
    buffer.resize(numChannels*channelWidth);
    
    outBuffer.resize(numChannels*frameWidth);
    
    writePointer = 0;
    readPointer = 0;
    triggerPointer = 0;
    
    if (now){
        triggerPrimed = true;
    } else {
        triggerPrimed = false;
    }
    triggerCollecting = false;
    triggerWaiting = false;
    oneShot = false;
    oneShotFired = false;

    upSampling = 1;
    downSampling = 1;
    downSampleCount = 1;
    autoTriggerCount = 0;
    
    holdOffms = 20.0;
    holdOffSamples = (int)(44.1*holdOffms*upSampling/downSampling);
    
    udp.setServer("127.0.0.1");
	udp.setPort(SCOPE_UDP_PORT);
	
	triggerTask = BeagleRT_createAuxiliaryTask(trigger_aux_task, 89, "scopeTriggerTask");
	lTriggering = false;
	failedTriggerCount = 0;
	triggerScheduleCount = 0;
	
	scopeUDPTask = BeagleRT_createAuxiliaryTask(send_scope_udp, 89, "scopeUDPSendTask");
	sendingScopeUDP = false;
	failedSendCount = 0;
    
    rt_printf("starting scope trigger mode %i, trigger channel %i trigger level %f, framewidth %i\n", triggerMode, triggerChannel, triggerLevel, frameWidth);

}

// log is called with floats as parameters, one per channel
void newScope::log(float chn1, ...){
    
    if (downSampling > 1){
        if (downSampleCount < downSampling){
            downSampleCount++;
            return;
        }
        downSampleCount = 1;
    }
    
    va_list args;
    va_start (args, chn1);
    
    int startingWritePointer = writePointer;
  
    // save the logged samples into the buffer
    buffer[writePointer] = chn1;

    for (unsigned int i=1; i < numChannels; i++) {
        // iterate over the function arguments, store them in the relevant part of the buffer
        // channels are stored sequentially in the buffer i.e [[channel1], [channel2], etc...]
        buffer[i*channelWidth + writePointer] = (float)va_arg(args, double);
    }

    writePointer = (writePointer+1)%channelWidth;
    
    scheduleTriggerTask();
    
    // if upSampling > 1, save repeated samples into the buffer
    for (int j=1; j<upSampling; j++){
        
        buffer[writePointer] = buffer[startingWritePointer];
    
        for (unsigned int i=1; i < numChannels; i++) {
            buffer[i*channelWidth + writePointer] = buffer[i*channelWidth + startingWritePointer];
        }
    
        writePointer = (writePointer+1)%channelWidth;
        
        scheduleTriggerTask();
        
    }
    
    va_end (args);
    
    
    
    OSC.scheduleAuxReadTask();
    
    /*while (OSC.messageWaiting()){
        rt_printf("real message!\n");
        parseMessage(OSC.popMessage());
    }*/
    
}

void newScope::scheduleTriggerTask(){
    
    if (triggerScheduleCount++ > frameWidth){
        if (!lTriggering){
            lTriggering = true;
            BeagleRT_scheduleAuxiliaryTask(triggerTask);
            //rt_printf("task scheduled\n");
        } else if (++failedTriggerCount > 128){
            failedTriggerCount = 0;
            BeagleRT_scheduleAuxiliaryTask(triggerTask);
            rt_printf("trigger timeout\n");
        }
        triggerScheduleCount = 0;
    }
    
    //rt_printf("task not scheduled\n");
}

// trigger should be called by an aux task as often as possible - ideally every block
void newScope::trigger(){
    
    if (!oneShot || (oneShot && !oneShotFired)){

        // iterate over the samples between the read and write pointers and check for / deal with triggers
        if (triggerMode == 0){
            while (readPointer != writePointer){
                triggerNormal();
                readPointer = (readPointer+1)%channelWidth;
            }
        } else if (triggerMode == 1){
            while (readPointer != writePointer){
                triggerAuto();
                readPointer = (readPointer+1)%channelWidth;
            }
        }
        
    }
    
    // while we're here, check our OSC messages...
    while (OSC.messageWaiting()){
        parseMessage(OSC.popMessage());
    }
    
    lTriggering = false;
    failedTriggerCount = 0;
    //rt_printf("trigger completed \n");
    //scheduleTriggerTask();
}



void newScope::sendBuffer(){
    
    // schedule the OSC message to be sent on the next OSC.sendMessage aux task
    // &outBuffer[0] is a pointer to the array underneath the vector
    //OSC.queueMessage(OSC.newMessage.to("/scope-log").add(&outBuffer[0], outBuffer.size()*sizeof(float)).end());
    ////rt_printf("sent buffer of length %i\n", outBuffer.size()*sizeof(float));
    
    //scopeUDPBuffer = &outBuffer[0];
    //scopeUDPBufferSize = outBuffer.size()*sizeof(float);
    if (!oneShot || (oneShot && !oneShotFired)){
        oneShotFired = true;
        if (!sendingScopeUDP){
            sendingScopeUDP = true;
            //rt_printf("scheduling send\n");
            BeagleRT_scheduleAuxiliaryTask(scopeUDPTask);
        } else if (++failedSendCount > 5){
            failedSendCount = 0;
            BeagleRT_scheduleAuxiliaryTask(scopeUDPTask);
            rt_printf("send UDP timeout\n");
        }
    }
    
    // send the outbuffer directly over dedicated UDP socket
    //rt_printf("sending outBuffer %i\n", udp.send(&outBuffer[0], outBuffer.size()*sizeof(float)));
    //rt_printf("sent\n");
}