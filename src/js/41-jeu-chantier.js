"use strict";
/* ============================================================
   JEU — scènes dessinées du chantier, une par chapitre
   ============================================================ */
/* ============ Chantier : ce qu'on construit, visible ============ */
function estConstruit(chapId,modId){ return !!jeu().construits[chapId+"/"+modId]; }

/* trait plein + couleur si construit, pointillé atténué sinon */
function pce(ok,extra){
  return ok
    ? `fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" ${extra||""}`
    : `fill="none" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="4 4" stroke-linejoin="round" ${extra||""}`;
}
function pceF(ok,couleur){
  return ok
    ? `fill="${couleur||"var(--accent)"}" fill-opacity=".22" stroke="var(--accent)" stroke-width="2"`
    : `fill="none" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="4 4"`;
}

function sceneLanceur(W,H,ok){
  const cx=W/2, sol=H-16;
  let s=`<line x1="12" y1="${sol}" x2="${W-12}" y2="${sol}" stroke="var(--dim)" stroke-opacity=".5" stroke-width="1.5"/>`;
  // tour de lancement (toujours présente)
  s+=`<path d="M ${cx+42} ${sol} L ${cx+42} ${sol-92} M ${cx+42} ${sol-30} L ${cx+22} ${sol-30} M ${cx+42} ${sol-60} L ${cx+22} ${sol-60}" stroke="var(--dim)" stroke-opacity=".45" stroke-width="1.5" fill="none"/>`;
  // corps
  s+=`<rect x="${cx-16}" y="${sol-84}" width="32" height="64" rx="2" ${pceF(ok.structure)}/>`;
  // coiffe / avionique
  s+=`<path d="M ${cx-16} ${sol-84} L ${cx} ${sol-112} L ${cx+16} ${sol-84} Z" ${pceF(ok.avionique)}/>`;
  if(ok.avionique) s+=`<circle cx="${cx}" cy="${sol-92}" r="3.5" fill="var(--accent2)"/>`;
  // ailerons + tuyère
  s+=`<path d="M ${cx-16} ${sol-34} L ${cx-30} ${sol-14} L ${cx-16} ${sol-14} Z" ${pceF(ok.propulsion)}/>`;
  s+=`<path d="M ${cx+16} ${sol-34} L ${cx+30} ${sol-14} L ${cx+16} ${sol-14} Z" ${pceF(ok.propulsion)}/>`;
  s+=`<path d="M ${cx-11} ${sol-20} L ${cx-15} ${sol-6} L ${cx+15} ${sol-6} L ${cx+11} ${sol-20} Z" ${pceF(ok.propulsion)}/>`;
  // bouclier thermique
  s+=`<path d="M ${cx-17} ${sol-24} Q ${cx} ${sol-14} ${cx+17} ${sol-24}" ${pce(ok.bouclier)}/>`;
  return s;
}
function sceneCarburant(W,H,ok){
  const cx=W/2-40, sol=H-16;
  let s=sceneLanceur(W-80,H,{structure:1,avionique:1,propulsion:1,bouclier:1});
  // cuves à droite
  const bx=W-92;
  const cuve=(x,rempli,lab)=>{
    let g=`<rect x="${x}" y="${sol-70}" width="22" height="54" rx="3" ${pceF(rempli)}/>`;
    if(rempli) g+=`<rect x="${x+3}" y="${sol-48}" width="16" height="29" fill="var(--accent2)" fill-opacity=".5"/>`;
    g+=`<text x="${x+11}" y="${sol-4}" font-size="8" fill="${rempli?"var(--accent)":"var(--dim)"}" text-anchor="middle" font-family="IBM Plex Mono">${lab}</text>`;
    return g;
  };
  s+=cuve(bx,ok.reservoir,"CUVE")+cuve(bx+28,ok.electrolyseur,"H2O")+cuve(bx+56,ok.ergols,"ERG");
  return s;
}
function sceneLunaire(W,H,ok){
  const sol=H-22;
  let s=`<path d="M 8 ${sol} Q ${W*0.3} ${sol-12} ${W*0.55} ${sol} T ${W-8} ${sol-4}" stroke="var(--dim)" stroke-opacity=".55" stroke-width="1.5" fill="none"/>`;
  s+=`<circle cx="${W-34}" cy="26" r="11" fill="none" stroke="var(--dim)" stroke-opacity=".4" stroke-width="1.2"/>`;
  // dôme d'habitation
  s+=`<path d="M ${W*0.18-26} ${sol-2} A 26 26 0 0 1 ${W*0.18+26} ${sol-2} Z" ${pceF(ok.habitat)}/>`;
  // panneaux solaires
  const px=W*0.45;
  s+=`<path d="M ${px-30} ${sol-24} L ${px+30} ${sol-34} L ${px+30} ${sol-22} L ${px-30} ${sol-12} Z" ${pceF(ok.solaire)}/>`;
  s+=`<line x1="${px}" y1="${sol-24}" x2="${px}" y2="${sol-2}" ${pce(ok.solaire)}/>`;
  // foreuse
  const fx=W*0.68;
  s+=`<path d="M ${fx-10} ${sol-2} L ${fx-6} ${sol-40} L ${fx+6} ${sol-40} L ${fx+10} ${sol-2} Z" ${pceF(ok.foreuse)}/>`;
  if(ok.foreuse) s+=`<line x1="${fx}" y1="${sol-40}" x2="${fx}" y2="${sol-52}" stroke="var(--accent2)" stroke-width="2"/>`;
  // serre
  const gx=W*0.87;
  s+=`<path d="M ${gx-20} ${sol-2} L ${gx-20} ${sol-20} L ${gx} ${sol-34} L ${gx+20} ${sol-20} L ${gx+20} ${sol-2} Z" ${pceF(ok.serre,"var(--ok)")}/>`;
  if(ok.serre) s+=`<path d="M ${gx-8} ${sol-4} v-8 M ${gx} ${sol-4} v-11 M ${gx+8} ${sol-4} v-8" stroke="var(--ok)" stroke-width="2"/>`;
  return s;
}
function sceneMars(W,H,ok){
  const cy=H/2, cx=W*0.72;
  let s=`<circle cx="${cx}" cy="${cy}" r="${Math.min(38,H/2-8)}" fill="var(--accent2)" fill-opacity=".14" stroke="var(--accent2)" stroke-opacity=".5" stroke-width="1.5"/>`;
  // vaisseau
  const vx=W*0.26;
  s+=`<rect x="${vx-34}" y="${cy-9}" width="68" height="18" rx="9" ${pceF(ok.vaisseau)}/>`;
  s+=`<path d="M ${vx+34} ${cy-9} L ${vx+52} ${cy} L ${vx+34} ${cy+9} Z" ${pceF(ok.vaisseau)}/>`;
  // réserves
  s+=`<circle cx="${vx-16}" cy="${cy-22}" r="8" ${pceF(ok.reserves)}/>`;
  s+=`<circle cx="${vx+4}" cy="${cy-22}" r="8" ${pceF(ok.reserves)}/>`;
  // atterrisseur
  s+=`<path d="M ${vx-8} ${cy+12} L ${vx+8} ${cy+12} L ${vx+14} ${cy+26} L ${vx-14} ${cy+26} Z" ${pceF(ok.atterrisseur)}/>`;
  if(ok.atterrisseur) s+=`<path d="M ${vx-14} ${cy+26} l -6 8 M ${vx+14} ${cy+26} l 6 8" stroke="var(--accent)" stroke-width="2"/>`;
  // trajectoire
  s+=`<path d="M ${vx+54} ${cy} Q ${(vx+cx)/2} ${cy-30} ${cx-40} ${cy-8}" stroke="var(--accent)" stroke-opacity="${ok.vaisseau?".7":".25"}" stroke-width="1.5" stroke-dasharray="5 5" fill="none"/>`;
  return s;
}
function sceneTerra(W,H,ok){
  const cx=W/2, cy=H/2, r=Math.min(46,H/2-6);
  const n=[ok.atmo,ok.eau,ok.dome,ok.colonie].filter(Boolean).length;
  const vert=n/4;
  let s=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--accent2)" fill-opacity="${0.16*(1-vert)+0.02}" stroke="var(--accent2)" stroke-opacity=".45" stroke-width="1.5"/>`;
  if(ok.atmo) s+=`<circle cx="${cx}" cy="${cy}" r="${r+7}" fill="none" stroke="var(--accent)" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  if(ok.eau){
    s+=`<path d="M ${cx-r*0.7} ${cy+r*0.35} q ${r*0.35} ${-r*0.3} ${r*0.7} 0 q ${r*0.3} ${r*0.25} ${r*0.6} -0.1" stroke="#4FA8E8" stroke-width="3" fill="none" stroke-opacity=".8"/>`;
  }
  if(ok.dome){
    s+=`<ellipse cx="${cx-r*0.35}" cy="${cy-r*0.3}" rx="${r*0.3}" ry="${r*0.2}" fill="var(--ok)" fill-opacity=".55"/>`;
    s+=`<ellipse cx="${cx+r*0.4}" cy="${cy+r*0.1}" rx="${r*0.26}" ry="${r*0.17}" fill="var(--ok)" fill-opacity=".45"/>`;
  }
  if(ok.colonie){
    s+=`<circle cx="${cx+r*0.15}" cy="${cy-r*0.55}" r="4" fill="var(--accent2)"/>`;
    s+=`<circle cx="${cx-r*0.55}" cy="${cy+r*0.4}" r="3" fill="var(--accent2)"/>`;
    s+=`<text x="${cx}" y="${cy+r+16}" font-size="9" fill="var(--accent)" text-anchor="middle" font-family="IBM Plex Mono">COLONIE ACTIVE</text>`;
  }
  return s;
}

function sceneOrbite(W,H,ok){
  const cx=W*0.5, cy=H/2;
  // Terre en bas
  let s=`<path d="M -20 ${H+40} A ${W*0.9} ${W*0.9} 0 0 1 ${W+20} ${H+40}" fill="var(--accent2)" fill-opacity=".10" stroke="var(--accent2)" stroke-opacity=".4" stroke-width="1.5"/>`;
  // module central
  s+=`<rect x="${cx-30}" y="${cy-11}" width="60" height="22" rx="11" ${pceF(ok.central)}/>`;
  // ailes solaires
  s+=`<rect x="${cx-92}" y="${cy-9}" width="52" height="18" ${pceF(ok.panneaux)}/>`;
  s+=`<rect x="${cx+40}" y="${cy-9}" width="52" height="18" ${pceF(ok.panneaux)}/>`;
  s+=`<line x1="${cx-40}" y1="${cy}" x2="${cx-30}" y2="${cy}" ${pce(ok.panneaux)}/>`;
  s+=`<line x1="${cx+30}" y1="${cy}" x2="${cx+40}" y2="${cy}" ${pce(ok.panneaux)}/>`;
  // sas d'amarrage
  s+=`<rect x="${cx-9}" y="${cy-30}" width="18" height="19" rx="3" ${pceF(ok.sas)}/>`;
  if(ok.sas) s+=`<circle cx="${cx}" cy="${cy-34}" r="4" fill="none" stroke="var(--accent2)" stroke-width="2"/>`;
  // laboratoire
  s+=`<rect x="${cx-13}" y="${cy+11}" width="26" height="21" rx="4" ${pceF(ok.labo)}/>`;
  if(ok.labo) s+=`<circle cx="${cx}" cy="${cy+21}" r="4" fill="var(--accent2)" fill-opacity=".7"/>`;
  return s;
}
function sceneMartienne(W,H,ok){
  const sol=H-20;
  let s=`<path d="M 6 ${sol} Q ${W*0.35} ${sol-10} ${W*0.6} ${sol} T ${W-6} ${sol-6}" stroke="var(--accent2)" stroke-opacity=".55" stroke-width="1.5" fill="none"/>`;
  // dôme pressurisé
  const dx=W*0.2;
  s+=`<path d="M ${dx-30} ${sol-2} A 30 30 0 0 1 ${dx+30} ${sol-2} Z" ${pceF(ok.dome)}/>`;
  // extracteur d'eau
  const ex=W*0.45;
  s+=`<rect x="${ex-13}" y="${sol-32}" width="26" height="30" rx="3" ${pceF(ok.extracteur)}/>`;
  if(ok.extracteur) s+=`<path d="M ${ex} ${sol-38} v-8" stroke="#4FA8E8" stroke-width="2.5"/>`;
  // ferme
  const fx=W*0.63;
  s+=`<path d="M ${fx-18} ${sol-2} L ${fx-18} ${sol-18} L ${fx} ${sol-30} L ${fx+18} ${sol-18} L ${fx+18} ${sol-2} Z" ${pceF(ok.ferme,"var(--ok)")}/>`;
  if(ok.ferme) s+=`<path d="M ${fx-7} ${sol-4} v-7 M ${fx} ${sol-4} v-10 M ${fx+7} ${sol-4} v-7" stroke="var(--ok)" stroke-width="2"/>`;
  // centrale
  const nx=W*0.81;
  s+=`<path d="M ${nx-12} ${sol-2} L ${nx-7} ${sol-26} L ${nx+7} ${sol-26} L ${nx+12} ${sol-2} Z" ${pceF(ok.centrale)}/>`;
  if(ok.centrale) s+=`<circle cx="${nx}" cy="${sol-34}" r="5" fill="none" stroke="var(--accent2)" stroke-width="2"/>`;
  // rover
  const rx=W*0.93;
  s+=`<rect x="${rx-14}" y="${sol-14}" width="24" height="9" rx="2" ${pceF(ok.rover)}/>`;
  if(ok.rover){
    s+=`<circle cx="${rx-9}" cy="${sol-3}" r="3.5" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
    s+=`<circle cx="${rx+5}" cy="${sol-3}" r="3.5" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
  }
  return s;
}
function renderChantier(){
  const host=$("#chantier"); if(!host) return;
  const j=jeu();
  const W=Math.max(280,Math.round(host.clientWidth||600));
  const H=W<420?132:154;
  host.setAttribute("viewBox",`0 0 ${W} ${H}`); host.style.height=H+"px";
  if(programmeFini()){
    host.innerHTML=sceneTerra(W,H,{atmo:1,eau:1,dome:1,colonie:1});
    return;
  }
  const ch=chapitreCourant();
  const ok={};
  for(const m of ch.modules) ok[m.id]=estConstruit(ch.id,m.id);
  const f={lanceur:sceneLanceur,carburant:sceneCarburant,orbite:sceneOrbite,lunaire:sceneLunaire,mars:sceneMars,martienne:sceneMartienne,terra:sceneTerra}[ch.id];
  host.innerHTML=f?f(W,H,ok):"";
}

/* --- prochaine pièce + traduction en missions --- */
function prochainePiece(){
  if(programmeFini()) return null;
  const ch=chapitreCourant(), j=jeu();
  const m=ch.modules.find(x=>!estConstruit(ch.id,x.id));
  if(!m) return null;
  const manque={};
  for(const [r,v] of Object.entries(m.cout)){
    const d=v-res(r);
    if(d>0) manque[r]=d;
  }
  return {chap:ch,module:m,manque};
}
function estimationSondes(manque){
  // rendement moyen par sonde selon les cibles débloquées
  const dispo=ciblesDispo();
  let best=0;
  for(const c of dispo){
    const tot=Object.values(c.gains).reduce((s,[a,b])=>s+(a+b)/2,0);
    if(tot>best) best=tot;
  }
  const total=Object.values(manque).reduce((a,b)=>a+b,0);
  return best>0?Math.max(1,Math.ceil(total/best)):null;
}
