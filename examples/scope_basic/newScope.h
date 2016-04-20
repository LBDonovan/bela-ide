#include <vector>
#include <stdarg.h>
#include <BeagleRT.h>
#include <oscpkt.hh>

#define FRAMES_STORED 2

class newScope{
    public:
        newScope();
        
        void setup(unsigned int numChannels, float sampleRate);
        void log(float chn1, ...);
        
        void trigger();
        
        std::vector<float> outBuffer;
        
        bool sendingScopeUDP;
        int failedSendCount;
        
    private:
        unsigned int numChannels;
        float sampleRate;
        bool connected;
        
        int frameWidth;
        int channelWidth;
        
        std::vector<float> buffer;
        
        int currentBuffer;
        int writePointer;
        int readPointer;
        
        void start(bool); 
        void triggerNormal();
        void triggerAuto();
        void sendBuffer();
        void scheduleTriggerTask();
        
        bool triggerPrimed;
        bool triggerCollecting;
        bool triggerWaiting;
        bool triggering;
        bool oneShot;
        bool oneShotFired;

        int failedTriggerCount;
        int autoTriggerCount;
        int triggerScheduleCount;
        
        int triggerPointer;
        
        int triggerChannel;
        float triggerLevel;
        int triggerMode;
        int triggerCount;
        int xOffset;
        int triggerDir;
        
        int holdOffSamples;
        float holdOffms;
        
        int upSampling;
        int downSampling;
        int downSampleCount;
        
        void parseMessage(oscpkt::Message);
        
        AuxiliaryTask triggerTask;
        AuxiliaryTask scopeUDPTask;
        
};