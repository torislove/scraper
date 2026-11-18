@echo off
title LeadHarvest Pro - Backend Intelligence Engine (Port 5002)
echo ===================================================================
echo   LEADHARVEST PRO: BACKEND INTELLIGENCE ENGINE
echo ===================================================================
echo Listening on: http://127.0.0.1:5002
echo.
cd /d "%~dp0\server"
node --max-old-space-size=4096 index.js
pause
