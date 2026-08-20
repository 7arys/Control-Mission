"use strict";
/* ============================================================
   JEU — sondes, ressources, chapitres et construction
   ============================================================ */
/* ============ Programme spatial (jeu de progression) ============ */

const RES=[["alliage","Alliage","▰"],["composants","Composants","◈"],["glace","Glace","❋"]];

const CIBLES=[
  {id:"orbite",   nom:"Orbite basse",        h:2,  chap:0, gains:{alliage:[8,14]}},
  {id:"debris",   nom:"Ceinture de débris",  h:4,  chap:0, gains:{alliage:[14,22],composants:[6,10]}},
  {id:"asteroide",nom:"Astéroïde 2004-KM",   h:8,  chap:0, gains:{alliage:[30,45],composants:[12,20]}},
  {id:"comete",   nom:"Comète glacée",       h:12, chap:0, gains:{glace:[40,60],composants:[8,14]}},
  {id:"lune",     nom:"Lune",                h:24, chap:2, gains:{alliage:[60,90],composants:[40,60],glace:[20,30]}},
  {id:"ceinture", nom:"Ceinture principale", h:30, chap:4, gains:{alliage:[110,150],composants:[60,90],glace:[30,50]}},
  {id:"mars",     nom:"Mars",                h:36, chap:5, gains:{alliage:[130,180],composants:[100,140],glace:[60,90]}},
  {id:"jupiter",  nom:"Lunes de Jupiter",    h:48, chap:6, gains:{alliage:[180,240],composants:[150,200],glace:[140,190]}},
];

const CHAPITRES=[
  {id:"lanceur", nom:"Assemblage du lanceur", ds:"Construire le véhicule capable de quitter l'atmosphère.",
   modules:[
     {id:"structure", nom:"Structure porteuse",   cout:{alliage:120}},
     {id:"propulsion",nom:"Moteur principal",     cout:{alliage:180,composants:60}},
     {id:"avionique", nom:"Avionique de vol",     cout:{alliage:90,composants:120}},
     {id:"bouclier",  nom:"Bouclier thermique",   cout:{alliage:200,composants:45}},
   ], gain:"Second emplacement de sonde"},

  {id:"carburant", nom:"Production d'ergols", ds:"Transformer la glace en carburant pour viser la Lune.",
   modules:[
     {id:"reservoir",    nom:"Réservoirs cryogéniques", cout:{alliage:150,composants:60}},
     {id:"electrolyseur",nom:"Électrolyseur",           cout:{composants:120,glace:180}},
     {id:"ergols",       nom:"Plein d'ergols",          cout:{glace:240,composants:60}},
     {id:"banc",         nom:"Banc d'essai statique",   cout:{alliage:200,composants:80}},
   ], gain:"Sonde lunaire débloquée"},

  {id:"orbite", nom:"Station orbitale", ds:"Un point d'appui permanent au-dessus de la Terre.",
   modules:[
     {id:"central",  nom:"Module central",     cout:{alliage:300,composants:150}},
     {id:"panneaux", nom:"Ailes solaires",     cout:{alliage:150,composants:220}},
     {id:"sas",      nom:"Sas d'amarrage",     cout:{alliage:260,composants:120}},
     {id:"labo",     nom:"Laboratoire",        cout:{alliage:200,composants:260,glace:60}},
   ], gain:"Troisième emplacement de sonde"},

  {id:"lunaire", nom:"Base lunaire", ds:"Une présence permanente dans la mer de la Tranquillité.",
   modules:[
     {id:"habitat", nom:"Module d'habitation",  cout:{alliage:400,composants:160}},
     {id:"solaire", nom:"Champ photovoltaïque", cout:{alliage:220,composants:300}},
     {id:"foreuse", nom:"Foreuse à régolithe",  cout:{alliage:350,composants:180}},
     {id:"serre",   nom:"Serre hydroponique",   cout:{alliage:280,composants:220,glace:150}},
     {id:"isru",    nom:"Atelier ISRU",         cout:{alliage:300,composants:260}},
   ], gain:"Sonde vers la ceinture principale"},

  {id:"mars", nom:"Cap sur Mars", ds:"Assembler le vaisseau interplanétaire et franchir le vide.",
   modules:[
     {id:"vaisseau",    nom:"Vaisseau interplanétaire", cout:{alliage:700,composants:450}},
     {id:"reserves",    nom:"Réserves de mission",      cout:{glace:500,composants:220}},
     {id:"atterrisseur",nom:"Module d'atterrissage",    cout:{alliage:620,composants:330}},
     {id:"blindage",    nom:"Blindage anti-radiations", cout:{alliage:480,composants:280}},
   ], gain:"Quatrième emplacement · sonde martienne"},

  {id:"martienne", nom:"Base martienne", ds:"Tenir sur place avant de transformer la planète.",
   modules:[
     {id:"dome",      nom:"Dôme pressurisé",     cout:{alliage:800,composants:400}},
     {id:"extracteur",nom:"Extracteur d'eau",    cout:{alliage:600,composants:350,glace:200}},
     {id:"ferme",     nom:"Ferme martienne",     cout:{alliage:500,composants:450,glace:300}},
     {id:"centrale",  nom:"Centrale nucléaire",  cout:{alliage:900,composants:600}},
     {id:"rover",     nom:"Rover d'exploration", cout:{alliage:400,composants:300}},
   ], gain:"Sonde vers les lunes de Jupiter"},

  {id:"terra", nom:"Terraformation", ds:"Rendre Mars habitable. L'œuvre d'une vie.",
   modules:[
     {id:"atmo",    nom:"Usine atmosphérique",   cout:{alliage:1500,composants:1000}},
     {id:"ocean",   nom:"Mise en eau",           cout:{glace:1200,composants:400}},
     {id:"forets",  nom:"Premières forêts",      cout:{alliage:900,composants:700,glace:800}},
     {id:"magneto", nom:"Bouclier magnétique",   cout:{alliage:1800,composants:1400}},
     {id:"colonie", nom:"Première colonie",      cout:{alliage:2000,composants:1500,glace:1000}},
   ], gain:"Programme accompli"},
];

const JEU_DEF={gains:{},depenses:{},jetonsG:{},jetonsU:{},sondes:[],recoltees:{},construits:{},chapitre:0,sondesTotal:0};
function jeu(){
  if(!S.jeu) S.jeu=clone(JEU_DEF);
  const j=S.jeu;
  // migration depuis l'ancien modèle (compteurs uniques, non fusionnables)
  if(j.res!==undefined || j.tokens!==undefined){
    const d=devId();
    j.gains=j.gains||{};
    j.gains[d]=Object.assign({alliage:0,composants:0,glace:0}, j.gains[d]||{}, j.res||{});
    j.jetonsG=j.jetonsG||{};
    j.jetonsG[d]=(j.jetonsG[d]||0)+(+j.tokens||0);
    delete j.res; delete j.tokens;
  }
  j.gains=j.gains||{}; j.depenses=j.depenses||{};
  j.jetonsG=j.jetonsG||{}; j.jetonsU=j.jetonsU||{};
  j.recoltees=j.recoltees||{};
  if(!Array.isArray(j.sondes)) j.sondes=[];
  if(!j.construits) j.construits={};
  return j;
}
function sommeMap(map,cle){
  let t=0;
  for(const v of Object.values(map||{})) t+=cle?(+((v||{})[cle])||0):(+v||0);
  return t;
}
function res(r){ const j=jeu(); return Math.round((sommeMap(j.gains,r)-sommeMap(j.depenses,r))*10)/10; }
function tokens(){ const j=jeu(); return Math.max(0, sommeMap(j.jetonsG)-sommeMap(j.jetonsU)); }
function ajouterRes(r,v){ const j=jeu(),d=devId(); j.gains[d]=j.gains[d]||{}; j.gains[d][r]=(j.gains[d][r]||0)+v; }
function depenserRes(r,v){ const j=jeu(),d=devId(); j.depenses[d]=j.depenses[d]||{}; j.depenses[d][r]=(j.depenses[d][r]||0)+v; }
function nbSlots(){ const c=jeu().chapitre; return 1+(c>=1?1:0)+(c>=3?1:0)+(c>=5?1:0); }
function ciblesDispo(){ return CIBLES.filter(c=>jeu().chapitre>=c.chap); }
function chapitreCourant(){ return CHAPITRES[Math.min(jeu().chapitre,CHAPITRES.length-1)]; }
function programmeFini(){ return jeu().chapitre>=CHAPITRES.length; }

/* --- jetons de lancement : gagnés uniquement par l'effort réel --- */
function gagnerJeton(n,raison){
  if(typeof modActif==="function" && !modActif("spatial")) return;
  const j=jeu(),d=devId();
  const place=Math.max(0, 6-tokens());
  const ajout=Math.min(place, n||1);
  if(ajout<=0){ return; }
  j.jetonsG[d]=(j.jetonsG[d]||0)+ajout;
  save();
  setTimeout(()=>toast(`${ajout>1?ajout+" jetons":"Jeton"} de lancement disponible${ajout>1?"s":""}`,raison||""),3400);
  renderSpatial(); renderHeader();
}

/* --- sondes --- */
function etatSonde(s){
  const fin=s.depart+s.duree;
  const now=Date.now();
  return {fini:now>=fin, reste:Math.max(0,fin-now), pct:Math.max(0,Math.min(1,(now-s.depart)/s.duree))};
}
function fmtDuree(ms){
  const m=Math.round(ms/60000);
  if(m<60) return m+" min";
  const h=Math.floor(m/60), r=m%60;
  return r?`${h} h ${String(r).padStart(2,"0")}`:`${h} h`;
}
function lancerSonde(cibleId){
  const j=jeu();
  const c=CIBLES.find(x=>x.id===cibleId); if(!c) return;
  if(tokens()<1){ toast("Aucun jeton — accomplis une mission"); return; }
  if(j.sondes.length>=nbSlots()){ toast("Tous les emplacements sont occupés"); return; }
  const d=devId();
  j.jetonsU[d]=(j.jetonsU[d]||0)+1;
  j.sondesTotal=(j.sondesTotal||0)+1;
  j.sondes.push({id:uid(),cible:c.id,depart:Date.now(),duree:c.h*3600*1000,par:d});
  save(); checkJalons(); if(typeof verifierLore==="function") verifierLore();
  $("#dlgSonde")&&$("#dlgSonde").close();
  toast(`Sonde en route vers ${c.nom} — retour dans ${c.h} h`,"Lancement");
  renderSpatial(); renderHeader();
}
function recolterSondes(){
  const j=jeu();
  const prets=j.sondes.filter(s=>etatSonde(s).fini);
  if(!prets.length){ toast("Aucune sonde revenue"); return; }
  const total={};
  let decouverte=false;
  for(const s of prets){
    const c=CIBLES.find(x=>x.id===s.cible); if(!c) continue;
    for(const [r,[a,b]] of Object.entries(c.gains)){
      const v=a+Math.floor(Math.random()*(b-a+1));
      total[r]=(total[r]||0)+v;
      ajouterRes(r,v);
    }
    if(Math.random()<0.08){ decouverte=true; ajouterRes("composants",15); total.composants=(total.composants||0)+15; }
  }
  const auj=todayKey();
  for(const s of prets) j.recoltees[s.id]=auj;
  j.sondes=j.sondes.filter(s=>!j.recoltees[s.id]);
  save();
  const txt=Object.entries(total).map(([r,v])=>`+${v} ${RES.find(x=>x[0]===r)[1]}`).join(" · ");
  toast(txt, decouverte?"Récolte + découverte !":"Récolte");
  renderSpatial(); renderHeader(); renderCarnet();
}

/* --- construction --- */
function peutConstruire(m){
  const j=jeu();
  return Object.entries(m.cout).every(([r,v])=>res(r)>=v);
}
function construire(chapId,modId){
  const ch=CHAPITRES.find(c=>c.id===chapId); if(!ch) return;
  const m=ch.modules.find(x=>x.id===modId); if(!m) return;
  const j=jeu();
  if(j.construits[chapId+"/"+modId]){ return; }
  if(!peutConstruire(m)){ toast("Matériaux insuffisants"); return; }
  for(const [r,v] of Object.entries(m.cout)) depenserRes(r,v);
  j.construits[chapId+"/"+modId]=todayKey();
  save();
  toast(m.nom+" assemblé","Construction");
  // chapitre terminé ?
  const fini=ch.modules.every(x=>j.construits[chapId+"/"+x.id]);
  if(fini && CHAPITRES[j.chapitre] && CHAPITRES[j.chapitre].id===chapId){
    j.chapitre++;
    save(); checkJalons();
    if(typeof verifierLore==="function") verifierLore();
    setTimeout(()=>toast(`${ch.nom} — terminé. ${ch.gain}.`,"Chapitre accompli"),1200);
  }
  renderAtelier(); renderSpatial(); renderHeader(); renderCarnet();
}

/* ============ Rendu : carte du tableau de bord ============ */
function renderSpatial(){
  const w=$("#carteSpatiale"); if(!w) return;
  if(typeof modActif==="function" && !modActif("spatial")){ w.style.display="none"; return; }
  w.style.display="";
  const j=jeu();
  const slots=nbSlots();
  const prets=j.sondes.filter(s=>etatSonde(s).fini).length;
  const fini=programmeFini();
  const ch=fini?null:chapitreCourant();
  const faits=ch?ch.modules.filter(m=>estConstruit(ch.id,m.id)).length:0;
  const totalMod=CHAPITRES.reduce((a,c)=>a+c.modules.length,0);
  const totalFaits=CHAPITRES.reduce((a,c)=>a+c.modules.filter(m=>estConstruit(c.id,m.id)).length,0);

  let h=`<div class="seance-head"><h2 style="margin:0">${fini?"Programme accompli":esc(ch.nom)}</h2>
    <span class="tag">${tokens()} jeton${tokens()>1?"s":""}</span></div>`;

  // LA SCÈNE : ce que tu construis, visible
  h+=`<svg id="chantier" preserveAspectRatio="none" aria-label="Chantier en cours"></svg>`;

  if(!fini){
    h+=`<div class="sp-etape"><span>Étape ${j.chapitre+1}/${CHAPITRES.length} · ${faits}/${ch.modules.length} pièces</span>
      <div class="cote-bar"><i style="width:${Math.round(totalFaits/totalMod*100)}%"></i></div>
      <span class="cote-meta">${totalFaits}/${totalMod} pièces sur l'ensemble du programme</span></div>`;

    // prochaine pièce, chiffrée en sondes
    const p=prochainePiece();
    if(p){
      const manqueTxt=Object.entries(p.manque).map(([r,v])=>`${v} ${RES.find(x=>x[0]===r)[1].toLowerCase()}`).join(", ");
      const nb=Object.keys(p.manque).length?estimationSondes(p.manque):0;
      h+=`<div class="sp-next">
        <div class="cote-meta">Prochaine pièce</div>
        <b>${esc(p.module.nom)}</b>
        ${Object.keys(p.manque).length
          ? `<span class="cote-meta">Il manque ${manqueTxt} — environ <em>${nb} sonde${nb>1?"s":""}</em>, soit ${nb} mission${nb>1?"s":""}.</span>`
          : `<span class="cote-meta" style="color:var(--accent)">Matériaux réunis — tu peux l'assembler.</span>`}
        <div class="spacer"></div>
        <button class="btn ${Object.keys(p.manque).length?"ghost":"signal"} small" onclick="ouvrirAtelier()">Atelier</button>
      </div>`;
    }
  } else {
    h+=`<p class="hand" style="margin-top:10px">Mars est habitable. Les sondes restent ouvertes, pour le plaisir.</p>`;
  }

  // ressources
  h+=`<div class="sp-res">${RES.map(([id,nom,ic])=>
    `<div><b>${ic} ${Math.round(res(id))}</b><span>${nom}</span></div>`).join("")}</div>`;

  // sondes
  h+=`<div class="sp-sondes">`;
  for(let i=0;i<slots;i++){
    const s=j.sondes[i];
    if(!s){
      h+=`<div class="sp-slot libre"><span class="sp-cible">Emplacement libre</span>
        <span class="cote-meta">${tokens()>0?"prêt au lancement":"une mission = un jeton"}</span></div>`;
    } else {
      const c=CIBLES.find(x=>x.id===s.cible)||{nom:"?"};
      const e=etatSonde(s);
      h+=`<div class="sp-slot ${e.fini?"pret":""}">
        <span class="sp-cible">${esc(c.nom)}</span>
        <div class="cote-bar"><i style="width:${Math.round(e.pct*100)}%"></i></div>
        <span class="cote-meta">${e.fini?"revenue — à récolter":"retour dans "+fmtDuree(e.reste)}</span></div>`;
    }
  }
  h+=`</div>`;
  h+=`<div class="row" style="margin-top:10px">
    ${prets?`<button class="btn signal" onclick="recolterSondes()">Récolter ${prets} sonde${prets>1?"s":""}</button>`:""}
    <button class="btn ${prets?"ghost":"signal"}" onclick="ouvrirSonde()" ${(tokens()<1||j.sondes.length>=slots)?"disabled":""}>Lancer une sonde</button>
  </div>`;

  w.innerHTML=h;
  if(typeof renderChantier==="function") renderChantier();
}

/* ============ Dialogue : lancer une sonde ============ */
function ouvrirSonde(){
  const j=jeu();
  const w=$("#dlgSondeBody");
  w.innerHTML=`<p class="muted">Un jeton par lancement. Tu en gagnes un à chaque mission ou sortie consignée, deux de plus quand l'ordre de mission hebdo est bouclé.</p>
  <div class="spacer"></div>
  ${ciblesDispo().map(c=>{
    const g=Object.entries(c.gains).map(([r,[a,b]])=>`${a}–${b} ${RES.find(x=>x[0]===r)[1]}`).join(" · ");
    return `<button class="pick wide" onclick="lancerSonde('${c.id}')" style="margin-bottom:7px">
      <b>${esc(c.nom)} — ${c.h} h</b><span>${g}</span></button>`;
  }).join("")}
  ${jeu().chapitre<2?`<p class="cote-meta">Lune et Mars se débloquent en avançant dans le programme.</p>`:""}`;
  $("#dlgSonde").showModal();
}

/* ============ Dialogue : atelier ============ */
function ouvrirAtelier(){ renderAtelier(); $("#dlgAtelier").showModal(); }
function renderAtelier(){
  const j=jeu(), w=$("#dlgAtelierBody"); if(!w) return;
  let h=`<div class="sp-res">${RES.map(([id,nom,ic])=>
    `<div><b>${ic} ${Math.round(res(id))}</b><span>${nom}</span></div>`).join("")}</div>`;
  CHAPITRES.forEach((ch,i)=>{
    const verrou=i>j.chapitre;
    const faits=ch.modules.filter(m=>j.construits[ch.id+"/"+m.id]).length;
    h+=`<h3 class="dbg-h" style="opacity:${verrou?.45:1}">${i+1}. ${esc(ch.nom)} ${faits===ch.modules.length?"✓":""}</h3>`;
    if(verrou){ h+=`<p class="cote-meta">Verrouillé — termine le chapitre précédent.</p>`; return; }
    for(const m of ch.modules){
      const fait=!!j.construits[ch.id+"/"+m.id];
      const ok=peutConstruire(m);
      const cout=Object.entries(m.cout).map(([r,v])=>{
        const manque=res(r)<v;
        return `<span class="${manque?"sp-manque":""}">${v} ${RES.find(x=>x[0]===r)[1]}</span>`;
      }).join(" · ");
      h+=`<div class="sp-mod ${fait?"fait":""}">
        <div><b>${esc(m.nom)}</b><div class="cote-meta">${fait?"assemblé le "+fmtDate(j.construits[ch.id+"/"+m.id]):cout}</div></div>
        ${fait?`<span class="stamp">OK</span>`:`<button class="btn small ${ok?"signal":"ghost"}" ${ok?"":"disabled"} onclick="construire('${ch.id}','${m.id}')">Construire</button>`}
      </div>`;
    }
  });
  w.innerHTML=h;
}
$("#sondeFermer").onclick=()=>$("#dlgSonde").close();
$("#atelierFermer").onclick=()=>$("#dlgAtelier").close();
