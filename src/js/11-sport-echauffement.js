"use strict";
/* ============================================================
   SPORT — échauffement et retour au calme
   ============================================================ */
/* ============ Échauffement ============ */
const ECHAUF_DEFAUT=[
  "Rotations articulaires — chevilles, genoux, hanches, épaules, nuque · 60 s, sans à-coups",
  "Marche sur place, montées de genoux lentes · 90 s, jusqu'à avoir un peu chaud",
  "Cercles de bras, petits puis grands · 45 s",
  "Chat-vache (mobilité du dos, à quatre pattes) · 8 allers-retours lents",
  "Ouverture de hanches : fente basse alternée, sans à-coups · 30 s par côté",
];
// ancienne liste : contenait des exercices en doublon avec la séance
const ECHAUF_V1=[
  "Rotations articulaires — chevilles, genoux, hanches, épaules, nuque · 60 s, sans à-coups",
  "Marche sur place ou pas chassés lents · 90 s, jusqu'à avoir un peu chaud",
  "Cercles de bras + passages de bande au-dessus de la tête · 45 s",
  "Chat-vache (mobilité du dos, à quatre pattes) · 8 allers-retours lents",
  "Squat à vide, descente lente · 10 répétitions",
  "Pompes inclinées mains sur le banc · 8 répétitions faciles",
];
const RETOUR_CALME="Retour au calme : 2 à 3 min de respiration lente et d'étirements doux, sans forcer. Ça ne prévient pas les courbatures, mais ça aide à retrouver de l'amplitude et à redescendre en pression.";

function echList(){
  if(!Array.isArray(S.echauffement)||!S.echauffement.length) S.echauffement=[...ECHAUF_DEFAUT];
  // remplace l'ancienne liste (doublons avec la séance) si elle n'a pas été personnalisée
  if(S.echauffement.length===ECHAUF_V1.length && S.echauffement.every((l,i)=>l===ECHAUF_V1[i]))
    S.echauffement=[...ECHAUF_DEFAUT];
  return S.echauffement;
}
function echEtat(){
  if(!S.enCours) return [];
  const n=echList().length;
  if(!Array.isArray(S.enCours.ech)||S.enCours.ech.length!==n) S.enCours.ech=Array(n).fill(false);
  return S.enCours.ech;
}
function echBloc(){
  const items=echList(), etat=echEtat();
  const faits=etat.filter(Boolean).length;
  return `<div class="echauf">
    <div class="echauf-head">
      <span>Échauffement · ~5 min <b>${faits}/${items.length}</b></span>
      <button class="btn ghost small" onclick="ouvrirEchauf()">Modifier</button>
    </div>
    ${items.map((t,i)=>`<div class="echauf-item ${etat[i]?"ok":""}" data-ech="${i}">
      <span class="echauf-box">${etat[i]?"✓":""}</span><span>${esc(t)}</span></div>`).join("")}
    <div class="cote-meta" style="margin-top:6px">Puis, sur le premier exercice, une série d'approche plus facile : moitié de charge, ou moitié des répétitions au poids du corps. Elle ne compte pas.</div>
  </div>`;
}
function brancherEchauf(w){
  w.querySelectorAll("[data-ech]").forEach(el=>el.onclick=()=>{
    const i=+el.dataset.ech, etat=echEtat();
    etat[i]=!etat[i]; save(); renderEnCours();
  });
}

/* --- éditeur --- */
function ouvrirEchauf(){
  $("#echTexte").value=echList().join("\n");
  $("#dlgEchauf").showModal();
}
function sauverEchauf(){
  const lignes=$("#echTexte").value.split("\n").map(l=>l.trim()).filter(Boolean);
  S.echauffement=lignes.length?lignes:[...ECHAUF_DEFAUT];
  save(); $("#dlgEchauf").close();
  toast("Échauffement mis à jour");
  renderEnCours();
}
function resetEchauf(){
  S.echauffement=[...ECHAUF_DEFAUT];
  $("#echTexte").value=S.echauffement.join("\n");
  save(); toast("Échauffement par défaut restauré");
}
