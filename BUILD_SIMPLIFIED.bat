@echo off
title Sistema POS - Build Simplificado LIMPIO
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
echo  🔧 BUILD LIMPIO v2.3
echo  ====================
echo.

REM === LIMPIEZA FORZADA ===
echo [1/8] 🧹 Limpieza completa forzada...

REM Eliminar base de datos con múltiples métodos
if exist database\pos.db (
    echo Eliminando database\pos.db...
    attrib -r database\pos.db 2>nul
    del /f /q database\pos.db 2>nul
    if exist database\pos.db (
        echo ⚠️ Forzando eliminación...
        taskkill /f /im node.exe 2>nul
        timeout /t 2 /nobreak >nul
        del /f /q database\pos.db 2>nul
    )
)

REM Eliminar todos los archivos .db
if exist database\*.db del /f /q database\*.db 2>nul

REM Limpiar directorios
if exist dist rmdir /s /q dist 2>nul
if exist node_modules rmdir /s /q node_modules 2>nul
if exist backend\node_modules rmdir /s /q backend\node_modules 2>nul

REM Verificar limpieza
if exist database\pos.db (
    echo ❌ ERROR: No se pudo eliminar la base de datos
    echo Por favor cierra todas las aplicaciones y ejecuta como administrador
    pause
    exit /b 1
)
echo ✅ Base de datos eliminada completamente

REM === VERIFICACIONES ===
echo.
echo [2/8] 🔍 Verificando Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js NO está instalado
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

REM === INSTALAR DEPENDENCIAS PRINCIPALES ===
echo.
echo [3/8] 📦 Instalando dependencias principales...
call npm install --silent
if errorlevel 1 (
    echo ❌ Error instalando dependencias principales
    pause
    exit /b 1
)
echo ✅ Dependencias principales instaladas

REM === INSTALAR DEPENDENCIAS BACKEND ===
echo.
echo [4/8] 🔧 Instalando dependencias backend...
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

REM === LIMPIEZA COMPLETA DE BASE DE DATOS ===
echo.
echo [5/8] 🗄️ Limpieza completa de base de datos...
call node clean-database.js
if errorlevel 1 (
    echo ❌ Error en limpieza de base de datos
    pause
    exit /b 1
)
echo ✅ Base de datos limpia verificada

REM === CREAR USUARIOS Y TABLAS ===
echo.
echo [6/8] 👥 Creando usuarios y estructura de base de datos...
call node create-users.js
if errorlevel 1 (
    echo ❌ Error creando usuarios
    pause
    exit /b 1
)
echo ✅ Usuarios creados: admin + cajeros

REM === CREAR PRODUCTOS Y CATEGORÍAS ===
echo.
echo [7/8] 🍔 Creando productos y categorías específicas...
call node create-products.js
if errorlevel 1 (
    echo ❌ Error creando productos
    pause
    exit /b 1
)
echo ✅ Productos y categorías configurados

REM === VERIFICACIÓN FINAL CON ARCHIVO SEPARADO ===
echo.
echo [7.5/8] 🔍 Verificación final de categorías...
call node verify-categories.js
if errorlevel 1 (
    echo ❌ Error: Se encontraron categorías incorrectas
    pause
    exit /b 1
)
echo ✅ Categorías verificadas correctamente

REM === BUILD ===
echo.
echo [8/8] 🏗️ Compilando aplicación...
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
echo 🎉 ¡BUILD COMPLETADO SIN CATEGORÍAS EXTRAÑAS!
echo ===============================================
echo.
echo 📱 ARCHIVOS GENERADOS:
for %%f in ("dist\win-unpacked\*.exe") do (
    echo    ✅ Ejecutable: %%~nxf
)
for %%f in ("dist\*Setup*.exe") do (
    echo    ✅ Instalador: %%~nxf
)
echo.
echo 🏷️ CATEGORÍAS CONFIRMADAS:
echo    ✅ PLATOS Y PORCIONES
echo    ✅ GASEOSAS Y JUGOS  
echo    ✅ REFRESCOS NATURALES
echo    ✅ EXTRAS
echo.
echo 🔐 CREDENCIALES:
echo    👤 admin / 123456
echo    👤 cajero1 / cajero1  
echo    👤 cajero2 / cajero2
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
echo ✅ Build completado con base de datos limpia y verificada
pause