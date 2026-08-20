"use strict";
/* ============================================================
   TÉLÉMÉTRIE — pesées, composition, courbe, import CSV Withings
   ============================================================ */
/* ============ Saisie manuelle ============ */
$("#btnAddPoids").onclick=()=>{
  const kg=parseFloat(String($("#inPoids").value).replace(",","."));
  if(!kg || kg<30 || kg>250){ toast("Poids invalide"); return; }
  const mg=parseFloat(String($("#inMg").value).replace(",","."))||null;
  const brut=parseFloat(String($("#inMm").value).replace(",","."))||null;
  const unite=$("#inMmUnit")?$("#inMmUnit").value:"pct";
  if(brut!=null){
    if(unite==="pct"&&(brut<35||brut>95)){ toast("Masse musculaire en % attendue entre 35 et 95"); return; }
    if(unite==="kg"&&(brut<10||brut>130)){ toast("Masse musculaire en kg attendue entre 10 et 130"); return; }
  }
  const {mm,mmp}=normaliseMM(kg,brut,unite);
  if(S.settings){ S.settings.mmUnit=unite; }
  ajouterPesee(todayKey(), kg, mg, true, mm, mmp);
  $("#inPoids").value=""; $("#inMg").value=""; $("#inMm").value="";
};
function normaliseMM(kg, val, unite){
  if(val==null||!kg) return {mm:null,mmp:null};
  if(unite==="kg") return {mm:Math.round(val*10)/10, mmp:Math.round(val/kg*1000)/10};
  return {mm:Math.round(kg*val/100*10)/10, mmp:Math.round(val*10)/10};
}
function ajouterPesee(d, kg, mg, manuel, mm, mmp){
  const ex=S.pesees.find(p=>p.d===d);
  const nouvelle=!ex;
  if(ex){ ex.kg=kg; if(mg!=null) ex.mg=mg; if(mm!=null) ex.mm=mm; if(mmp!=null) ex.mmp=mmp; }
  else S.pesees.push({d,kg,mg,mm:mm==null?null:mm,mmp:mmp==null?null:mmp});
  S.pesees.sort((a,b)=>a.d<b.d?-1:1);
  if(manuel && !nouvelle){ save(); toast("Pesée du jour mise à jour"); renderPoids(); return; }
  if(manuel){
    const q=queteCourante(); q.pesees++; save();
    gagner(15,"Télémétrie transmise");
    verifierQuete();
  } else save();
  renderPoids();
}

/* ============ Import CSV Withings ============ */
$("#inCsv").addEventListener("change", async e=>{
  const f=e.target.files[0]; if(!f) return;
  const txt=await f.text();
  const res=parseWithingsCsv(txt);
  if(!res.length){ $("#csvStatus").textContent="Aucune pesée reconnue dans ce fichier. Vérifie qu'il s'agit bien de l'export poids (weight.csv)."; return; }
  let n=0;
  for(const r of res){
    const ex=S.pesees.find(p=>p.d===r.d);
    if(ex){ ex.kg=r.kg; if(r.mg!=null) ex.mg=r.mg; if(r.mm!=null) ex.mm=r.mm; if(r.mmp!=null) ex.mmp=r.mmp; }
    else { S.pesees.push(r); n++; }
  }
  S.pesees.sort((a,b)=>a.d<b.d?-1:1);
  marquerActivite(); save();
  $("#csvStatus").textContent=`${res.length} pesées lues, ${n} nouvelles ajoutées.`;
  toast(`${res.length} pesées importées`,"Import terminé");
  checkJalons(); renderPoids(); renderHeader(); renderBase();
  e.target.value="";
});
function parseWithingsCsv(txt){
  const sep = txt.split("\n")[0].includes(";") ? ";" : ",";
  const lignes = txt.split(/\r?\n/).filter(l=>l.trim());
  if(lignes.length<2) return [];
  // découpe en respectant les guillemets
  const split = l => {
    const out=[]; let cur="", inQ=false;
    for(const c of l){
      if(c==='"') inQ=!inQ;
      else if(c===sep && !inQ){ out.push(cur); cur=""; }
      else cur+=c;
    }
    out.push(cur); return out.map(x=>x.trim().replace(/^"|"$/g,""));
  };
  const head = split(lignes[0]).map(h=>h.toLowerCase());
  const iDate = head.findIndex(h=>h.includes("date"));
  const iKg   = head.findIndex(h=>(h.includes("poids")||h.includes("weight"))&&!h.includes("fat")&&!h.includes("graisse")&&!h.includes("grasse")&&!h.includes("muscul"));
  const iFat  = head.findIndex(h=>h.includes("fat mass")||h.includes("graisse")||h.includes("grasse"));
  const iFatP = head.findIndex(h=>h.includes("fat ratio")||(h.includes("%")&&(h.includes("graisse")||h.includes("grasse")||h.includes("fat"))));
  const iMus  = head.findIndex(h=>(h.includes("masse musculaire")||h.includes("muscle mass"))&&!h.includes("%"));
  const iMusP = head.findIndex(h=>(h.includes("masse musculaire")||h.includes("muscle mass"))&&h.includes("%"));
  if(iDate<0||iKg<0) return [];
  const out=[];
  for(let i=1;i<lignes.length;i++){
    const c=split(lignes[i]);
    const kg=parseFloat(String(c[iKg]||"").replace(",","."));
    if(!kg||kg<30||kg>250) continue;
    const d=parseDate(c[iDate]); if(!d) continue;
    let mg=null;
    if(iFatP>=0){ const v=parseFloat(String(c[iFatP]).replace(",",".")); if(v>2&&v<70) mg=v; }
    else if(iFat>=0){ const v=parseFloat(String(c[iFat]).replace(",",".")); if(v>1&&v<kg) mg=Math.round(v/kg*1000)/10; }
    let mm=null,mmp=null;
    if(iMus>=0){ const v=parseFloat(String(c[iMus]).replace(",",".")); if(v>5&&v<=kg+2){ mm=Math.round(v*10)/10; mmp=Math.round(v/kg*1000)/10; } }
    if(mm==null&&iMusP>=0){ const v=parseFloat(String(c[iMusP]).replace(",",".")); if(v>35&&v<98){ mmp=Math.round(v*10)/10; mm=Math.round(kg*v/100*10)/10; } }
    const ex=out.find(p=>p.d===d);
    if(!ex) out.push({d,kg:Math.round(kg*10)/10,mg,mm,mmp});
  }
  return out;
}
function parseDate(s){
  s=String(s).trim();
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);              // 2026-08-13
  if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);            // 13/08/2026
  if(m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  const d=new Date(s);
  return isNaN(d)?null:todayKey(d);
}

/* ============ Courbe SVG : brut + tendance 7 j ============ */
function renderPoids(){
  renderPoidsChart(); renderPoidsTable(); renderCompo();
}
function deltaSur(champ,jours){
  const lim=new Date(); lim.setDate(lim.getDate()-(jours||14));
  const limK=todayKey(lim);
  const av=S.pesees.filter(p=>p[champ]!=null&&p.d<limK).pop();
  const ap=S.pesees.filter(p=>p[champ]!=null).pop();
  if(!av||!ap||av===ap) return null;
  return Math.round((ap[champ]-av[champ])*10)/10;
}
function renderCompo(){
  const w=$("#compoBloc"); if(!w) return;
  const der=S.pesees[S.pesees.length-1];
  if(!der){ w.innerHTML=`<p class="muted">Aucune donnée. Ta balance Body Comp donne poids, masse grasse et masse musculaire — saisis-les dans l'unité que la balance affiche, l'app convertit.</p>`; return; }
  const carte=(lab,val,unite,champ,sous)=>{
    if(val==null) return `<div><b>—</b><span>${lab}</span></div>`;
    const d=deltaSur(champ,14);
    const fl=d==null?"":`<i class="${d>0?"up":d<0?"down":""}">${d>0?"+":""}${d} sur 14 j</i>`;
    return `<div><b>${val}${unite}</b><span>${lab}</span>${sous?`<i>${sous}</i>`:""}${fl}</div>`;
  };
  w.innerHTML=`<div class="compo">
    ${carte("Poids",der.kg," kg","kg")}
    ${carte("Masse grasse",der.mg," %","mg")}
    ${carte("Masse musculaire",der.mm," kg","mm",der.mmp!=null?der.mmp+" % du poids":"")}
  </div>
  <p class="muted" style="margin-top:8px">Relevé du ${fmtDate(der.d)}. Le suivi se fait sur les <b>kilos</b> : le pourcentage baisse mécaniquement dès que tu prends du poids, même sans perdre un gramme de muscle.</p>
  <p class="muted" style="margin-top:6px">À savoir : ce que Withings appelle masse musculaire correspond à la masse non grasse hors os — muscles, organes et <b>toute l'eau du corps</b>. D'où des valeurs élevées (75 à 85 % chez un homme mince) et des écarts d'un jour à l'autre qui reflètent surtout l'hydratation. Ne regarde que la tendance sur plusieurs semaines.</p>`;
}
// moyenne glissante sur 7 jours calendaires — c'est cette courbe qui compte,
// pas les variations quotidiennes dues à l'hydratation
function moyenne7(pesees){
  return pesees.map(p=>{
    const d0=new Date(p.d); const dm=new Date(d0); dm.setDate(dm.getDate()-6);
    const win=pesees.filter(x=>{ const dx=new Date(x.d); return dx>=dm && dx<=d0; });
    return {d:p.d, kg:win.reduce((s,x)=>s+x.kg,0)/win.length};
  });
}
function renderPoidsChart(){
  const host=$("#poidsChart"); if(!host) return;
  const data=S.pesees.slice(-120);
  const W=Math.max(300, Math.round(host.clientWidth||940));
  const compact=W<560;

  if(data.length<2){
    const H=compact?90:110;
    host.setAttribute("viewBox",`0 0 ${W} ${H}`); host.style.height=H+"px";
    host.innerHTML=`<text x="${W/2}" y="${H/2-4}" text-anchor="middle" font-family="IBM Plex Mono" font-size="${compact?11:13}" fill="var(--dim)">DEUX RELEVÉS REQUIS</text>
      <text x="${W/2}" y="${H/2+16}" text-anchor="middle" font-family="IBM Plex Mono" font-size="${compact?11:13}" fill="var(--dim)">POUR TRACER LA TENDANCE</text>`;
    $("#poidsVerdict").textContent=""; return;
  }

  const H=compact?210:280;
  const pl=compact?34:52, pr=12, pt=14, pb=compact?26:32;
  host.setAttribute("viewBox",`0 0 ${W} ${H}`); host.style.height=H+"px";

  const t0=new Date(data[0].d).getTime(), t1=new Date(data[data.length-1].d).getTime();
  const span=Math.max(t1-t0, 864e5);
  const kgs=data.map(p=>p.kg);
  let mn=Math.min(...kgs), mx=Math.max(...kgs);
  const marge=Math.max((mx-mn)*0.15, .8); mn-=marge; mx+=marge;
  const X=d=>pl+(W-pl-pr)*((new Date(d).getTime()-t0)/span);
  const Y=k=>pt+(H-pt-pb)*(1-(k-mn)/(mx-mn));
  const fs=compact?10:12;
  let out="";

  const step=(mx-mn)>6?2:1;
  for(let k=Math.ceil(mn);k<=mx;k+=step){
    out+=`<line x1="${pl}" y1="${Y(k)}" x2="${W-pr}" y2="${Y(k)}" stroke="var(--line)" stroke-width="1"/>
          <text x="${pl-6}" y="${Y(k)+4}" text-anchor="end" font-size="${fs}" fill="var(--dim)" font-family="IBM Plex Mono">${k}</text>`;
  }
  const nDates=compact?3:5;
  for(let i=0;i<nDates;i++){
    const t=t0+span*i/(nDates-1); const dd=new Date(t);
    const anc=i===0?"start":i===nDates-1?"end":"middle";
    out+=`<text x="${pl+(W-pl-pr)*i/(nDates-1)}" y="${H-8}" text-anchor="${anc}" font-size="${fs}" fill="var(--dim)" font-family="IBM Plex Mono">${dd.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</text>`;
  }
  out+=`<polyline fill="none" stroke="var(--dim)" stroke-opacity=".55" stroke-width="1.5" points="${data.map(p=>X(p.d)+","+Y(p.kg)).join(" ")}"/>`;
  for(const p of data) out+=`<circle cx="${X(p.d)}" cy="${Y(p.kg)}" r="${compact?2:3}" fill="var(--dim)"/>`;
  const m7=moyenne7(data);
  out+=`<polyline fill="none" stroke="var(--accent)" stroke-width="${compact?2.5:3}" stroke-linecap="round" points="${m7.map(p=>X(p.d)+","+Y(p.kg)).join(" ")}"/>`;
  const last=m7[m7.length-1];
  out+=`<circle cx="${X(last.d)}" cy="${Y(last.kg)}" r="${compact?4:5}" fill="var(--accent)" stroke="var(--bg)" stroke-width="1.5"/>`;
  host.innerHTML=out;

  const j14=m7.filter(p=>new Date(p.d)>=new Date(Date.now()-14*864e5));
  let verdict="";
  if(j14.length>=2){
    const delta=Math.round((j14[j14.length-1].kg-j14[0].kg)*10)/10;
    verdict=Math.abs(delta)<0.2?"Tendance stable sur 2 semaines — cap maintenu."
      :`${delta>0?"+":""}${delta} kg de tendance sur 2 semaines.`;
  }
  $("#poidsVerdict").textContent=verdict;
}
function renderPoidsTable(){
  const t=$("#tblPoids");
  if(!S.pesees.length){ t.innerHTML=`<tr><td class="muted">Aucune pesée.</td></tr>`; return; }
  t.innerHTML=S.pesees.slice(-10).reverse().map(p=>
    `<tr><td>${fmtDate(p.d)}</td><td><b>${p.kg} kg</b></td><td class="muted">${[p.mg!=null?p.mg+" % MG":"",p.mm!=null?p.mm+" kg MM"+(p.mmp!=null?" ("+p.mmp+" %)":""):""].filter(Boolean).join(" · ")}</td>
     <td style="text-align:right"><button class="btn small danger" data-delp="${p.d}">✕</button></td></tr>`).join("");
  t.querySelectorAll("[data-delp]").forEach(b=>b.onclick=()=>{
    S.pesees=S.pesees.filter(p=>p.d!==b.dataset.delp); save(); renderPoids();
  });
}
