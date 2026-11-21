@echo off
REM ---------------------------------------------------------------------------
REM Local development helper only. Public users install from the Chrome Web
REM Store; this script never ships in the product UI.
REM
REM Launches a separate Chrome profile with this repo's extension loaded and
REM opens the local Command Center, so you do not have to click through
REM chrome://extensions by hand.
REM ---------------------------------------------------------------------------
setlocal

set "REPO=%~dp0.."
for %%I in ("%REPO%") do set "REPO=%%~fI"
set "EXT=%REPO%\extension"

if not exist "%EXT%\manifest.json" (
  echo Could not find the extension at:
  echo   %EXT%
  pause
  exit /b 1
)

set "PROFILE=%TEMP%\scraper-ram-turbo-dev-profile"
if not exist "%PROFILE%" mkdir "%PROFILE%"

echo Opening Chrome with RAM Turbo loaded from:
echo   %EXT%
echo.

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not defined CHROME (
  echo Chrome was not found in the usual places.
  echo Open chrome://extensions and load this folder manually:
  echo   %EXT%
  pause
  exit /b 1
)

start "" "%CHROME%" --user-data-dir="%PROFILE%" --load-extension="%EXT%" --new-window "http://localhost:5173/command"
exit /b 0
