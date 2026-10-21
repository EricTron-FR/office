#!/bin/bash
# Eric Office : lancement sur Mac (double-clic, ou ./start.command dans le Terminal)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé : lance d'abord install.command (ou installe-le depuis https://nodejs.org)."
  read -n 1 -s -r -p "Appuie sur une touche pour fermer..."
  exit 1
fi
(sleep 1 && open "http://localhost:8123") &
node server.js
