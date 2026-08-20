"use strict";
/* ============================================================
   SPORT — séance socle débutant et journées de repos
   ============================================================ */
/* ============ Séance socle (mode débutant : une seule séance répétée) ============ */
function seanceSocle(){
  const ex=(nom,series,reps,poids,note,zones)=>({id:uid(),nom,series,reps,poids,note:note||"",zones,mode:"kg"});
  const band=(nom,series,reps,bandeId,note,zones)=>{
    const e={id:uid(),nom,series,reps,poids:0,note:note||"",zones,mode:"bande"};
    appliquerBande(e,bandeId);
    return e;
  };
  return {id:uid(),nom:"Séance socle",exos:[
    ex("Squat au poids du corps",3,10,0,"descente lente, talons au sol",["jambes"]),
    ex("Pompes inclinées (mains sur le banc)",3,6,0,"plus le banc est haut, plus c'est facile",["pecs","triceps"]),
    band("Développé debout à l'élastique",3,10,"b2","ancrage dans le dos",["pecs","epaules"]),
    band("Élévations latérales à l'élastique",3,10,"b1","bras presque tendus",["epaules"]),
    ex("Curl haltères",3,10,5,"par haltère",["biceps"]),
    band("Extensions triceps à l'élastique",3,12,"b2","coudes fixes",["triceps"]),
    ex("Gainage (secondes)",3,20,0,"dos droit, fessiers serrés",["abdos"]),
    ex("Crunch",3,10,0,"lent, sans tirer sur la nuque",["abdos"]),
  ]};
}
// remet le volume de départ sans toucher aux charges et bandes déjà choisies
function recalibrerSocle(){
  const s=S.seances.find(x=>x.nom==="Séance socle");
  if(!s){ toast("Aucune séance socle"); return; }
  if(!confirm("Ramener séries et répétitions au volume de départ ?\n\nTes charges et tes bandes sont conservées.")) return;
  const base=seanceSocle();
  for(const e of s.exos){
    const ref=base.exos.find(x=>x.nom===e.nom);
    if(ref){ e.series=ref.series; e.reps=ref.reps; }
    else e.reps=Math.max(5,Math.round(e.reps*0.75));
  }
  save(); renderSeances();
  toast("Volume ramené au niveau débutant");
}
function passerEnSeanceUnique(){
  if(!confirm("Remplacer le programme par une séance socle unique, répétée à chaque fois ?\n\nTes missions déjà accomplies et tes aptitudes sont conservées.")) return;
  S.seances=[seanceSocle()];
  S.enCours=null;
  save(); renderSeances(); renderBase();
  toast("Programme simplifié — une seule séance à répéter","Mode débutant");
}
function restaurerProgrammeComplet(){
  if(!confirm("Revenir au programme en trois séances (A, B, C) ?")) return;
  const socle=S.seances.find(s=>s.nom==="Séance socle");
  seedSeances();
  if(socle) S.seances.push(socle);
  save(); renderSeances(); renderBase();
  toast("Programme A / B / C restauré");
}
function modeSocle(){ return S.seances.length===1 && S.seances[0].nom==="Séance socle"; }

/* ============ Journée de repos / courbatures ============ */
const NIV_REPOS=[
  {id:"legere", nom:"Légères",  ds:"gênantes mais je bouge bien"},
  {id:"moderee",nom:"Modérées", ds:"raide, amplitude réduite"},
  {id:"forte",  nom:"Fortes",   ds:"douloureux au moindre mouvement"},
];
let reposDraft={zones:[],niveau:"moderee",note:""};

function ouvrirRepos(){
  reposDraft={zones:[],niveau:"moderee",note:""};
  renderReposDialog();
  $("#dlgRepos").showModal();
}
function renderReposDialog(){
  const w=$("#dlgReposBody");
  w.innerHTML=`
  <p class="muted">Aucun point gagné — le repos n'est pas une performance. Mais la journée est consignée : ta série de jours en service continue, et l'app en tiendra compte pour te proposer la prochaine séance.</p>
  <label class="fld" style="margin:14px 0 6px">Zones courbaturées <span class="muted">(facultatif)</span></label>
  <div>${ZONES.map(([zid,zl])=>`<span class="tag zrep ${reposDraft.zones.includes(zid)?"on":""}" data-zr="${zid}" style="cursor:pointer">${zl}</span>`).join("")}</div>
  <label class="fld" style="margin:14px 0 6px">Intensité</label>
  <div class="pickrow col">${NIV_REPOS.map(n=>`<button class="pick wide ${reposDraft.niveau===n.id?"on":""}" data-nr="${n.id}"><b>${n.nom}</b><span>${n.ds}</span></button>`).join("")}</div>
  <label class="fld" style="margin:14px 0 6px">Note <span class="muted">(facultatif)</span></label>
  <input id="reposNote" placeholder="ex : suite du parcours du combattant" value="${esc(reposDraft.note)}">`;
  w.querySelectorAll("[data-zr]").forEach(t=>t.onclick=()=>{
    const z=t.dataset.zr;
    reposDraft.zones=reposDraft.zones.includes(z)?reposDraft.zones.filter(x=>x!==z):[...reposDraft.zones,z];
    renderReposDialog();
  });
  w.querySelectorAll("[data-nr]").forEach(b=>b.onclick=()=>{ reposDraft.niveau=b.dataset.nr; renderReposDialog(); });
  $("#reposNote").oninput=()=>{ reposDraft.note=$("#reposNote").value; };
}
function validerRepos(){
  const n=NIV_REPOS.find(x=>x.id===reposDraft.niveau);
  const dejà=S.histoSeances.find(h=>h.d===todayKey()&&h.repos);
  const zl=reposDraft.zones.map(z=>ZONES.find(x=>x[0]===z)[1]);
  const entree={
    d:todayKey(), nom:"◦ Journée de repos", m:0, repos:true,
    sets:(zl.length?zl.join(", "):"récupération")+" · "+n.nom,
    zonesRepos:[...reposDraft.zones], niveau:reposDraft.niveau, note:reposDraft.note||""
  };
  if(dejà) S.histoSeances=S.histoSeances.filter(h=>h!==dejà);
  S.histoSeances.unshift(entree);
  S.journal.unshift({d:todayKey(),txt:"Journée de repos consignée",m:0});
  S.journal=S.journal.slice(0,80);
  marquerActivite();
  save(); checkJalons();
  $("#dlgRepos").close();
  toast(dejà?"Repos du jour mis à jour":"Journée de repos consignée","Récupération");
  renderSeances(); renderBase(); renderHeader(); renderCarnet();
}

/* --- zones encore sensibles (repos consigné récemment) --- */
function zonesSensibles(jours){
  const lim=new Date(); lim.setDate(lim.getDate()-(jours||2));
  const limK=todayKey(lim);
  const out=new Set();
  for(const h of S.histoSeances){
    if(!h.repos || h.d<limK) continue;
    for(const z of (h.zonesRepos||[])) out.add(z);
  }
  return [...out];
}
function reposAujourdhui(){ return S.histoSeances.some(h=>h.d===todayKey()&&h.repos); }
