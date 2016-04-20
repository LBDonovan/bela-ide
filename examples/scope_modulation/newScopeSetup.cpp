#include <newScope.h>
#include <OSCServer.h>

OSCServer OSC;

// should be called once during main setup
void newScope::setup(unsigned int _numChannels, float _sampleRate){
    
    numChannels = _numChannels;
    sampleRate = _sampleRate;
    
    rt_printf("Setting up scope with %i channels at a sample rate of %fHz\n", numChannels, sampleRate);
    
    // send the /setup-scope OSC message to node and wait (blocking) for the reply
    bool setupReply = false;
    int sendFailures = 0;
    OSC.sendMessageNow(OSC.newMessage.to("/setup-scope").add((int)numChannels).add(sampleRate).end());
    
    rt_printf("Sent setup\n");
    usleep(100000);
    rt_printf("starting loop\n");
    while(!setupReply){
        rt_printf("checking message\n");
        if (OSC.recieveMessage()){
            rt_printf("Message recieved!\n");
            oscpkt::Message msg = OSC.popMessage();
            if (msg.addressPattern().c_str()[0] == '/'){
                rt_printf("%s\n", msg.addressPattern().c_str());
            }
            if (msg.match("/scope-setup-reply")) {
                bool _connected;
                int _frameWidth;
                int _triggerMode;
                int _triggerChannel;
                float _triggerLevel;
                int _xOffset;
                int _triggerDir;
                if (msg.arg().popBool(_connected).popInt32(_frameWidth).popInt32(_triggerMode)
                    .popInt32(_triggerChannel).popFloat(_triggerLevel).popInt32(_xOffset).popInt32(_triggerDir)
                    .isOkNoMoreArgs()){
                    
                    connected = _connected;
                    triggerMode = _triggerMode;
                    frameWidth = _frameWidth;
                    triggerChannel = _triggerChannel;
                    triggerLevel = _triggerLevel;
                    xOffset = _xOffset;
                    triggerDir = _triggerDir;
                    setupReply = true;
                    
                    start(connected);
                    
                }
            } else {
                //setupReply = true;
                rt_printf("not right\n");
            }
        } else {
            
            if (sendFailures++ > 10){
                rt_printf("Could not connect to node, scope will not work\n");
                setupReply = true;
            } else {
                // timeout - try again
                OSC.sendMessageNow(OSC.newMessage.to("/setup-scope").add((int)numChannels).add(sampleRate).end());
                //rt_printf("Sent setup\n");
                usleep(100000);
                //rt_printf("Sleep done\n");
            }
            
        }
    }
    
    // Create aux tasks
    OSC.createAuxTasks();
    
    
    rt_printf("Finished scope setup\n");
    
}