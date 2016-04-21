# BeagleRT IDE
# Liam Donovan - based on Makefile for BeagleRT by Andrew McPherson

# This Makefile is intended for use with the node IDE only
# must be called as: make all PROJECT=project_name

# if the PROJECT variable is not set, throw an error and exit
# otherwise, calling make clean without setting PROJECT results in entire projects directory being rm -rf'ed
ifndef PROJECT
	$(error PROJECT is not set)
endif

PROJECT_DIR := $(abspath ../projects/$(PROJECT))

RM := rm -rf
STATIC_LIBS := ./libNE10.a
LIBS := -lrt -lnative -lxenomai -lbeaglert -lprussdrv -lsndfile -lpd

INCLUDES := -I/usr/include/ne10 -I/usr/xenomai/include -I$(PROJECT_DIR) -I../include


ASM_SRCS := $(wildcard $(PROJECT_DIR)/*.S)
ASM_OBJS := $(addprefix $(PROJECT_DIR)/build/,$(notdir $(ASM_SRCS:.S=.o)))
ASM_DEPS := $(addprefix $(PROJECT_DIR)/build/,$(notdir $(ASM_SRCS:.S=.d)))

C_SRCS := $(wildcard $(PROJECT_DIR)/*.c)
C_OBJS := $(addprefix $(PROJECT_DIR)/build/,$(notdir $(C_SRCS:.c=.o)))
C_DEPS := $(addprefix $(PROJECT_DIR)/build/,$(notdir $(C_SRCS:.c=.d)))

CPP_SRCS := $(wildcard $(PROJECT_DIR)/*.cpp)
CPP_OBJS := $(addprefix $(PROJECT_DIR)/build/,$(notdir $(CPP_SRCS:.cpp=.o)))
CPP_DEPS := $(addprefix $(PROJECT_DIR)/build/,$(notdir $(CPP_SRCS:.cpp=.d)))

# All = build BeagleRT
all: SYNTAX_FLAG :=
all: OPTIMISATION_FLAG := -O2 -march=armv7-a -mtune=cortex-a8 -mfloat-abi=hard -mfpu=neon --fast-math -ftree-vectorize
all: BeagleRT

# syntax = check syntax
syntax: SYNTAX_FLAG := -fsyntax-only
syntax: OPTIMISATION_FLAG := -O0
syntax: SYNTAX

# debug
debug: DEBUG_FLAG := -g
debug: OPTIMISATION_FLAG := -O0
debug: BeagleRT

# Rule for user-supplied C++ files
$(PROJECT_DIR)/build/%.o: $(PROJECT_DIR)/%.cpp
	@echo 'Building $(notdir $<)...'
	@g++ $(DEBUG_FLAG) $(SYNTAX_FLAG) $(INCLUDES) -std=c++0x $(OPTIMISATION_FLAG) -Wall -c -fmessage-length=0 -U_FORTIFY_SOURCE -MMD -MP -MF"$(@:%.o=%.d)" -o "$@" "$<"
	@echo '	...done'
	@echo ' '

# Rule for user-supplied C files
$(PROJECT_DIR)/build/%.o: $(PROJECT_DIR)/%.c
	@echo 'Building $(notdir $<)...'
	@gcc $(DEBUG_FLAG) $(SYNTAX_FLAG) $(INCLUDES) $(OPTIMISATION_FLAG) -Wall -c -fmessage-length=0 -U_FORTIFY_SOURCE -MMD -MP -MF"$(@:%.o=%.d)" -o "$@" "$<"
	@echo '	...done'
	@echo ' '

# Rule for user-supplied assembly files
$(PROJECT_DIR)/build/%.o: $(PROJECT_DIR)/%.S
	@echo 'Building $(notdir $<)...'
	@as  -o "$@" "$<"
	@echo '	...done'
	@echo ' '

# Rule for building BeagleRT
BeagleRT: $(ASM_OBJS) $(C_OBJS) $(CPP_OBJS)
	@echo 'Linking...'
#	@echo 'Invoking: GCC C++ Linker'
	@g++ $(DEBUG_FLAG) $(SYNTAX_FLAG) -L/usr/xenomai/lib -L/usr/lib/arm-linux-gnueabihf -pthread -Wpointer-arith -o "$(PROJECT_DIR)/$(PROJECT)" $(ASM_OBJS) $(C_OBJS) $(CPP_OBJS) $(STATIC_LIBS) $(LIBS)
	@echo '	...done'
	
# This rule compiles c and c++ source files without output or linking
SYNTAX: $(C_OBJS) $(CPP_OBJS)

# include all dependencies - necessary to force recompilation when a header is changed
# (had to remove -MT"$(@:%.o=%.d)" from g++/gcc call for this to work)
-include $(CPP_DEPS) $(C_DEPS) $(ASM_DEPS)

# Remove object files and executable of PROJECT
clean:
	-$(RM) $(PROJECT_DIR)/build/* $(PROJECT_DIR)/$(PROJECT)

post-build:
# Nothing to do here (for now)

.PHONY: all clean dependents
.SECONDARY: post-build
