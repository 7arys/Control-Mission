#!/usr/bin/env node
/* ============================================================
 *  Contrôle Mission — assemblage des sources en un fichier
 *
 *  Usage :  node build.js
 *  Sortie :  index.html (racine du dépôt)
 *
 *  Version multiplateforme du script build.sh : fonctionne
 *  sous Windows, macOS et Linux dès que Node.js est installé.
 * ============================================================ */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const racine = __dirname;
const lire = p => fs.readFileSync(path.join(racine, p), "utf8");
const lireDossier = d =>
  fs.readdirSync(path.join(racine, d)).sort()
    .filter(f => !f.startsWith("."))
    .map(f => ({ nom: f, contenu: lire(path.join(d, f)) }));

console.log("→ Vérification de la syntaxe JavaScript…");
const js = lireDossier("src/js");
const fin = s => (s.endsWith("\n") ? s : s + "\n");
const tout = js.map(f => fin(f.contenu)).join("");
const tmp = path.join(require("os").tmpdir(), "cm-check.js");
fs.writeFileSync(tmp, tout);
try {
  execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  console.log("  ✓ syntaxe correcte");
} catch (e) {
  console.error("✗ Erreur de syntaxe — assemblage annulé.\n");
  console.error(String(e.stderr || e.message));
  process.exit(1);
}

console.log("→ Assemblage des styles…");
const css = lireDossier("src/css").map(f => fin(f.contenu)).join("").replace(/\n+$/,"");

console.log("→ Assemblage du document…");
const sortie =
  lire("src/html/head.html").replace("/*__STYLES__*/", css) +
  lire("src/html/body.html") +
  "<script>\n" + tout + "</script>\n</body></html>\n";

fs.writeFileSync(path.join(racine, "index.html"), sortie);
console.log(`✓ index.html assemblé (${Buffer.byteLength(sortie,"utf8")} octets)`);
console.log(`\n  Fichiers sources : ${js.length + lireDossier("src/css").length + 2}`);
console.log('  Prochaine étape : git add -A && git commit -m "…" && git push');
