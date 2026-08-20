# Installation — Contrôle Mission

Objectif : la même app sur iPhone et PC, avec synchronisation automatique.

---

## Étape 1 — Créer la base Supabase (5 min)

1. Va sur **supabase.com** → *Start your project* → connexion avec GitHub ou e-mail.
2. **New project** : donne-lui un nom (ex. `controle-mission`), choisis un mot de passe de base
   (tu n'en auras pas besoin ensuite, mais note-le), région **Europe (Paris ou Francfort)**, plan **Free**.
3. Attends ~2 min que le projet se crée.
4. Dans le menu de gauche : **SQL Editor** → *New query* → colle exactement ceci → **Run** :

```sql
create table if not exists carnet_sync (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table carnet_sync enable row level security;

create policy "acces espace" on carnet_sync
  for all to anon
  using (true) with check (true);
```

5. Menu de gauche : **Project Settings → API**. Note deux choses :
   - **Project URL** → ressemble à `https://abcdefgh.supabase.co`
   - **anon / public key** → longue chaîne commençant par `eyJ...`
     (c'est une clé prévue pour être utilisée côté navigateur, pas un mot de passe)

---

## Étape 2 — Publier l'app sur GitHub Pages (5 min)

1. Sur **github.com** → **New repository** → nom au choix (ex. `controle-mission`),
   visibilité **Public** (Pages est gratuit sur les dépôts publics), coche *Add a README*.
2. **Add file → Upload files** → dépose `controle-mission.html`.
   **Renomme-le `index.html`** avant ou après l'upload (bouton crayon) — c'est le nom que Pages sert par défaut.
3. **Settings → Pages** → *Source* : **Deploy from a branch** → branche `main`, dossier `/ (root)` → **Save**.
4. Attends 1 à 2 minutes. L'URL apparaît en haut de la page :
   `https://TONPSEUDO.github.io/controle-mission/`

> Le fichier publié ne contient **aucun identifiant** : URL Supabase, clé et espace sont saisis
> dans l'app et restent stockés sur chaque appareil.

---

## Étape 3 — Configurer le premier appareil (PC)

1. Ouvre ton URL GitHub Pages.
2. Onglet **Dossier → Synchronisation iPhone ⇄ PC** :
   - **URL du projet** : ton Project URL Supabase
   - **Clé publique anon** : la clé `eyJ...`
   - **Identifiant d'espace** : clique sur **Générer un ID**
3. **Enregistrer** → une première synchro part automatiquement.
   L'état doit afficher « Synchronisé à HH:MM ».

---

## Étape 4 — Appairer l'iPhone (1 min)

1. Sur le PC : bouton **Copier le code d'appairage**. Envoie-toi le code (SMS, mail, notes…).
2. Sur l'iPhone, ouvre la même URL dans **Safari**.
3. **Partager → Sur l'écran d'accueil** : l'app s'installe comme une vraie application
   (stockage plus durable qu'un simple onglet, et affichage plein écran).
4. Ouvre-la, onglet **Dossier**, colle le code dans **Coller le code ici** → **Appliquer**.
5. La synchro part immédiatement : tes données du PC apparaissent.

---

## Comment fonctionne la synchro

- **Automatique** : 4 secondes après chaque action, à l'ouverture de l'app,
  au retour sur l'app (changement d'onglet, déverrouillage), et au retour du réseau.
- **Manuelle** : bouton **Synchroniser** dans le Dossier.
- **Hors ligne** : tout continue de fonctionner en local ; la synchro se fait au retour du réseau.

### Fusion sans perte
Si tu utilises les deux appareils entre deux synchros, rien n'est écrasé :

| Donnée | Règle |
|---|---|
| Points de mission | Compteur séparé par appareil, **additionnés** |
| Missions & sorties | Fusionnées (doublons éliminés) |
| Pesées | Une par date, la plus complète gagne |
| Aptitudes E→SS | Maximum des deux appareils |
| Records | La charge la plus lourde gagne |
| Insignes | Date d'obtention la plus ancienne |
| Ordre de mission | Recalculé depuis les données fusionnées |
| Programme & réglages | La version modifiée le plus récemment |

**Seule exception connue** : si tu modifies ton programme d'entraînement sur les deux appareils
sans synchro entre les deux, la version la plus récente écrase l'autre. Les missions déjà
accomplies, elles, sont toujours conservées.

### Ce qui ne quitte jamais l'appareil
- La **clé API Anthropic** (génération IA des repas)
- La **séance en cours** (non terminée)
- Les **identifiants de synchro** eux-mêmes

---

## Sauvegardes

- Une **sauvegarde locale automatique** est écrite avant chaque fusion.
- Fais un **Exporter mes données (JSON)** de temps en temps : c'est ton filet définitif,
  indépendant de Supabase comme de GitHub.

---

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `Échec : lecture 401` | Clé anon incorrecte ou incomplète |
| `Échec : écriture 404` | Table `carnet_sync` non créée — relance le SQL de l'étape 1 |
| `Échec : écriture 401/403` | La *policy* RLS n'a pas été créée |
| `Failed to fetch` | URL mal saisie (doit finir par `.supabase.co`, sans `/` final) ou pas de réseau |
| Les données n'arrivent pas | Vérifie que l'**identifiant d'espace est identique** sur les deux appareils |

Le plan gratuit Supabase met un projet en pause après ~1 semaine sans aucune requête.
Comme l'app synchronise à chaque ouverture, ça n'arrivera pas en usage normal ;
si ça arrive, un clic sur *Restore* dans le tableau de bord Supabase suffit.
