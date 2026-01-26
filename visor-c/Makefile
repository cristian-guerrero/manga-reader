# Makefile for Manga Viewer PoC
# Works on Linux/macOS with raylib installed

CC = gcc
CFLAGS = -Wall -Wextra -O2
LDFLAGS = 

# Detect OS
UNAME_S := $(shell uname -s)

ifeq ($(UNAME_S),Linux)
    LDFLAGS += -lraylib -lGL -lm -lpthread -ldl -lrt -lX11 -Wl,-rpath,'$$ORIGIN/lib'
endif
ifeq ($(UNAME_S),Darwin)
    LDFLAGS += -lraylib -framework OpenGL -framework Cocoa -framework IOKit -framework CoreVideo
endif

# Use pkg-config if available
PKG_CONFIG := $(shell which pkg-config 2>/dev/null)
ifdef PKG_CONFIG
    RAYLIB_EXISTS := $(shell pkg-config --exists raylib && echo yes)
    ifeq ($(RAYLIB_EXISTS),yes)
        CFLAGS += $(shell pkg-config --cflags raylib)
        LDFLAGS += $(shell pkg-config --libs raylib)
    endif
endif

TARGET = viewer
SRC = main.c

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

clean:
	rm -f $(TARGET)

run: $(TARGET)
	./$(TARGET)

.PHONY: all clean run
