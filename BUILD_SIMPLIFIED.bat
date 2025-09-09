@echo off
title Sistema POS - Build Simplificado
color 0A
chcp 65001 >nul

echo.
echo  ██████╗  ██████╗ ███████╗
echo  ██╔══██╗██╔═══██╗██╔════╝ 
echo  ██████╔╝██║   ██║███████╗
echo  ██╔═══╝ ██║   ██║╚════██║
echo  ██║     ╚██████╔╝███████║
echo  ╚═╝      ╚═════╝ ╚══════╝
echo.
echo  🔧 BUILD SIMPLIFICADO v2.1
echo  ==========================
echo.

REM === VERIFICACIONES ===
echo [1/7] 🔍 Verificando Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js NO está instalado
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

REM === LIMPIAR ===
echo.
echo [2/7] 🧹 Limpiando entorno...
if exist dist rmdir /s /q dist 2>nul
if exist database\pos.db del database\pos.db 2>nul
if exist node_modules rmdir /s /q node_modules 2>nul
if exist backend\node_modules rmdir /s /q backend\node_modules 2>nul
echo ✅ Entorno limpio

REM === INSTALAR DEPENDENCIAS PRINCIPALES ===
echo.
echo [3/7] 📦 Instalando dependencias principales...
call npm install --silent
if errorlevel 1 (
    echo ❌ Error instalando dependencias principales
    pause
    exit /b 1
)
echo ✅ Dependencias principales instaladas

REM === INSTALAR DEPENDENCIAS BACKEND ===
echo.
echo [4/7] 🔧 Instalando dependencias backend...
cd backend
call npm install jsonwebtoken@9.0.2 moment@2.29.4 --save
if errorlevel 1 (
    echo ❌ Error instalando jsonwebtoken y moment
    cd ..
    pause
    exit /b 1
)

call npm install --silent
if errorlevel 1 (
    echo ❌ Error instalando otras dependencias backend
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ Dependencias backend instaladas

REM === VERIFICAR DEPENDENCIAS CRITICAS ===
echo.
echo [5/7] 🔍 Verificando dependencias críticas...
if not exist "backend\node_modules\jsonwebtoken" (
    echo ❌ jsonwebtoken no encontrado
    echo Instalando manualmente...
    cd backend
    call npm install jsonwebtoken --save
    cd ..
)

if not exist "backend\node_modules\moment" (
    echo ❌ moment no encontrado
    echo Instalando manualmente...
    cd backend
    call npm install moment --save
    cd ..
)
echo ✅ Dependencias críticas verificadas

REM === CREAR USUARIOS Y TABLAS ===
echo.
echo [6/7] 👥 Creando usuarios y tablas automáticamente...
call node create-users.js
if errorlevel 1 (
    echo ❌ Error creando usuarios
    pause
    exit /b 1
)
echo ✅ Base de datos configurada con admin + 2 cajeros

REM === BUILD ===
echo.
echo [7/7] 🏗️ Compilando aplicación...
call npm run build
if errorlevel 1 (
    echo ❌ Error en compilación
    pause
    exit /b 1
)
echo ✅ Aplicación compilada

REM === CREAR SCRIPTS DE INICIO ===
echo.
echo 📝 Creando scripts de inicio...

REM Script para ejecutable portable
for %%f in ("dist\win-unpacked\*.exe") do (
    echo @echo off> INICIAR_POS.bat
    echo title Sistema POS>> INICIAR_POS.bat
    echo echo 🏪 Iniciando Sistema POS...>> INICIAR_POS.bat
    echo start "" "%%f">> INICIAR_POS.bat
    echo exit>> INICIAR_POS.bat
    echo ✅ INICIAR_POS.bat creado
)

REM Script para instalador
for %%f in ("dist\*Setup*.exe") do (
    echo @echo off> INSTALAR_POS.bat
    echo title Instalar Sistema POS>> INSTALAR_POS.bat
    echo echo 💿 Iniciando instalador...>> INSTALAR_POS.bat
    echo start "" "%%f">> INSTALAR_POS.bat
    echo exit>> INSTALAR_POS.bat
    echo ✅ INSTALAR_POS.bat creado
)

echo.
echo 🎉 ¡BUILD COMPLETADO!
echo ==================
echo.
echo 📱 ARCHIVOS GENERADOS:
for %%f in ("dist\win-unpacked\*.exe") do (
    echo    ✅ Ejecutable: %%~nxf
)
for %%f in ("dist\*Setup*.exe") do (
    echo    ✅ Instalador: %%~nxf
)
echo.
echo 🔐 CREDENCIALES:
echo    👤 admin / 123456
echo    👤 cajero1 / cajero1  
echo    👤 cajero2 / cajero2
echo.
echo 🚀 USAR:
echo    • INICIAR_POS.bat - Para pruebas
echo    • INSTALAR_POS.bat - Para instalar en otras PCs
echo.

echo ¿Desea probar el ejecutable ahora? (S/N)
set /p PROBAR="> "
if /i "%PROBAR%"=="S" (
    for %%f in ("dist\win-unpacked\*.exe") do (
        start "" "%%f"
        goto :done
    )
)

:done
echo ✅ Build completado exitosamente
pause