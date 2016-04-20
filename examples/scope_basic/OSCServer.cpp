#include "OSCServer.h"

// sorry for globals - AuxiliaryTask requires it

OSCServer* thisOSCServer;

void check_OSC_Messages(){
    thisOSCServer->checkMessages();
}

void send_OSC_Messages(){
    thisOSCServer->sendQueue(); 
}

OSCServer::OSCServer() {
    inSocket.init(UDP_RECIEVE_PORT);
	outSocket.setServer("127.0.0.1");
	outSocket.setPort(UDP_SEND_PORT);

    checkingMessages = false;
    sendingMessages = false;
    
    thisOSCServer = this;
}

void OSCServer::checkMessages(){
    checkingMessages = true;
    if (inSocket.waitUntilReady(true, UDP_RECIEVE_TIMEOUT_MS)){
        int msgLength = inSocket.read(&inMessage, UDP_RECIEVE_MAX_LENGTH, false);
        oscpkt::PacketReader pr(inMessage, msgLength);
        oscpkt::Message *inmsg;
        while (pr.isOk() && (inmsg = pr.popMessage()) != 0) {
            inQueue.push(*inmsg);
        }
    }
    checkingMessages = false;
} 

void OSCServer::sendQueue(){
    
    sendingMessages = true;
    
    if (!outQueue.empty()){
    
        oscpkt::PacketWriter pw;
        
        while(!outQueue.empty()){
            pw.addMessage(outQueue.front());
            outQueue.pop();
            //rt_printf("BeagleRT: packed message\n");
        }
        
        char* buffer = pw.packetData();
        outSocket.send(buffer, pw.packetSize());

    }
    
    sendingMessages = false;
}

void OSCServer::sendMessageNow(oscpkt::Message msg){
    
        oscpkt::PacketWriter pw;
        pw.addMessage(msg);
        
        char* buffer = pw.packetData();
        outSocket.send(buffer, pw.packetSize());
        rt_printf("BeagleRT: sent message");
}

void OSCServer::queueMessage(oscpkt::Message msg){
    
        outQueue.push(msg);
}

bool OSCServer::recieveMessage(){
    // if there are OSC messages waiting, decode and queue them
    // not audio-thread safe!
    rt_printf("reading messages\n");
    if (inSocket.waitUntilReady(true, 10)){
        rt_printf("message recieved\n");
        char buffer[UDP_RECIEVE_MAX_LENGTH];
        int msgLength = inSocket.read(&buffer, UDP_RECIEVE_MAX_LENGTH, false);
        
        oscpkt::PacketReader pr(buffer, msgLength);
        oscpkt::Message *inmsg;
        while (pr.isOk() && (inmsg = pr.popMessage()) != 0) {
            inQueue.push(*inmsg);
        }
        rt_printf("message queue: %i\n", inQueue.size()); 
        return true;
    } else {
        rt_printf("message timeout\n"); 
        return false;
    }
}

oscpkt::Message OSCServer::popMessage(){
    oscpkt::Message msg;
    if (!inQueue.empty()){
        msg = inQueue.front();
        inQueue.pop();
        return msg;
    }
    msg.init("/empty");
    return msg;
}

bool OSCServer::messageWaiting(){
    return !inQueue.empty();
}

void OSCServer::createAuxTasks(){
    messageCheckTask = BeagleRT_createAuxiliaryTask(check_OSC_Messages, 91, "messageCheckTask");
	messageSendTask = BeagleRT_createAuxiliaryTask(send_OSC_Messages, 91, "messageSendTask");
}

void OSCServer::scheduleAuxReadTask(){
    if (!checkingMessages){
        BeagleRT_scheduleAuxiliaryTask(messageCheckTask);
    }
}

void OSCServer::scheduleAuxTasks(){
    if (!checkingMessages){
        BeagleRT_scheduleAuxiliaryTask(messageCheckTask);
    }
    if (!sendingMessages){
        BeagleRT_scheduleAuxiliaryTask(messageSendTask);
    }
}