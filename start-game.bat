@echo off
cd /d "%~dp0"
echo STELLAR CLASH - Original Assets / Fleet Edition
echo Open http://localhost:8000 after the server starts.
echo Keep this window open while playing. Press Ctrl+C to stop.
where py >nul 2>nul
if %errorlevel% equ 0 (
    py -m http.server 8000
) else (
    python -m http.server 8000
)
pause
