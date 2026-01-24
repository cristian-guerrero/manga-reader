@echo off
REM Manga Viewer Launcher
REM Sets PATH to include DLL directory

setlocal
set "PATH=%~dp0dll;%PATH%"
set "VIPSHOME=%~dp0lib"

start "" "%~dp0MangaViewer.exe" %*
