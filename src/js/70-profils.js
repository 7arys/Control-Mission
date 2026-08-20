"use strict";
/* ============================================================
   PROFILS — plusieurs personnes sur le même appareil, fiche
   personnelle utilisée par l'application et par l'IA
   ============================================================ */

const NIVEAUX=[
  {id:"debutant",     nom:"Débutant",     ds:"je commence ou je reprends après une longue pause"},
  {id:"intermediaire",nom:"Intermédiaire",ds:"je m'entraîne régulièrement depuis plusieurs mois"},
  {id:"confirme",     nom:"Confirmé",     ds:"plusieurs années de pratique"},
];
function nomNiveau(id){ const n=NIVEAUX.find(x=>x.id===id); return n?n.nom:"Débutant"; }
function nomProfil(){ return (S.profil&&S.profil.nom)||"—"; }

/* --- description envoyée à l'IA : plus rien n'est codé en dur --- */
function profilPourIA(){
  const p=S.profil||{};
  const n=NIVEAUX.find(x=>x.id===p.niveau)||NIVEAUX[0];
  return {
    niveau: p.niveau==="debutant"
      ? "grand débutant — premières semaines d'entraînement, aucune base de force"
      : n.nom+" — "+n.ds,
    anciennete_missions:(typeof nbMissions==="function")?nbMissions():0,
    objectif: p.objectif || "non précisé",
    frequence_visee: `${(S.settings&&S.settings.objSeances)||3} séances par semaine`,
    materiel: p.materiel || "non précisé",
    contrainte: p.contrainte || "aucune contrainte signalée",
  };
}

/* ============ Changement de profil ============ */
function basculerProfil(id){
  if(id===profilActif()) return;
  localStorage.setItem("expedition_actif",id);
  location.reload();
}
function creerProfil(nom){
  const l=listeProfils();
  const id="p"+Math.random().toString(36).slice(2,8);
  l.push({id,nom:nom||"Nouveau profil"});
  setProfils(l);
  localStorage.setItem("expedition_actif",id);
  location.reload();
}
function supprimerProfil(id){
  const l=listeProfils();
  if(l.length<2){ toast("Il faut au moins un profil"); return; }
  const p=l.find(x=>x.id===id); if(!p) return;
  if(!confirm(`Supprimer le profil « ${p.nom||id} » et toutes ses données ?\n\nCette action est définitive.`)) return;
  localStorage.removeItem(cleData(id));
  localStorage.removeItem(cleSync(id));
  localStorage.removeItem("expedition_backup:"+id);
  const reste=l.filter(x=>x.id!==id);
  setProfils(reste);
  if(profilActif()===id) localStorage.setItem("expedition_actif",reste[0].id);
  location.reload();
}
function majNomProfil(nom){
  const l=listeProfils(), id=profilActif();
  const p=l.find(x=>x.id===id);
  if(p){ p.nom=nom; setProfils(l); }
}

/* ============ Fiche et sélecteur (onglet Dossier) ============ */
function renderProfil(){
  const w=$("#carteProfil"); if(!w) return;
  const p=S.profil||{};
  const l=listeProfils(), actif=profilActif();
  w.innerHTML=`
  <label class="fld">Nom ou pseudo<input id="pfNom" value="${esc(p.nom||"")}" placeholder="ton prénom"></label>
  <label class="fld" style="margin-bottom:6px">Niveau</label>
  <div class="pickrow col">${NIVEAUX.map(n=>
    `<button class="pick wide ${p.niveau===n.id?"on":""}" data-niv="${n.id}"><b>${n.nom}</b><span>${n.ds}</span></button>`).join("")}</div>
  <div class="spacer"></div>
  <label class="fld">Objectif<input id="pfObj" value="${esc(p.objectif||"")}" placeholder="ex : prendre du muscle, perdre du gras, être plus endurant"></label>
  <label class="fld">Matériel disponible<input id="pfMat" value="${esc(p.materiel||"")}" placeholder="ex : haltères, élastiques, banc, barre de traction"></label>
  <label class="fld">Contrainte ou blessure <span class="muted">(important)</span>
    <input id="pfCon" value="${esc(p.contrainte||"")}" placeholder="ex : genou fragile, pas de sauts"></label>
  <div class="row"><button class="btn" id="pfSave">Enregistrer</button></div>
  <p class="cote-meta" style="margin-top:8px">Ces informations restent sur ton appareil. Elles servent à personnaliser les conseils et sont transmises à l'IA si tu l'actives.</p>

  <h3 class="dbg-h" style="margin-top:18px">Profils sur cet appareil</h3>
  <p class="muted">Chaque profil a ses propres séances, sa télémétrie et sa synchronisation. Pratique pour faire essayer l'application à quelqu'un sans mélanger vos données.</p>
  <div class="spacer"></div>
  ${l.map(x=>`<div class="mod-tog">
      <div><b>${esc(x.nom||"Sans nom")}${x.id===actif?" · actif":""}</b><span>${x.id===actif?"profil en cours":"basculer pour l'utiliser"}</span></div>
      <div style="display:flex;gap:6px">
        ${x.id===actif?"":`<button class="btn small" data-bascule="${x.id}">Ouvrir</button>`}
        ${l.length>1?`<button class="btn small danger" data-suppr="${x.id}">✕</button>`:""}
      </div></div>`).join("")}
  <div class="spacer"></div>
  <button class="btn ghost small" id="pfNew">+ Nouveau profil</button>`;

  w.querySelectorAll("[data-niv]").forEach(b=>b.onclick=()=>{
    S.profil.niveau=b.dataset.niv; save(); renderProfil();
  });
  $("#pfSave").onclick=()=>{
    S.profil.nom=$("#pfNom").value.trim();
    S.profil.objectif=$("#pfObj").value.trim();
    S.profil.materiel=$("#pfMat").value.trim();
    S.profil.contrainte=$("#pfCon").value.trim();
    majNomProfil(S.profil.nom);
    save(); majEnteteProfil(); renderProfil();
    toast("Profil enregistré");
  };
  w.querySelectorAll("[data-bascule]").forEach(b=>b.onclick=()=>basculerProfil(b.dataset.bascule));
  w.querySelectorAll("[data-suppr]").forEach(b=>b.onclick=()=>supprimerProfil(b.dataset.suppr));
  $("#pfNew").onclick=()=>{
    const n=prompt("Nom du nouveau profil ?");
    if(n!==null) creerProfil(n.trim());
  };
}
function majEnteteProfil(){
  const e=$("#sysNom");
  if(e) e.textContent=(S.profil&&S.profil.nom)?S.profil.nom.toUpperCase():"INVITÉ";
}

/* ============ Accueil au premier lancement ============ */
let bienvenueEtape=0;
function besoinBienvenue(){
  return !(S.profil&&S.profil.nom) && !(S.histoSeances&&S.histoSeances.length);
}
function ouvrirBienvenue(){
  bienvenueEtape=0;
  renderBienvenue();
  $("#dlgBienvenue").showModal();
}
function renderBienvenue(){
  const w=$("#dlgBienvenueBody");
  const p=S.profil||{};
  if(bienvenueEtape===0){
    w.innerHTML=`
      <p>Cette application sert à <b>t'entraîner régulièrement</b> et à voir ta progression, sans t'obliger à tenir un carnet.</p>
      <div class="dbg-list"><b>Le principe</b><ul>
        <li>Tu fais une séance, tu coches tes séries.</li>
        <li>Un <b>débriefing</b> te dit quoi ajuster la fois suivante : monter d'un kilo, consolider, ou alléger.</li>
        <li>Chaque séance rapporte des <b>points de mission</b> qui alimentent un programme spatial : sondes, chantier, chapitres.</li>
        <li>Rien ne progresse sans séance. Le jeu récompense l'effort, il ne le remplace pas.</li>
      </ul></div>
      <p class="muted">Trois questions rapides et on démarre.</p>`;
    $("#bvSuivant").textContent="Commencer";
  } else if(bienvenueEtape===1){
    w.innerHTML=`
      <label class="fld">Comment veux-tu qu'on t'appelle ?<input id="bvNom" value="${esc(p.nom||"")}" placeholder="prénom ou pseudo"></label>
      <label class="fld" style="margin:14px 0 6px">Ton niveau</label>
      <div class="pickrow col">${NIVEAUX.map(n=>
        `<button class="pick wide ${p.niveau===n.id?"on":""}" data-bvniv="${n.id}"><b>${n.nom}</b><span>${n.ds}</span></button>`).join("")}</div>`;
    w.querySelectorAll("[data-bvniv]").forEach(b=>b.onclick=()=>{
      S.profil.nom=$("#bvNom").value.trim();
      S.profil.niveau=b.dataset.bvniv;
      renderBienvenue();
    });
    $("#bvSuivant").textContent="Suivant";
  } else {
    w.innerHTML=`
      <label class="fld">Ton objectif<input id="bvObj" value="${esc(p.objectif||"")}" placeholder="ex : prendre du muscle, me remettre en forme"></label>
      <label class="fld">Matériel dont tu disposes<input id="bvMat" value="${esc(p.materiel||"")}" placeholder="ex : haltères, élastiques, banc — ou rien du tout"></label>
      <label class="fld">Une blessure ou une contrainte ? <span class="muted">(facultatif mais utile)</span>
        <input id="bvCon" value="${esc(p.contrainte||"")}" placeholder="ex : genou fragile, pas de sauts"></label>
      <p class="cote-meta">Tout est modifiable plus tard dans l'onglet Dossier.</p>`;
    $("#bvSuivant").textContent="C'est parti";
  }
}
function bienvenueSuivant(){
  if(bienvenueEtape===1){
    const n=$("#bvNom"); if(n) S.profil.nom=n.value.trim();
  }
  if(bienvenueEtape===2){
    const o=$("#bvObj"), m=$("#bvMat"), c=$("#bvCon");
    if(o) S.profil.objectif=o.value.trim();
    if(m) S.profil.materiel=m.value.trim();
    if(c) S.profil.contrainte=c.value.trim();
    if(!S.profil.nom) S.profil.nom="Opérateur";
    majNomProfil(S.profil.nom);
    save(); majEnteteProfil(); renderProfil(); renderBase();
    $("#dlgBienvenue").close();
    toast("Bienvenue "+S.profil.nom+" — commence par une mission","Profil créé");
    return;
  }
  bienvenueEtape++;
  renderBienvenue();
}
