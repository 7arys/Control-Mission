# Contrôle Mission

Application personnelle de suivi sportif, avec télémétrie corporelle,
débriefing de séance et programme spatial de progression.

Fonctionne dans le navigateur, sans installation, sur téléphone comme sur PC.

---

## Ce qu'elle fait

- **Missions** — programme d'entraînement, séance guidée avec échauffement,
  suivi par zone musculaire (rangs E → SS), bandes élastiques et charges libres.
- **Débriefing** — indice de séance, volume, records, et un ajustement chiffré
  par exercice pour la fois suivante. Analyse approfondie par IA en option.
- **Télémétrie** — poids, masse grasse, masse musculaire, tendance sur 7 jours,
  import CSV Withings.
- **Récupération** — journées de repos consignées, zones courbaturées prises en
  compte dans les suggestions.
- **Vivres** — plan de repas hebdomadaire et liste de courses *(désactivable)*.
- **Programme spatial** — sondes en temps réel, chantier dessiné en 7 chapitres
  et journal de bord *(désactivable)*.
- **Synchronisation** — entre appareils via Supabase, avec fusion sans perte.

Trois habillages au choix : Orbite, Apollo, Tactique.

---

## Utiliser

Ouvrir `index.html` dans un navigateur. Sur iPhone : Safari →
**Partager → Sur l'écran d'accueil** pour l'installer comme une application.

Aucune donnée ne sort de l'appareil tant que la synchronisation n'est pas
configurée. Clé API et identifiants de synchro restent locaux, jamais dans le code.

---

## Modifier

Les sources sont dans `src/`, découpées par domaine. Après modification :

```bash
./build.sh        # ou : node build.js
```

`index.html` est régénéré. Ne le modifie jamais directement.

---

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — organisation du code, conventions,
  où aller pour changer quoi.
- [`GITHUB.md`](GITHUB.md) — dépôt, historique des versions, publication.
- [`INSTALLATION.md`](INSTALLATION.md) — Supabase et GitHub Pages, pas à pas.
