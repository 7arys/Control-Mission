"use strict";
/* ============================================================
   JEU — journal de bord : entrées automatiques et personnelles
   ============================================================ */
/* ============ Journal de bord (lore) ============ */

/* Entrées débloquées par la progression. Chaque clé n'apparaît qu'une fois. */
const LORE_AUTO=[
  {cle:"init", titre:"Ouverture du dossier",
   txt:"Le programme est officiellement ouvert. Un hangar, une table de traçage, et un objectif que personne ici n'a jamais atteint. On commence par ce qu'on peut fabriquer : de la structure.",
   test:()=>true},

  {cle:"sonde1", titre:"Première sonde",
   txt:"La première sonde a quitté l'aire de lancement ce matin. Trajectoire nominale. On l'a suivie jusqu'à ce qu'elle ne soit plus qu'un point, puis plus rien du tout. Il faut maintenant attendre — c'est la partie qu'on n'avait pas anticipée.",
   test:()=>(S.jeu&&S.jeu.sondesTotal>=1)},

  {cle:"sonde10", titre:"Routine de vol",
   txt:"Dixième lancement. Les gestes sont devenus mécaniques, les retours plus réguliers. Ce qui semblait exceptionnel il y a quelques semaines est devenu une habitude de travail.",
   test:()=>(S.jeu&&S.jeu.sondesTotal>=10)},

  {cle:"ch1", titre:"Le lanceur est debout",
   txt:"Bouclier posé ce soir. Pour la première fois, la silhouette complète tient debout sur le pas de tir. Quatre pièces, des semaines de récupération de matériaux, et cette chose qui ressemble enfin à une fusée.",
   test:()=>(S.jeu&&S.jeu.chapitre>=1)},

  {cle:"ch2", titre:"Le plein est fait",
   txt:"L'électrolyseur tourne depuis trois jours. La glace ramenée par les sondes devient de l'hydrogène et de l'oxygène, et les réservoirs sont pleins. La Lune n'est plus une idée : c'est une distance, et on a de quoi la parcourir.",
   test:()=>(S.jeu&&S.jeu.chapitre>=2)},

  {cle:"ch3", titre:"Un toit au-dessus de la Terre",
   txt:"La station est habitable. On y voit la planète tourner par le hublot du laboratoire, et personne ne s'en lasse. C'est le premier endroit du programme qui n'est pas une machine, mais un lieu.",
   test:()=>(S.jeu&&S.jeu.chapitre>=3)},

  {cle:"ch4", titre:"Poussière grise",
   txt:"La base lunaire est en service. La foreuse mord le régolithe, la serre a produit ses premières pousses. Dehors, un silence que rien ne remplit. On s'habitue vite au gris.",
   test:()=>(S.jeu&&S.jeu.chapitre>=4)},

  {cle:"ch5", titre:"Injection trans-martienne",
   txt:"Le vaisseau a quitté l'orbite. Après la mise à feu, plus rien à faire pendant des mois, sinon vérifier des chiffres qui ne bougent pas. Le vide entre deux planètes est surtout fait d'attente.",
   test:()=>(S.jeu&&S.jeu.chapitre>=5)},

  {cle:"ch6", titre:"Tenir sur Mars",
   txt:"Dôme pressurisé, eau extraite, ferme en service. On ne visite plus Mars : on y habite. La centrale tourne, le rover est sorti hier pour la première fois. C'est encore hostile, mais ce n'est plus impossible.",
   test:()=>(S.jeu&&S.jeu.chapitre>=6)},

  {cle:"ch7", titre:"Une planète respirable",
   txt:"Le bouclier magnétique est en place, l'atmosphère s'épaissit, les premières forêts tiennent. Personne dans l'équipe ne verra le résultat final. C'était le principe depuis le début.",
   test:()=>(S.jeu&&S.jeu.chapitre>=7)},

  {cle:"lune", titre:"Première sonde lunaire",
   txt:"Retour d'échantillons lunaires. La composition confirme ce qu'on espérait : de quoi construire sur place plutôt que tout emporter depuis le sol.",
   test:()=>(S.jeu&&(S.jeu.construits||{})["carburant/ergols"])},

  {cle:"missions25", titre:"Vingt-cinq séances",
   txt:"Vingt-cinq séances au journal. Le programme spatial n'avance que parce que quelqu'un, en bas, continue de soulever de la fonte trois fois par semaine. Rien ici n'est gratuit.",
   test:()=>(typeof nbMissions==="function"&&nbMissions()>=25)},
];

function lore(){ if(!Array.isArray(S.lore)) S.lore=[]; return S.lore; }
function verifierLore(){
  const l=lore();
  let nouveau=null;
  for(const e of LORE_AUTO){
    if(l.some(x=>x.cle===e.cle)) continue;
    let ok=false; try{ ok=e.test(); }catch(err){}
    if(!ok) continue;
    l.unshift({id:uid(),cle:e.cle,d:todayKey(),ts:Date.now(),titre:e.titre,txt:e.txt,auto:true});
    nouveau=e;
  }
  if(nouveau){
    save();
    setTimeout(()=>toast(nouveau.titre,"Nouvelle entrée au journal"),2600);
    renderLore();
  }
}

/* --- rendu --- */
function renderLore(){
  const w=$("#carteLore"); if(!w) return;
  if(typeof modActif==="function" && !modActif("spatial")){ w.style.display="none"; return; }
  w.style.display="";
  const l=lore();
  let h=`<div class="seance-head"><h2 style="margin:0">Journal de bord</h2>
    <span class="tag">${l.length} entrée${l.length>1?"s":""}</span></div>`;
  if(!l.length){
    h+=`<p class="muted">Vide pour l'instant. Les entrées apparaissent au fil du programme, et tu peux écrire les tiennes.</p>`;
  } else {
    h+=l.slice(0,2).map(e=>entreeHtml(e,true)).join("");
    if(l.length>2) h+=`<p class="cote-meta">+ ${l.length-2} entrée${l.length-2>1?"s":""} plus ancienne${l.length-2>1?"s":""}</p>`;
  }
  h+=`<div class="spacer"></div><div class="row">
    <button class="btn ghost small" onclick="ouvrirLore()">Ouvrir le journal</button>
    <button class="btn ghost small" onclick="editerEntree(null)">+ Écrire une entrée</button></div>`;
  w.innerHTML=h;
}
function entreeHtml(e,court){
  return `<div class="lore-e ${e.auto?"auto":"perso"}">
    <div class="lore-h"><b>${esc(e.titre)}</b><span>${fmtDate(e.d)}${e.auto?"":" · personnel"}</span></div>
    <p>${esc(court&&e.txt.length>190?e.txt.slice(0,190)+"…":e.txt)}</p>
    ${e.auto?"":`<div class="row" style="margin-top:6px">
      <button class="btn ghost small" onclick="editerEntree('${e.id}')">Modifier</button>
      <button class="btn danger small" onclick="supprimerEntree('${e.id}')">Supprimer</button></div>`}
  </div>`;
}
function ouvrirLore(){
  const l=lore();
  $("#dlgLoreBody").innerHTML = l.length
    ? l.map(e=>entreeHtml(e,false)).join("")
    : `<p class="muted">Aucune entrée.</p>`;
  $("#dlgLore").showModal();
}

/* --- entrées personnelles --- */
let loreEnCours=null;
function editerEntree(id){
  loreEnCours=id;
  const e=id?lore().find(x=>x.id===id):null;
  $("#dlgEntreeTitre").textContent=e?"Modifier l'entrée":"Nouvelle entrée";
  $("#loreTitre").value=e?e.titre:"";
  $("#loreTexte").value=e?e.txt:"";
  $("#loreDate").value=e?e.d:todayKey();
  $("#dlgEntree").showModal();
}
function sauverEntree(){
  const t=$("#loreTitre").value.trim(), x=$("#loreTexte").value.trim();
  if(!t&&!x){ toast("Entrée vide"); return; }
  const d=$("#loreDate").value||todayKey();
  const l=lore();
  if(loreEnCours){
    const e=l.find(y=>y.id===loreEnCours);
    if(e){ e.titre=t||"Sans titre"; e.txt=x; e.d=d; }
  } else {
    l.unshift({id:uid(),d,ts:Date.now(),titre:t||"Sans titre",txt:x,auto:false});
  }
  l.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:(b.ts||0)-(a.ts||0));
  save(); $("#dlgEntree").close();
  toast(loreEnCours?"Entrée modifiée":"Entrée ajoutée");
  renderLore();
  if($("#dlgLore").hasAttribute("open")) ouvrirLore();
}
function supprimerEntree(id){
  const e=lore().find(x=>x.id===id); if(!e) return;
  if(!confirm(`Supprimer « ${e.titre} » ?`)) return;
  S.lore=lore().filter(x=>x.id!==id);
  save(); renderLore();
  if($("#dlgLore").hasAttribute("open")) ouvrirLore();
}
