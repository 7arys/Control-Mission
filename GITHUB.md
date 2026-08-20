# Mettre Contrôle Mission sur GitHub

## Ce qui va dans le dépôt

**Tout.** Les sources *et* le fichier assemblé cohabitent :

```
ton-depot/
├── index.html        ← le fichier assemblé. C'est LUI que GitHub Pages sert.
├── src/              ← les sources. C'est ELLES que tu modifies.
├── build.sh          ← assemblage (macOS, Linux, Git Bash)
├── build.js          ← assemblage (Windows, ou partout où Node est installé)
├── README.md
├── ARCHITECTURE.md
├── INSTALLATION.md
└── GITHUB.md         ← ce fichier
```

`index.html` ne **remplace** pas les sources et n'est pas **remplacé** par elles :
c'est leur résultat. On garde les deux, et c'est justement ce qui permet d'avoir
à la fois un historique lisible (les sources) et une app qui marche (le fichier).

> **Ne modifie jamais `index.html` à la main.** Il est réécrit à chaque assemblage,
> tes changements seraient perdus. Tout se passe dans `src/`.

---

## Le cycle de travail

```
1. modifier un fichier dans src/
2. lancer l'assemblage        →  ./build.sh   ou   node build.js
3. tester en ouvrant index.html dans le navigateur
4. enregistrer la version     →  commit + push
```

Chaque *commit* est un point de sauvegarde nommé. C'est ça, l'historique :
tu peux revenir à n'importe lequel, comparer deux versions, voir ce qui a changé
et quand.

---

## Méthode A — GitHub Desktop (recommandée)

Interface graphique, pas de ligne de commande, et **Git Bash est installé au
passage** — donc `build.sh` fonctionnera aussi sous Windows.

### Installation
1. Télécharge **GitHub Desktop** sur `desktop.github.com`, connecte-toi.
2. **File → New repository**. Nom : `controle-mission`. Décoche « Initialize with README »
   si tu comptes déposer les fichiers toi-même.
3. **Show in Explorer** pour ouvrir le dossier, puis copie dedans tout le contenu
   de l'archive (`src/`, `index.html`, `build.sh`, `build.js`, les `.md`, `.gitignore`).

### Premier enregistrement
1. Retour dans GitHub Desktop : tous les fichiers apparaissent à gauche.
2. En bas à gauche, écris un résumé : `Version initiale`.
3. **Commit to main**, puis **Publish repository** en haut.
   → Décoche **Keep this code private** (Pages est gratuit sur les dépôts publics).

### Ensuite, à chaque modification
1. Tu modifies un fichier dans `src/`.
2. Tu lances l'assemblage (voir plus bas).
3. GitHub Desktop montre les changements ligne par ligne, en vert et rouge.
4. Tu écris un résumé — *« Élévations latérales : bande légère par défaut »* —
   puis **Commit to main** et **Push origin**.

### Revenir en arrière
Onglet **History** : chaque commit est listé. Clic droit sur l'un d'eux →
**Revert changes in commit** annule ce changement précis sans toucher au reste.

---

## Méthode B — Interface web seule

Sans rien installer, depuis n'importe quel appareil (y compris l'iPhone).

1. Sur `github.com` → **New repository** → nom, **Public**, **Create**.
2. **uploading an existing file** → glisse-dépose le dossier entier
   (le navigateur conserve l'arborescence).
3. En bas : message de commit → **Commit changes**.

Pour modifier ensuite : ouvre un fichier dans `src/`, clique le crayon, édite,
puis **Commit changes** en bas — chaque enregistrement crée un point d'historique.

**Limite importante :** l'interface web ne peut pas lancer l'assemblage. Tu devras
soit le faire sur ton PC de temps en temps, soit ajouter l'assemblage automatique
(voir plus bas).

---

## Activer GitHub Pages

Une seule fois, après le premier envoi :

**Settings → Pages → Source : Deploy from a branch → Branch : `main` → Dossier : `/ (root)` → Save**

Ton URL apparaît en une ou deux minutes :
`https://TONPSEUDO.github.io/controle-mission/`

C'est cette adresse que tu ouvres sur l'iPhone et sur le PC. Le dossier `src/`
est présent dans le dépôt mais Pages sert `index.html` — les sources ne gênent rien.

---

## Lancer l'assemblage selon ton système

| Système | Commande |
|---|---|
| Windows (avec GitHub Desktop) | ouvre **Git Bash** dans le dossier → `./build.sh` |
| Windows (avec Node.js) | `node build.js` |
| macOS / Linux | `./build.sh` |

La première fois sous macOS ou Linux : `chmod +x build.sh`.

Le script refuse d'assembler si le JavaScript contient une erreur de syntaxe —
ça évite de publier une version cassée.

---

## Nommer les versions importantes

Pour marquer une étape (« la version qui marchait bien avant que je touche au
jeu »), utilise une **Release** : page du dépôt → **Releases** → **Create a new release**
→ tag `v1.0`, titre, description. Tu pourras y revenir en un clic, même des mois
plus tard.

Convention simple : `v1.0`, `v1.1` pour des ajouts, `v2.0` quand tu changes
quelque chose en profondeur.

---

## Pour plus tard : l'assemblage automatique

Quand tu seras à l'aise, un fichier `.github/workflows/build.yml` peut lancer
l'assemblage sur les serveurs de GitHub à chaque envoi — tu ne modifierais alors
que `src/`, et `index.html` se régénérerait tout seul, y compris depuis l'iPhone.

Ce n'est pas nécessaire au début, et ça complique le débogage. Demande-le-moi
le jour où l'assemblage manuel devient pénible.

---

## Les erreurs classiques

| Symptôme | Cause |
|---|---|
| L'URL affiche une erreur 404 | Pages pas activé, ou `index.html` absent de la racine |
| Le site ne change pas après un envoi | Assemblage oublié — `index.html` n'a pas été régénéré |
| Modifications perdues | `index.html` modifié à la main au lieu des sources |
| Page blanche | Erreur JavaScript : ouvre la console du navigateur (F12) |
| Pages indisponible | Dépôt privé — Pages est gratuit sur les dépôts publics |

**Rappel :** ton dépôt étant public, n'y mets jamais ta clé API ni tes identifiants
Supabase. L'application les stocke sur l'appareil, pas dans le fichier — c'est
volontaire, ne change pas ça.
