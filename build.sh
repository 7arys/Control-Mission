#!/usr/bin/env bash
# ============================================================
#  Contrôle Mission — assemblage des sources en un fichier
#
#  Usage :  ./build.sh
#  Sortie :  dist/index.html
#
#  Les fichiers sont concaténés dans l'ordre alphabétique de leur
#  nom : c'est le numéro en préfixe qui fixe l'ordre. 00-core doit
#  rester en premier, 99-boot en dernier.
# ============================================================
set -e
cd "$(dirname "$0")"

SORTIE="index.html"   # racine du dépôt : c'est ce que GitHub Pages sert

echo "→ Vérification de la syntaxe JavaScript…"
if command -v node >/dev/null 2>&1; then
  cat src/js/*.js > /tmp/cm-check.js
  node --check /tmp/cm-check.js || { echo "✗ Erreur de syntaxe — assemblage annulé."; exit 1; }
  echo "  ✓ syntaxe correcte"
else
  echo "  ⚠ node absent : vérification ignorée"
fi

echo "→ Assemblage des styles…"
CSS=$(cat src/css/*.css)

echo "→ Assemblage du document…"
{
  # en-tête : on injecte le CSS à la place du marqueur
  awk -v css="$CSS" '{ gsub(/\/\*__STYLES__\*\//, css); print }' src/html/head.html
  cat src/html/body.html
  echo '<script>'
  cat src/js/*.js
  echo '</script>'
  echo '</body></html>'
} > "$SORTIE"

TAILLE=$(wc -c < "$SORTIE" | tr -d ' ')
echo "✓ $SORTIE assemblé ($TAILLE octets)"
echo ""
echo "  Fichiers sources : $(ls src/css/*.css src/js/*.js src/html/*.html | wc -l | tr -d ' ')"
echo "  Prochaine étape : git add -A && git commit -m \"…\" && git push"
