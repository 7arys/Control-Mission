"use strict";
/* ============================================================
   TÉLÉMÉTRIE — sorties extérieures (rando, vélo, parcours…)
   ============================================================ */
/* ============ Activités extérieures ============ */
const ACTIVITES=[
  {id:"rando",    nom:"Randonnée",             zones:["jambes","abdos"]},
  {id:"parcours", nom:"Parcours du combattant",zones:["dos","biceps","abdos","jambes","epaules"]},
  {id:"escalade", nom:"Escalade / grimpe",     zones:["dos","biceps","abdos","epaules"]},
  {id:"velo",     nom:"Vélo",                  zones:["jambes"]},
  {id:"natation", nom:"Natation",              zones:["dos","epaules","abdos","jambes"]},
  {id:"marche",   nom:"Marche",                zones:["jambes"]},
  {id:"autre",    nom:"Autre activité",        zones:[]},
];
const INTENSITES=[
  {id:"tranquille",nom:"Tranquille",ds:"je peux discuter sans peine",   mult:0.9},
  {id:"soutenu",   nom:"Soutenu",   ds:"essoufflé mais régulier",       mult:1.3},
  {id:"intense",   nom:"Intense",   ds:"difficile à tenir longtemps",   mult:1.7},
];
const DUREES=[20,30,45,60,90,120,180];

let actDraft={type:"rando",min:60,intensite:"soutenu",zones:null,note:"",d:null};

function ouvrirActivite(){
  actDraft={type:"rando",min:60,intensite:"soutenu",zones:null,note:"",d:todayKey()};
  renderActDialog();
  $("#dlgActivite").showModal();
}
function actPts(){
  const it=INTENSITES.find(x=>x.id===actDraft.intensite);
  return Math.min(180, Math.round(actDraft.min*it.mult));
}
function actZones(){
  if(actDraft.zones && actDraft.zones.length) return actDraft.zones;
  return (ACTIVITES.find(x=>x.id===actDraft.type)||{zones:[]}).zones;
}
function renderActDialog(){
  const w=$("#dlgActBody");
  const zonesActives=actZones();
  w.innerHTML=`
  <label class="fld" style="margin-bottom:6px">1 · Quelle activité ?</label>
  <div class="pickrow">${ACTIVITES.map(a=>`<button class="pick ${actDraft.type===a.id?"on":""}" data-act="${a.id}">${a.nom}</button>`).join("")}</div>

  <label class="fld" style="margin:14px 0 6px">2 · Combien de temps ?</label>
  <div class="pickrow">${DUREES.map(m=>`<button class="pick ${actDraft.min===m?"on":""}" data-min="${m}">${m>=60?(m/60)+" h"+(m%60?" "+(m%60):""):m+" min"}</button>`).join("")}
    <input type="number" min="5" max="600" step="5" value="${actDraft.min}" id="actMinLibre" style="max-width:92px" title="Durée libre (min)"></div>

  <label class="fld" style="margin:14px 0 6px">3 · Quelle intensité ressentie ?</label>
  <div class="pickrow col">${INTENSITES.map(i=>`<button class="pick wide ${actDraft.intensite===i.id?"on":""}" data-int="${i.id}">
      <b>${i.nom}</b><span>${i.ds}</span></button>`).join("")}</div>

  <label class="fld" style="margin:14px 0 6px">4 · Note <span class="muted">(facultatif)</span></label>
  <input id="actNote" placeholder="ex : corde, mur, poutre — moitié du parcours" value="${esc(actDraft.note)}">

  <div class="actpreview">
    <div><b>+${actPts()} pts de mission</b></div>
    <div class="muted">${zonesActives.length?"Zones créditées : "+zonesActives.map(z=>ZONES.find(x=>x[0]===z)[1]).join(", "):"Aucune zone musculaire créditée — choisis-en ci-dessous si tu veux"}</div>
    <div style="margin-top:6px">${ZONES.map(([zid,zl])=>`<span class="tag zact ${zonesActives.includes(zid)?"on":""}" data-za="${zid}" style="cursor:pointer">${zl}</span>`).join("")}</div>
  </div>`;

  w.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{ actDraft.type=b.dataset.act; actDraft.zones=null; renderActDialog(); });
  w.querySelectorAll("[data-min]").forEach(b=>b.onclick=()=>{ actDraft.min=+b.dataset.min; renderActDialog(); });
  w.querySelectorAll("[data-int]").forEach(b=>b.onclick=()=>{ actDraft.intensite=b.dataset.int; renderActDialog(); });
  w.querySelectorAll("[data-za]").forEach(t=>t.onclick=()=>{
    const cur=[...actZones()];
    const z=t.dataset.za;
    actDraft.zones = cur.includes(z) ? cur.filter(x=>x!==z) : [...cur,z];
    renderActDialog();
  });
  const libre=$("#actMinLibre");
  libre.onchange=()=>{ const v=parseInt(libre.value)||0; if(v>=5&&v<=600){ actDraft.min=v; renderActDialog(); } };
  $("#actNote").oninput=()=>{ actDraft.note=$("#actNote").value; };
}
$("#actValider").onclick=()=>{
  const a=ACTIVITES.find(x=>x.id===actDraft.type);
  const it=INTENSITES.find(x=>x.id===actDraft.intensite);
  const zones=actZones();
  const pts=actPts();
  // crédit des zones : volume équivalent réparti
  if(zones.length){
    const total=actDraft.min*it.mult/4;
    const gains={};
    for(const z of zones) gains[z]=total/zones.length;
    appliquerGains(gains);
  }
  const nom=a.id==="autre"&&actDraft.note?actDraft.note.slice(0,40):a.nom;
  S.histoSeances.unshift({
    d:todayKey(), nom:"▲ "+nom, m:pts, ext:true,
    sets:`${actDraft.min} min · ${it.nom}`,
    note:actDraft.note||""
  });
  const q=queteCourante(); q.seances++; save();
  $("#dlgActivite").close();
  const an=enregistrerAnalyseSortie(nom,actDraft.min,it.nom,zones,pts);
  gagner(pts, `${nom} consignée`);
  gagnerJeton(1,"Sortie consignée");
  setTimeout(()=>{ ouvrirDebrief(an.id); renderAnalyses(); },600);
  renderSeances();
};
$("#actAnnuler").onclick=()=>$("#dlgActivite").close();
