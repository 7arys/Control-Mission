"use strict";
/* ============================================================
   SERVICE — fournisseurs d'IA (Gemini, OpenRouter, Anthropic)
   ============================================================ */
/* ============ Fournisseurs d'IA ============ */
const IA_FOURNISSEURS=[
  {id:"gemini", nom:"Google Gemini", ds:"Gratuit · sans carte bancaire",
   modele:"gemini-2.5-flash", lien:"aistudio.google.com/apikey",
   note:"Sur l'offre gratuite, Google peut utiliser les données envoyées pour entraîner ses modèles."},
  {id:"openrouter", nom:"OpenRouter", ds:"Gratuit · modèles ouverts",
   modele:"openrouter/free", lien:"openrouter.ai/keys",
   note:"Environ 50 requêtes par jour sans crédit. Le routeur choisit un modèle gratuit disponible."},
  {id:"anthropic", nom:"Anthropic (Claude)", ds:"Payant à l'usage",
   modele:"claude-sonnet-4-6", lien:"console.anthropic.com",
   note:"Quelques centimes par analyse. Crédit initial de 5 $ minimum."},
];
// modèles de repli tentés si le modèle principal est saturé ou introuvable
const IA_SECOURS={
  gemini:["gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.0-flash"],
  openrouter:["openrouter/free"],
  anthropic:["claude-sonnet-4-6"],
};
function iaFournisseur(){
  const id=(S.settings&&S.settings.iaProvider)||"gemini";
  return IA_FOURNISSEURS.find(f=>f.id===id)||IA_FOURNISSEURS[0];
}
function iaModele(){
  const m=(S.settings&&S.settings.iaModel||"").trim();
  return m||iaFournisseur().modele;
}
function iaPrete(){ return !!((S.settings&&S.settings.apiKey||"").trim()); }

/* --- appel unifié : renvoie du texte brut --- */
const IA_ATTENTES=[1500,4000,9000];          // attente croissante entre deux essais
const IA_REPRENDRE=[500,502,503,504];        // surcharges passagères : on réessaie
const IA_QUOTA=429;                          // quota : inutile d'insister sans délai indiqué
let iaProgres=null;
// compteur local : le quota gratuit se compte par jour et par projet Google
function iaCompteur(){
  const j=todayKey();
  let c={};
  try{ c=JSON.parse(localStorage.getItem("expedition_ia")||"{}"); }catch(e){}
  if(c.jour!==j) c={jour:j,n:0};
  return c;
}
function iaIncrementer(){
  const c=iaCompteur(); c.n=(c.n||0)+1;
  localStorage.setItem("expedition_ia",JSON.stringify(c));
  return c.n;
}                          // callback facultatif pour informer l'utilisateur
const iaPause=ms=>new Promise(r=>setTimeout(r,ms));

function requeteIA(f, modele, prompt, mt, key){
  if(f.id==="gemini") return {
    url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`,
    opts:{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:mt,temperature:0.7}})},
    lire:d=>{ const c=d.candidates&&d.candidates[0];
      return ((c&&c.content&&c.content.parts)||[]).map(x=>x.text||"").join(""); }
  };
  if(f.id==="openrouter") return {
    url:"https://openrouter.ai/api/v1/chat/completions",
    opts:{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({model:modele,max_tokens:mt,messages:[{role:"user",content:prompt}]})},
    lire:d=>(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||""
  };
  return {
    url:"https://api.anthropic.com/v1/messages",
    opts:{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key,
      "anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:modele,max_tokens:mt,messages:[{role:"user",content:prompt}]})},
    lire:d=>(d.content||[]).map(c=>c.text||"").join("")
  };
}

// un modèle, avec reprises automatiques si le service est saturé
// message d'erreur renvoyé par le fournisseur, s'il en donne un
async function lireErreur(r){
  try{
    const t=await r.clone().text();
    const j=JSON.parse(t);
    const m=(j.error&&(j.error.message||j.error.status))||"";
    return String(m).slice(0,120);
  }catch(e){ return ""; }
}
async function essayerModele(f, modele, prompt, mt, key){
  const q=requeteIA(f,modele,prompt,mt,key);
  let statut=0, detail="";
  for(let i=0;i<=IA_ATTENTES.length;i++){
    let r=null, ra=NaN;
    try{ iaIncrementer(); r=await fetch(q.url,q.opts); }
    catch(e){ statut=0; }
    if(r){
      if(r.ok) return q.lire(await r.json());
      statut=r.status;
      ra=r.headers?parseInt(r.headers.get("retry-after")||"",10):NaN;
      try{ detail=await lireErreur(r); }catch(e){}
      // quota : on ne réessaie que si le serveur annonce un délai court (limite par minute)
      if(statut===IA_QUOTA && !(ra>0&&ra<=90)) break;
      if(statut!==IA_QUOTA && !IA_REPRENDRE.includes(statut)) break;
    }
    if(i===IA_ATTENTES.length) break;
    let attente=IA_ATTENTES[i];
    if(ra>0) attente=ra*1000;
    attente+=Math.round(Math.random()*700);      // décalage aléatoire : évite que tout le monde réessaie en même temps
    if(iaProgres) iaProgres(`${f.nom} saturé — nouvel essai dans ${Math.round(attente/1000)} s…`);
    await iaPause(attente);
  }
  const e=new Error(msgErr(f.nom,statut,detail));
  e.statut=statut;
  throw e;
}

async function appelIA(prompt, maxTokens){
  const f=iaFournisseur(), modele=iaModele();
  const key=(S.settings.apiKey||"").trim();
  const mt=maxTokens||1600;
  if(!key) throw new Error("clé absente");
  try{
    return await essayerModele(f,modele,prompt,mt,key);
  }catch(e){
    // saturation persistante ou modèle inconnu : on tente un modèle de repli
    if(e.statut===503||e.statut===404||e.statut===500){   // pas sur un 429 : le quota est commun au projet
      const secours=(IA_SECOURS[f.id]||[]).filter(m=>m!==modele);
      for(const m of secours){
        if(iaProgres) iaProgres(`Bascule sur le modèle de secours ${m}…`);
        try{
          const t=await essayerModele(f,m,prompt,mt,key);
          if(iaProgres) iaProgres(`Réponse obtenue avec ${m}.`);
          return t;
        }catch(e2){ /* on passe au suivant */ }
      }
    }
    throw e;
  }
}
function msgErr(nom,code,detail){
  const d=detail?" — "+detail:"";
  if(!code)          return nom+" : pas de réponse (réseau ou navigateur)";
  if(code===401||code===403) return nom+" : clé refusée"+d;
  if(code===429){
    const journalier=/day|daily|per day|RPD/i.test(detail||"");
    return journalier
      ? nom+" : quota du jour épuisé. Il repart vers 9 h du matin (minuit heure du Pacifique). Essaie un modèle Flash-Lite, bien plus généreux."
      : nom+" : trop de requêtes rapprochées. Attends une minute, ou passe à un modèle Flash-Lite."+d;
  }
  if(code===404)     return nom+" : modèle introuvable — vérifie son nom dans le Dossier";
  if(code===503)     return nom+" : modèle saturé côté serveur. Rien à voir avec ta clé — réessaie dans un instant";
  if(code>=500)      return nom+" : panne temporaire du service ("+code+")";
  return nom+" : erreur "+code;
}
/* --- appel attendant du JSON, tolérant aux réponses mal formées --- */
function parseJsonSouple(txt){
  let s=String(txt||"").replace(/```json|```/g,"").trim();
  const a=s.indexOf("{"), b=s.lastIndexOf("}");
  if(a>=0&&b>a) s=s.slice(a,b+1);
  try{ return JSON.parse(s); }catch(e){}
  let r=s.replace(/,\s*([}\]])/g,"$1").replace(/\r/g,"");
  r=r.replace(/"((?:[^"\\]|\\.)*)"/g,function(m,inner){ return '"'+inner.replace(/\n/g,"\\n")+'"'; });
  try{ return JSON.parse(r); }catch(e){}
  throw new Error("format illisible");
}
async function appelIAJson(prompt, maxTokens){
  const txt=await appelIA(prompt,maxTokens);
  try{ return parseJsonSouple(txt); }
  catch(e){
    const rattrapage=await appelIA(
      "Reformate le contenu ci-dessous en JSON STRICTEMENT valide. "+
      "Aucune balise markdown, aucun commentaire, aucun guillemet double a l'interieur des textes, "+
      "aucun retour a la ligne dans les valeurs. Reponds uniquement le JSON.\n\n"+String(txt).slice(0,6000),
      maxTokens);
    return parseJsonSouple(rattrapage);
  }
}

/* ============ Réglages ============ */
function renderIAConfig(){
  const w=$("#iaConfig"); if(!w) return;
  const f=iaFournisseur();
  w.innerHTML=`
  <div class="pickrow col">${IA_FOURNISSEURS.map(x=>
    `<button class="pick wide ${f.id===x.id?"on":""}" data-ia="${x.id}"><b>${x.nom}</b><span>${x.ds}</span></button>`).join("")}</div>
  <p class="cote-meta" style="margin:9px 0">Clé à créer sur <b>${f.lien}</b>. ${f.note}</p>
  <label class="fld">Clé API<input id="setApiKey" type="password" placeholder="colle ta clé ici" autocomplete="off" value="${esc(S.settings.apiKey||"")}"></label>
  <label class="fld">Modèle <span class="muted">(modifiable si le nom change)</span>
    <input id="setModele" placeholder="${esc(f.modele)}" value="${esc(S.settings.iaModel||"")}"></label>
  <div class="row">
    <button class="btn" id="iaSave">Enregistrer</button>
    <button class="btn signal" id="iaTest">Tester</button>
    ${f.id==="gemini"?`<button class="btn ghost" id="iaListe">Modèles disponibles</button>`:""}
  </div>
  <p class="muted" id="iaEtat" style="margin-top:8px">${iaPrete()?"Clé enregistrée.":"Aucune clé : le bilan technique des séances reste disponible sans IA."}</p>
  <p class="cote-meta">${iaCompteur().n||0} requête${(iaCompteur().n||0)>1?"s":""} envoyée${(iaCompteur().n||0)>1?"s":""} aujourd'hui depuis cet appareil.${f.id==="gemini"?" Les modèles <b>Flash-Lite</b> ont le quota gratuit le plus large ; les modèles en avant-première, le plus étroit." : ""}</p>`;
  w.querySelectorAll("[data-ia]").forEach(b=>b.onclick=()=>{
    S.settings.iaProvider=b.dataset.ia;
    S.settings.iaModel="";
    save(); renderIAConfig();
  });
  $("#iaSave").onclick=()=>{
    S.settings.apiKey=$("#setApiKey").value.trim();
    S.settings.iaModel=$("#setModele").value.trim();
    save(); toast("Réglages IA enregistrés"); renderIAConfig();
  };
  if($("#iaListe")) $("#iaListe").onclick=async ()=>{
    const e=$("#iaEtat");
    const key=$("#setApiKey").value.trim();
    if(!key){ e.textContent="Renseigne d'abord ta clé."; return; }
    e.textContent="Interrogation de Google…";
    try{
      const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models",{headers:{"x-goog-api-key":key}});
      if(!r.ok) throw new Error(msgErr("Gemini",r.status));
      const d=await r.json();
      const noms=(d.models||[])
        .filter(m=>(m.supportedGenerationMethods||[]).includes("generateContent"))
        .map(m=>String(m.name||"").replace("models/",""))
        .filter(n=>/flash|lite/i.test(n))
        .slice(0,10);
      e.innerHTML=noms.length
        ? "Modèles utilisables : "+noms.map(n=>`<b>${esc(n)}</b>`).join(", ")+". Copie celui que tu veux dans le champ Modèle."
        : "Aucun modèle listé.";
    }catch(err){ e.textContent="Échec — "+err.message; }
  };
  $("#iaTest").onclick=async ()=>{
    S.settings.apiKey=$("#setApiKey").value.trim();
    S.settings.iaModel=$("#setModele").value.trim();
    save();
    const e=$("#iaEtat"); e.textContent="Test en cours…";
    iaProgres=t=>{ e.textContent=t; };
    try{
      const t=await appelIA("Réponds exactement : OK",30);
      e.textContent=t.trim()?`Connexion réussie avec ${iaFournisseur().nom} (${iaModele()}).`:"Réponse vide — vérifie le modèle.";
    }catch(err){ e.textContent="Échec — "+err.message; }
    iaProgres=null;
  };
}
