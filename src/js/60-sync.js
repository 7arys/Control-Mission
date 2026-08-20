"use strict";
/* ============================================================
   SERVICE — synchronisation Supabase et fusion sans perte
   ============================================================ */
/* ============ Synchronisation Supabase ============ */
const SYNC={busy:false,timer:null,dernier:null};

function syncCfg(){ try{ return JSON.parse(localStorage.getItem("expedition_sync")||"{}"); }catch(e){ return {}; } }
function setSyncCfg(c){ localStorage.setItem("expedition_sync",JSON.stringify(c)); }
function syncActif(){ const c=syncCfg(); return !!(c.url&&c.key&&c.espace); }
function syncHeaders(c,extra){
  return Object.assign({apikey:c.key,Authorization:"Bearer "+c.key},extra||{});
}
function nettoieUrl(u){ return String(u||"").trim().replace(/\/+$/,""); }

async function syncPull(){
  const c=syncCfg();
  const url=`${nettoieUrl(c.url)}/rest/v1/carnet_sync?id=eq.${encodeURIComponent(c.espace)}&select=data`;
  const r=await fetch(url,{headers:syncHeaders(c)});
  if(!r.ok) throw new Error("lecture "+r.status);
  const j=await r.json();
  return (j&&j[0]&&j[0].data)?j[0].data:null;
}
async function syncPush(data){
  const c=syncCfg();
  const url=`${nettoieUrl(c.url)}/rest/v1/carnet_sync`;
  const r=await fetch(url,{
    method:"POST",
    headers:syncHeaders(c,{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"}),
    body:JSON.stringify({id:c.espace,data,updated_at:new Date().toISOString()})
  });
  if(!r.ok) throw new Error("écriture "+r.status);
}

/* --- ce qui ne quitte jamais l'appareil : clé API et séance en cours --- */
function pourEnvoi(st){
  const o=JSON.parse(JSON.stringify(st));
  if(o.settings) o.settings.apiKey="";
  o.enCours=null;
  return o;
}

/* ============ Fusion sans perte ============ */
function fusion(L,R){
  const out=JSON.parse(JSON.stringify(L));
  const distant = (R.stamp||0) > (L.stamp||0);

  // points : compteur par appareil, total = somme (aucune perte croisée)
  out.alt=Object.assign({},R.alt||{});
  for(const [k,v] of Object.entries(L.alt||{})) out.alt[k]=Math.max(v,out.alt[k]||0);

  // journal des opérations
  const kh=x=>`${x.d}|${x.nom}|${x.m}`;
  const mH=new Map();
  for(const x of (R.histoSeances||[])) mH.set(kh(x),x);
  for(const x of (L.histoSeances||[])) mH.set(kh(x),x);
  out.histoSeances=[...mH.values()].sort((a,b)=>a.d<b.d?1:-1).slice(0,400);

  // télémétrie : une pesée par date, on garde la plus complète
  const mP=new Map();
  for(const x of (R.pesees||[])) mP.set(x.d,x);
  for(const x of (L.pesees||[])){
    const e=mP.get(x.d);
    mP.set(x.d,(e&&e.mg!=null&&x.mg==null)?e:x);
  }
  out.pesees=[...mP.values()].sort((a,b)=>a.d<b.d?-1:1);

  // journal de bord
  const kj=x=>`${x.d}|${x.txt}|${x.m}`;
  const mJ=new Map();
  for(const x of (R.journal||[])) mJ.set(kj(x),x);
  for(const x of (L.journal||[])) mJ.set(kj(x),x);
  out.journal=[...mJ.values()].sort((a,b)=>a.d<b.d?1:-1).slice(0,80);

  // série de jours : union
  out.activite=Object.assign({},R.activite||{},L.activite||{});

  // aptitudes : maximum des deux côtés
  out.muscles={};
  for(const z of new Set([...Object.keys(R.muscles||{}),...Object.keys(L.muscles||{})])){
    const a=(R.muscles||{})[z]||{pts:0,n:0,last:null}, b=(L.muscles||{})[z]||{pts:0,n:0,last:null};
    out.muscles[z]={
      pts:Math.max(a.pts||0,b.pts||0),
      n:Math.max(a.n||0,b.n||0),
      last:[a.last,b.last].filter(Boolean).sort().pop()||null
    };
  }
  // records : le plus lourd gagne
  out.prs={};
  for(const k of new Set([...Object.keys(R.prs||{}),...Object.keys(L.prs||{})]))
    out.prs[k]=Math.max((R.prs||{})[k]||0,(L.prs||{})[k]||0);

  // insignes : on garde la date d'obtention la plus ancienne
  out.jalons={};
  for(const k of new Set([...Object.keys(R.jalons||{}),...Object.keys(L.jalons||{})])){
    const v=[(R.jalons||{})[k],(L.jalons||{})[k]].filter(Boolean).sort();
    out.jalons[k]=v[0];
  }
  // débriefings : union par identifiant, l'analyse IA existante l'emporte
  const mA=new Map();
  for(const x of (R.analyses||[])) mA.set(x.id,x);
  for(const x of (L.analyses||[])){
    const e=mA.get(x.id);
    mA.set(x.id, (e&&e.ia&&!x.ia)?e:x);
  }
  out.analyses=[...mA.values()].sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,60);

  // journal de bord : union par identifiant, la version la plus récemment modifiée gagne
  const mL=new Map();
  for(const x of (R.lore||[])) mL.set(x.id,x);
  for(const x of (L.lore||[])){
    const e=mL.get(x.id);
    mL.set(x.id,(e&&(e.ts||0)>(x.ts||0))?e:x);
  }
  out.lore=[...mL.values()].sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:(b.ts||0)-(a.ts||0)).slice(0,300);

  // recettes : union par identifiant
  const mR=new Map();
  for(const x of (R.recettes||[])) mR.set(x.id,x);
  for(const x of (L.recettes||[])) mR.set(x.id,x);
  out.recettes=[...mR.values()];

  // programme spatial : fusion sans perte, ordre indépendant
  if(R.jeu||L.jeu){
    const A=R.jeu||{}, B=L.jeu||{};
    const maxParCle=(x,y)=>{
      const o=Object.assign({},x||{});
      for(const [k,v] of Object.entries(y||{})){
        if(typeof v==="object"&&v){
          o[k]=Object.assign({},o[k]||{});
          for(const [k2,v2] of Object.entries(v)) o[k][k2]=Math.max(+((o[k]||{})[k2])||0, +v2||0);
        } else o[k]=Math.max(+o[k]||0, +v||0);
      }
      return o;
    };
    const recoltees=Object.assign({},A.recoltees||{},B.recoltees||{});
    const parId=new Map();
    for(const s of (A.sondes||[])) parId.set(s.id,s);
    for(const s of (B.sondes||[])) parId.set(s.id,s);
    out.jeu={
      // compteurs cumulés par appareil : on prend le maximum de chaque compteur
      gains:      maxParCle(A.gains,B.gains),
      depenses:   maxParCle(A.depenses,B.depenses),
      jetonsG:    maxParCle(A.jetonsG,B.jetonsG),
      jetonsU:    maxParCle(A.jetonsU,B.jetonsU),
      // sondes : union des deux appareils, moins celles déjà récoltées
      sondes:     [...parId.values()].filter(s=>!recoltees[s.id]).sort((a,b)=>a.depart-b.depart),
      recoltees:  recoltees,
      construits: Object.assign({},A.construits||{},B.construits||{}),
      chapitre:   Math.max(A.chapitre||0, B.chapitre||0),
      sondesTotal:Math.max(A.sondesTotal||0, B.sondesTotal||0),
    };

    // la limite d'emplacements reste la règle : deux appareils ne peuvent pas
    // faire voler plus de sondes que le programme ne le permet
    const slots=1+(out.jeu.chapitre>=1?1:0)+(out.jeu.chapitre>=3?1:0);
    if(out.jeu.sondes.length>slots){
      const gardees=out.jeu.sondes.slice(0,slots);       // les plus anciennes partent en premier
      const annulees=out.jeu.sondes.slice(slots);
      for(const s of annulees){
        // le jeton est rendu à l'appareil qui l'avait dépensé
        let d=s.par;
        if(!d || !(out.jeu.jetonsU[d]>0))
          d=Object.keys(out.jeu.jetonsU).find(k=>out.jeu.jetonsU[k]>0);
        if(d) out.jeu.jetonsU[d]=Math.max(0,(out.jeu.jetonsU[d]||0)-1);
        out.jeu.recoltees[s.id]="annulee";
        out.jeu.sondesTotal=Math.max(0,(out.jeu.sondesTotal||0)-1);
      }
      out.jeu.sondes=gardees;
      out.jeu._annulees=annulees.length;
    }
  }

  // configuration : la version la plus récemment modifiée l'emporte
  if(distant){
    if(R.seances&&R.seances.length) out.seances=R.seances;
    if(R.semaine) out.semaine=R.semaine;
    out.settings=Object.assign({},L.settings,R.settings||{},{apiKey:(L.settings||{}).apiKey||""});
  }
  // ordre de mission : recalculé depuis les données fusionnées
  const qr=R.quete, ql=L.quete;
  const wk=[qr&&qr.semaine, ql&&ql.semaine].filter(Boolean).sort().pop();
  if(wk){
    const fin=new Date(wk+"T12:00:00"); fin.setDate(fin.getDate()+7);
    const finK=fin.toISOString().slice(0,10);
    const dans=d=>d>=wk&&d<finK;
    out.quete={
      semaine:wk,
      seances:(out.histoSeances||[]).filter(x=>dans(x.d)&&!x.repos).length,
      pesees:(out.pesees||[]).filter(x=>dans(x.d)).length,
      plan:!!((qr&&qr.plan)||(ql&&ql.plan)),
      claimed:!!((qr&&qr.claimed)||(ql&&ql.claimed))
    };
  }

  out.enCours=L.enCours;                       // la séance en cours reste locale
  out.stamp=Math.max(L.stamp||0,R.stamp||0);
  return out;
}

/* ============ Orchestration ============ */
function syncEtat(txt){ const e=$("#syncEtat"); if(e) e.textContent=txt; }
function syncPlanifier(){
  if(!syncActif()) return;
  clearTimeout(SYNC.timer);
  SYNC.timer=setTimeout(()=>syncMaintenant(true),4000);
}
async function syncMaintenant(silencieux){
  if(!syncActif()){ if(!silencieux) toast("Synchro non configurée"); return; }
  if(SYNC.busy) return;
  SYNC.busy=true; syncEtat("Synchronisation en cours…");
  // filet de sécurité local avant toute fusion
  try{ localStorage.setItem("expedition_backup",JSON.stringify(S)); }catch(e){}
  try{
    const distant=await syncPull();
    let annulees=0;
    if(distant){
      S=fusion(S,distant);
      S.altitude=totalAlt();
      if(S.jeu&&S.jeu._annulees){ annulees=S.jeu._annulees; delete S.jeu._annulees; }
      localStorage.setItem("expedition",JSON.stringify(S));
    }
    await syncPush(pourEnvoi(S));
    SYNC.dernier=new Date();
    syncEtat("Synchronisé à "+SYNC.dernier.toLocaleTimeString("fr-FR"));
    rerender();
    if(annulees)
      toast(`${annulees} sonde${annulees>1?"s":""} annulée${annulees>1?"s":""} : un seul vol à la fois selon tes emplacements. Jeton${annulees>1?"s":""} rendu${annulees>1?"s":""}.`,"Emplacements dépassés");
    else if(!silencieux) toast("Synchronisation terminée");
  }catch(e){
    syncEtat("Échec : "+e.message+" — données locales intactes");
    if(!silencieux) toast("Échec de synchro : "+e.message);
  }
  SYNC.busy=false;
}
function rerender(){
  renderHeader(); renderBase(); renderSeances(); renderPoids();
  renderRecettes(); renderSemaine(); renderCarnet(); renderAnalyses(); renderSpatial(); if(typeof renderLore==="function") renderLore();
}

/* ============ Code d'appairage ============ */
function codeAppairage(){
  const c=syncCfg();
  if(!c.url||!c.key||!c.espace) return "";
  return btoa(unescape(encodeURIComponent(JSON.stringify({u:c.url,k:c.key,e:c.espace}))));
}
function appliquerCode(code){
  const o=JSON.parse(decodeURIComponent(escape(atob(String(code).trim()))));
  if(!o.u||!o.k||!o.e) throw new Error("code incomplet");
  setSyncCfg({url:o.u,key:o.k,espace:o.e});
  return true;
}

/* ============ Interface (onglet Dossier) ============ */
function renderSync(){
  const c=syncCfg();
  const u=$("#syncUrl"), k=$("#syncKey"), e=$("#syncEspace");
  if(!u) return;
  u.value=c.url||""; k.value=c.key||""; e.value=c.espace||"";
  syncEtat(syncActif()?(SYNC.dernier?"Synchronisé à "+SYNC.dernier.toLocaleTimeString("fr-FR"):"Configuré — prêt à synchroniser"):"Non configuré : les données restent sur cet appareil.");
}
function initSyncUI(){
  if(!$("#syncSave")) return;
  $("#syncSave").onclick=()=>{
    const cfg={url:nettoieUrl($("#syncUrl").value),key:$("#syncKey").value.trim(),espace:$("#syncEspace").value.trim()};
    if(!cfg.url.startsWith("https://")){ toast("L'URL doit commencer par https://"); return; }
    setSyncCfg(cfg); renderSync(); toast("Synchro enregistrée");
    syncMaintenant(false);
  };
  $("#syncGen").onclick=()=>{
    const id=(crypto&&crypto.randomUUID)?crypto.randomUUID():("esp-"+Date.now()+"-"+Math.random().toString(36).slice(2,10));
    $("#syncEspace").value=id; toast("Identifiant généré");
  };
  $("#syncNow").onclick=()=>syncMaintenant(false);
  $("#syncCopy").onclick=()=>{
    const code=codeAppairage();
    if(!code){ toast("Configure d'abord la synchro"); return; }
    if(navigator.clipboard) navigator.clipboard.writeText(code).then(()=>toast("Code copié — colle-le sur l'autre appareil"));
    else { $("#syncPaste").value=code; toast("Code affiché ci-dessous"); }
  };
  $("#syncApply").onclick=()=>{
    try{
      appliquerCode($("#syncPaste").value);
      renderSync(); $("#syncPaste").value="";
      toast("Appareil appairé"); syncMaintenant(false);
    }catch(err){ toast("Code invalide"); }
  };
  // synchro au retour sur l'application
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible") syncMaintenant(true);
  });
  window.addEventListener("online",()=>syncMaintenant(true));
}
