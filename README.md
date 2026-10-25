# Eric Office ✻

Un bureau en pixel art façon Pokémon (vue de dessus, avec une touche Claude). Tes sessions Claude Code, terminal et app, y apparaissent comme des persos qui bossent.

## Lancer
Double-clique sur `start.bat` (Windows) ou `start.command` (Mac). Tu peux aussi lancer `node server.js`, puis ouvrir http://localhost:8123.

Le serveur lit `~/.claude/projects` sans rien y modifier. Il diffuse l'activité des sessions actives depuis moins de 2 h. Sans serveur, la page tourne en mode démo.

## L'étage
- **En haut** : bureau du patron, open space, salle de pause et terrasse (vue sur Lyon, vraie météo).
- **En bas** : le jardin suspendu (mare, hautes herbes, potager, pique-nique, boîte aux lettres) et la bibliothèque.

## Pokédex
1. Tes agents gagnent des **tickets** 🎟 quand ils travaillent pour de vrai : un ticket par tâche terminée, un toutes les 40 actions, plus un bonus du jour.
2. Un ticket = un tour de **roue**. Elle donne une Poké Ball, une Super Ball, une Hyper Ball ou une Master Ball.
3. Tu ouvres la Ball : tu obtiens un Pokémon de Kanto (151).
4. La rareté suit le **taux de capture officiel** des jeux :
   - Commun : ≥ 190
   - Peu commun : 100 à 189
   - Rare : 60 à 99
   - Épique : 50 et moins
   - Légendaire : légendaires et fabuleux
5. Chaque Ball a ses propres chances (tableau sous la roue).
6. Les doublons donnent des bonbons 🍬 : 5 bonbons = 1 ticket.
7. Tu choisis jusqu'à **6 Pokémon pour le jardin**. Ils s'y baladent, nagent dans la mare, dorment la nuit et jouent avec les agents et les chats.

La progression est gardée dans le navigateur (localStorage). Les sprites et la police pixel sont chargés depuis Internet (PokeAPI sur GitHub, Google Fonts).

## Les agents se parlent
- **Bulles manga** : quand un agent ou un sous-agent écrit à un autre, il va le voir et lui parle dans une bulle manga. Ça couvre l'outil `SendMessage` de Claude Code et la messagerie d'équipe du bureau.
- **Stagiaires** : les sous-agents apparaissent comme des stagiaires. Ils rendent leur rapport à leur chef avant de partir.

## Fichiers
| Fichier | Rôle |
|---|---|
| `server.js` | serveur local (Node, sans dépendance) : page, flux des sessions, agents pilotés |
| `perm-mcp.js` | mini serveur MCP : autorisations + messagerie d'équipe |
| `index.html` | page, style, mode démo, lecture des sessions |
| `world.js` | le monde : pièces, meubles, persos, chats, ciel, météo, zoom |
| `rooms.js` | jardin suspendu, bibliothèque, terrasse, pluie, interactions |
| `pokemon.js` | les Pokémon du jardin |
| `dex.js` | Pokédex : tickets, roue, Balls, collection, équipe du jardin |
| `talk.js` | bulles manga et conversations entre agents |
| `features.js` | ambiance : nuit éclairée, laser, chat sur le clavier, employé du jour, pizza, robot, saisons |
| `events.js` | événements : évacuation, anniversaire, apéro, arc-en-ciel… |
| `ui.js` | interface : fiches agents, fil d'actu, outils, discussion, réglages, télé |

## Astuces
- Molette pour zoomer, glisser pour se déplacer, « 📍 Aller à… » pour changer de pièce.
- 🔴 Laser : les chats courent après ta souris. Clique sur un chat ou un Pokémon pour lui faire un câlin.
- 📺 Mode kiosque pour une télé ou un second écran (Échap pour sortir).
- ⚙ Réglages : texte au-dessus des persos, sons, notifications, prénom, événements.
