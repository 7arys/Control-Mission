"use strict";
/* ============================================================
   VIVRES — recettes, plan de la semaine, liste de courses
   ============================================================ */
/* ============ Recettes de départ (surplus léger + protéines) ============ */
function seedRecettes(){
  const R=(nom,type,kcal,prot,ing)=>({id:uid(),nom,type,kcal,prot,ing});
  const I=(q,u,n)=>({q,u,n});
  S.recettes=[
    R("Skyr, flocons d'avoine & banane","petitdej",520,35,[I(200,"g","Skyr"),I(80,"g","Flocons d'avoine"),I(1,"","Banane"),I(20,"g","Amandes"),I(15,"g","Miel")]),
    R("Œufs brouillés, pain complet","petitdej",480,28,[I(3,"","Œufs"),I(80,"g","Pain complet"),I(10,"g","Beurre"),I(1,"","Tomate")]),
    R("Porridge protéiné","petitdej",450,30,[I(70,"g","Flocons d'avoine"),I(30,"g","Whey ou skyr"),I(250,"ml","Lait demi-écrémé"),I(30,"g","Beurre de cacahuète")]),
    R("Poulet rôti, riz & brocolis","dej",650,45,[I(180,"g","Filet de poulet"),I(90,"g","Riz (cru)"),I(200,"g","Brocolis"),I(10,"ml","Huile d'olive")]),
    R("Pâtes au thon & tomates","dej",620,40,[I(100,"g","Pâtes complètes (cru)"),I(140,"g","Thon en boîte"),I(200,"g","Sauce tomate"),I(30,"g","Parmesan")]),
    R("Bœuf haché 5%, patates douces","dej",640,42,[I(150,"g","Bœuf haché 5%"),I(300,"g","Patate douce"),I(150,"g","Haricots verts"),I(10,"ml","Huile d'olive")]),
    R("Wrap poulet crudités","dej",560,38,[I(2,"","Tortillas complètes"),I(140,"g","Filet de poulet"),I(50,"g","Fromage frais"),I(1,"","Avocat"),I(80,"g","Crudités")]),
    R("Saumon, quinoa & courgettes","diner",620,40,[I(160,"g","Pavé de saumon"),I(80,"g","Quinoa (cru)"),I(200,"g","Courgettes"),I(10,"ml","Huile d'olive")]),
    R("Omelette champignons, salade","diner",480,32,[I(3,"","Œufs"),I(150,"g","Champignons"),I(40,"g","Emmental râpé"),I(100,"g","Salade verte"),I(60,"g","Pain complet")]),
    R("Chili con carne express","diner",640,42,[I(150,"g","Bœuf haché 5%"),I(120,"g","Haricots rouges"),I(200,"g","Tomates concassées"),I(70,"g","Riz (cru)"),I(1,"","Oignon")]),
    R("Dahl de lentilles corail","diner",560,26,[I(120,"g","Lentilles corail"),I(200,"ml","Lait de coco léger"),I(200,"g","Tomates concassées"),I(1,"","Oignon"),I(70,"g","Riz (cru)")]),
    R("Fromage blanc & fruits secs","collation",300,20,[I(250,"g","Fromage blanc"),I(30,"g","Noix"),I(20,"g","Raisins secs")]),
    R("Shaker & banane","collation",280,26,[I(30,"g","Whey"),I(250,"ml","Lait demi-écrémé"),I(1,"","Banane")]),
    R("Toast beurre de cacahuète","collation",320,12,[I(60,"g","Pain complet"),I(25,"g","Beurre de cacahuète")]),
  ];
}
const SLOTS=[["petitdej","Petit-déj"],["dej","Déjeuner"],["collation","Collation"],["diner","Dîner"]];
const JOURS=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

/* ============ Rendu recettes ============ */
function renderRecettes(){
  const w=$("#listeRecettes");
  if(!S.recettes.length){ w.innerHTML=`<p class="muted">Aucune recette.</p>`; return; }
  const parType={};
  for(const r of S.recettes) (parType[r.type]??=[]).push(r);
  w.innerHTML=SLOTS.map(([t,label])=>parType[t]?`<div style="margin-bottom:8px"><span class="tag on">${label}</span> `+
    parType[t].map(r=>`<button class="tag" data-rec="${r.id}" style="cursor:pointer">${esc(r.nom)} · ${r.prot} g</button>`).join(" ")+`</div>`:"").join("");
  w.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>editRecette(b.dataset.rec));
}

/* ============ Éditeur recette ============ */
let editingRecId=null;
function editRecette(id){
  editingRecId=id;
  const r=id?S.recettes.find(x=>x.id===id):null;
  $("#dlgRecetteTitle").textContent=r?"Modifier la recette":"Nouvelle recette";
  $("#drNom").value=r?r.nom:"";
  $("#drType").value=r?r.type:"dej";
  $("#drKcal").value=r?r.kcal:"";
  $("#drProt").value=r?r.prot:"";
  $("#drIng").value=r?r.ing.map(i=>`${i.q||""} ${i.u||""} ${i.n}`.trim().replace(/\s+/g," ")).join("\n"):"";
  $("#drDelete").style.display=r?"":"none";
  $("#dlgRecette").showModal();
}
function parseIng(txt){
  return txt.split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
    const m=l.match(/^([\d.,]+)\s*(g|kg|ml|cl|l|c\.à\.s|c\.à\.c|cs|cc)?\s+(.+)$/i);
    if(m) return {q:parseFloat(m[1].replace(",",".")),u:(m[2]||"").toLowerCase(),n:m[3].trim()};
    return {q:1,u:"",n:l};
  });
}
$("#drSave").onclick=()=>{
  const nom=$("#drNom").value.trim(); if(!nom){ toast("Nom manquant"); return; }
  const data={nom,type:$("#drType").value,kcal:+$("#drKcal").value||0,prot:+$("#drProt").value||0,ing:parseIng($("#drIng").value)};
  if(editingRecId){ Object.assign(S.recettes.find(x=>x.id===editingRecId),data); }
  else S.recettes.push(Object.assign({id:uid()},data));
  save(); $("#dlgRecette").close(); renderRecettes(); checkJalons();
};
$("#drCancel").onclick=()=>$("#dlgRecette").close();
$("#drDelete").onclick=()=>{
  if(confirm("Supprimer cette recette ?")){
    S.recettes=S.recettes.filter(x=>x.id!==editingRecId);
    save(); $("#dlgRecette").close(); renderRecettes();
  }
};
$("#btnAddRecette").onclick=()=>editRecette(null);

/* ============ Génération de la semaine ============ */
$("#btnGenSemaine").onclick=async ()=>{
  const key=iaPrete();
  $("#genStatus").textContent = key ? `Requête ${iaFournisseur().nom} en cours…` : "Composition depuis la base locale…";
  $("#btnGenSemaine").disabled=true;
  try{
    const jours = key ? await genSemaineIA(key) : genSemaineLocale();
    poserSemaine(jours);
    $("#genStatus").textContent = key ? "Semaine générée par l'IA à partir de ta base et de tes objectifs." : "Semaine composée depuis ta base locale. Configure une IA gratuite dans le Dossier pour des propositions inédites.";
  }catch(err){
    console.error(err);
    $("#genStatus").textContent="La génération IA a échoué ("+(err.message||"erreur réseau")+"). Repli sur ta base de recettes.";
    poserSemaine(genSemaineLocale());
  }
  $("#btnGenSemaine").disabled=false;
};
function poserSemaine(jours){
  const premiere = !S.semaine;
  S.semaine={debut:semaineKey(),jours};
  const q=queteCourante(); if(!q.plan){ q.plan=true; }
  save();
  gagner(60,"Plan de vivres établi");
  verifierQuete(); renderSemaine();
}
function genSemaineLocale(){
  const par={}; for(const r of S.recettes) (par[r.type]??=[]).push(r);
  const pick=(t,evite)=>{
    const pool=(par[t]||[]).filter(r=>r.id!==evite);
    if(!pool.length) return par[t]?.[0]||null;
    return pool[Math.floor(Math.random()*pool.length)];
  };
  const jours=[]; const prev={};
  for(let j=0;j<7;j++){
    const slots={};
    for(const [t] of SLOTS){
      const r=pick(t,prev[t]); if(r){ slots[t]=r.id; prev[t]=r.id; }
    }
    jours.push({slots});
  }
  return jours;
}
async function genSemaineIA(key){
  const base=S.recettes.map(x=>({id:x.id,nom:x.nom,type:x.type,kcal:x.kcal,prot:x.prot}));
  const prompt=`Tu es un nutritionniste sportif. Compose un plan de repas de 7 jours (lundi à dimanche) adapté à ce profil : ${JSON.stringify((typeof profilPourIA==="function")?profilPourIA():{})}. Objectif ${S.settings.prot} g de protéines/jour, cuisine française simple et économique.
Base de recettes disponible (à privilégier, réutilise leurs "id") : ${JSON.stringify(base)}
Créneaux par jour : petitdej, dej, collation, diner.
Tu peux proposer au maximum 4 nouvelles recettes si la base manque de variété. Chaque nouvelle recette doit avoir : nom, type, kcal, prot, ing (liste de {q, u, n} avec q=quantité numérique, u=unité (g/ml ou vide), n=nom d'ingrédient).
Réponds UNIQUEMENT avec un JSON valide, sans balises markdown, au format :
{"nouvelles":[{...}], "jours":[{"slots":{"petitdej":"id","dej":"id","collation":"id","diner":"id"}}, ... 7 éléments]}
Les valeurs des slots référencent des id de la base OU l'index "n0","n1"… des nouvelles recettes.`;
  const plan=await appelIAJson(prompt,3000);
  const map={};
  (plan.nouvelles||[]).forEach((x,i)=>{
    const rec={id:uid(),nom:x.nom,type:x.type||"dej",kcal:+x.kcal||0,prot:+x.prot||0,
      ing:(x.ing||[]).map(y=>({q:+y.q||1,u:y.u||"",n:String(y.n||"")}))};
    S.recettes.push(rec); map["n"+i]=rec.id;
  });
  const jours=(plan.jours||[]).slice(0,7).map(j=>{
    const slots={};
    for(const [t] of SLOTS){
      let v=j.slots?j.slots[t]:null; if(!v) continue;
      if(map[v]) v=map[v];
      if(S.recettes.find(x=>x.id===v)) slots[t]=v;
    }
    return {slots};
  });
  if(jours.length<7) throw new Error("réponse incomplète");
  save(); renderRecettes();
  return jours;
}
function renderSemaine(){
  const w=$("#planSemaine");
  if(!S.semaine){ w.innerHTML=`<div class="card flat"><p class="hand">Aucun plan de vivres en mémoire — lancer « Générer ma semaine »</p></div>`; return; }
  w.innerHTML=S.semaine.jours.map((j,i)=>{
    let kcal=0,prot=0;
    const lignes=SLOTS.map(([t,label])=>{
      const r=S.recettes.find(x=>x.id===j.slots[t]); if(!r) return "";
      kcal+=r.kcal; prot+=r.prot;
      return `<div class="meal-line"><span class="slot">${label}</span><span style="flex:1">${esc(r.nom)}</span><span class="kx">${r.kcal} kcal · ${r.prot} g</span>
        <button class="btn small ghost" data-swap="${i}:${t}" title="Changer">↻</button></div>`;
    }).join("");
    const okProt=prot>=S.settings.prot;
    return `<div class="day-plan"><h3>${JOURS[i]}<small>${kcal} kcal · <span style="${okProt?"":"color:#F8C9A8"}">${prot} g prot</span></small></h3>${lignes}</div>`;
  }).join("");
  w.querySelectorAll("[data-swap]").forEach(b=>b.onclick=()=>{
    const [i,t]=b.dataset.swap.split(":");
    const j=S.semaine.jours[+i];
    const pool=S.recettes.filter(r=>r.type===t);
    if(pool.length<2) return;
    const cur=pool.findIndex(r=>r.id===j.slots[t]);
    j.slots[t]=pool[(cur+1)%pool.length].id;
    save(); renderSemaine();
  });
}

/* ============ Liste de courses ============ */
$("#btnCourses").onclick=()=>{
  if(!S.semaine){ toast("Génère d'abord ta semaine"); return; }
  const agg={};
  for(const j of S.semaine.jours) for(const [t] of SLOTS){
    const r=S.recettes.find(x=>x.id===j.slots[t]); if(!r) continue;
    for(const i of r.ing){
      const k=(i.n||"").toLowerCase()+"|"+(i.u||"");
      if(!agg[k]) agg[k]={n:i.n,u:i.u,q:0};
      agg[k].q+=(+i.q||0);
    }
  }
  const items=Object.values(agg).sort((a,b)=>a.n.localeCompare(b.n,"fr"));
  $("#coursesInfo").textContent=`${items.length} articles pour 7 jours.`;
  $("#coursesList").innerHTML=items.map(i=>{
    let q=i.q, u=i.u;
    if(u==="g"&&q>=1000){q=Math.round(q/100)/10;u="kg";}
    if(u==="ml"&&q>=1000){q=Math.round(q/100)/10;u="l";}
    return `<li><span>${esc(i.n)}</span><b>${q%1?q.toFixed(1):q} ${u}</b></li>`;
  }).join("");
  $("#dlgCourses").showModal();
  $("#btnCopyCourses").onclick=()=>{
    const txt=items.map(i=>`- ${i.n} : ${i.q}${i.u?" "+i.u:""}`).join("\n");
    navigator.clipboard?.writeText(txt).then(()=>toast("Liste copiée"));
  };
};
$("#btnCloseCourses").onclick=()=>$("#dlgCourses").close();
