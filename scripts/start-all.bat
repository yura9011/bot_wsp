@echo off
echo.
echo ===== WHATSAPP DEMO - INICIANDO SERVICIOS =====
echo.
echo 🤖 Iniciando Bot de WhatsApp...
start "WhatsApp Bot" cmd /k "node bot.js"
timeout /t 3 /nobreak >nul

echo 📊 Iniciando Dashboard Web...
start "Dashboard" cmd /k "node dashboard.js"
timeout /t 2 /nobreak >nul

echo.
echo ✅ Servicios iniciados:
echo    🤖 Bot WhatsApp: Ventana separada
echo    📊 Dashboard: http://localhost:3001
echo.
echo 💡 Para detener: Cerrar las ventanas de comandos
echo ===============================================
pause
