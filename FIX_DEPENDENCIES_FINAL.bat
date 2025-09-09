@echo off
title Corrigiendo Dependencias del Ejecutable
color 0C
chcp 65001 >nul

echo.
echo 🔧 CORRIGIENDO DEPENDENCIAS DEL EJECUTABLE
echo ========================================
echo.

REM Verificar que dist existe
if not exist dist (
    echo ❌ Carpeta dist no encontrada
    echo 💡 Ejecuta primero: npm run build
    pause
    exit /b 1
)

echo ✅ Carpeta dist encontrada

REM Buscar la estructura del backend
set BACKEND_PATH=""
if exist "dist\win-unpacked\resources\app\backend" (
    set BACKEND_PATH=dist\win-unpacked\resources\app\backend
    echo ✅ Backend encontrado en: app\backend
) else if exist "dist\win-unpacked\resources\app.asar.unpacked\backend" (
    set BACKEND_PATH=dist\win-unpacked\resources\app.asar.unpacked\backend
    echo ✅ Backend encontrado en: app.asar.unpacked\backend
) else (
    echo ❌ Backend no encontrado en dist
    echo 💡 Creando estructura manualmente...
    mkdir "dist\win-unpacked\resources\app.asar.unpacked" 2>nul
    xcopy /E /I /Y backend "dist\win-unpacked\resources\app.asar.unpacked\backend" >nul 2>&1
    set BACKEND_PATH=dist\win-unpacked\resources\app.asar.unpacked\backend
    echo ✅ Backend copiado a: app.asar.unpacked\backend
)

echo.
echo 📦 INSTALANDO DEPENDENCIAS EN: %BACKEND_PATH%
echo.

REM Guardar directorio actual
set ORIGINAL_DIR=%CD%

REM Ir al directorio del backend en dist
cd /d "%BACKEND_PATH%"

REM Verificar que estamos en el directorio correcto
echo 📂 Directorio actual: %CD%

REM Eliminar node_modules si existe
if exist node_modules (
    echo 🗑️ Eliminando node_modules anterior...
    rmdir /s /q node_modules
)

REM Copiar package.json desde backend original
echo 📋 Copiando package.json...
copy "%ORIGINAL_DIR%\backend\package.json" . >nul 2>&1

REM Instalar dependencias específicas
echo 📦 Instalando dependencias críticas...
echo    - jsonwebtoken
echo    - moment  
echo    - express
echo    - cors
echo    - sqlite3
echo    - bcryptjs
echo.

call npm install jsonwebtoken@9.0.0 moment@2.29.4 express@4.18.2 cors@2.8.5 sqlite3@5.1.7 bcryptjs@2.4.3 morgan@1.10.0 helmet@7.1.0 express-rate-limit@7.1.0 --omit=dev --omit=optional --no-fund

if errorlevel 1 (
    echo ❌ Instalación de npm falló
    echo 🔄 Intentando método de copia directa...
    
    REM Regresar al directorio original
    cd /d "%ORIGINAL_DIR%"
    
    REM Verificar que backend\node_modules existe
    if exist backend\node_modules (
        echo ✅ Copiando node_modules desde backend original...
        xcopy /E /I /Y backend\node_modules "%BACKEND_PATH%\node_modules" >nul 2>&1
        
        if errorlevel 1 (
            echo ❌ Error copiando node_modules
        ) else (
            echo ✅ node_modules copiado exitosamente
        )
    ) else (
        echo ❌ backend\node_modules no existe
        echo 🔧 Instalando primero en backend...
        cd backend
        call npm install --omit=dev --omit=optional
        cd ..
        echo 📂 Copiando a dist...
        xcopy /E /I /Y backend\node_modules "%BACKEND_PATH%\node_modules" >nul 2>&1
    )
) else (
    echo ✅ Dependencias instaladas correctamente
    
    REM Regresar al directorio original
    cd /d "%ORIGINAL_DIR%"
)

echo.
echo 🔍 VERIFICANDO MÓDULOS INSTALADOS...
echo.

REM Verificar módulos críticos
if exist "%BACKEND_PATH%\node_modules\jsonwebtoken" (
    echo ✅ jsonwebtoken - ENCONTRADO
) else (
    echo ❌ jsonwebtoken - NO ENCONTRADO
)

if exist "%BACKEND_PATH%\node_modules\moment" (
    echo ✅ moment - ENCONTRADO
) else (
    echo ❌ moment - NO ENCONTRADO
)

if exist "%BACKEND_PATH%\node_modules\express" (
    echo ✅ express - ENCONTRADO
) else (
    echo ❌ express - NO ENCONTRADO
)

if exist "%BACKEND_PATH%\node_modules\cors" (
    echo ✅ cors - ENCONTRADO
) else (
    echo ❌ cors - NO ENCONTRADO
)

if exist "%BACKEND_PATH%\node_modules\sqlite3" (
    echo ✅ sqlite3 - ENCONTRADO
) else (
    echo ❌ sqlite3 - NO ENCONTRADO
)

echo.
echo 📁 ARCHIVOS EJECUTABLES:
echo.

if exist "dist\Sistema POS Setup 1.0.0.exe" (
    echo ✅ Instalador: dist\Sistema POS Setup 1.0.0.exe
)

if exist "dist\win-unpacked" (
    echo ✅ Ejecutable portable encontrado en: dist\win-unpacked\
    for %%f in ("dist\win-unpacked\*.exe") do (
        echo    📱 %%~nxf
    )
)

echo.
echo 📝 CREANDO SCRIPTS DE INICIO...

REM Script para ejecutable portable
for %%f in ("dist\win-unpacked\*.exe") do (
    echo @echo off> INICIAR_POS.bat
    echo title Sistema POS>> INICIAR_POS.bat
    echo echo Iniciando Sistema POS...>> INICIAR_POS.bat
    echo start "" "%%f">> INICIAR_POS.bat
    echo exit>> INICIAR_POS.bat
    echo ✅ INICIAR_POS.bat creado
)

REM Script para instalador
if exist "dist\Sistema POS Setup 1.0.0.exe" (
    echo @echo off> INSTALAR_POS.bat
    echo title Instalador Sistema POS>> INSTALAR_POS.bat
    echo echo Iniciando instalador...>> INSTALAR_POS.bat
    echo start "" "dist\Sistema POS Setup 1.0.0.exe">> INSTALAR_POS.bat
    echo exit>> INSTALAR_POS.bat
    echo ✅ INSTALAR_POS.bat creado
)

echo.
echo 🎉 CORRECCIÓN COMPLETADA
echo ========================
echo.
echo 🔐 CREDENCIALES:
echo    👤 admin / 123456
echo    👤 cajero1 / cajero1
echo.
echo 🚀 PRÓXIMOS PASOS:
echo    1. Ejecutar INICIAR_POS.bat para probar
echo    2. Si funciona, el problema está resuelto
echo    3. Si persiste, revisar logs del ejecutable
echo.

echo ¿Desea probar el ejecutable ahora? (S/N)
set /p PROBAR="> "

if /i "%PROBAR%"=="S" (
    echo 🚀 Iniciando prueba...
    for %%f in ("dist\win-unpacked\*.exe") do (
        start "" "%%f"
        goto :done
    )
    echo ❌ No se encontró ejecutable
)

:done
echo.
echo ✅ Script completado
pause