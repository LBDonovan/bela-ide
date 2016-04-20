#include <newScope.h>

void newScope::parseMessage(oscpkt::Message msg){
    
    ////rt_printf("parsing message\n");

    if (msg.match("/scope-settings")) {
        //rt_printf("recieved scope settings message\n");
        int _frameWidth;
        int _triggerMode;
        int _triggerChannel;
        float _triggerLevel;
        int _xOffset;
        int _triggerDir;
        if (msg.arg().popInt32(_frameWidth).popInt32(_triggerMode)
            .popInt32(_triggerChannel).popFloat(_triggerLevel).popInt32(_xOffset).popInt32(_triggerDir)
            .isOkNoMoreArgs()){
            
            triggerMode = _triggerMode;
            frameWidth = _frameWidth;
            triggerChannel = _triggerChannel;
            triggerLevel = _triggerLevel;
            xOffset = _xOffset;
            triggerDir = _triggerDir;
            
            channelWidth = frameWidth * FRAMES_STORED;
            
            //buffer.clear();
            buffer.resize(numChannels*channelWidth);
            
            //outBuffer.clear();
            outBuffer.resize(numChannels*frameWidth);
            
            writePointer = 0;
            triggerPointer = 0;
            
            triggerPrimed = true;
            triggerCollecting = false;
            triggerWaiting = false;
            
        }
    } else if (msg.match("/scope-hold-off")){
        float holdOff;
        if (msg.arg().popFloat(holdOff).isOkNoMoreArgs()){
            holdOffms = holdOff;
            holdOffSamples = (int)(44.1*holdOffms*upSampling/downSampling);
            rt_printf("hold off set to %fms, %i samples\n", holdOffms, holdOffSamples);
        }
    } else if (msg.match("/scope-x-offset")){
        int _xOffset;
        if (msg.arg().popInt32(_xOffset).isOkNoMoreArgs()){
            xOffset = _xOffset;
            rt_printf("x-offset set to %i samples\n", xOffset);
        }
    } else if (msg.match("/scope-trigger-level")){
        float _triggerLevel;
        if (msg.arg().popFloat(_triggerLevel).isOkNoMoreArgs()){
            triggerLevel = _triggerLevel;
            rt_printf("trigger level set to %f\n", triggerLevel);
        }
    } else if (msg.match("/scope-trigger-direction")){
        int _triggerDir;
        if (msg.arg().popInt32(_triggerDir).isOkNoMoreArgs()){
            triggerDir = _triggerDir;
            rt_printf("triggerDir set to %i samples\n", triggerDir);
        }
    } else if (msg.match("/scope-trigger-channel")){
        int _triggerChannel;
        if (msg.arg().popInt32(_triggerChannel).isOkNoMoreArgs()){
            triggerChannel = _triggerChannel;
            rt_printf("triggerChannel set to %i samples\n", triggerChannel);
        }
    } else if (msg.match("/scope-sampling")){
        int _upSampling;
        int _downSampling;
        if (msg.arg().popInt32(_upSampling).popInt32(_downSampling).isOkNoMoreArgs()){
            upSampling = _upSampling;
            downSampling = _downSampling;
            downSampleCount = 1;
            rt_printf("Upsampling: %i, downsampling: %i\n", upSampling, downSampling);
            //holdOffSamples = (int)(44.1*holdOffms*upSampling/downSampling);
            //rt_printf("hold off set to %fms, %i samples\n", holdOffms, holdOffSamples);
        }
    } else if (msg.match("/scope-trigger-mode")){
        int _triggerMode;
        if (msg.arg().popInt32(_triggerMode).isOkNoMoreArgs()){
            triggerMode = _triggerMode;
            rt_printf("triggerMode set to %i samples\n", _triggerMode);
        }
    } else if (msg.match("/scope-one-shot")){
        oneShot = !oneShot;
        rt_printf("One shot: %i", oneShot);
    }

    
    

}