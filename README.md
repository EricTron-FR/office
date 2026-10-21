# Eric Office ✻

Un bureau en pixel art (vue de dessus, touche Claude) où tes sessions Claude Code — terminal et app — apparaissent comme des persos qui bossent.

## Lancer
Double-clique sur `start.bat` (ou `node server.js`, puis http://localhost:8123).
Le serveur lit en lecture seule `~/.claude/projects` et diffuse l'activité des sessions actives depuis moins de 2 h. Sans serveur, la page tourne en mode démo.

## Fichiers
| Fichier | Rôle |
|---|---|
| `server.js` | serveur local (Node, sans dépendance) : page + flux des sessions |
| `index.html` | page, mise en page, mode démo, lecture des sessions |
| `world.js` | le monde : pièces, meubles, persos, chats, ciel, météo, zoom |
| `features.js` | ambiance et fun : nuit éclairée, laser, chat sur le clavier, employé du jour, baby-foot, pizza, robot, saisons |
| `ui.js` | interface : fiches agents, fil d'actu, outils, légende, réglages, sons, notifications |

## Astuces
- Molette pour zoomer, glisser pour se déplacer, boutons CEO / Open space / Pause.
- 🔴 Laser : les chats courent après ta souris. Clique sur un chat pour le caresser.
- 📺 Mode kiosque pour une télé ou un second écran (Échap pour sortir).
- ⚙ Réglages : texte au-dessus des persos, sons, notifications, filtre « ceux qui m'attendent », prénom.
- Tester une saison : `http://localhost:8123/?season=halloween` ou `?season=christmas`.
