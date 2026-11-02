/* ---------- Strakke iconen (pen en prullenbak) ---------- */
const ICON_EDIT='<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const ICON_CAL='<svg viewBox="0 0 24 24" class="ico"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 10h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/></svg>';
const ICON_CHART='<svg viewBox="0 0 24 24" class="ico"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>';
const ICON_BUD='<svg viewBox="0 0 24 24" class="ico"><rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><path d="M7 6V4.5h10V6"/><circle cx="16.5" cy="15" r="1"/></svg>';
const ICON_DEL='<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

function monthName(i, style){
  let s;
  try { s = new Date(2024,i,1).toLocaleDateString(lang,{month:style}); }
  catch(e){ s = new Date(2024,i,1).toLocaleDateString("en",{month:style}); }
  return s.charAt(0).toLocaleUpperCase(lang)+s.slice(1);
}
let months=[], monthsFull=[];

/* ================= GEGEVENS ================= */
const data = { categories: [] };
const NOW = new Date().getMonth();
let currentMonth = NOW;
let page = "month";   // "month" of "general"

/* Kleuren van de grafieken (ongewijzigd) */
const C_INC="#16a34a", C_EXP="#dc2626", C_SAV="#2563eb", C_REST="#0d9488";
const PALETTE=["#dc2626","#f59e0b","#8b5cf6","#ec4899","#0ea5e9","#84cc16","#f97316","#14b8a6","#a855f7","#64748b"];
const PALETTE_INC=["#16a34a","#22c55e","#15803d","#4ade80","#166534","#86efac","#65a30d","#a3e635"];

function fmt(n){ return (n||0).toFixed(2); }
function money(n){ return (n<0?"-":"")+"€"+Math.abs(n).toFixed(2); }
function $(id){ return document.getElementById(id); }

/* Labels voor soort en frequentie (waarden in de gegevens blijven Nederlands) */
function typeLabel(v){ return v==="inkomen"?t("tI"):(v==="sparen"?t("tS"):t("tE")); }
function freqLabel(v){
  return ({dag:t("dy"),week:t("wk"),maand:t("mo"),jaar:t("yr"),eenmalig:t("once")})[v] || v;
}
function periodLabel(v){ return ({week:t("wk"),maand:t("mo"),jaar:t("yr")})[v] || v; }

/* ---------- Berekeningen ---------- */
function monthly(item){
  switch(item.freq){
    case "dag": return item.amount*30;
    case "week": return item.amount*4.33;
    case "maand": return item.amount;
    case "jaar": return item.amount/12;
    default: return 0;
  }
}
function calcItem(item, month){
  if(month < item.startMonth) return 0;
  if(item.freq==="eenmalig") return month===item.startMonth ? item.amount : 0;
  return monthly(item);
}
function eachItem(fn){
  function walk(cat, top){
    cat.items.forEach(i=>fn(i, top));
    cat.children.forEach(c=>walk(c, top));
  }
  data.categories.forEach(c=>walk(c, c));
}
/* Over = inkomsten - uitgaven - sparen */
function sumMonth(month, recurringOnly){
  let inc=0, exp=0, sav=0;
  eachItem(i=>{
    if(recurringOnly && i.freq==="eenmalig") return;
    const v=calcItem(i,month);
    if(i.type==="inkomen") inc+=v;
    else if(i.type==="sparen") sav+=v;
    else exp+=v;
  });
  return {inc, exp, sav, rest: inc-exp-sav};
}
function catTotal(cat, type, valueFn){
  let tt=0;
  cat.items.forEach(i=>{ if(i.type===type) tt+=valueFn(i); });
  cat.children.forEach(c=>{ tt+=catTotal(c,type,valueFn); });
  return tt;
}
function catType(cat){
  const val=i=> i.freq==="eenmalig" ? Math.abs(i.amount) : Math.abs(monthly(i));
  const a=catTotal(cat,"inkomen",val), b=catTotal(cat,"uitgave",val), c=catTotal(cat,"sparen",val);
  if(a===0 && b===0 && c===0) return "leeg";
  if(a>=b && a>=c) return "inkomen";
  if(b>=a && b>=c) return "uitgave";
  return "sparen";
}

/* ---------- Invulvenster ---------- */
function openForm(title, fields, onSave, opts){
  opts = opts || {};
  const overlay=document.createElement("div");
  overlay.className="overlay";
  const box=document.createElement("div");
  box.className="modal";
  const h=document.createElement("h3");
  h.textContent=title;
  box.appendChild(h);
  if(opts.message){
    const p=document.createElement("p");
    p.textContent=opts.message;
    box.appendChild(p);
  }
  const inputs={};
  fields.forEach(f=>{
    const lb=document.createElement("label");
    lb.textContent=f.label;
    let el;
    if(f.type==="select"){
      el=document.createElement("select");
      f.options.forEach(o=>{
        const op=document.createElement("option");
        op.value=o[0]; op.textContent=o[1];
        if(o[0]===f.value) op.selected=true;
        el.appendChild(op);
      });
    } else {
      el=document.createElement("input");
      el.type=f.type||"text";
      if(f.type==="number") el.step="0.01";
      el.value = (f.value===undefined||f.value===null) ? "" : f.value;
    }
    inputs[f.key]=el;
    lb.appendChild(el);
    box.appendChild(lb);
  });
  const err=document.createElement("div");
  err.className="err";
  box.appendChild(err);
  const btns=document.createElement("div");
  btns.className="btns";
  const cancel=document.createElement("button");
  cancel.className="btn-cancel";
  cancel.textContent=t("cancel");
  cancel.onclick=()=>document.body.removeChild(overlay);
  const ok=document.createElement("button");
  ok.textContent=opts.saveText||t("save");
  if(opts.danger) ok.className="btn-del";
  ok.onclick=()=>{
    const values={};
    fields.forEach(f=>{ values[f.key]=inputs[f.key].value; });
    const e=onSave(values);
    if(e){ err.textContent=e; return; }
    document.body.removeChild(overlay);
  };
  btns.appendChild(cancel);
  btns.appendChild(ok);
  box.appendChild(btns);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const first=fields.length?inputs[fields[0].key]:null;
  if(first) first.focus();
}

function itemFields(def, recurringOnly){
  const fr = recurringOnly ? ["dag","week","maand","jaar"] : ["dag","week","maand","jaar","eenmalig"];
  return [
    {key:"label", label:t("name"), type:"text", value:def?def.label:""},
    {key:"amount", label:t("amt"), type:"number", value:def?def.amount:""},
    {key:"type", label:t("kind"), type:"select", options:["inkomen","uitgave","sparen"].map(v=>[v,typeLabel(v)]), value:def?def.type:"uitgave"},
    {key:"freq", label:t("freq"), type:"select", options:fr.map(v=>[v,freqLabel(v)]), value:def?def.freq:"maand"}
  ];
}
function readItem(v){
  const label=v.label.trim();
  if(!label) return {error:t("e1")};
  const amount=parseFloat(String(v.amount).replace(",","."));
  if(isNaN(amount)) return {error:t("e2")};
  return {item:{label, amount, type:v.type, freq:v.freq}};
}

/* ---------- Categorieën & bedragen ---------- */
function addCategory(parent){
  openForm(parent?t("nsub"):t("ncat"),
    [{key:"name", label:t("name"), type:"text"}],
    v=>{
      const name=v.name.trim();
      if(!name) return t("e1");
      const cat={ name, children:[], items:[], collapsed:false };
      (parent ? parent.children : data.categories).push(cat);
      if(parent) parent.collapsed=false;
      refreshAll();
    });
}
function renameCat(cat){
  openForm(t("ren"),
    [{key:"name", label:t("name"), type:"text", value:cat.name}],
    v=>{
      const name=v.name.trim();
      if(!name) return t("e1");
      cat.name=name;
      refreshAll();
    });
}
function deleteCat(list, idx){
  const cat=list[idx];
  if(!cat) return;
  openForm(t("dc"), [],
    ()=>{ list.splice(idx,1); refreshAll(); },
    {message:t("dcm").replace("{n}",cat.name), saveText:t("del"), danger:true});
}
function addItem(cat){
  const recurringOnly = page==="general";
  openForm(t("nit"), itemFields(null, recurringOnly), v=>{
    const r=readItem(v);
    if(r.error) return r.error;
    r.item.startMonth = recurringOnly ? 0 : currentMonth;
    cat.items.push(r.item);
    cat.collapsed=false;
    refreshAll();
  });
}
function editItem(cat, index){
  const item=cat.items[index];
  if(!item) return;
  const recurringOnly = page==="general";
  openForm(t("eit"), itemFields(item, recurringOnly), v=>{
    const r=readItem(v);
    if(r.error) return r.error;
    item.label=r.item.label;
    item.amount=r.item.amount;
    item.type=r.item.type;
    item.freq=r.item.freq;
    refreshAll();
  });
}
function deleteItem(cat, index){
  const item=cat.items[index];
  if(!item) return;
  openForm(t("di"), [],
    ()=>{ cat.items.splice(index,1); refreshAll(); },
    {message:t("dim").replace("{n}",item.label), saveText:t("del"), danger:true});
}

function makeBtn(text, cls, fn, title){
  const b=document.createElement("button");
  b.className=cls;
  if(text==="✏️") b.innerHTML=ICON_EDIT;
  else if(text==="🗑️") b.innerHTML=ICON_DEL;
  else b.textContent=text;
  if(title) b.title=title;
  b.onclick=fn;
  return b;
}

function renderCategory(cat, parent, list, idx, ctx, isSub){
  const block=document.createElement("div");
  block.className="cat-block"+(cat.collapsed?" collapsed":"");

  const bar=document.createElement("div");
  bar.className="cat-bar t-"+catType(cat)+(isSub?" sub":"");

  const tg=makeBtn(cat.collapsed?"▸":"▾","small toggle",()=>{
    cat.collapsed=!cat.collapsed;
    block.classList.toggle("collapsed", cat.collapsed);
    tg.textContent=cat.collapsed?"▸":"▾";
  });
  bar.appendChild(tg);

  const nm=document.createElement("strong");
  nm.textContent=cat.name;
  bar.appendChild(nm);
  bar.appendChild(makeBtn(t("addA"),"small",()=>addItem(cat)));
  bar.appendChild(makeBtn(t("addS"),"small",()=>addCategory(cat),t("nsub")));
  bar.appendChild(makeBtn("✏️","small btn-edit",()=>renameCat(cat),t("ren")));
  bar.appendChild(makeBtn("🗑️","small btn-del",()=>deleteCat(list,idx),t("dc")));
  block.appendChild(bar);

  const body=document.createElement("div");
  body.className="cat-body";
  block.appendChild(body);
  parent.appendChild(block);

  cat.items.forEach((i,index)=>{
    if(!ctx.filter(i)) return;
    const el=document.createElement("div");
    el.className="item";
    const lb=document.createElement("span");
    lb.className="nm";
    lb.textContent=i.label;
    const bd=document.createElement("span");
    bd.className="badge";
    bd.textContent=typeLabel(i.type)+" · "+freqLabel(i.freq);
    const am=document.createElement("span");
    am.className = "am " + (i.type==="inkomen" ? "income" : (i.type==="sparen" ? "saving" : "expense"));
    am.textContent=ctx.amountText(i);
    el.appendChild(lb); el.appendChild(bd); el.appendChild(am);
    el.appendChild(makeBtn("✏️","small btn-edit",()=>editItem(cat,index),t("eit")));
    el.appendChild(makeBtn("🗑️","small btn-del",()=>deleteItem(cat,index),t("di")));
    body.appendChild(el);
  });
  cat.children.forEach((c,ci)=>renderCategory(c, body, cat.children, ci, ctx, true));
}

/* ---------- Grafiek-hulpjes ---------- */
const charts={};
function chartsAvailable(){
  const ok = typeof Chart !== "undefined";
  $("chartWarn").style.display = ok ? "none" : "block";
  if(ok){
    Chart.defaults.animation=false;
    Chart.defaults.color="#cbd5e1";
    Chart.defaults.borderColor="rgba(255,255,255,0.08)";
  }
  return ok;
}
function drawChart(key, canvasId, config){
  if(charts[key]){ charts[key].destroy(); charts[key]=null; }
  if(!chartsAvailable()) return;
  try { charts[key]=new Chart($(canvasId), config); }
  catch(e){ console.error("Grafiek fout:", e); }
}
function drawPie(key, canvasId, emptyId, labels, values, colors){
  const canvas=$(canvasId), empty=$(emptyId);
  const total=values.reduce((a,b)=>a+b,0);
  if(charts[key]){ charts[key].destroy(); charts[key]=null; }
  if(!(total>0)){
    canvas.style.display="none";
    empty.style.display="block";
    return;
  }
  canvas.style.display="block";
  empty.style.display="none";
  drawChart(key, canvasId, {
    type:"pie",
    data:{ labels:labels, datasets:[{ data:values, backgroundColor:colors, borderColor:"#071f4d", borderWidth:2 }] },
    options:{ responsive:true, plugins:{ legend:{ position:"bottom" } } }
  });
}
function pieDataByCategory(type, palette, valueFn){
  const labels=[], values=[], colors=[];
  data.categories.forEach(c=>{
    const tt=catTotal(c,type,valueFn);
    if(tt>0){
      labels.push(c.name);
      values.push(Math.round(tt*100)/100);
      colors.push(palette[colors.length % palette.length]);
    }
  });
  return {labels, values, colors};
}
function expensePieData(valueFn){ return pieDataByCategory("uitgave", PALETTE, valueFn); }
function incomePieData(valueFn){ return pieDataByCategory("inkomen", PALETTE_INC, valueFn); }

/* ================= MAANDPAGINA ================= */
const monthCtx = {
  filter: ()=>true,
  amountText: i=>"€"+fmt(calcItem(i,currentMonth))
};

function renderMonthPage(){
  $("monthName").textContent=monthsFull[currentMonth];
  const r=sumMonth(currentMonth,false);
  $("mInc").textContent=fmt(r.inc);
  $("mExp").textContent=fmt(r.exp);
  $("mSav").textContent=fmt(r.sav);
  const rest=$("mRest");
  rest.textContent=money(r.rest);
  rest.className=r.rest<0?"negative":"positive";

  const root=$("categories");
  root.innerHTML="";
  data.categories.forEach((c,i)=>renderCategory(c, root, data.categories, i, monthCtx, false));

  const rc=sumMonth(currentMonth,true);
  $("recInc").textContent=fmt(rc.inc);
  $("recExp").textContent=fmt(rc.exp);
  $("recSav").textContent=fmt(rc.sav);
  const bal=$("recBal");
  bal.textContent=money(rc.rest);
  bal.className=rc.rest<0?"negative":"positive";

  const inc=[], exp=[], sav=[], rst=[];
  for(let m=0;m<12;m++){
    const s=sumMonth(m,false);
    inc.push(s.inc); exp.push(s.exp); sav.push(s.sav); rst.push(s.rest);
  }
  const ds=[];
  if($("showIncome").checked) ds.push({label:t("inc"), data:inc, backgroundColor:C_INC, borderRadius:6});
  if($("showExpense").checked) ds.push({label:t("exp"), data:exp, backgroundColor:C_EXP, borderRadius:6});
  if($("showSaving").checked) ds.push({label:t("sav"), data:sav, backgroundColor:C_SAV, borderRadius:6});
  if($("showRest").checked) ds.push({label:t("leftS"), data:rst, backgroundColor:C_REST, borderRadius:6});
  drawChart("bar","chart",{ type:"bar", data:{ labels:months, datasets:ds }});

  const p=expensePieData(i=>calcItem(i,currentMonth));
  drawPie("pie","pieChart","pieEmpty",p.labels,p.values,p.colors);

  const q=incomePieData(i=>calcItem(i,currentMonth));
  drawPie("incPie","incPieChart","incPieEmpty",q.labels,q.values,q.colors);
}
["showIncome","showExpense","showSaving","showRest"].forEach(id=>{
  $(id).addEventListener("change", ()=>renderMonthPage());
});

/* ================= ALGEMENE PAGINA ================= */
const periodFactor = { week:12/52, maand:1, jaar:12 };
const genCtx = {
  filter: i=>i.freq!=="eenmalig",
  amountText: i=>"€"+fmt(monthly(i)*periodFactor[$("genPeriod").value])+" / "+periodLabel($("genPeriod").value)
};

function renderGeneralPage(){
  $("ytdTitle").textContent=t("ytd").replace("{m}",monthsFull[NOW]);
  let inc=0, exp=0, sav=0;
  for(let m=0;m<=NOW;m++){
    const s=sumMonth(m,false);
    inc+=s.inc; exp+=s.exp; sav+=s.sav;
  }
  const n=NOW+1;
  $("yInc").textContent=fmt(inc);
  $("yExp").textContent=fmt(exp);
  $("ySav").textContent=fmt(sav);
  const yr=$("yRest");
  yr.textContent=money(inc-exp-sav);
  yr.className=(inc-exp-sav)<0?"negative":"positive";
  $("aInc").textContent=fmt(inc/n);
  $("aExp").textContent=fmt(exp/n);
  $("aSav").textContent=fmt(sav/n);

  const period=$("genPeriod").value;
  const f=periodFactor[period];
  let rInc=0, rExp=0, rSav=0;
  const incMap={};
  eachItem(i=>{
    if(i.freq==="eenmalig") return;
    const v=monthly(i)*f;
    if(i.type==="inkomen"){ rInc+=v; incMap[i.label]=(incMap[i.label]||0)+v; }
    else if(i.type==="sparen") rSav+=v;
    else rExp+=v;
  });
  const rRest=rInc-rExp-rSav;
  $("gInc").textContent=fmt(rInc);
  $("gExp").textContent=fmt(rExp);
  $("gSav").textContent=fmt(rSav);
  const gb=$("gBal");
  gb.textContent=money(rRest)+" / "+periodLabel(period);
  gb.className=rRest<0?"negative":"positive";

  const root=$("genCategories");
  root.innerHTML="";
  data.categories.forEach((c,i)=>renderCategory(c, root, data.categories, i, genCtx, false));

  drawChart("genBar","genBar",{
    type:"bar",
    data:{
      labels:[t("inc"),t("exp"),t("sav"),t("leftS")],
      datasets:[{
        label:"€ / "+periodLabel(period),
        data:[rInc, rExp, rSav, rRest],
        backgroundColor:[C_INC, C_EXP, C_SAV, rRest<0?"#f59e0b":C_REST],
        borderRadius:8
      }]
    },
    options:{ plugins:{ legend:{ display:false } } }
  });

  drawPie("pSaldo","genPieSaldo","genPieSaldoEmpty",
    [t("exp"),t("sav"),t("leftS")],
    [Math.round(rExp*100)/100, Math.round(rSav*100)/100, Math.round(Math.max(rRest,0)*100)/100],
    [C_EXP, C_SAV, C_REST]);

  const il=[], iv=[], ic=[];
  Object.keys(incMap).forEach(k=>{
    il.push(k); iv.push(Math.round(incMap[k]*100)/100); ic.push(PALETTE_INC[ic.length % PALETTE_INC.length]);
  });
  drawPie("pInc","genPieInc","genPieIncEmpty",il,iv,ic);

  const q=incomePieData(i=> i.freq==="eenmalig" ? 0 : monthly(i)*f);
  drawPie("pIncCat","genPieIncCat","genPieIncCatEmpty",q.labels,q.values,q.colors);

  const p=expensePieData(i=> i.freq==="eenmalig" ? 0 : monthly(i)*f);
  drawPie("pExp","genPieExp","genPieExpEmpty",p.labels,p.values,p.colors);
}
$("genPeriod").addEventListener("change", ()=>renderGeneralPage());

/* ================= PANELEN INKLAPBAAR ================= */
document.querySelectorAll(".panel").forEach(p=>{
  const h=p.querySelector("h3");
  if(!h) return;
  h.classList.add("panel-head");
  h.onclick=()=>{
    p.classList.toggle("collapsed");
    if(!p.classList.contains("collapsed")){
      setTimeout(()=>{ Object.values(charts).forEach(c=>{ if(c) c.resize(); }); }, 30);
    }
  };
});

/* ================= MENU'S ================= */
function openMenu(){ closeAll(); $("sidebar").classList.add("open"); $("backdrop").classList.add("open"); }
function openSettings(){ closeAll(); $("settingsBar").classList.add("open"); $("backdrop").classList.add("open"); }
function closeAll(){
  $("sidebar").classList.remove("open");
  $("settingsBar").classList.remove("open");
  $("backdrop").classList.remove("open");
}
$("menuBtn").onclick=openMenu;
$("gearBtn").onclick=openSettings;
$("closeMenu").onclick=closeAll;
$("closeSettings").onclick=closeAll;
$("backdrop").onclick=closeAll;
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeAll(); });

let menuGroupOpen=false;
function renderNav(){
  const box=$("sideContent");
  box.innerHTML="";

  /* Knop 1: Overzichten (bundelt algemeen overzicht en alle maanden) */
  const grp=document.createElement("div");
  grp.className="menu-group"+(menuGroupOpen?" open":"");
  const gb=document.createElement("button");
  gb.className="side-item group"+((page==="month"||page==="general")?" group-active":"");
  gb.innerHTML=ICON_CAL+'<span class="gl"></span><span class="chev">▾</span>';
  gb.querySelector(".gl").textContent=t("grp");
  gb.onclick=()=>{ menuGroupOpen=!menuGroupOpen; grp.classList.toggle("open",menuGroupOpen); };
  grp.appendChild(gb);

  const sub=document.createElement("div");
  sub.className="submenu";
  const g=document.createElement("button");
  g.className="side-item"+(page==="general"?" active":"");
  g.innerHTML=ICON_CHART+"<span></span>"; g.lastChild.textContent=t("genOv");
  g.onclick=()=>{ page="general"; closeAll(); refreshAll(); };
  sub.appendChild(g);
  monthsFull.forEach((m,i)=>{
    const b=document.createElement("button");
    b.className="side-item"+(page==="month" && i===currentMonth?" active":"");
    b.innerHTML=ICON_CAL+"<span></span>"; b.lastChild.textContent=m;
    b.onclick=()=>{ page="month"; currentMonth=i; closeAll(); refreshAll(); };
    sub.appendChild(b);
  });
  grp.appendChild(sub);
  box.appendChild(grp);

  /* Knop 2: Budgetten */
  const bb=document.createElement("button");
  bb.className="side-item"+(page==="budget"?" active":"");
  bb.innerHTML=ICON_BUD+"<span></span>"; bb.lastChild.textContent=t("bud");
  bb.onclick=()=>{ page="budget"; closeAll(); refreshAll(); };
  box.appendChild(bb);

  $("pageLabel").textContent = page==="general" ? t("genOv") : (page==="budget" ? t("bud") : monthsFull[currentMonth]);
}

function renderLangList(){
  const box=$("langList");
  box.innerHTML="";
  LANGS.forEach(L=>{
    const b=document.createElement("button");
    b.className="side-item"+(L.c===lang?" active":"");
    b.textContent=L.f+"  "+L.n;
    b.onclick=()=>{ setLang(L.c); };
    box.appendChild(b);
  });
}

function setLang(c){
  lang=c;
  try { localStorage.setItem("bt_lang", c); } catch(e){}
  applyLang();
  closeAll();
}

function applyLang(){
  const L=LANGS.find(x=>x.c===lang) || LANGS[0];
  document.documentElement.lang=lang;
  document.documentElement.dir=L.rtl?"rtl":"ltr";
  months=[]; monthsFull=[];
  for(let i=0;i<12;i++){ months.push(monthName(i,"short")); monthsFull.push(monthName(i,"long")); }
  document.querySelectorAll("[data-i]").forEach(e=>{ e.textContent=t(e.dataset.i); });
  $("chartWarn").textContent=t("cw");
  const opts=$("genPeriod").options;
  opts[0].textContent=t("wk"); opts[1].textContent=t("mo"); opts[2].textContent=t("yr");
  renderLangList();
  refreshAll();
}

/* ================= BUDGETTEN ================= */
let budMode = String(NOW);   // maandnummer of "ytd" (dit jaar tot nu)

function budMult(){ return budMode==="ytd" ? NOW+1 : 1; }
function catSpent(cat){
  if(budMode==="ytd"){
    let sum=0;
    for(let m=0;m<=NOW;m++) sum+=catTotal(cat,"uitgave",i=>calcItem(i,m));
    return sum;
  }
  const m=+budMode;
  return catTotal(cat,"uitgave",i=>calcItem(i,m));
}

function budgetFields(cat, requireAmount){
  return [
    {key:"name", label:t("name"), type:"text", value:cat?cat.name:""},
    {key:"budget", label:t("bAmt"), type:"number", value:(cat && cat.budget!==undefined)?cat.budget:""}
  ];
}
function addBudget(){
  openForm(t("bNewT"), budgetFields(null), v=>{
    const name=v.name.trim();
    if(!name) return t("e1");
    const amount=parseFloat(String(v.budget).replace(",","."));
    if(isNaN(amount) || amount<0) return t("e2");
    data.categories.push({ name, children:[], items:[], collapsed:false, budget:amount });
    refreshAll();
  });
}
function editBudget(cat){
  openForm(t("bEditT"), budgetFields(cat), v=>{
    const name=v.name.trim();
    if(!name) return t("e1");
    const raw=String(v.budget).trim();
    if(raw===""){ delete cat.budget; }
    else {
      const amount=parseFloat(raw.replace(",","."));
      if(isNaN(amount) || amount<0) return t("e2");
      cat.budget=amount;
    }
    cat.name=name;
    refreshAll();
  });
}

function budRow(cat, idx, spent, budget){
  const hasB = budget>0;
  const over = hasB && spent>budget+0.005;
  const block=document.createElement("div");
  block.className="cat-block";

  const bar=document.createElement("div");
  bar.className="cat-bar t-"+(!hasB ? "leeg" : (over ? "uitgave" : "inkomen"));
  const nm=document.createElement("strong");
  nm.textContent=cat.name;
  bar.appendChild(nm);
  bar.appendChild(makeBtn("✏️","small btn-edit",()=>editBudget(cat),t("bEditT")));
  bar.appendChild(makeBtn("🗑️","small btn-del",()=>deleteCat(data.categories,idx),t("dc")));
  block.appendChild(bar);

  const body=document.createElement("div");
  body.className="cat-body";
  const it=document.createElement("div");
  it.className="item";
  const lb=document.createElement("span");
  lb.className="nm";
  if(hasB) lb.textContent=t("spent")+": "+money(spent)+" "+t("bOf")+" "+money(budget);
  else lb.textContent=t("spent")+": "+money(spent);
  it.appendChild(lb);

  if(hasB){
    const st=document.createElement("span");
    st.className="am "+(over?"expense":"income");
    st.textContent = over ? t("bOverBy").replace("{x}",fmt(spent-budget)) : t("bLeftBy").replace("{x}",fmt(budget-spent));
    it.appendChild(st);
    body.appendChild(it);
    const pbar=document.createElement("div");
    pbar.className="pbar";
    const fill=document.createElement("div");
    const pct=Math.min(100, spent/budget*100);
    fill.className="pfill "+(spent>budget+0.005?"bad":(pct>=80?"warn":"ok"));
    fill.style.width=pct+"%";
    pbar.appendChild(fill);
    body.appendChild(pbar);
  } else {
    const st=document.createElement("span");
    st.className="badge";
    st.textContent=t("bNone");
    it.appendChild(st);
    const sb=makeBtn(t("bSet"),"small",()=>editBudget(cat));
    it.appendChild(sb);
    body.appendChild(it);
  }
  block.appendChild(body);
  return block;
}

function renderBudgetPage(){
  /* Periodekeuze */
  const sel=$("budPeriod");
  sel.innerHTML="";
  monthsFull.forEach((m,i)=>{
    const o=document.createElement("option"); o.value=String(i); o.textContent=m; sel.appendChild(o);
  });
  const oy=document.createElement("option"); oy.value="ytd"; oy.textContent=t("bYtd"); sel.appendChild(oy);
  sel.value=budMode;
  const label = budMode==="ytd" ? t("bYtd") : monthsFull[+budMode];
  $("budTitle").textContent=t("bTitleP").replace("{p}",label);

  const mult=budMult();
  const withB=[], noB=[];
  data.categories.forEach((c,idx)=>{
    const spent=catSpent(c);
    const budget=(c.budget||0)*mult;
    (budget>0 ? withB : noB).push({c, idx, spent, budget});
  });

  /* Balans (zonder sparen) */
  let tb=0, ts=0, over=0;
  const pl=[], pv=[], pc=[];
  withB.forEach(r=>{
    tb+=r.budget; ts+=r.spent;
    if(r.spent>r.budget+0.005){
      const d=r.spent-r.budget;
      over+=d;
      pl.push(r.c.name); pv.push(Math.round(d*100)/100); pc.push(PALETTE[pc.length % PALETTE.length]);
    }
  });
  $("bdBudget").textContent=fmt(tb);
  $("bdSpent").textContent=fmt(ts);
  const bal=$("bdBal");
  bal.textContent=money(tb-ts);
  bal.className=(tb-ts)<0?"negative":"positive";
  const ov=$("bdOver");
  ov.textContent=money(over);
  ov.className=over>0?"negative":"positive";

  /* Cirkeldiagram: welke categorie veroorzaakt de overschrijding */
  drawPie("bpie","budPie","budPieEmpty",pl,pv,pc);

  /* Lijst */
  const root=$("budList");
  root.innerHTML="";
  if(!data.categories.length){
    const p=document.createElement("p");
    p.className="hint"; p.style.marginTop="12px";
    p.textContent=t("bNoCats");
    root.appendChild(p);
    return;
  }
  withB.forEach(r=>root.appendChild(budRow(r.c,r.idx,r.spent,r.budget)));
  if(noB.length){
    const l=document.createElement("div");
    l.className="side-label"; l.style.marginTop="16px";
    l.textContent=t("bNoB");
    root.appendChild(l);
    noB.forEach(r=>root.appendChild(budRow(r.c,r.idx,r.spent,0)));
  }
}
$("budPeriod").addEventListener("change", e=>{ budMode=e.target.value; renderBudgetPage(); });

function refreshAll(){
  renderNav();
  $("pageMonth").style.display = page==="month" ? "block" : "none";
  $("pageGeneral").style.display = page==="general" ? "block" : "none";
  $("pageBudget").style.display = page==="budget" ? "block" : "none";
  try {
    if(page==="month") renderMonthPage();
    else if(page==="general") renderGeneralPage();
    else renderBudgetPage();
  } catch(e){ console.error(e); }
}

applyLang();
