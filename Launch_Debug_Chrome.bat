@echo off
echo Starting Chrome with DevTools Remote Debugging on port 9222...
taskkill /F /IM chrome.exe >nul 2>&1
ping 127.0.0.1 -n 2 >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data\DebugProfile" "http://localhost:5173/command"
echo Chrome is now open and listening on port 9222!
