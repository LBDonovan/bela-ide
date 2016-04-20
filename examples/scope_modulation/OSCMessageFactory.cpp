#include "OSCMessageFactory.h"

OSCMessageFactory& OSCMessageFactory::to(std::string addr){
    msg.init(addr);
    return *this;
}

OSCMessageFactory& OSCMessageFactory::add(std::string in){
    msg.pushStr(in);
    return *this;
}
OSCMessageFactory& OSCMessageFactory::add(int in){
    msg.pushInt32(in);
    return *this;
}
OSCMessageFactory& OSCMessageFactory::add(float in){
    msg.pushFloat(in);
    return *this;
}
OSCMessageFactory& OSCMessageFactory::add(bool in){
    msg.pushBool(in);
    return *this;
}
OSCMessageFactory& OSCMessageFactory::add(void *ptr, int size){
    msg.pushBlob(ptr, size);
    return *this;
}

oscpkt::Message OSCMessageFactory::end(){
    return msg;
}
