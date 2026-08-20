"use strict";
/* ============================================================
   SPORT — bandes élastiques et résistances
   ============================================================ */
/* ============ Bandes élastiques ============ */
/* Valeurs indicatives à ajuster : la résistance réelle est souvent imprimée sur la bande
   ou indiquée dans la notice SmartWorkout. L'ordre compte, du plus souple au plus dur. */
const BANDES_DEFAUT=[
  {id:"b1", nom:"Très légère", kg:4},
  {id:"b2", nom:"Légère",      kg:7},
  {id:"b3", nom:"Moyenne",     kg:11},
  {id:"b4", nom:"Forte",       kg:16},
  {id:"b5", nom:"Très forte",  kg:23},
];
function bandes(){
  if(!Array.isArray(S.bandes)||!S.bandes.length) S.bandes=JSON.parse(JSON.stringify(BANDES_DEFAUT));
  return S.bandes;
}
function bandeById(id){ return bandes().find(b=>b.id===id)||null; }
function bandeSuivante(id){
  const l=bandes(), i=l.findIndex(b=>b.id===id);
  return (i>=0&&i<l.length-1)?l[i+1]:null;
}
function bandePrecedente(id){
  const l=bandes(), i=l.findIndex(b=>b.id===id);
  return i>0?l[i-1]:null;
}
function libelleBande(id){
  const b=bandeById(id);
  return b?`${b.nom} · ${b.kg} kg`:"bande non choisie";
}
/* applique la bande à un exercice : la résistance équivalente alimente
   le calcul de volume, les records et la progression, comme une charge */
function appliquerBande(exo,id){
  const b=bandeById(id);
  exo.bande=id;
  exo.poids=b?b.kg:0;
}
function selectBande(exo){
  const l=bandes();
  return `<select data-bande="${exo.id}" style="max-width:170px;padding:6px" title="Résistance de la bande">
    <option value="">— bande —</option>
    ${l.map(b=>`<option value="${b.id}" ${exo.bande===b.id?"selected":""}>${esc(b.nom)} · ${b.kg} kg</option>`).join("")}
  </select>`;
}

/* --- éditeur des résistances --- */
function ouvrirBandes(){
  $("#bandesTexte").value=bandes().map(b=>`${b.nom} : ${b.kg}`).join("\n");
  $("#dlgBandes").showModal();
}
function sauverBandes(){
  const lignes=$("#bandesTexte").value.split("\n").map(l=>l.trim()).filter(Boolean);
  const out=[];
  lignes.forEach((l,i)=>{
    const m=l.match(/^(.*?)\s*[:=]\s*([\d.,]+)/);
    if(m){
      const kg=parseFloat(m[2].replace(",","."))||0;
      const anc=bandes()[i];
      out.push({id:(anc&&anc.id)||("b"+uid()), nom:m[1].trim()||("Bande "+(i+1)), kg});
    }
  });
  if(!out.length){ toast("Format : Nom : résistance en kg"); return; }
  S.bandes=out;
  // réaligner la résistance équivalente des exercices concernés
  for(const s of S.seances) for(const e of s.exos){
    if(e.mode==="bande"){ const b=bandeById(e.bande); e.poids=b?b.kg:0; }
  }
  save(); $("#dlgBandes").close();
  toast("Résistances mises à jour");
  renderSeances(); renderBandes();
}
function resetBandes(){
  S.bandes=JSON.parse(JSON.stringify(BANDES_DEFAUT));
  $("#bandesTexte").value=S.bandes.map(b=>`${b.nom} : ${b.kg}`).join("\n");
  save(); toast("Résistances par défaut restaurées");
}
function renderBandes(){
  const w=$("#listeBandes"); if(!w) return;
  w.innerHTML=`<div>${bandes().map(b=>`<span class="tag">${esc(b.nom)} · ${b.kg} kg</span>`).join("")}</div>
    <div class="spacer"></div>
    <button class="btn ghost small" onclick="ouvrirBandes()">Modifier</button>`;
}

/* --- migration : exercices élastiques existants --- */
function migrerBandes(){
  bandes();
  for(const s of (S.seances||[])) for(const e of (s.exos||[])){
    if(e.mode) continue;
    if(/élastique|elastique|bande/i.test(e.nom+" "+(e.note||""))){
      e.mode="bande";
      if(!e.bande){
        const def=/moyenne/i.test(e.note||"")?"b3":"b2";
        appliquerBande(e,def);
      }
    } else e.mode="kg";
  }
}
