# Contrôle Mission — architecture du code

## Pourquoi ce découpage

L'application est **écrite en 21 fichiers** puis **assemblée en un seul** (`dist/index.html`).

Ce n'est pas une contradiction, c'est le meilleur des deux :

- **Pour modifier**, tu ouvres un fichier de 200 lignes qui traite d'un seul sujet.
- **Pour utiliser**, tu déposes un fichier unique sur GitHub Pages. Pas de serveur à
  configurer, pas de chemins qui cassent, ça marche même hors ligne une fois en cache.

Une seule commande fait le lien : `./build.sh`.

---

## L'arborescence

```
controle-mission/
├── build.sh              ← assemble tout (la seule commande à connaître)
├── README.md
├── ARCHITECTURE.md       ← ce fichier
├── GITHUB.md             ← dépôt, historique, publication
├── INSTALLATION.md       ← Supabase et GitHub Pages
├── index.html            ← le résultat, c'est LUI que GitHub Pages sert
├── build.js              ← même chose, version Node (Windows)
└── src/
    ├── html/
    │   ├── head.html     ← métadonnées, polices, marqueur d'injection du CSS
    │   └── body.html     ← toute la structure : pages, cartes, fenêtres
    ├── css/
    │   ├── 00-themes.css      ← les 3 habillages (couleurs, polices)
    │   ├── 01-base.css        ← en-tête, navigation, cartes, boutons, champs
    │   ├── 02-modules.css     ← styles par fonctionnalité
    │   └── 03-responsive.css  ← ajustements mobile (toujours en dernier)
    └── js/
        ├── 00-core.js               ← état, stockage, points, grades, insignes, thèmes
        ├── 10-sport-seances.js      ← programme, séance en cours, aptitudes E→SS
        ├── 11-sport-echauffement.js ← échauffement, retour au calme
        ├── 12-sport-bandes.js       ← bandes élastiques et résistances
        ├── 13-sport-repos.js        ← séance socle débutant, journées de repos
        ├── 14-sport-analyse.js      ← débriefing, indice, conseils de progression
        ├── 20-telemetrie.js         ← pesées, composition, courbe, CSV Withings
        ├── 21-activites.js          ← sorties extérieures
        ├── 30-vivres.js             ← recettes, plan de la semaine, courses
        ├── 40-jeu-programme.js      ← sondes, ressources, chapitres, construction
        ├── 41-jeu-chantier.js       ← scènes dessinées du chantier
        ├── 42-jeu-lore.js           ← journal de bord
        ├── 50-ia.js                 ← fournisseurs d'IA
        ├── 60-sync.js               ← synchronisation Supabase
        └── 99-boot.js               ← tableau de bord, réglages, démarrage
```

---

## La règle d'or : l'ordre des numéros

Les fichiers sont concaténés **dans l'ordre alphabétique de leur nom**.
Le préfixe numérique sert uniquement à fixer cet ordre.

- `00-core.js` doit rester **en premier** : il définit `$`, `S`, `save()`, `toast()`…
  que tout le reste utilise.
- `99-boot.js` doit rester **en dernier** : il termine par `load(); boot();`
  qui démarre réellement l'application.
- Entre les deux, l'ordre importe peu : les fonctions sont visibles partout
  puisque tout finit dans un seul script.

Pour ajouter un module, choisis un numéro libre dans la bonne tranche
(10-19 sport, 20-29 télémétrie, 30-39 vivres, 40-49 jeu, 50-69 services).

---

## Conventions du code

**Pas de modules ES, pas d'imports.** Toutes les fonctions sont globales. C'est
volontaire : ça permet le fichier unique et le fonctionnement hors serveur.
La contrepartie : les noms doivent être uniques dans tout le projet.

**Un seul objet d'état : `S`.** Tout est dedans (séances, pesées, jeu, journal…).
Il est sauvegardé dans le `localStorage` du navigateur par `save()`.

```js
S.pesees.push({d:"2026-08-18", kg:72.4});
save();          // écrit sur l'appareil + déclenche la synchro
```

**Après toute modification de `S`, appeler `save()`**, puis la fonction de rendu
concernée (`renderBase()`, `renderSeances()`, `renderSpatial()`…).

**Les fonctions de rendu s'appellent `renderX()`** et reconstruisent leur zone
depuis zéro. Pas de mise à jour partielle : c'est plus simple et assez rapide ici.

**Ne jamais utiliser `localStorage` directement** en dehors de `00-core.js`
et `60-sync.js`.

---

## Modifications courantes : où aller

| Ce que tu veux changer | Fichier |
|---|---|
| Couleurs, polices, ajouter un habillage | `css/00-themes.css` |
| Taille des boutons, espacements | `css/01-base.css` |
| Affichage sur petit écran | `css/03-responsive.css` |
| Exercices de la séance socle | `js/13-sport-repos.js` → `seanceSocle()` |
| Étapes de l'échauffement | `js/11-sport-echauffement.js` → `ECHAUF_DEFAUT` |
| Résistances des bandes | `js/12-sport-bandes.js` → `BANDES_DEFAUT` |
| Règles de progression (quand augmenter) | `js/14-sport-analyse.js` → `conseilExo()` |
| Points gagnés par action | chercher `gagner(` dans les fichiers |
| Grades et paliers de secteur | `js/00-core.js` → `CAMPS` |
| Insignes | `js/00-core.js` → `JALONS` |
| Cibles de sonde, coûts, chapitres | `js/40-jeu-programme.js` → `CIBLES`, `CHAPITRES` |
| Dessins du chantier | `js/41-jeu-chantier.js` |
| Entrées du journal de bord | `js/42-jeu-lore.js` → `LORE_AUTO` |
| Consignes envoyées à l'IA | `js/14-sport-analyse.js` → `lancerAnalyseIA()` |
| Règles de fusion entre appareils | `js/60-sync.js` → `fusion()` |

---

## Assembler

```bash
./build.sh
```

ou, sous Windows / partout où Node est installé :

```bash
node build.js
```

Les deux produisent un fichier **strictement identique**. Le script vérifie
d'abord la syntaxe JavaScript et **refuse d'assembler en cas d'erreur** — ça
évite de publier une version cassée. Puis il produit `index.html` à la racine.

Sans Node.js installé, la vérification est simplement ignorée, l'assemblage
fonctionne quand même.

---

## Publier

`index.html` étant déjà à la racine, il suffit d'envoyer le dépôt sur GitHub :
Pages le sert automatiquement. Voir `GITHUB.md` pour la mise en place complète.

Les fichiers de `src/` restent dans le dépôt : ils ne sont pas servis comme page,
et les garder permet de reprendre les modifications depuis n'importe quel poste.

---

## Deux pièges à connaître

**Les `const` en début de fichier.** Comme tout devient un seul script, une
constante déclarée dans `40-jeu-programme.js` n'existe pas encore quand
`10-sport-seances.js` s'exécute. Les *fonctions*, elles, sont visibles partout.
En pratique : ne lis pas une constante d'un autre fichier depuis du code qui
s'exécute au chargement — fais-le dans une fonction, appelée après le démarrage.

**La synchronisation.** Si tu ajoutes un nouveau champ dans `S` qui doit suivre
entre les appareils, pense à le traiter dans `fusion()` (`js/60-sync.js`).
Sinon il restera sur un seul appareil, ou sera écrasé par l'autre.
