"use strict";
/* ============================================================
   SPORT — programme, séance en cours, zones musculaires, aptitudes
   ============================================================ */
/* ============ Zones musculaires & cotation alpine ============ */
const ZONES = [
  ["pecs","Pectoraux","PEC"],
  ["dos","Dos","DOS"],
  ["epaules","Épaules","EPA"],
  ["biceps","Biceps","BIC"],
  ["triceps","Triceps","TRI"],
  ["abdos","Abdos","ABD"],
  ["jambes","Jambes & Fessiers","JBS"],
];
const GRADES = [
  {pts:0,   g:"E",  nom:"Novice"},
  {pts:40,  g:"D",  nom:"Apprenti"},
  {pts:100, g:"C",  nom:"Confirmé"},
  {pts:200, g:"B",  nom:"Aguerri"},
  {pts:350, g:"A",  nom:"Élite"},
  {pts:550, g:"S",  nom:"Maître"},
  {pts:800, g:"SS", nom:"Légende"},
];
function gradeDe(pts){
  let cur=GRADES[0], next=null;
  for(let i=0;i<GRADES.length;i++){
    if(pts>=GRADES[i].pts) cur=GRADES[i];
    else { next=GRADES[i]; break; }
  }
  return {cur,next};
}
function inferZones(nom){
  const n=nom.toLowerCase();
  const z=[];
  if(/développé|d[ée]velopp|écart|pompe|dips/.test(n)) z.push("pecs");
  if(/traction|rowing|tirage|dos/.test(n)) z.push("dos");
  if(/épaule|elevation|élévation|lat[ée]rale|militaire|oiseau/.test(n)) z.push("epaules");
  if(/curl|biceps/.test(n)) z.push("biceps");
  if(/triceps|extension.*bande|dips|pompe/.test(n)) z.push("triceps");
  if(/abdo|roue|gainage|crunch|planche/.test(n)) z.push("abdos");
  if(/squat|fente|hip|thrust|fessier|abduction|jambe|mollet|soulevé/.test(n)) z.push("jambes");
  return [...new Set(z)];
}
function migrateZones(){
  for(const s of (S.seances||[])) for(const e of (s.exos||[])){
    if(!e.zones || !e.zones.length) e.zones=inferZones(e.nom);
    if(e.note===undefined) e.note="";
  }
  if(!S.muscles) S.muscles={};
  // Migration ponctuelle : élévations latérales si absentes du programme
  if(!S._migElev){
    const dejaLa=S.seances.some(s=>s.exos.some(e=>/[ée]l[ée]vation/i.test(e.nom)));
    if(!dejaLa){
      const cible=S.seances.find(s=>/pecs/i.test(s.nom))||S.seances[0];
      if(cible) cible.exos.push({id:uid(),nom:"Élévations latérales haltères",series:3,reps:12,poids:4,note:"par haltère",zones:["epaules"]});
    }
    S._migElev=true;
  }
}

/* ============ Programme de départ (haltères, bandes SmartWorkout, banc, roue abdo, poignées pompes, barre de traction — pied fragile : zéro impact)
   Les charges sont des suggestions de départ pour débutant, à ajuster dès la première séance. ============ */
function seedSeances(){
  const ex=(nom,series,reps,poids,note,zones)=>({id:uid(),nom,series,reps,poids,note:note||"",zones});
  S.seances=[
    {id:uid(),nom:"A · Pecs & Triceps",exos:[
      ex("Développé haltères sur banc",4,10,8,"par haltère",["pecs","triceps"]),
      ex("Écartés haltères",3,12,6,"par haltère",["pecs"]),
      ex("Pompes sur poignées",3,12,0,"poids du corps",["pecs","triceps"]),
      ex("Élévations latérales haltères",3,12,4,"par haltère",["epaules"]),
      ex("Extensions triceps bande",3,15,0,"bande moyenne",["triceps"]),
      ex("Roue abdominale",3,8,0,"poids du corps",["abdos"]),
    ]},
    {id:uid(),nom:"B · Dos & Biceps",exos:[
      ex("Tractions (progression)",4,5,0,"négatives ou bande d'assistance",["dos","biceps"]),
      ex("Rowing haltère unilatéral",4,10,10,"par côté",["dos"]),
      ex("Tirage bande assis",3,12,0,"bande forte",["dos"]),
      ex("Curl haltères",3,12,6,"par haltère",["biceps"]),
      ex("Curl marteau",3,10,6,"par haltère",["biceps"]),
    ]},
    {id:uid(),nom:"C · Jambes, Fessiers & Abdos",exos:[
      ex("Squat gobelet",4,12,12,"un haltère tenu devant",["jambes"]),
      ex("Hip thrust sur banc",4,12,14,"haltère sur le bassin",["jambes"]),
      ex("Fentes arrière (sans impact)",3,10,6,"par haltère",["jambes"]),
      ex("Abduction bande",3,15,0,"bande légère",["jambes"]),
      ex("Roue abdominale",3,10,0,"poids du corps",["abdos"]),
      ex("Gainage (secondes)",3,45,0,"poids du corps",["abdos"]),
    ]},
  ];
}

/* ============ Points musculaires ============ */
// pts = séries cochées × reps × charge équivalente / 40, répartis entre les zones de l'exo
// charge équivalente : poids saisi, sinon 8 (poids du corps / bande)
function crediterMuscles(s, setsMap){
  const gains={};
  for(const e of s.exos){
    const done=(setsMap[e.id]||[]).filter(Boolean).length;
    if(!done || !e.zones || !e.zones.length) continue;
    const charge=e.poids>0?e.poids:8;
    const pts=done*e.reps*charge/40;
    for(const z of e.zones) gains[z]=(gains[z]||0)+pts/e.zones.length;
  }
  return appliquerGains(gains);
}
// Applique un dictionnaire {zone: points} avec bonus de régularité
function appliquerGains(gains){
  const auj=todayKey();
  const bonus=[];
  for(const [z,p] of Object.entries(gains)){
    const m=S.muscles[z]??={pts:0,last:null,n:0};
    let pf=p;
    if(m.last){
      const jours=(new Date(auj)-new Date(m.last))/864e5;
      if(jours>=1 && jours<=7){ pf=p*1.25; bonus.push(z); }
    }
    const avant=gradeDe(m.pts).cur.g;
    m.pts=Math.round((m.pts+pf)*10)/10;
    m.last=auj; m.n++;
    const apres=gradeDe(m.pts).cur.g;
    if(apres!==avant){
      const zl=ZONES.find(x=>x[0]===z);
      const gr=GRADES.find(x=>x.g===apres);
      setTimeout(()=>toast(`${zl[1]} passe au niveau ${apres} — ${gr.nom}`,"Aptitude relevée"),2200);
    }
  }
  return bonus;
}
function zoneFaible(){
  let min=null;
  for(const [id] of ZONES){
    const p=S.muscles[id]?.pts||0;
    if(min===null || p<min.p) min={id,p};
  }
  return min?.id;
}

/* ============ Rendu du programme ============ */
function renderSeances(){
  const wrap=$("#listeSeances"); wrap.innerHTML="";
  for(const s of S.seances){
    const card=document.createElement("div"); card.className="card";
    const detail=s.exos.map(e=>{
      const charge=e.mode==="bande"?(e.bande?esc(libelleBande(e.bande)):"élastique"):(e.poids>0?e.poids+" kg":"poids du corps");
      return `<div class="exo-det"><b>${esc(e.nom)}</b>
        <span>${e.series} × ${e.reps} · <em>${charge}</em>${e.note?` · ${esc(e.note)}`:""}</span></div>`;
    }).join("");
    card.innerHTML=`<div class="seance-head">
      <div><b>${esc(s.nom)}</b><div class="muted">${s.exos.length} exercices</div></div>
      <div style="display:flex;gap:6px">
        <button class="btn small signal" data-go="${s.id}">Partir</button>
        <button class="btn small ghost" data-edit="${s.id}">Modifier</button>
      </div></div>
      <details style="margin-top:6px"><summary class="muted" style="cursor:pointer">Détail & charges</summary>
      <div style="margin-top:6px">${detail}</div></details>`;
    wrap.appendChild(card);
  }
  wrap.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>demarrerSeance(b.dataset.go));
  wrap.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editSeance(b.dataset.edit));
  renderEnCours(); renderHistoSeances(); renderMuscles();
  if(typeof renderAnalyses==="function") renderAnalyses();
  if(typeof renderModeProgramme==="function") renderModeProgramme();
  if(typeof renderBandes==="function") renderBandes();
}

/* ============ Cotation des muscles ============ */
function renderMuscles(){
  const w=$("#cotationGrid"); if(!w) return;
  const faible=zoneFaible();
  const idxOf=g=>GRADES.findIndex(x=>x.g===g.g);
  w.innerHTML=ZONES.map(([id,label,ico])=>{
    const m=S.muscles[id]||{pts:0,last:null,n:0};
    const {cur,next}=gradeDe(m.pts);
    const pct=next?Math.min(100,Math.round((m.pts-cur.pts)/(next.pts-cur.pts)*100)):100;
    const dernier=m.last?fmtDate(m.last):"jamais";
    const ri=idxOf(cur);
    const rc=ri>=5?"var(--signal)":ri>=4?"var(--signal-deep)":ri>=2?"var(--foret)":"var(--sapin)";
    return `<div class="cote ${id===faible?"faible":""}">
      <div class="cote-head"><span><span class="zcode">[${ico}]</span>${label}</span>
        <span class="cote-grade" style="color:${rc}">${cur.g==="SS"?"★":""}${cur.g}<small class="cote-titre">${cur.nom}</small></span></div>
      <div class="cote-bar"><i style="width:${pct}%"></i></div>
      <div class="cote-meta">${next?`${Math.round(m.pts)} / ${next.pts} pts vers niv. ${next.g}`:`${Math.round(m.pts)} pts — niveau max`} · ${m.n} mission${m.n>1?"s":""} · dernier : ${dernier}</div>
      ${id===faible?`<div class="hand" style="font-size:16px">▶ zone prioritaire cette semaine</div>`:""}
    </div>`;
  }).join("");
}

/* ============ Séance en cours ============ */
function demarrerSeance(id){
  if(S.enCours && !confirm("Une mission est déjà en cours. La remplacer ?")) return;
  const s=S.seances.find(x=>x.id===id); if(!s) return;
  S.enCours={seanceId:id, sets:{}, debut:Date.now()};
  for(const e of s.exos) S.enCours.sets[e.id]=Array(e.series).fill(false);
  save(); renderEnCours();
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderEnCours(){
  const w=$("#seanceEnCours");
  if(!S.enCours){ w.innerHTML=""; return; }
  const s=S.enCours.libre || S.seances.find(x=>x.id===S.enCours.seanceId);
  if(!s){ S.enCours=null; save(); w.innerHTML=""; return; }
  const libre=!!S.enCours.libre;
  let html=`<div class="card" style="border-color:var(--signal)">
    <div class="seance-head"><h2 style="margin:0">${esc(s.nom)}</h2><span class="stamp">${libre?"Libre · en cours":"En cours"}</span></div>`;
  html+=(typeof echBloc==="function")?echBloc():"";
  for(const e of s.exos){
    const done=S.enCours.sets[e.id]||[];
    const pr=S.prs[e.nom];
    html+=`<div class="exo">
      <div class="exo-name">${esc(e.nom)}</div>
      <div class="exo-meta">${e.series} × ${e.reps}${e.mode==="bande"?` · élastique`:""}${e.note?` · ${esc(e.note)}`:""}${pr?` · <span class="pr-note">record : ${pr} kg</span>`:""}${e===s.exos[0]?` · <span class="pr-note">approche : ${e.poids>0?Math.max(1,Math.round(e.poids/2))+" kg":"moitié des reps"}, non comptée</span>`:""}</div>
      <div class="sets">${done.map((d,i)=>`<span class="set-chip ${d?"done":""}" data-exo="${e.id}" data-i="${i}">${d?"✓":i+1}</span>`).join("")}
        ${e.mode==="bande"?selectBande(e):`<input type="number" step="0.5" min="0" placeholder="kg" value="${e.poids||""}" data-kg="${e.id}" style="width:74px;padding:6px" title="Charge utilisée (kg)">`}
      </div></div>`;
  }
  html+=`<p class="cote-meta" style="margin-top:10px">${(typeof RETOUR_CALME!=="undefined")?esc(RETOUR_CALME):""}</p>`;
  html+=`<div class="spacer"></div><div class="row">
    <button class="btn signal" id="btnFinish">Valider · +120 pts</button>
    <button class="btn ghost" id="btnAbandon">Abandonner</button></div></div>`;
  w.innerHTML=html;
  if(typeof brancherEchauf==="function") brancherEchauf(w);
  w.querySelectorAll(".set-chip").forEach(c=>c.onclick=()=>{
    const arr=S.enCours.sets[c.dataset.exo]; arr[+c.dataset.i]=!arr[+c.dataset.i]; save(); renderEnCours();
  });
  w.querySelectorAll("[data-kg]").forEach(inp=>inp.onchange=()=>{
    const e=s.exos.find(x=>x.id===inp.dataset.kg); if(!e) return;
    e.poids=parseFloat(inp.value)||0; save();
  });
  w.querySelectorAll("[data-bande]").forEach(sel=>sel.onchange=()=>{
    const e=s.exos.find(x=>x.id===sel.dataset.bande); if(!e) return;
    appliquerBande(e,sel.value); save(); renderEnCours();
  });
  $("#btnFinish").onclick=()=>terminerSeance(s);
  $("#btnAbandon").onclick=()=>{ if(confirm("Abandonner cette mission ?")){ S.enCours=null; save(); renderEnCours(); } };
}
function terminerSeance(s){
  const musclesAvant=JSON.parse(JSON.stringify(S.muscles||{}));
  const echSnapshot={
    total:(typeof echList==="function")?echList().length:0,
    faits:(S.enCours&&Array.isArray(S.enCours.ech))?S.enCours.ech.filter(Boolean).length:0
  };
  let dureeMin=null;
  if(S.enCours&&S.enCours.debut){
    const m=Math.round((Date.now()-S.enCours.debut)/60000);
    if(m>0&&m<=180) dureeMin=m;
  }
  const prs=[];
  for(const e of s.exos){
    if(e.poids>0 && (!S.prs[e.nom] || e.poids>S.prs[e.nom])){ S.prs[e.nom]=e.poids; prs.push(`${e.nom} → ${e.poids} kg`); }
  }
  const setsMap=S.enCours.sets;
  const libre=!!S.enCours.libre;
  const totalSets=Object.values(setsMap).flat().length;
  const doneSets=Object.values(setsMap).flat().filter(Boolean).length;
  const bonus=crediterMuscles(s, setsMap);
  S.histoSeances.unshift({d:todayKey(), nom:s.nom+(libre?" [LIBRE]":""), m:120, prs, sets:`${doneSets}/${totalSets}`});
  S.enCours=null;
  const q=queteCourante(); q.seances++; save();
  const bilan=construireBilan(s,setsMap,dureeMin,libre,musclesAvant,prs);
  bilan.ech=echSnapshot;
  const an=enregistrerAnalyse(bilan);
  gagner(120, `Mission « ${s.nom} » accomplie`);
  gagnerJeton(1,"Mission accomplie");
  setTimeout(()=>{ ouvrirDebrief(an.id); renderAnalyses(); },600);
  if(prs.length) setTimeout(()=>toast(prs.join(" · "),"Nouveau record"),1600);
  if(bonus.length) setTimeout(()=>toast("Bonus régularité ×1,25 : "+bonus.map(z=>ZONES.find(x=>x[0]===z)[1]).join(", ")),3000);
  verifierQuete();
  renderSeances();
}
function renderHistoSeances(){
  const h=$("#histoSeances");
  if(!S.histoSeances.length){ h.innerHTML=`<p class="muted">Aucune mission au journal. Le premier pas est le plus dur, soldat.</p>`; return; }
  h.innerHTML=`<table class="mini">`+S.histoSeances.slice(0,12).map(x=>
    `<tr class="${x.repos?"repos":x.ext?"ext":""}"><td>${fmtDate(x.d)}</td><td><b>${esc(x.nom)}</b>${x.prs&&x.prs.length?` <span class="pr-note">PR !</span>`:""}</td><td class="muted">${esc(x.sets||"")}</td><td class="muted">${x.m>0?"+"+x.m+" pts":"—"}</td></tr>`).join("")+`</table>`;
}

/* ============ Éditeur de séance ============ */
let editingSeanceId=null, modeLibre=false;
function editSeance(id, libre){
  editingSeanceId=id; modeLibre=!!libre;
  const s=id?S.seances.find(x=>x.id===id):null;
  $("#dlgSeanceTitle").textContent=modeLibre?"Mission libre — juste pour aujourd'hui":(s?"Modifier la mission":"Nouvel ordre de mission");
  $("#dsNom").value=s?s.nom:(modeLibre?"Mission libre":"");
  $("#dsSave").textContent=modeLibre?"En avant !":"Enregistrer";
  $("#dsDelete").style.display=s?"":"none";
  renderExoEditor(s?clone(s.exos):[]);
  $("#dlgSeance").showModal();
}
let exoDraft=[];
function renderExoEditor(exos){
  exoDraft=exos;
  const w=$("#dsExos"); w.innerHTML="";
  exoDraft.forEach((e,i)=>{
    const div=document.createElement("div"); div.className="exo";
    div.innerHTML=`<div class="row">
      <input placeholder="Exercice" value="${esc(e.nom)}" data-f="nom" style="flex:3;min-width:150px">
      <input type="number" min="1" placeholder="Séries" value="${e.series}" data-f="series" style="max-width:70px">
      <input type="number" min="1" placeholder="Reps" value="${e.reps}" data-f="reps" style="max-width:70px">
      ${e.mode==="bande"?`<span class="tag on" data-mode="${i}" style="cursor:pointer;align-self:center">élastique</span>`:`<input type="number" min="0" step="0.5" placeholder="kg" value="${e.poids||""}" data-f="poids" style="max-width:70px">`}
      <button class="btn small danger" data-del="${i}">✕</button></div>
      <input placeholder="Note (ex : par haltère, bande forte…)" value="${esc(e.note||"")}" data-f="note" style="margin-top:5px;font-size:13px">
      <div style="margin-top:5px">
        <span class="tag ${e.mode==="bande"?"on":""}" data-basc="${i}" style="cursor:pointer">${e.mode==="bande"?"⇄ passer en kg":"⇄ passer en élastique"}</span>
        ${e.mode==="bande"?selectBande(e):""}
      </div>
      <div style="margin-top:5px">${ZONES.map(([zid,zl])=>`<span class="tag zpick ${(e.zones||[]).includes(zid)?"on":""}" data-z="${zid}" data-i="${i}">${zl}</span>`).join("")}</div>`;
    div.querySelectorAll("[data-f]").forEach(inp=>inp.oninput=()=>{
      const f=inp.dataset.f;
      e[f]=(f==="nom"||f==="note")?inp.value:(f==="poids"?(parseFloat(inp.value)||0):(parseInt(inp.value)||1));
    });
    div.querySelectorAll(".zpick").forEach(t=>t.onclick=()=>{
      e.zones=e.zones||[];
      const z=t.dataset.z;
      if(e.zones.includes(z)) e.zones=e.zones.filter(x=>x!==z);
      else e.zones.push(z);
      t.classList.toggle("on");
    });
    const basc=div.querySelector("[data-basc]");
    if(basc) basc.onclick=()=>{
      if(e.mode==="bande"){ e.mode="kg"; e.bande=null; e.poids=0; }
      else { e.mode="bande"; appliquerBande(e,"b2"); }
      renderExoEditor(exoDraft);
    };
    const selB=div.querySelector("[data-bande]");
    if(selB) selB.onchange=()=>{ appliquerBande(e,selB.value); renderExoEditor(exoDraft); };
    div.querySelector("[data-del]").onclick=()=>{ exoDraft.splice(i,1); renderExoEditor(exoDraft); };
    w.appendChild(div);
  });
}
$("#dsAddExo").onclick=()=>{ exoDraft.push({id:uid(),nom:"",series:3,reps:10,poids:0,note:"",zones:[],mode:"kg"}); renderExoEditor(exoDraft); };
$("#dsSave").onclick=()=>{
  const nom=$("#dsNom").value.trim(); if(!nom){ toast("Donne un nom à la mission"); return; }
  const exos=exoDraft.filter(e=>e.nom.trim()).map(e=>{
    if(!e.zones||!e.zones.length) e.zones=inferZones(e.nom);
    return e;
  });
  if(modeLibre){
    if(!exos.length){ toast("Ajoute au moins un exercice"); return; }
    if(S.enCours && !confirm("Une mission est déjà en cours. La remplacer ?")) return;
    S.enCours={libre:{nom,exos}, sets:{}, debut:Date.now()};
    for(const e of exos) S.enCours.sets[e.id]=Array(e.series).fill(false);
    save(); $("#dlgSeance").close(); renderEnCours();
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  if(editingSeanceId){
    const s=S.seances.find(x=>x.id===editingSeanceId); s.nom=nom; s.exos=exos;
  } else {
    S.seances.push({id:uid(),nom,exos});
  }
  save(); $("#dlgSeance").close(); renderSeances();
};
$("#dsCancel").onclick=()=>$("#dlgSeance").close();
$("#dsDelete").onclick=()=>{
  if(confirm("Retirer cet ordre de mission ?")){
    S.seances=S.seances.filter(x=>x.id!==editingSeanceId);
    save(); $("#dlgSeance").close(); renderSeances();
  }
};
$("#btnAddSeance").onclick=()=>editSeance(null);
$("#btnSeanceLibre").onclick=()=>editSeance(null,true);
$("#btnActivite").onclick=()=>ouvrirActivite();
$("#btnRepos").onclick=()=>ouvrirRepos();
$("#reposAnnuler").onclick=()=>$("#dlgRepos").close();
$("#reposValider").onclick=()=>validerRepos();
function renderModeProgramme(){
  const w=$("#modeProgramme"); if(!w) return;
  w.innerHTML=modeSocle()
    ? `<button class="btn ghost small" onclick="recalibrerSocle()">Recalibrer le volume</button>
       <button class="btn ghost small" onclick="restaurerProgrammeComplet()">Programme A / B / C</button>`
    : `<button class="btn ghost small" onclick="passerEnSeanceUnique()">Mode débutant · séance unique</button>`;
}
