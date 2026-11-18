@echo off
title LeadHarvest Pro - Full Command Center Launcher
echo ===================================================================
echo   LEADHARVEST PRO: LAUNCHING BACKEND + CLIENT + MASTER SWARM
echo ===================================================================
echo Backend Engine: http://127.0.0.1:5002
echo Client Console: http://127.0.0.1:5173
echo Master Console: http://127.0.0.1:5174
echo.
cd /d "%~dp0"
node dev.js --all
pause
