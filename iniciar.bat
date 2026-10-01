@echo off
chcp 65001 >nul
title Servidor - Correcoes Operacionais PROSECURITY
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo O Node.js nao esta instalado neste computador.
  echo Baixe a versao LTS em https://nodejs.org , instale e execute este arquivo de novo.
  echo.
  pause
  exit /b 1
)
node server.js
echo.
echo O servidor foi encerrado.
pause
