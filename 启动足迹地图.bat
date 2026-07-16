@echo off
chcp 65001 >nul
title 足迹地图 - 个人旅游记录工具
echo.
echo   🗺️  足迹地图启动中...
echo.
cd /d "%~dp0"
start "" http://localhost:27286
node server.js
pause
