@echo off
chcp 65001 >nul
echo.
echo  === Eric Office : installation ===
echo.
where node >nul 2>nul
if %errorlevel%==0 (
  echo  [ok] Node.js est deja installe.
) else (
  echo  Installation de Node.js...
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  echo.
  echo  Node.js installe. Ferme cette fenetre puis lance start.bat.
  pause
  exit /b
)
where claude >nul 2>nul
if %errorlevel%==0 (
  echo  [ok] Claude Code est installe : tu pourras piloter des agents depuis le bureau.
) else (
  echo  [info] Claude Code n'est pas trouve. Le bureau marche quand meme (observation des sessions).
  echo         Pour piloter des agents depuis le bureau, installe Claude Code puis connecte-toi.
)
echo.
echo  Tout est pret : lance start.bat
echo.
pause
