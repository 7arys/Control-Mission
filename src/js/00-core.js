"use strict";
/* ============================================================
   NOYAU — état, stockage, points, grades, insignes, thèmes, navigation
   ============================================================ */
/* ============ Utilitaires ============ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const todayKey = (d=new Date()) => d.toISOString().slice(0,10);
const fmtDate = k => { const d=new Date(k+"T12:00:00"); return d.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"}); };
const uid = () => Math.random().toString(36).slice(2,9);
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function toast(msg, hand){
  const t=$("#toast");
  t.innerHTML = (hand?`<span class="hand">${esc(hand)}</span><br>`:"")+esc(msg);
  t.classList.add("show");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2600);
}

/* ============ État & stockage ============ */
function devId(){
  let d=localStorage.getItem("expedition_dev");
  if(!d){ d="d"+Math.random().toString(36).slice(2,10); localStorage.setItem("expedition_dev",d); }
  return d;
}
const DEFAULTS = {
  altitude: 0,
  alt: {},                     // points par appareil : total = somme (fusion sans perte)
  stamp: 0,                 // XP = mètres gravis
  journal: [],                 // {d, txt, m}
  seances: [],                 // programme : {id, nom, exos:[{id,nom,series,reps,poids}]}
  histoSeances: [],            // {d, seanceId, nom, m, prs:[..]}
  enCours: null,               // {seanceId, sets:{exoId:[bool,..]}, debut}
  prs: {},                     // exoNom -> poids max
  pesees: [],                  // {d, kg, mg}
  analyses: [],                // débriefings de séance
  jeu: null,                   // programme spatial
  echauffement: null,          // liste personnalisable
  lore: [],                    // journal de bord
  bandes: null,                // résistances élastiques
  muscles: {},                 // zone -> {pts, last, n}
  recettes: [],                // {id, nom, type, kcal, prot, ing:[{q,u,n}]}
  semaine: null,               // {debut, jours:[{d, slots:{petitdej,dej,diner,collation}}]}
  jalons: {},                  // id -> dateISO
  quete: null,                 // {semaine, done:{seances,pesees,plan}, reward}
  settings: { prot: 130, apiKey: "", skin: "orbite", iaProvider: "gemini", iaModel: "", objSeances: 3, objPesees: 2, mmUnit: "pct", modules: { vivres: true, spatial: true } },
  activite: {},                // dateKey -> true (pour la streak)
};
let S;
function load(){
  try { S = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem("expedition")||"{}")); }
  catch(e){ S = clone(DEFAULTS); }
  S.settings = Object.assign({}, DEFAULTS.settings, S.settings||{});
  if(!S.alt || !Object.keys(S.alt).length) S.alt = (S.altitude>0)?{[devId()]:S.altitude}:{};
  S.altitude = totalAlt();
  if(!S.seances.length && !S.histoSeances.length) seedSeances();
  if(!S.recettes.length) seedRecettes();
  migrateZones();
  if(typeof migrerBandes==="function") migrerBandes();
  migrerRecords();
}
// Le rang d'aptitude reposait autrefois sur le volume cumulé, ce qui le faisait
// monter même sans progresser. On reconstruit la meilleure séance par zone à
// partir des débriefings enregistrés ; à défaut, la prochaine séance fera foi.
function migrerRecords(){
  if(S._migRec) return;
  const best={};
  for(const a of (S.analyses||[])){
    const pz=(a.bilan&&a.bilan.parZone)||null;
    if(!pz) continue;
    for(const [z,v] of Object.entries(pz)){
      const s=v/10;
      if(!best[z]||s>best[z]) best[z]=s;
    }
  }
  for(const [z,m] of Object.entries(S.muscles||{})){
    if(m.record===undefined) m.record=Math.round((best[z]||0)*10)/10;
  }
  S._migRec=true;
}
function totalAlt(){ return Object.values(S.alt||{}).reduce((a,b)=>a+(+b||0),0); }
let BOOT=true;
function save(){
  if(!BOOT) S.stamp=Date.now();
  localStorage.setItem("expedition", JSON.stringify(S));
  if(typeof syncPlanifier==="function") syncPlanifier();
}

/* ============ Camps (paliers d'altitude) ============ */
const CAMPS = [
  {alt:0,     nom:"AIRE DE LANCEMENT", code:"T-0"},
  {alt:900,   nom:"ORBITE BASSE",      code:"LEO"},
  {alt:2200,  nom:"ORBITE HAUTE",      code:"GEO"},
  {alt:4000,  nom:"STATION",           code:"STA"},
  {alt:6500,  nom:"LUNE",              code:"LUN"},
  {alt:9500,  nom:"CEINTURE",          code:"AST"},
  {alt:13000, nom:"MARS",              code:"MRS"},
  {alt:17000, nom:"JUPITER",           code:"JUP"},
  {alt:22000, nom:"ESPACE PROFOND",    code:"∞"},
];
function campActuel(){
  let c=CAMPS[0];
  for(const k of CAMPS) if(S.altitude>=k.alt) c=k;
  return c;
}
function campSuivant(){
  for(const k of CAMPS) if(S.altitude<k.alt) return k;
  return null;
}

/* ============ Gain d'altitude ============ */
function gagner(m, raison){
  const avant = campActuel();
  S.alt[devId()]=(S.alt[devId()]||0)+m;
  S.altitude=totalAlt();
  marquerActivite();
  S.journal.unshift({d:todayKey(), txt:raison, m});
  S.journal = S.journal.slice(0,60);
  const apres = campActuel();
  save();
  if(apres.alt !== avant.alt){
    toast(`Cap atteint : ${apres.nom}`, "Nouveau palier");
  } else {
    toast(`${raison} · +${m} pts`);
  }
  checkJalons();
  if(typeof verifierLore==="function") verifierLore();
  renderHeader(); renderBase(); renderCarnet();
}
function marquerActivite(){ S.activite[todayKey()] = true; }

/* ============ Streak : jours d'expédition consécutifs ============ */
function streak(){
  let n=0; const d=new Date();
  if(!S.activite[todayKey(d)]) d.setDate(d.getDate()-1); // la journée en cours ne casse pas la série
  while(S.activite[todayKey(d)]){ n++; d.setDate(d.getDate()-1); }
  return n;
}

/* ============ Quête hebdomadaire ============ */
function semaineKey(d=new Date()){
  const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day);
  return todayKey(x);
}
function queteCourante(){
  const wk = semaineKey();
  if(!S.quete || S.quete.semaine!==wk){
    S.quete = {semaine:wk, seances:0, pesees:0, plan:false, claimed:false};
    save();
  }
  return S.quete;
}
function modActif(id){
  const m=(S.settings&&S.settings.modules)||{};
  return m[id]!==false;
}
function queteObjectifs(){
  const s=S.settings||{};
  return {seances:Math.max(1,+s.objSeances||3), pesees:Math.max(1,+s.objPesees||2), plan:modActif("vivres")?1:0};
}
function queteComplete(q){
  const o=queteObjectifs();
  return q.seances>=o.seances && q.pesees>=o.pesees && (q.plan?1:0)>=o.plan;
}

/* ============ Jalons (achievements) ============ */
function nbMissions(){ return (S.histoSeances||[]).filter(h=>!h.repos).length; }
const JALONS = [
  {id:"depart",   ico:"▲", nom:"Décollage",         ds:"Première mission validée",     test:()=>nbMissions()>=1},
  {id:"s10",      ico:"◈", nom:"10 missions",        ds:"Dix missions au compteur",     test:()=>nbMissions()>=10},
  {id:"s25",      ico:"❖", nom:"25 missions",        ds:"Le rythme est pris",           test:()=>nbMissions()>=25},
  {id:"s50",      ico:"✦", nom:"50 missions",        ds:"Vétéran du terrain",           test:()=>nbMissions()>=50},
  {id:"st7",      ico:"◉", nom:"7 j en service",    ds:"Une semaine sans rompre",      test:()=>streak()>=7},
  {id:"st30",     ico:"◎", nom:"30 j en service",   ds:"Un mois de constance",         test:()=>streak()>=30},
  {id:"pr1",      ico:"↑", nom:"Premier record",     ds:"Un PR consigné",               test:()=>Object.keys(S.prs).length>=1},
  {id:"pr5",      ico:"⇈", nom:"5 records",          ds:"Cinq exercices dépassés",      test:()=>Object.keys(S.prs).length>=5},
  {id:"p7",       ico:"≈", nom:"Télémétrie",        ds:"7 relevés consignés",          test:()=>S.pesees.length>=7},
  {id:"p30",      ico:"∿", nom:"Analyste",          ds:"30 relevés consignés",         test:()=>S.pesees.length>=30},
  {id:"chef",     ico:"▤", nom:"Intendance",        ds:"Première semaine planifiée",   test:()=>!!S.semaine},
  {id:"rec10",    ico:"☰", nom:"Base de vivres",    ds:"10 recettes enregistrées",     test:()=>S.recettes.length>=10},
  {id:"q1",       ico:"★", nom:"Premier ordre",      ds:"Un ordre de mission bouclé",  test:()=>!!S.jalons._q1},
  {id:"ext1",     ico:"⬡", nom:"Grand air",         ds:"Première sortie consignée",   test:()=>S.histoSeances.filter(h=>h.ext).length>=1},
  {id:"ext10",    ico:"⬢", nom:"Baroudeur",         ds:"10 sorties consignées",       test:()=>S.histoSeances.filter(h=>h.ext).length>=10},
  {id:"recup",    ico:"◦", nom:"Écoute du corps",    ds:"Une journée de repos consignée",test:()=>S.histoSeances.some(h=>h.repos)},
  {id:"sp1",      ico:"➤", nom:"Premier lancement",  ds:"Une sonde envoyée",           test:()=>!!(S.jeu&&S.jeu.sondesTotal>=1)},
  {id:"sp2",      ico:"⌬", nom:"Lanceur assemblé",   ds:"Chapitre 1 terminé",          test:()=>!!(S.jeu&&S.jeu.chapitre>=1)},
  {id:"sp3",      ico:"☾", nom:"Base lunaire",       ds:"Chapitre 4 terminé",          test:()=>!!(S.jeu&&S.jeu.chapitre>=4)},
  {id:"sp4",      ico:"♂", nom:"Terraformation",     ds:"Programme spatial accompli",  test:()=>!!(S.jeu&&S.jeu.chapitre>=7)},
  {id:"alp",      ico:"◐", nom:"Orbite haute",      ds:"2 200 pts de mission",          test:()=>S.altitude>=2200},
  {id:"refuge",   ico:"◑", nom:"Alunissage",        ds:"6 500 pts de mission",          test:()=>S.altitude>=6500},
  {id:"sommet",   ico:"✧", nom:"Espace profond",    ds:"9 000 pts de mission",         test:()=>S.altitude>=9000},
];
function checkJalons(){
  let nouveaux=[];
  for(const j of JALONS){
    if(!S.jalons[j.id] && j.test()){ S.jalons[j.id]=todayKey(); nouveaux.push(j); }
  }
  if(nouveaux.length){
    save();
    setTimeout(()=>toast(nouveaux.map(j=>j.ico+" "+j.nom).join(" · "),"Jalon atteint !"),900);
  }
}

/* ============ Header : profil d'ascension ============ */
function renderHeader(){
  const st=streak();
  $("#hdStreak").innerHTML = st>0 ? `<b>${st} J</b> EN SERVICE CONTINU` : `EN ATTENTE DE LANCEMENT`;
  const c=campActuel(), n=campSuivant();
  $("#hdCamp").textContent = "SECTEUR : "+c.nom;
  $("#hdAlt").textContent = Math.round(S.altitude)+" PTS DE MISSION";
  $("#hdNext").textContent = n ? `CAP SUIVANT : ${n.nom} — ${n.alt} PTS` : "ESPACE PROFOND ATTEINT";

  // Sondes en vol : une voie par emplacement
  const host=$("#ascension");
  const W=Math.max(300, Math.round((host&&host.clientWidth)||980));
  const compact=W<620;
  const j=(typeof jeu==="function")?jeu():{sondes:[],tokens:0};
  const slots=(typeof nbSlots==="function")?nbSlots():1;
  const voieH=24, H=14+slots*voieH;
  if(host){ host.setAttribute("viewBox",`0 0 ${W} ${H}`); host.style.height=H+"px"; }
  const xA=compact?58:88, xB=W-(compact?52:76);
  let svg="";
  for(let i=0;i<slots;i++){
    const y=14+i*voieH;
    const s=j.sondes[i];
    if(!s){
      svg+=`<line x1="${xA}" y1="${y}" x2="${xB}" y2="${y}" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="3 5"/>`;
      svg+=`<text x="0" y="${y+3.5}" font-size="${compact?9:10}" fill="var(--dim)" font-family="IBM Plex Mono">LIBRE</text>`;
      svg+=`<text x="${W}" y="${y+3.5}" font-size="${compact?9:10}" fill="var(--dim)" text-anchor="end" font-family="IBM Plex Mono">${j.tokens>0?"PRÊT":"—"}</text>`;
      continue;
    }
    const cible=(typeof CIBLES!=="undefined")?CIBLES.find(x=>x.id===s.cible):null;
    const e=etatSonde(s);
    const nom=(cible?cible.nom:"?").toUpperCase().slice(0,compact?9:14);
    svg+=`<line x1="${xA}" y1="${y}" x2="${xB}" y2="${y}" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="3 5"/>`;
    const xp=xA+(xB-xA)*e.pct;
    svg+=`<line x1="${xA}" y1="${y}" x2="${xp}" y2="${y}" stroke="var(--accent)" stroke-width="2"/>`;
    svg+=`<circle cx="${xB}" cy="${y}" r="3.5" fill="none" stroke="${e.fini?"var(--accent2)":"var(--dim)"}" stroke-width="1.5"/>`;
    svg+=`<g transform="translate(${xp},${y})"><path d="M 0 -5 L 4 4 L 0 1.5 L -4 4 Z" fill="var(--accent2)" transform="rotate(90)"/></g>`;
    svg+=`<text x="0" y="${y+3.5}" font-size="${compact?9:10}" fill="var(--ink)" font-family="IBM Plex Mono">${nom}</text>`;
    svg+=`<text x="${W}" y="${y+3.5}" font-size="${compact?9:10}" fill="${e.fini?"var(--accent2)":"var(--dim)"}" text-anchor="end" font-family="IBM Plex Mono">${e.fini?"RETOUR":fmtDuree(e.reste)}</text>`;
  }
  $("#ascension").innerHTML = svg;
}

let _rsz=null;
window.addEventListener("resize",()=>{ clearTimeout(_rsz); _rsz=setTimeout(()=>{ if(typeof S!=="undefined"&&S){ renderHeader(); if(typeof renderPoidsChart==="function") renderPoidsChart(); if(typeof renderChantier==="function") renderChantier(); } },180); });
window.addEventListener("orientationchange",()=>setTimeout(()=>{ if(typeof S!=="undefined"&&S) renderHeader(); },260));

/* ============ Habillages ============ */
const SKINS=[
  {id:"orbite",  nom:"Orbite",   ds:"Sci-fi spatial",  sw:["#070B14","#37D5E8","#FF8A3D"]},
  {id:"apollo",  nom:"Apollo",   ds:"Contrôle 1969",   sw:["#15181A","#FFB020","#E03C31"]},
  {id:"tactique",nom:"Tactique", ds:"HUD gaming",      sw:["#0A0A11","#8B5CFF","#FFD166"]},
];
function applySkin(id){
  if(!SKINS.some(s=>s.id===id)) id="orbite";
  document.documentElement.dataset.theme=id;
  S.settings.skin=id; save();
  if(typeof renderHeader==="function") renderHeader();
  renderSkinPicker();
}
function renderSkinPicker(){
  const w=$("#skinPicker"); if(!w) return;
  w.innerHTML=SKINS.map(s=>`<button class="skin ${S.settings.skin===s.id?"on":""}" data-skin="${s.id}">
    <span class="sw">${s.sw.map(c=>`<i style="background:${c}"></i>`).join("")}</span>
    <span class="nm">${s.nom}</span><span class="ds">${s.ds}</span></button>`).join("");
  w.querySelectorAll("[data-skin]").forEach(b=>b.onclick=()=>applySkin(b.dataset.skin));
}

/* ============ Navigation ============ */
// Filet de sécurité : <dialog> sur très vieux navigateurs
if(!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal){
  document.querySelectorAll("dialog").forEach(dl=>{
    dl.showModal=function(){ this.setAttribute("open",""); };
    dl.close=function(){ this.removeAttribute("open"); };
  });
}
$$("nav button").forEach(b=>b.addEventListener("click",()=>{
  $$("nav button").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  $$("section.page").forEach(p=>p.classList.remove("visible"));
  $("#page-"+b.dataset.page).classList.add("visible");
  window.scrollTo({top:0});
}));
