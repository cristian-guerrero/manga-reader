// input.h - Input handling (mouse, keyboard, drag-and-drop)
#ifndef INPUT_H
#define INPUT_H

#include "../include/types.h"

// Handle all input (mouse wheel, drag, keyboard, auto-scroll)
void HandleInput(AppState* state);

// Handle file/folder drag and drop
void HandleDragDrop(AppState* state);

#endif // INPUT_H
