"use strict";
/* ============================================================
   SPORT — débriefing, indice de séance, conseils de progression
   ============================================================ */
/* ============ Débriefing de mission ============ */

/* --- Bilan technique calculé localement --- */
function construireBilan(s, setsMap, dureeMin, libre, musclesAvant, prs){
  const exos=[]; let vol=0, setsFaits=0, setsPrevus=0;
  const parZone={};
  for(const e of s.exos){
    const arr=setsMap[e.id]||[];
    const done=arr.filter(Boolean).length, prevu=arr.length;
    const charge=+e.poids||0;
    const rr=(typeof equivReps==="function")?equivReps(e):e.reps;
    const v=done*rr*charge;
    vol+=v; setsFaits+=done; setsPrevus+=prevu;
    const zs=e.zones||[];
    for(const z of zs) parZone[z]=(parZone[z]||0)+(done*rr*(charge||8))/zs.length;
    exos.push({nom:e.nom,done,prevu,reps:e.reps,poids:charge,vol:v,zones:zs,
               mode:e.mode||"kg", bande:e.bande||null,
               dejaComplet:exoPrecedentComplet(s.nom,e.nom),
               conseil:conseilExo(done,prevu,charge,e.reps,e,{dejaComplet:exoPrecedentComplet(s.nom,e.nom)})});
  }
  // récupération : jours depuis le dernier travail de chaque zone
  const recup={};
  for(const z of Object.keys(parZone)){
    const last=(musclesAvant[z]||{}).last;
    recup[z]= last ? Math.round((new Date(todayKey())-new Date(last))/864e5) : null;
  }
  return {nom:s.nom, libre:!!libre, duree:dureeMin, vol:Math.round(vol),
          setsFaits, setsPrevus, exos, parZone, recup, prs:prs||[]};
}
// l'exercice a-t-il déjà été bouclé intégralement la fois précédente ?
function exoPrecedentComplet(nomSeance,nomExo){
  const p=(S.analyses||[]).find(a=>!a.ext&&a.nom===nomSeance);
  if(!p||!p.bilan||!p.bilan.exos) return false;
  const x=p.bilan.exos.find(y=>y.nom===nomExo);
  return !!(x&&x.prevu>0&&x.done>=x.prevu);
}
function conseilExo(done,prevu,charge,reps,e,ctx){
  ctx=ctx||{};
  if(prevu===0) return {action:"—",txt:"Aucune série enregistrée."};
  if(done===0) return {action:"Non fait",txt:"Exercice sauté cette fois — à replacer dès la prochaine séance."};
  const taux=done/prevu;
  const bande=(e&&e.mode==="bande");
  // séance ressentie difficile : on ne monte jamais
  if(taux>=1 && ctx.ressenti==="dur")
    return {action:"Consolider",txt:`Séries bouclées mais séance ressentie difficile : refais exactement la même chose la prochaine fois.`};
  // première fois complète : on valide avant de monter
  if(taux>=1 && !ctx.dejaComplet && ctx.ressenti!=="facile")
    return {action:"Consolider",txt:`Première fois où tu boucles tout : refais la même chose la prochaine fois pour confirmer, puis on augmentera.`};
  if(bande){
    const suiv=(typeof bandeSuivante==="function")?bandeSuivante(e.bande):null;
    const prec=(typeof bandePrecedente==="function")?bandePrecedente(e.bande):null;
    if(taux>=1) return suiv
      ? {action:"Augmenter",txt:`Toutes les séries bouclées : passe à la bande ${suiv.nom} (${suiv.kg} kg) la prochaine fois.`}
      : {action:"Augmenter",txt:`Bande la plus dure déjà atteinte : ajoute 2 répétitions (${reps}→${reps+2}) ou éloigne-toi de l'ancrage pour tendre davantage.`};
    if(taux<0.7) return prec
      ? {action:"Alléger",txt:`Moins de 70 % des séries bouclées : redescends à la bande ${prec.nom} (${prec.kg} kg).`}
      : {action:"Alléger",txt:`Trop dur même sur la bande la plus souple : rapproche-toi de l'ancrage pour réduire la tension.`};
    return {action:"Maintenir",txt:`Garde cette bande jusqu'à boucler toutes les séries proprement.`};
  }
  if(taux>=1 && charge>0){
    const pas=charge<10?1:2;
    return {action:"Augmenter",txt:`Toutes les séries bouclées : passe à ${charge+pas} kg la prochaine fois.`};
  }
  if(taux>=1 && charge===0)
    return {action:"Augmenter",txt:`Séries complètes au poids du corps : ajoute 1 à 2 répétitions (${reps}→${reps+2}).`};
  if(taux<0.7)
    return {action:"Alléger",txt:`Moins de 70 % des séries bouclées : la charge est trop lourde, redescends d'un cran.`};
  return {action:"Maintenir",txt:`Séries partiellement bouclées : garde cette charge jusqu'à les finir toutes.`};
}
function indiceSeance(b, precedent){
  let n=(b.setsPrevus? b.setsFaits/b.setsPrevus : 1)*55;
  if(precedent && precedent.vol>0 && b.vol>0){
    const r=b.vol/precedent.vol;
    n+=Math.max(0,Math.min(30,(r-0.9)*100));
  } else n+=18;
  n+=Math.min(15,(b.prs||[]).length*8);
  return Math.max(0,Math.min(100,Math.round(n)));
}
function libelleIndice(i){
  if(i>=92) return "Séance de référence";
  if(i>=78) return "Solide";
  if(i>=60) return "Correct";
  if(i>=40) return "À consolider";
  return "Séance légère";
}

/* --- Enregistrement d'un débriefing --- */
function enregistrerAnalyse(bilan){
  const p=(S.analyses||[]).find(a=>a.nom===bilan.nom && !a.ext);
  const precedent=p?{vol:(p.bilan&&p.bilan.vol)||0,indice:p.indice,d:p.d}:null;
  const an={
    id:uid(), d:todayKey(), ts:Date.now(), nom:bilan.nom, ext:false,
    indice:indiceSeance(bilan,precedent), bilan, precedent,
    ia:null
  };
  S.analyses=[an,...(S.analyses||[])].slice(0,60);
  save();
  return an;
}
function enregistrerAnalyseSortie(nom,min,intensite,zones,pts){
  const an={
    id:uid(), d:todayKey(), ts:Date.now(), nom, ext:true, indice:null,
    bilan:{nom,ext:true,duree:min,intensite,zones,pts,exos:[],parZone:{},recup:{},prs:[]},
    precedent:null, ia:null
  };
  S.analyses=[an,...(S.analyses||[])].slice(0,60);
  save();
  return an;
}

/* --- Rendu du débriefing --- */
function ouvrirDebrief(id){
  const an=(S.analyses||[]).find(a=>a.id===id);
  if(!an) return;
  renderDebrief(an);
  $("#dlgDebrief").showModal();
}
function renderDebrief(an){
  const b=an.bilan;
  let h="";

  if(!an.ext){
    const pct=b.setsPrevus?Math.round(b.setsFaits/b.setsPrevus*100):0;
    h+=`<div class="dbg-indice">
      <div class="dbg-num">${an.indice}<small>/100</small></div>
      <div style="flex:1">
        <div class="dbg-lab">${libelleIndice(an.indice)}</div>
        <div class="cote-bar"><i style="width:${an.indice}%"></i></div>
        <div class="cote-meta">Exécution ${pct} % · ${b.setsFaits}/${b.setsPrevus} séries${b.duree?` · ${b.duree} min`:""}</div>
      </div></div>`;

    h+=`<div class="dbg-kpi">
      <div><b>${b.vol.toLocaleString("fr-FR")}</b><span>kg de charge déplacés</span></div>
      <div><b>${(an.precedent&&an.precedent.vol>0&&b.vol>0)?((b.vol>=an.precedent.vol?"+":"")+Math.round((b.vol/an.precedent.vol-1)*100)+" %"):"—"}</b><span>vs séance précédente</span></div>
      <div><b>${b.prs.length}</b><span>record${b.prs.length>1?"s":""} battu${b.prs.length>1?"s":""}</span></div>
    </div>`;

    if(b.prs.length) h+=`<p class="hand">Records : ${b.prs.map(esc).join(" · ")}</p>`;

    if(b.ech&&b.ech.total){
      const ok=b.ech.faits;
      h+= ok===0
        ? `<p class="dbg-warn">⚠ Échauffement non coché. À froid — surtout le matin — c'est le facteur de risque numéro un pour un débutant. Cinq minutes suffisent.</p>`
        : `<p class="muted">Échauffement : ${ok}/${b.ech.total} étapes${ok===b.ech.total?" — complet ✓":""}.</p>`;
    }
    h+=`<h3 class="dbg-h">Comment as-tu ressenti la séance ?</h3>
      <div class="pickrow">
        ${[["facile","Facile"],["ok","Correcte"],["dur","Difficile"]].map(([id,lab])=>
          `<button class="pick ${an.ressenti===id?"on":""}" onclick="setRessenti('${an.id}','${id}')">${lab}</button>`).join("")}
      </div>
      <p class="cote-meta" style="margin-top:6px">${an.ressenti?"Les consignes ci-dessous en tiennent compte.":"Réponds pour affiner les consignes de progression."}</p>`;
    h+=`<h3 class="dbg-h">Ajustements pour la prochaine fois</h3>`;
    for(const e of b.exos){
      const cons=conseilExo(e.done,e.prevu,e.poids,e.reps,e,{dejaComplet:e.dejaComplet,ressenti:an.ressenti});
      e.conseil=cons;
      const cls=cons.action==="Augmenter"?"up":(cons.action==="Alléger"||cons.action==="Non fait")?"down":"keep";
      h+=`<div class="dbg-exo">
        <div><b>${esc(e.nom)}</b> <span class="cote-meta">${e.done}/${e.prevu} × ${e.reps}${e.mode==="bande"?(e.bande?` · bande ${esc((bandeById(e.bande)||{}).nom||"")}`:" · élastique"):(e.poids?` · ${e.poids} kg`:"")}</span></div>
        <div class="dbg-act ${cls}">${cons.action}</div>
        <div class="muted" style="grid-column:1/-1;font-size:12px">${esc(cons.txt)}</div>
      </div>`;
    }

    const sens=(typeof zonesSensibles==="function")?zonesSensibles(2):[];
    const touchees=sens.filter(z=>Object.keys(b.parZone).includes(z)).map(z=>ZONES.find(x=>x[0]===z)[1]);
    if(touchees.length) h+=`<p class="dbg-warn">⚠ ${touchees.join(", ")} : zone${touchees.length>1?"s":""} signalée${touchees.length>1?"s":""} courbaturée${touchees.length>1?"s":""} ces deux derniers jours. Si la gêne persiste après la séance, allège nettement la prochaine fois.</p>`;
    const rAuj=Object.entries(b.recup).filter(([z,j])=>j===0).map(([z])=>ZONES.find(x=>x[0]===z)[1]);
    const rHier=Object.entries(b.recup).filter(([z,j])=>j===1).map(([z])=>ZONES.find(x=>x[0]===z)[1]);
    if(rAuj.length||rHier.length){
      const parts=[];
      if(rAuj.length) parts.push(`${rAuj.join(", ")} — déjà travaillé${rAuj.length>1?"s":""} aujourd'hui`);
      if(rHier.length) parts.push(`${rHier.join(", ")} — travaillé${rHier.length>1?"s":""} hier`);
      h+=`<p class="dbg-warn">⚠ ${parts.join(" · ")}. Un muscle a besoin d'environ 48 h avant d'être resollicité lourdement : privilégie une autre zone à la prochaine séance.</p>`;
    }

    const zf=zoneFaible();
    if(zf) h+=`<p class="muted">Zone la plus en retard actuellement : <b>${ZONES.find(x=>x[0]===zf)[1]}</b>.</p>`;
  } else {
    h+=`<div class="dbg-kpi">
      <div><b>${b.duree}</b><span>minutes</span></div>
      <div><b>${b.intensite}</b><span>intensité</span></div>
      <div><b>+${b.pts}</b><span>pts de mission</span></div>
    </div>
    <p class="muted">Zones sollicitées : ${(b.zones||[]).map(z=>ZONES.find(x=>x[0]===z)[1]).join(", ")||"—"}.</p>`;
  }

  // bloc IA
  h+=`<h3 class="dbg-h">Analyse approfondie</h3><div id="dbgIA">`;
  if(an.ia){
    h+=renderIA(an.ia);
  } else if(iaPrete()){
    h+=`<p class="muted">Analyse détaillée par IA à partir de ton historique, ton matériel et tes objectifs.</p>
        <button class="btn signal small" onclick="lancerAnalyseIA('${an.id}')">Lancer l'analyse</button>`;
  } else {
    h+=`<p class="muted">Configure une IA gratuite dans l'onglet Dossier pour débloquer l'analyse approfondie : lecture croisée de ton historique, détection de déséquilibres, plan de progression.</p>`;
  }
  h+=`</div>`;
  $("#dlgDebriefBody").innerHTML=h;
  $("#dlgDebriefTitle").textContent=(an.ext?"Débriefing — sortie":"Débriefing — mission")+" · "+fmtDate(an.d);
}
function renderIA(ia){
  let h=`<p>${esc(ia.synthese||"")}</p>`;
  if(ia.points_forts&&ia.points_forts.length)
    h+=`<div class="dbg-list ok"><b>Points forts</b><ul>${ia.points_forts.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
  if(ia.a_corriger&&ia.a_corriger.length)
    h+=`<div class="dbg-list warn"><b>À corriger</b><ul>${ia.a_corriger.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
  if(ia.ajustements&&ia.ajustements.length)
    h+=`<div class="dbg-list"><b>Ajustements précis</b><ul>${ia.ajustements.map(a=>`<li><b>${esc(a.exo||"")}</b> — ${esc(a.action||"")}${a.raison?` <span class="muted">(${esc(a.raison)})</span>`:""}</li>`).join("")}</ul></div>`;
  if(ia.recuperation) h+=`<p class="muted"><b>Récupération :</b> ${esc(ia.recuperation)}</p>`;
  if(ia.prochaine) h+=`<p class="hand">Prochaine séance : ${esc(ia.prochaine)}</p>`;
  return h;
}

function setRessenti(id,val){
  const an=(S.analyses||[]).find(x=>x.id===id); if(!an) return;
  an.ressenti=val;
  // fige les conseils recalculés pour le tableau de bord
  if(an.bilan&&an.bilan.exos)
    for(const e of an.bilan.exos)
      e.conseil=conseilExo(e.done,e.prevu,e.poids,e.reps,e,{dejaComplet:e.dejaComplet,ressenti:val});
  save(); renderDebrief(an); renderAnalyses();
  if(typeof renderBase==="function") renderBase();
}

/* --- Analyse IA --- */
async function lancerAnalyseIA(id){
  const an=(S.analyses||[]).find(a=>a.id===id); if(!an) return;
  if(!iaPrete()){ toast("Aucune IA configurée (onglet Dossier)"); return; }
  const box=$("#dbgIA"); if(box) box.innerHTML=`<p class="muted">Analyse en cours…</p>`;
  if(typeof iaProgres!=="undefined") iaProgres=t=>{ if(box) box.innerHTML=`<p class="muted">${esc(t)}</p>`; };
  try{
    const histo=(S.analyses||[]).filter(a=>a.nom===an.nom&&a.id!==an.id).slice(0,4)
      .map(a=>({date:a.d,indice:a.indice,volume:a.bilan.vol,execution:`${a.bilan.setsFaits}/${a.bilan.setsPrevus}`}));
    const aptitudes={};
    for(const [zid,zl] of ZONES){
      const m=S.muscles[zid]||{pts:0,n:0,last:null};
      aptitudes[zl]={points:Math.round(m.pts),seances:m.n,dernier:m.last};
    }
    // journées de repos et courbatures des 14 derniers jours
    const lim=new Date(); lim.setDate(lim.getDate()-14);
    const limK=todayKey(lim);
    const repos=(S.histoSeances||[]).filter(h=>h.repos&&h.d>=limK).map(h=>({
      date:h.d, niveau:h.niveau||"",
      zones:(h.zonesRepos||[]).map(z=>(ZONES.find(x=>x[0]===z)||[])[1]).filter(Boolean),
      note:h.note||""
    }));
    const missions14=(S.histoSeances||[]).filter(h=>!h.repos&&h.d>=limK).length;
    const derniere=(S.histoSeances||[]).find(h=>!h.repos);
    const joursDepuis=derniere?Math.round((new Date(todayKey())-new Date(derniere.d))/864e5):null;

    const payload={
      profil:{
        niveau:"grand débutant — premières semaines d'entraînement, aucune base de force",
        anciennete_missions:(typeof nbMissions==="function")?nbMissions():0,
        objectif:"esthétique définie (abdos, biceps, pectoraux, fessiers), pas de volume maximal",
        frequence_visee:`${(S.settings&&S.settings.objSeances)||3} séances par semaine, 30 à 40 min, souvent au réveil`,
        materiel:["haltères","bandes de résistance SmartWorkout","banc","roue abdominale","poignées de pompes","barre de traction"],
        contrainte:"pied fragile : aucun exercice à impact (ni course, ni corde à sauter, ni sauts)"
      },
      charges_utilisees:an.bilan.exos.map(e=>({
        exercice:e.nom, series:`${e.done}/${e.prevu}`, reps:e.reps,
        type:e.mode==="bande"?"élastique":"charge libre",
        bande:e.mode==="bande"?((bandeById(e.bande)||{}).nom||"non choisie"):null,
        resistance_kg:e.poids
      })),
      bandes_disponibles:(typeof bandes==="function")?bandes().map(b=>({nom:b.nom,kg:b.kg})):[],
      echauffement:an.bilan.ech||null,
      recuperation:{
        jours_repos_consignes_14j:repos,
        missions_14j:missions14,
        jours_depuis_derniere_seance:joursDepuis
      },
      seance:an.bilan,
      indice:an.indice,
      ressenti_seance:an.ressenti||"non renseigné",
      historique_meme_seance:histo,
      aptitudes_par_zone:aptitudes,
      records_actuels:S.prs
    };
    const prompt=`Tu es un coach de musculation. Analyse cette séance et réponds en français.

DONNÉES : ${JSON.stringify(payload)}

Contraintes de réponse :
- Il s'agit d'un GRAND DÉBUTANT. Priorité absolue : régularité, technique et plaisir, avant la charge. Ne propose jamais d'ajouter des exercices ou des séries à ce stade.
- Progression très graduelle : au maximum +1 kg sur les petits mouvements (curl, élévations), +2 kg sur les gros, et seulement si toutes les séries ont été bouclées sans difficulté.
- Pour les exercices à l'élastique, la progression se fait en passant à la bande immédiatement supérieure de la liste "bandes_disponibles", ou en ajoutant des répétitions, jamais en kilos. Nomme la bande précise à utiliser.
- Prends en compte les charges réellement utilisées (champ "charges_utilisees") et commente-les concrètement.
- Prends en compte les journées de repos et les courbatures signalées (champ "recuperation") : si des zones étaient douloureuses récemment, recommande explicitement la prudence sur ces zones. Ne culpabilise JAMAIS le repos : c'est une bonne décision d'entraînement.
- Si la reprise suit plusieurs jours d'arrêt, conseille de reprendre à 60-70 % des charges.
- Commente l'échauffement s'il n'a pas été fait.
- Ne propose JAMAIS d'exercice à impact (course, sauts, corde à sauter).
- Utilise uniquement le matériel listé.
- Aucun conseil médical ni nutritionnel chiffré.
- Sois concret et chiffré, mais bienveillant : 3 ajustements maximum.
- Ne propose une augmentation que si l'exercice a été bouclé intégralement ET que le ressenti n'est pas 'dur'. Sinon, recommande de refaire la même chose pour consolider.
- Si le ressenti de séance est 'dur', ne propose AUCUNE augmentation.

Format impératif : réponds UNIQUEMENT avec un JSON valide, sans balises markdown.
N'utilise AUCUN guillemet double à l'intérieur des textes (utilise des apostrophes si besoin).
N'utilise aucun retour à la ligne à l'intérieur des valeurs.
Structure attendue :
{"synthese":"2-3 phrases sur cette séance et la tendance",
 "points_forts":["..."],
 "a_corriger":["..."],
 "ajustements":[{"exo":"nom","action":"quoi faire précisément","raison":"pourquoi"}],
 "recuperation":"une phrase sur le repos avant la prochaine séance",
 "prochaine":"quelle séance viser ensuite et pourquoi"}`;
    an.ia=await appelIAJson(prompt,1600);
    if(typeof iaProgres!=="undefined") iaProgres=null;
    save();
    if(box) box.innerHTML=renderIA(an.ia);
    renderAnalyses();
  }catch(e){
    if(typeof iaProgres!=="undefined") iaProgres=null;
    if(box) box.innerHTML=`<p class="muted">Analyse indisponible : ${esc(e.message)}. Le bilan technique ci-dessus reste valable, et c&rsquo;est lui qui porte les consignes chiffrées.</p>
      <button class="btn ghost small" onclick="lancerAnalyseIA('${id}')">Réessayer</button>`;
  }
}

/* --- Historique des débriefings --- */
function renderAnalyses(){
  const w=$("#listeAnalyses"); if(!w) return;
  const A=S.analyses||[];
  if(!A.length){ w.innerHTML=`<p class="muted">Aucun débriefing pour l'instant. Il s'ouvre automatiquement à la fin de chaque mission.</p>`; return; }
  w.innerHTML=`<table class="mini">`+A.slice(0,20).map(a=>
    `<tr style="cursor:pointer" data-an="${a.id}">
      <td>${fmtDate(a.d)}</td>
      <td><b>${esc(a.nom)}</b>${a.ia?` <span class="pr-note">IA</span>`:""}</td>
      <td class="muted">${a.ext?(a.bilan.duree+" min"):(a.bilan.vol.toLocaleString("fr-FR")+" kg")}</td>
      <td style="text-align:right"><b style="color:var(--accent)">${a.indice!=null?a.indice:"—"}</b></td>
    </tr>`).join("")+`</table>`;
  w.querySelectorAll("[data-an]").forEach(t=>t.onclick=()=>ouvrirDebrief(t.dataset.an));
}
$("#dbgFermer").onclick=()=>$("#dlgDebrief").close();
