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
async function appelIA(prompt, maxTokens){
  const f=iaFournisseur(), modele=iaModele();
  const key=(S.settings.apiKey||"").trim();
  const mt=maxTokens||1600;
  if(!key) throw new Error("clé absente");

  if(f.id==="gemini"){
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`;
    const r=await fetch(url,{method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":key},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],
        generationConfig:{maxOutputTokens:mt,temperature:0.7}})});
    if(!r.ok) throw new Error(msgErr("Gemini",r.status));
    const d=await r.json();
    const c=d.candidates&&d.candidates[0];
    return ((c&&c.content&&c.content.parts)||[]).map(x=>x.text||"").join("");
  }

  if(f.id==="openrouter"){
    const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({model:modele,max_tokens:mt,messages:[{role:"user",content:prompt}]})});
    if(!r.ok) throw new Error(msgErr("OpenRouter",r.status));
    const d=await r.json();
    return (d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||"";
  }

  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":key,
      "anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:modele,max_tokens:mt,messages:[{role:"user",content:prompt}]})});
  if(!r.ok) throw new Error(msgErr("Claude",r.status));
  const d=await r.json();
  return (d.content||[]).map(c=>c.text||"").join("");
}
function msgErr(nom,code){
  if(code===401||code===403) return nom+" : clé refusée";
  if(code===429) return nom+" : quota atteint, réessaie plus tard";
  if(code===404) return nom+" : modèle introuvable";
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
    <button class="btn signal" id="iaTest">Tester la connexion</button>
  </div>
  <p class="muted" id="iaEtat" style="margin-top:8px">${iaPrete()?"Clé enregistrée.":"Aucune clé : le bilan technique des séances reste disponible sans IA."}</p>`;
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
  $("#iaTest").onclick=async ()=>{
    S.settings.apiKey=$("#setApiKey").value.trim();
    S.settings.iaModel=$("#setModele").value.trim();
    save();
    const e=$("#iaEtat"); e.textContent="Test en cours…";
    try{
      const t=await appelIA("Réponds exactement : OK",30);
      e.textContent=t.trim()?`Connexion réussie avec ${iaFournisseur().nom} (${iaModele()}).`:"Réponse vide — vérifie le modèle.";
    }catch(err){ e.textContent="Échec — "+err.message; }
  };
}
