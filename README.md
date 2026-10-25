# Eric Office ✻

Un bureau en pixel art façon Pokémon (vue de dessus, avec une touche Claude). Tes sessions Claude Code, terminal et app, y apparaissent comme des persos qui bossent.

## Lancer
Double-clique sur `start.bat` (Windows) ou `start.command` (Mac). Tu peux aussi lancer `node server.js`, puis ouvrir http://localhost:8123.

Le serveur lit `~/.claude/projects` sans rien y modifier. Il diffuse l'activité des sessions actives depuis moins de 2 h. Sans serveur, la page tourne en mode démo.

## L'étage
- **En haut** : bureau du patron, open space, salle de pause et terrasse (vue sur Lyon, vraie météo).
- **En bas** : le jardin suspendu (mare, hautes herbes, potager, pique-nique, boîte aux lettres) et la bibliothèque.

## Pokédex
- **Tickets** 🎟 : un par tâche terminée par un vrai agent, un toutes les 40 actions, un bonus du jour, plus les badges et les défis.
- **Roue** : 1 ticket = 1 Ball (Poké, Super, Hyper ou Master Ball), ouverte en grand spectacle.
- **Rafales** : ×5 ou ×10 (un rare ou mieux garanti à ×10), ouvertes en rafale avec un récapitulatif.
- **Région** : tu choisis où tirer, parmi les 1025 Pokémon de Kanto à Paldea, ou toutes les régions à la fois.
- **Rareté** : elle suit le taux de capture officiel des jeux.
  - Commun : ≥ 190
  - Peu commun : 100 à 189
  - Rare : 60 à 99
  - Épique : 50 et moins
  - Légendaire : légendaires et fabuleux
- **Pièces** 🪙 : les doublons en rapportent selon leur rareté (commun 2, peu commun 3, rare 5, épique 15, légendaire 40). À la boutique, on les échange contre un ticket (10), une Super Ball (15), une Hyper Ball (40) ou une Master Ball (150).
- **Pokédex** : par région, avec le nombre attrapé dans chacune.
- **Jardin** : jusqu'à 6 Pokémon. Ceux d'eau nagent dans la mare et en sortent parfois. Ils jouent avec les agents et les chats.
- **Pokémon sauvages** 🌿 : environ toutes les 10 minutes, ça bouge dans les hautes herbes du jardin. Clique dessus pour lancer un combat façon Rouge Feu : attaque pour affaiblir le Pokémon sans le mettre K.O., donne-lui une baie, puis lance une Ball (Poké Ball gratuite ; Super, Hyper et Master Ball contre des pièces). La capture suit la vraie formule des jeux.
- **Mon jardin** : recherche par nom ou numéro, filtres par région, rareté et type, et tri par date de capture, numéro, nom, rareté ou nombre d'exemplaires.
- **Badges & défis** : 20 badges façon arène, débloqués par le travail de tes agents (tâches, actions, nuits, travail en équipe) et par ta collection. Trois défis du jour, plus un bonus si tu fais les trois.

Dans le jardin, les Pokémon sont animés (marche sur 8 directions, repos, sommeil, saut) grâce aux sprites du projet communautaire [PMD SpriteCollab](https://github.com/PMDCollab/SpriteCollab) (licence CC BY-NC 4.0, usage non commercial). Les icônes et grands sprites viennent de [PokeAPI](https://github.com/PokeAPI/sprites).

Le décor utilise deux tilesets libres (CC-BY-SA 3.0) : l'extérieur « Pokemon-inspired » de **Red_Voxel** et l'intérieur de **Bonsaiheldin** (voir [assets/CREDITS.md](assets/CREDITS.md)). Sans eux (hors-ligne, par exemple), le décor dessiné à la main s'affiche.

La progression est gardée dans le navigateur (localStorage). Les données des Pokémon sont dans `dexdata.js` (générées depuis PokeAPI). Les sprites et la police pixel sont chargés depuis Internet (GitHub, Google Fonts).

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
| `dexdata.js` | les 1025 Pokémon : nom, taux de capture, types, évolutions (généré depuis PokeAPI) |
| `dex.js` | Pokédex : tickets, roue, rafales, régions, pièces, boutique, collection, jardin |
| `gacha.js` | animations d'ouverture de Ball, de rafale et célébrations |
| `badges.js` | badges et défis du jour |
| `wild.js` | Pokémon sauvages des hautes herbes : combat et capture |
| `tiles.js` | tuiles libres de droits (herbe, chemin, sapins, haie, parquet, tapis) |
| `assets/` | les deux tilesets et leurs crédits |
| `talk.js` | bulles manga et conversations entre agents |
| `features.js` | ambiance : nuit éclairée, laser, chat sur le clavier, employé du jour, pizza, robot, saisons |
| `events.js` | événements : évacuation, anniversaire, apéro, arc-en-ciel… |
| `ui.js` | interface : fiches agents, fil d'actu, outils, discussion, réglages, télé |

## Astuces
- Molette pour zoomer, glisser pour se déplacer, « 📍 Aller à… » pour changer de pièce.
- 🔴 Laser : les chats courent après ta souris. Clique sur un chat ou un Pokémon pour lui faire un câlin.
- 📺 Mode kiosque pour une télé ou un second écran (Échap pour sortir).
- ⚙ Réglages : texte au-dessus des persos, sons, notifications, prénom, événements.
