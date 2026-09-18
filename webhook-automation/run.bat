@echo off
setlocal enabledelayedexpansion
REM Dependency-free bootstrap for Windows: mirrors run.sh exactly (see its
REM comments for rationale). Checks Node, installs deps and the Playwright
REM browser only when actually needed, then hands off to cli/index.ts.
cd /d "%~dp0"

set MIN_NODE_MAJOR=18
set INSTALL_STAMP=node_modules\.install-stamp

echo Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo X Node.js not found. Install Node.js %MIN_NODE_MAJOR%+ from https://nodejs.org and re-run run.bat
  echo.
  exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node.split(\".\")[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS %MIN_NODE_MAJOR% (
  echo.
  echo X Node.js %MIN_NODE_MAJOR%+ required. Upgrade from https://nodejs.org and re-run run.bat
  echo.
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo OK Node.js %%v found

echo.
echo Checking dependencies...
set NEEDS_INSTALL=0
if not exist node_modules set NEEDS_INSTALL=1
if not exist "%INSTALL_STAMP%" set NEEDS_INSTALL=1
if exist "%INSTALL_STAMP%" (
  for /f %%a in ('powershell -NoProfile -Command "(Get-Item package-lock.json).LastWriteTime -gt (Get-Item '%INSTALL_STAMP%').LastWriteTime"') do (
    if /I "%%a"=="True" set NEEDS_INSTALL=1
  )
)

if %NEEDS_INSTALL%==1 (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo X npm install failed. See the output above.
    exit /b 1
  )
  echo. > "%INSTALL_STAMP%"
  echo OK Dependencies installed
) else (
  echo OK Dependencies already installed
)

echo.
echo Checking Playwright browser (chromium)...
REM playwright install is itself idempotent — no-ops quickly when chromium
REM is already present. Only chromium is ever launched by this project
REM (src/clients/sdk.client.ts) — no other browser is needed.
call npx playwright install chromium
if errorlevel 1 (
  echo X Could not install the Playwright browser. See the output above.
  exit /b 1
)
echo OK Browser ready

echo.
call npx tsx cli\index.ts %*
exit /b %errorlevel%
