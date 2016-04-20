#include <newScope.h>

void newScope::triggerAuto(){
    // if we are currently listening for a trigger
    if (triggerPrimed){
        
        // if we crossed the trigger threshold
        if ((!triggerDir && buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] < triggerLevel // positive trigger direction
            && buffer[channelWidth*triggerChannel+readPointer] >= triggerLevel) || 
            (triggerDir && buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] > triggerLevel // negative trigger direciton
            && buffer[channelWidth*triggerChannel+readPointer] <= triggerLevel)){
            
            //rt_printf("triggered scope\n");
            
            // stop listening for a trigger
            triggerPrimed = false;
            triggerCollecting = true;
            
            // save the readpointer at the trigger point
            triggerPointer = (readPointer-xOffset+channelWidth)%channelWidth;
            
            triggerCount = frameWidth/2 - xOffset;
            
        } else {
            if (autoTriggerCount++ > frameWidth){
                // it's been a whole frameWidth since we've found a trigger, so give a trigger anyway
                triggerPrimed = false;
                triggerCollecting = true;
                
                // save the readpointer at the trigger point
                triggerPointer = (readPointer-xOffset+channelWidth)%channelWidth;
                
                triggerCount = frameWidth/2 - xOffset;
                autoTriggerCount = 0;
            }
        }
        
    } else if (triggerCollecting){
        
        // if a trigger has been detected, and we are still collecting the second half of the triggered frame
        if (--triggerCount){
            /*for (unsigned int i=0; i<numChannels; i++){
                outBuffer[frameWidth*i+writePointer] = buffer[frameWidth*i+writePointer];
            }*/
        } else {
            triggerCollecting = false;
            triggerWaiting = true;
            triggerCount = frameWidth/2 + holdOffSamples;
            
            // copy the previous to next frameWidth/2 samples into the outBuffer
            int startptr = (triggerPointer-frameWidth/2 + channelWidth)%channelWidth;
            int endptr = (triggerPointer+frameWidth/2 + channelWidth)%channelWidth;
            
            if (endptr > startptr){
                for (unsigned int i=0; i<numChannels; i++){
                    std::copy(&buffer[channelWidth*i+startptr], &buffer[channelWidth*i+endptr], outBuffer.begin()+(i*frameWidth));
                }
            } else {
                for (unsigned int i=0; i<numChannels; i++){
                    std::copy(&buffer[channelWidth*i+startptr], &buffer[channelWidth*(i+1)], outBuffer.begin()+(i*frameWidth));
                    std::copy(&buffer[channelWidth*i], &buffer[channelWidth*i+endptr], outBuffer.begin()+((i+1)*frameWidth-endptr));
                }
            }
            
            // the whole frame has been saved in outBuffer, so send it
            sendBuffer();
        }
        
    } else if (triggerWaiting){
        
        // if a trigger has been completed, and we are waiting half a framewidth before looking for another
        if (--triggerCount){
            
        } else {
            triggerWaiting = false;
            triggerPrimed = true;
        }
        
    }
}

void newScope::triggerNormal(){
     //rt_printf("trigger normal\n");
    // if we are currently listening for a trigger
    if (triggerPrimed){
        
        // if we crossed the trigger threshold
        if ((!triggerDir && buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] < triggerLevel // positive trigger direction
            && buffer[channelWidth*triggerChannel+readPointer] >= triggerLevel) || 
            (triggerDir && buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] > triggerLevel // negative trigger direciton
            && buffer[channelWidth*triggerChannel+readPointer] <= triggerLevel)){
            
            //rt_printf("triggered scope\n");
            
            // stop listening for a trigger
            triggerPrimed = false;
            triggerCollecting = true;
            
            // save the readpointer at the trigger point
            triggerPointer = (readPointer-xOffset+channelWidth)%channelWidth;
            
            triggerCount = frameWidth/2 - xOffset;
            
        }
        
    } else if (triggerCollecting){
        
        // if a trigger has been detected, and we are still collecting the second half of the triggered frame
        if (--triggerCount){
            /*for (unsigned int i=0; i<numChannels; i++){
                outBuffer[frameWidth*i+writePointer] = buffer[frameWidth*i+writePointer];
            }*/
        } else {
            triggerCollecting = false;
            triggerWaiting = true;
            triggerCount = frameWidth/2 + holdOffSamples;
            
            // copy the previous to next frameWidth/2 samples into the outBuffer
            int startptr = (triggerPointer-frameWidth/2 + channelWidth)%channelWidth;
            int endptr = (triggerPointer+frameWidth/2 + channelWidth)%channelWidth;
            
            if (endptr > startptr){
                for (unsigned int i=0; i<numChannels; i++){
                    std::copy(&buffer[channelWidth*i+startptr], &buffer[channelWidth*i+endptr], outBuffer.begin()+(i*frameWidth));
                }
            } else {
                for (unsigned int i=0; i<numChannels; i++){
                    std::copy(&buffer[channelWidth*i+startptr], &buffer[channelWidth*(i+1)], outBuffer.begin()+(i*frameWidth));
                    std::copy(&buffer[channelWidth*i], &buffer[channelWidth*i+endptr], outBuffer.begin()+((i+1)*frameWidth-endptr));
                }
            }
            
            // the whole frame has been saved in outBuffer, so send it
            sendBuffer();
        }
        
    } else if (triggerWaiting){
        
        // if a trigger has been completed, and we are waiting half a framewidth before looking for another
        if (--triggerCount){
            
        } else {
            triggerWaiting = false;
            triggerPrimed = true;
        }
        
    }
}