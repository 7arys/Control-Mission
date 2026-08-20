"use strict";
/* ============================================================
   DÉMARRAGE — tableau de bord, réglages, modules, lancement
   ============================================================ */
/* ============ Quête hebdo : vérification & récompense ============ */
function verifierQuete(){
  const q=queteCourante();
  if(!q.claimed && queteComplete(q)){
    q.claimed=true; S.jalons._q1=S.jalons._q1||todayKey(); save();
    setTimeout(()=>{ gagner(100,"Ordre de mission hebdo accompli"); gagnerJeton(1,"Ordre hebdo bouclé"); },1200);
  }
}

/* ============ Camp de base (dashboard) ============ */
function renderBase(){
  const q=queteCourante(), o=queteObjectifs();
  const item=(ok,txt)=>`<div style="display:flex;gap:8px;align-items:center;padding:3px 0">
    <span style="font-family:var(--body);font-weight:600;color:${ok?"var(--signal)":"var(--dim)"}">[${ok?"■":"&nbsp;&nbsp;"}]</span><span style="${ok?"opacity:.6;text-decoration:line-through":""}">${txt}</span></div>`;
  $("#baseQuete").innerHTML=`<div class="seance-head"><h2 style="margin:0">Ordre de mission — semaine</h2>${q.claimed?`<span class="stamp">Exécuté</span>`:`<span class="tag">+100 pts</span>`}</div>
    ${item(q.seances>=o.seances,`Accomplir ${o.seances} missions (${Math.min(q.seances,o.seances)}/${o.seances})`)}
    ${item(q.pesees>=o.pesees,`Consigner ${o.pesees} pesées (${Math.min(q.pesees,o.pesees)}/${o.pesees})`)}
    ${o.plan?item(!!q.plan,`Planifier le ravitaillement hebdomadaire`):""}`;

  // Séance du jour — priorité à la zone la plus faible
  const dernieres=S.histoSeances.map(h=>h.nom);
  let suggestion=S.seances[0];
  const zf=typeof zoneFaible==="function"?zoneFaible():null;
  const parZone=zf?S.seances.find(s=>s.exos.some(e=>(e.zones||[]).includes(zf))):null;
  if(parZone && parZone.nom!==dernieres[0]) suggestion=parZone;
  else if(S.seances.length && dernieres.length){
    const idx=S.seances.findIndex(s=>s.nom===dernieres[0]);
    suggestion=S.seances[(idx+1)%S.seances.length]||S.seances[0];
  }
  const zfLabel=zf&&suggestion===parZone?ZONES.find(x=>x[0]===zf)[1]:null;
  const dejaAujourdhui=S.histoSeances.some(h=>h.d===todayKey()&&!h.repos);
  const sensibles=(typeof zonesSensibles==="function")?zonesSensibles(2):[];
  const enRepos=(typeof reposAujourdhui==="function")&&reposAujourdhui();
  const btnSortie=`<div class="spacer"></div><div class="row">
    <button class="btn ghost small" onclick="document.querySelector('[data-page=seances]').click();ouvrirActivite()">▲ Sortie</button>
    <button class="btn ghost small" onclick="document.querySelector('[data-page=seances]').click();ouvrirRepos()">◦ Repos</button></div>`;
  const noteSensible=sensibles.length?`<p class="hand" style="font-size:11px">Encore sensible : ${sensibles.map(z=>ZONES.find(x=>x[0]===z)[1]).join(", ")} — allège ou évite ces zones.</p>`:"";

  // Reprise : combien de jours depuis la dernière vraie séance
  const derniere=S.histoSeances.find(h=>!h.repos);
  let joursOff=null;
  if(derniere) joursOff=Math.round((new Date(todayKey())-new Date(derniere.d))/864e5);
  const totalMissions=(typeof nbMissions==="function")?nbMissions():0;
  let noteReprise="";
  if(joursOff!==null&&joursOff>=4)
    noteReprise=`<p class="dbg-warn" style="font-size:12px;margin:8px 0">${joursOff} jours sans séance — reprends à 60-70 % de tes charges et arrête-toi en te disant que tu aurais pu en faire plus.</p>`;
  else if(totalMissions>0&&totalMissions<6)
    noteReprise=`<p class="cote-meta" style="margin:6px 0">Séance ${totalMissions+1} — à ce stade, la régularité et la technique comptent bien plus que la charge.</p>`;

  // Consignes retenues du dernier débriefing
  let consignes="";
  const derAn=(S.analyses||[]).find(a=>!a.ext&&a.bilan&&a.bilan.exos&&a.bilan.exos.length);
  if(derAn){
    const up=derAn.bilan.exos.filter(e=>e.conseil&&e.conseil.action==="Augmenter")
      .map(e=>`${e.nom}${e.poids>0?` → ${e.poids+(e.poids<10?1:2)} kg`:` → ${e.reps+2} reps`}`);
    const down=derAn.bilan.exos.filter(e=>e.conseil&&e.conseil.action==="Alléger").map(e=>`${e.nom} → alléger`);
    const cons=derAn.bilan.exos.filter(e=>e.conseil&&e.conseil.action==="Consolider").map(e=>`${e.nom} → même chose`);
    const tout=[...up,...down,...cons].slice(0,4);
    if(tout.length) consignes=`<div class="cote-meta" style="margin-top:8px">Consignes du dernier débriefing :</div>
      <ul style="margin:4px 0 0 16px;font-size:12.5px">${tout.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`;
  }
  // espacement recommandé entre deux séances complètes (48 h à 3 séances/semaine)
  const espacement=Math.max(1,Math.floor(7/((S.settings&&S.settings.objSeances)||3)));
  const quotaAtteint=q.seances>=o.seances;
  const enRecup=(joursOff!==null && joursOff>0 && joursOff<espacement);

  const blocLancer=(cls,txt)=>suggestion
    ? `<button class="btn ${cls}" onclick="demarrerSeance('${suggestion.id}');document.querySelector('[data-page=seances]').click()">${txt}</button>`
    : "";

  let corps;
  if(enRepos){
    corps=`<p class="hand">Journée de repos consignée. C'est une décision d'entraînement, pas une absence.</p>${noteSensible}`;
  } else if(dejaAujourdhui){
    corps=`<p class="hand">Mission du jour accomplie.</p>
      <p class="muted">Le muscle se répare et se renforce maintenant, pas pendant la séance. Prochaine séance conseillée dans ${espacement} jour${espacement>1?"s":""}.</p>`;
  } else if(S.enCours){
    corps=`<p>Une mission est en cours.</p><button class="btn signal" onclick="document.querySelector('[data-page=seances]').click()">Reprendre</button>`;
  } else if(enRecup){
    corps=`<p class="hand">Journée de récupération</p>
      <p class="muted">Séance faite ${joursOff===1?"hier":"il y a "+joursOff+" jours"}. Un groupe musculaire a besoin d'environ 48 h pour se reconstruire — c'est là que la progression se fait. ${quotaAtteint?"Ton objectif de la semaine est déjà atteint.":"Prochaine séance conseillée demain."}</p>
      ${noteSensible}
      <div class="spacer"></div>
      <p class="cote-meta">Envie de bouger sans forcer ? Une marche ou une sortie compte aussi.</p>
      <div class="spacer"></div>
      <details><summary class="muted" style="cursor:pointer;font-size:12px">Je me sens frais, lancer quand même</summary>
        <div class="spacer"></div>
        ${blocLancer("ghost small","Lancer malgré tout · +120 pts")}
        <p class="cote-meta" style="margin-top:6px">Possible ponctuellement, mais pas deux jours de suite en routine.</p>
      </details>`;
  } else if(suggestion){
    corps=`<p>Mission recommandée :</p><p><b>${esc(suggestion.nom)}</b>${zfLabel?`<br><span class="hand" style="font-size:16px">objectif : renforcer ${zfLabel}</span>`:""}</p>
      <div class="spacer"></div>
      ${blocLancer("signal","Lancer · +120 pts")}${noteSensible}${noteReprise}${consignes}`;
  } else {
    corps=`<p class="muted">Aucune séance au programme.</p>`;
  }
  $("#baseSeance").innerHTML=`<h2>Ordre du jour</h2>`+corps+btnSortie;

  // Poids
  const last=S.pesees[S.pesees.length-1];
  const peseAujourdhui=last&&last.d===todayKey();
  $("#basePoids").innerHTML=`<h2>Télémétrie</h2>`+(
    peseAujourdhui?`<p class="hand">${last.kg} kg transmis aujourd'hui ✓</p>`
    :`<p>${last?`Dernière : <b>${last.kg} kg</b> (${fmtDate(last.d)})`:"Aucune pesée pour l'instant."}</p><div class="spacer"></div>
      <button class="btn ghost" onclick="document.querySelector('[data-page=poids]').click()">Consigner · +15 pts</button>`);

  // Repas du jour
  let repasHtml=`<p class="muted">Aucun plan de vivres cette semaine.</p>`;
  if(S.semaine){
    const dow=(new Date().getDay()+6)%7;
    const j=S.semaine.jours[dow];
    if(j){
      repasHtml=SLOTS.map(([t,label])=>{
        const r=S.recettes.find(x=>x.id===j.slots[t]);
        return r?`<div class="meal-line"><span class="slot">${label}</span><span style="flex:1">${esc(r.nom)}</span><span class="kx">${r.prot} g</span></div>`:"";
      }).join("");
    }
  }
  $("#baseRepas").innerHTML=`<h2>Vivres du jour</h2>${repasHtml}`;

  // Journal
  $("#baseJournal").innerHTML=`<h2>Journal des opérations</h2>`+(S.journal.length
    ?`<table class="mini">${S.journal.slice(0,6).map(e=>`<tr><td class="muted">${fmtDate(e.d)}</td><td>${esc(e.txt)}</td><td class="muted">+${e.m} pts</td></tr>`).join("")}</table>`
    :`<p class="hand">Journal vierge — en attente de données</p>`);
}

/* ============ Carnet : jalons + réglages ============ */
function renderCarnet(){
  $("#jalonsGrid").innerHTML=JALONS.map(j=>`<div class="jalon ${S.jalons[j.id]?"won":""}">
    <div class="ico">${j.ico}</div><div class="nm">${j.nom}</div><div class="ds">${S.jalons[j.id]?fmtDate(S.jalons[j.id]):j.ds}</div></div>`).join("");
  renderSkinPicker();
  if(typeof renderModules==="function") renderModules();
  if(typeof renderIAConfig==="function") renderIAConfig();
  $("#setProt").value=S.settings.prot;
  if($("#setObjS")) $("#setObjS").value=S.settings.objSeances||3;
  if($("#setObjP")) $("#setObjP").value=S.settings.objPesees||2;
  if($("#inMmUnit")) $("#inMmUnit").value=S.settings.mmUnit||"pct";
  $("#protCible").textContent=S.settings.prot;
}
$("#btnSaveSettings").onclick=()=>{
  S.settings.prot=Math.max(60,Math.min(260,+$("#setProt").value||130));
  S.settings.objSeances=Math.max(1,Math.min(7,+$("#setObjS").value||3));
  S.settings.objPesees=Math.max(1,Math.min(7,+$("#setObjP").value||2));
  save(); renderBase(); renderCarnet(); toast("Réglages enregistrés");
};
$("#btnExport").onclick=()=>{
  const blob=new Blob([JSON.stringify(S,null,1)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`expedition-${todayKey()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
};
$("#btnImport").onclick=()=>$("#inImport").click();
$("#inImport").addEventListener("change",async e=>{
  const f=e.target.files[0]; if(!f) return;
  try{
    const data=JSON.parse(await f.text());
    if(!("altitude" in data)) throw new Error();
    if(!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) return;
    S=Object.assign({},DEFAULTS,data); save(); boot();
    toast("Sauvegarde restaurée");
  }catch{ toast("Fichier invalide"); }
  e.target.value="";
});
$("#btnReset").onclick=()=>{
  if(confirm("Tout effacer et repartir de l'aire de lancement ? (pense à exporter avant)")&&confirm("Vraiment sûr ? C'est définitif.")){
    localStorage.removeItem("expedition"); load(); boot();
BOOT=false;   // à partir d'ici, toute écriture horodate vraiment la configuration
  }
};

/* ============ Modules activables ============ */
const MODULES=[
  {id:"vivres",  nom:"Vivres & repas",   ds:"plan de la semaine, liste de courses"},
  {id:"spatial", nom:"Programme spatial",ds:"sondes, chantier, progression"},
];
function renderModules(){
  const w=$("#modulesToggle"); if(!w) return;
  w.innerHTML=MODULES.map(m=>{
    const on=modActif(m.id);
    return `<div class="mod-tog"><div><b>${m.nom}</b><span>${m.ds}</span></div>
      <button class="btn small ${on?"signal":"ghost"}" data-mod-t="${m.id}">${on?"Activé":"Désactivé"}</button></div>`;
  }).join("");
  w.querySelectorAll("[data-mod-t]").forEach(btn=>btn.onclick=()=>{
    const id=btn.dataset.modT;
    S.settings.modules=Object.assign({vivres:true,spatial:true},S.settings.modules||{});
    S.settings.modules[id]=!modActif(id);
    save(); appliquerModules(); renderModules(); renderBase(); renderSpatial();
    toast(`${MODULES.find(x=>x.id===id).nom} ${modActif(id)?"activé":"mis en suspens"}`);
  });
}
function appliquerModules(){
  const nv=document.querySelector('nav [data-mod="vivres"]');
  if(nv){
    nv.style.display=modActif("vivres")?"":"none";
    if(!modActif("vivres")&&nv.classList.contains("active")){
      document.querySelector('nav [data-page="base"]').click();
    }
  }
  const cs=$("#carteSpatiale");
  if(cs) cs.style.display=modActif("spatial")?"":"none";
  const cl=$("#carteLore");
  if(cl) cl.style.display=modActif("spatial")?"":"none";
  const pr=$("#baseRepas");
  if(pr) pr.style.display=modActif("vivres")?"":"none";
}

/* ============ Boot ============ */
function boot(){
  queteCourante();
  applySkin(S.settings.skin||"orbite");
  appliquerModules();
  if(typeof initSyncUI==="function"){ initSyncUI(); renderSync(); if(syncActif()) syncMaintenant(true); }
  renderHeader(); renderBase(); renderSeances(); renderPoids(); renderRecettes(); renderSemaine(); renderCarnet(); renderAnalyses(); renderSpatial(); renderModeProgramme(); renderBandes();
  if(typeof verifierLore==="function") verifierLore();
  if(typeof renderLore==="function") renderLore();
  checkJalons();
}
function tickClock(){
  const el=$("#sysClock"); if(!el) return;
  const d=new Date();
  el.textContent=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
}
setInterval(tickClock,1000); tickClock();
setInterval(()=>{ if(typeof jeu==="function"&&jeu().sondes.length){ renderHeader(); renderSpatial(); } },30000);
load(); boot();
BOOT=false;   // à partir d'ici, toute écriture horodate vraiment la configuration
