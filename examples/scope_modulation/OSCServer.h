#ifndef __OSCServer_H_INCLUDED__
#define __OSCServer_H_INCLUDED__ 

#include <BeagleRT.h>
#include <UdpServer.h>
#include <UdpClient.h>
//#include "oscpkt.hh"
#include "OSCMessageFactory.h"
#include <queue>

#define UDP_RECIEVE_PORT 8675
#define UDP_RECIEVE_TIMEOUT_MS 2
#define UDP_RECIEVE_MAX_LENGTH 16384

#define UDP_SEND_PORT 8676
#define OSC_SEND_MAX_SIZE 16384

//class AuxiliaryTask;

class OSCServer{
    public:
        OSCServer();
        
        void checkMessages();
        void sendMessage(oscpkt::Message);
        
        void queueMessage(oscpkt::Message);     // audio thread safe - queues message
        void sendQueue();    // only ever run on auxiliary thread. Sends all messages.
        
        void sendMessageNow(oscpkt::Message);   // NOT audio thread safe - can be used in setup
        
        bool recieveMessage();
        bool messageWaiting();
        
        void createAuxTasks();
        void scheduleAuxTasks();
        void scheduleAuxReadTask();
        
        oscpkt::Message popMessage();
        
        OSCMessageFactory newMessage;
        
    private:
        UdpServer inSocket;
        UdpClient outSocket;

        AuxiliaryTask messageCheckTask;
        AuxiliaryTask messageSendTask;
        
        std::queue<oscpkt::Message> outQueue;
        std::queue<oscpkt::Message> inQueue;
        
        bool checkingMessages;
        bool sendingMessages;
        int inMessage[UDP_RECIEVE_MAX_LENGTH];

};



#endif