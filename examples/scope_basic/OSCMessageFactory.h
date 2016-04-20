#ifndef __OSCMessageFactory_H_INCLUDED__
#define __OSCMessageFactory_H_INCLUDED__ 

#include "oscpkt.hh"
#include <string>

class OSCMessageFactory{
    public:
        OSCMessageFactory& to(std::string);
        OSCMessageFactory& add(std::string);
        OSCMessageFactory& add(int);
        OSCMessageFactory& add(float);
        OSCMessageFactory& add(bool);
        OSCMessageFactory& add(void *ptr, int size);
        oscpkt::Message end();
    private:
        oscpkt::Message msg;
};

#endif