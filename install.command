#!/bin/bash
# Eric Office : installation sur Mac
cd "$(dirname "$0")"
echo ""
echo " === Eric Office : installation ==="
echo ""
if command -v node >/dev/null 2>&1; then
  echo " [ok] Node.js est déjà installé ($(node -v))."
elif command -v brew >/dev/null 2>&1; then
  echo " Installation de Node.js avec Homebrew..."
  brew install node
else
  echo " Node.js n'est pas installé et Homebrew non plus."
  echo " Télécharge l'installeur macOS (LTS) sur https://nodejs.org, installe-le, puis relance ce script."
  open "https://nodejs.org"
  read -n 1 -s -r -p "Appuie sur une touche pour fermer..."
  exit 1
fi
if command -v claude >/dev/null 2>&1 || [ -x "$HOME/.local/bin/claude" ]; then
  echo " [ok] Claude Code est installé : tu pourras piloter des agents depuis le bureau."
else
  echo " [info] Claude Code n'est pas trouvé. Le bureau marche quand même (observation des sessions)."
fi
chmod +x start.command 2>/dev/null
echo ""
echo " Tout est prêt : lance start.command"
echo ""
read -n 1 -s -r -p "Appuie sur une touche pour fermer..."
