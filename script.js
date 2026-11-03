/* ---------- Strakke iconen (pen en prullenbak) ---------- */
const ICON_EDIT='<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const ICON_CAL='<svg viewBox="0 0 24 24" class="ico"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 10h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/></svg>';
const ICON_CHART='<svg viewBox="0 0 24 24" class="ico"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>';
const ICON_BUD='<svg viewBox="0 0 24 24" class="ico"><rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><path d="M7 6V4.5h10V6"/><circle cx="16.5" cy="15" r="1"/></svg>';
const ICON_BOT='<svg viewBox="0 0 24 24" class="ico"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z"/><path d="M9 11h.01"/><path d="M15 11h.01"/><path d="M9.5 14.5c1.5 1.2 3.5 1.2 5 0"/></svg>';
const ICON_DEL='<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

function monthName(i, style){
  let s;
  try { s = new Date(2024,i,1).toLocaleDateString(lang,{month:style}); }
  catch(e){ s = new Date(2024,i,1).toLocaleDateString("en",{month:style}); }
  return s.charAt(0).toLocaleUpperCase(lang)+s.slice(1);
}
let months=[], monthsFull=[];

/* ================= GEGEVENS ================= */
const data = { categories: [], prefs: { fixed: {}, keep: {} } };
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

  /* Knop 3: Ask Buddy */
  const by=document.createElement("button");
  by.className="side-item"+(page==="buddy"?" active":"");
  by.innerHTML=ICON_BOT+"<span></span>"; by.lastChild.textContent="Ask Buddy";
  by.onclick=()=>{ page="buddy"; closeAll(); refreshAll(); };
  box.appendChild(by);

  $("pageLabel").textContent = page==="general" ? t("genOv") : (page==="budget" ? t("bud") : (page==="buddy" ? "Ask Buddy" : monthsFull[currentMonth]));
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

/* ================= ASK BUDDY ================= */
/* Buddy rekent met jouw eigen cijfers en leert van wat je zegt.
   Wat Buddy leert wordt bewaard in data.prefs (vaste kosten en "niet besparen op"). */
function T(nl,en){ return lang==="nl" ? nl : en; }
function prefs(){
  data.prefs = data.prefs || {};
  data.prefs.fixed = data.prefs.fixed || {};
  data.prefs.keep = data.prefs.keep || {};
  return data.prefs;
}
function bkey(s){ return String(s||"").trim().toLowerCase(); }

const FIXED_WORDS=["huur","hypotheek","lening","afbetaling","krediet","verzekering","belasting","kinderopvang","school","alimentatie","rent","mortgage","loan","insurance","tax","credit","lease","leasing"];
function autoFixed(label,cat){
  const s=bkey(label)+" "+bkey(cat);
  return FIXED_WORDS.some(w=>s.indexOf(w)>-1);
}
const TIPS=[
  {w:["deliveroo","uber eats","ubereats","thuisbezorgd","takeaway.com","just eat","bezorg","delivery","maaltijdbox","hellofresh"], pct:0.50,
   nl:"Kook zelf: zoek makkelijke recepten op YouTube of doe aan mealprepping (in één keer voor meerdere dagen koken). Een grote pot pasta met groenten of kip met rijst geeft al 4 maaltijden.",
   en:"Cook at home: find easy recipes on YouTube or try meal prepping (cook several portions at once). One big pot of pasta with vegetables or chicken with rice already gives 4 meals."},
  {w:["abonnement","netflix","spotify","disney","streaming","youtube","subscription"], pct:0.30,
   nl:"Check welke abonnementen je echt gebruikt en zeg de rest op.", en:"Check which subscriptions you really use and cancel the rest."},
  {w:["restaurant","takeaway","uit eten","horeca","café","cafe","snack","koffie","lunch","fastfood","bar ","dining","coffee"], pct:0.25,
   nl:"Kook vaker thuis en neem je lunch mee.", en:"Cook at home more often and bring your own lunch."},
  {w:["kleding","kledij","shoppen","clothes","clothing","shopping"], pct:0.25,
   nl:"Wacht met kopen en kijk eerst naar tweedehands of sales.", en:"Wait before buying and check second-hand or sales first."},
  {w:["hobby","gaming","game","uitgaan","entertainment","cinema","bioscoop","vakantie","holiday"], pct:0.20,
   nl:"Stel een vast maandbedrag in voor vrije tijd en hou je eraan.", en:"Set a fixed monthly amount for leisure and stick to it."},
  {w:["sport","fitness","gym"], pct:0.15,
   nl:"Vergelijk abonnementen of kies een goedkopere optie.", en:"Compare memberships or pick a cheaper option."},
  {w:["gsm","telefoon","internet","mobile","phone"], pct:0.15,
   nl:"Vergelijk tarieven; vaak kan je goedkoper bij dezelfde dienst.", en:"Compare rates; you can often pay less for the same service."},
  {w:["energie","gas","elektriciteit","stroom","water","energy","electric"], pct:0.10,
   nl:"Vergelijk leveranciers en let op je verbruik.", en:"Compare suppliers and watch your usage."},
  {w:["boodschappen","supermarkt","groceries","food","eten"], pct:0.10,
   nl:"Plan je maaltijden, maak een lijstje en gebruik aanbiedingen.", en:"Plan meals, use a shopping list and look for deals."},
  {w:["transport","brandstof","benzine","diesel","auto","fuel","car","trein","bus"], pct:0.10,
   nl:"Combineer ritten of kies vaker fiets of openbaar vervoer.", en:"Combine trips or use bike or public transport more often."}
];
function tipFor(e){
  const s=" "+bkey(e.label)+" "+bkey(e.cat)+" ";
  for(const x of TIPS){ if(x.w.some(w=>s.indexOf(w)>-1)) return x; }
  return {pct:0.10, nl:"Kijk of je hier met een kleine aanpassing minder kan uitgeven.", en:"See if a small change could cut this cost."};
}

function buddyExpenses(month){
  const out=[];
  data.categories.forEach(top=>{
    (function walk(cat){
      cat.items.forEach(i=>{
        if(i.type!=="uitgave") return;
        const amt=calcItem(i,month);
        if(amt>0) out.push({label:i.label, cat:top.name, amt});
      });
      cat.children.forEach(walk);
    })(top);
  });
  const m={};
  out.forEach(e=>{
    const k=bkey(e.label);
    if(!m[k]) m[k]={label:e.label, cat:e.cat, amt:0};
    m[k].amt+=e.amt;
  });
  return Object.values(m);
}
function isFixed(e){
  const p=prefs(), k=bkey(e.label), kc=bkey(e.cat);
  if(p.fixed[k]!==undefined) return p.fixed[k];
  if(p.fixed[kc]!==undefined) return p.fixed[kc];
  return autoFixed(e.label,e.cat);
}
function isKept(e){
  const p=prefs();
  return !!p.keep[bkey(e.label)] || !!p.keep[bkey(e.cat)];
}

/* ----- Wat Buddy leert ----- */
function learnFixed(label){
  const p=prefs(), k=bkey(label);
  p.fixed[k]=true; delete p.keep[k];
  buddyPush("buddy", T("Genoteerd: “"+label+"” is een vaste kost. Daar laat ik je voortaan met rust.",
                       "Noted: “"+label+"” is a fixed cost. I will leave it out of my tips from now on."),
    [{label:T("Toon nieuwe tips","Show new tips"), fn:()=>buddyRun("save")}]);
  refreshAll();
}
function learnKeep(label){
  const p=prefs(), k=bkey(label);
  p.keep[k]=true;
  buddyPush("buddy", T("Oké, op “"+label+"” stel ik geen besparing meer voor.",
                       "Okay, I will not suggest cutting “"+label+"” anymore."),
    [{label:T("Toon nieuwe tips","Show new tips"), fn:()=>buddyRun("save")}]);
  refreshAll();
}
function forgetPref(k){
  const p=prefs();
  delete p.fixed[k]; delete p.keep[k];
  buddyPush("buddy", T("Vergeten: “"+k+"”.","Forgotten: “"+k+"”."));
  refreshAll();
}

/* ----- Antwoorden ----- */
function overBudgetList(){
  const res=[];
  data.categories.forEach(c=>{
    if(!(c.budget>0)) return;
    const spent=catTotal(c,"uitgave",i=>calcItem(i,NOW));
    if(spent>c.budget+0.005) res.push({name:c.name, over:spent-c.budget, spent, budget:c.budget});
  });
  return res.sort((a,b)=>b.over-a.over);
}

function rSave(){
  const mname=monthsFull[NOW];
  const ex=buddyExpenses(NOW);
  if(!ex.length) return [{text:T("Ik zie nog geen uitgaven in "+mname+". Voeg eerst bedragen toe, dan kan ik meekijken.",
                                  "I don't see any expenses in "+mname+" yet. Add some amounts first and I can take a look.")}];
  const fixed=ex.filter(isFixed);
  const kept=ex.filter(e=>!isFixed(e) && isKept(e));
  const cand=ex.filter(e=>!isFixed(e) && !isKept(e)).sort((a,b)=>b.amt-a.amt);
  const replies=[];

  const over=overBudgetList();
  if(over.length){
    replies.push({text:T("Eerst dit: je zit boven budget bij\n","First things first: you are over budget on\n")
      + over.map(o=>"• "+o.name+": "+money(o.over)+T(" boven budget"," over budget")).join("\n")});
  }
  if(!cand.length){
    replies.push({text:T("Buiten je vaste kosten en de dingen waar je niet op wilt besparen zie ik geen uitgaven meer om op te besparen. Sterk bezig!",
                         "Apart from your fixed costs and the things you want to keep, I see nothing left to cut. Well done!")});
  } else {
    const top=cand.slice(0,5);
    let total=0;
    const lines=top.map(e=>{
      const tp=tipFor(e), sv=e.amt*tp.pct;
      total+=sv;
      return "• "+e.label+" ("+e.cat+"): "+money(e.amt)+" → "+Math.round(tp.pct*100)+"% = "+money(sv)+T("/maand","/month")+"\n   "+T(tp.nl,tp.en);
    });
    replies.push({text:T("Dit zijn de plekken waar je in "+mname+" het makkelijkst kunt besparen:\n\n","These are the easiest places to save in "+mname+":\n\n")
      + lines.join("\n\n")
      + "\n\n"+T("Samen is dat ongeveer "+money(total)+" per maand ("+money(total*12)+" per jaar).",
                 "Together that is about "+money(total)+" per month ("+money(total*12)+" per year).")});
    const acts=[];
    top.slice(0,3).forEach(e=>{
      acts.push({label:T("Niet besparen op "+e.label,"Don't cut "+e.label), fn:()=>learnKeep(e.label)});
      acts.push({label:T(e.label+" is vast",e.label+" is fixed"), fn:()=>learnFixed(e.label)});
    });
    if(buddyAIReady()){
      acts.push({label:T("🔎 Meer tips van het internet","🔎 More tips from the internet"),
                 fn:()=>buddyAskAI(T("Waarop kan ik het best besparen? Ga mijn uitgaven één voor één na, leg uit wat ze zijn en geef per uitgave een concreet alternatief (bij eten laten bezorgen bv. een makkelijk recept of mealprepplan).","Where can I best save? Go through my expenses one by one, explain what they are and give a concrete alternative for each (for food delivery e.g. an easy recipe or a meal prep plan)."))});
    }
    replies.push({text:T("Past dit bij jou? Zeg me waar je niet op wilt besparen, dan leer ik dat.",
                         "Does this fit you? Tell me what you don't want to cut and I will learn it."), actions:acts});
  }
  if(fixed.length){
    replies.push({text:T("Ik heb deze vaste kosten buiten beschouwing gelaten, want daar kan je moeilijk op besparen: ",
                         "I left these fixed costs out because they are hard to cut: ")+fixed.map(e=>e.label).join(", ")+"."});
  }
  if(kept.length){
    replies.push({text:T("En dit wil je zelf houden: ","And you want to keep these: ")+kept.map(e=>e.label).join(", ")+"."});
  }
  return replies;
}

function rTop(){
  const mname=monthsFull[NOW];
  const ex=buddyExpenses(NOW).sort((a,b)=>b.amt-a.amt);
  if(!ex.length) return [{text:T("Ik zie nog geen uitgaven in "+mname+".","I don't see any expenses in "+mname+" yet.")}];
  const total=ex.reduce((s,e)=>s+e.amt,0);
  const lines=ex.slice(0,5).map((e,i)=>(i+1)+". "+e.label+" ("+e.cat+"): "+money(e.amt)+" ("+Math.round(e.amt/total*100)+"%)"+(isFixed(e)?T(" – vaste kost"," – fixed cost"):""));
  return [{text:T("Je grootste uitgaven in "+mname+":\n","Your biggest expenses in "+mname+":\n")+lines.join("\n")+"\n\n"+T("Totaal uitgaven: ","Total expenses: ")+money(total)}];
}

function rBudget(){
  const has=data.categories.some(c=>c.budget>0);
  if(!has) return [{text:T("Je hebt nog geen budgetten ingesteld. Op de pagina Budgetten kan je per categorie een maandbudget kiezen.",
                           "You haven't set any budgets yet. On the Budgets page you can set a monthly budget per category."),
                    actions:[{label:T("Naar Budgetten","Go to Budgets"), fn:()=>{ page="budget"; refreshAll(); }}]}];
  const over=overBudgetList();
  const mname=monthsFull[NOW];
  if(!over.length) return [{text:T("Goed nieuws: in "+mname+" zit geen enkele categorie boven het budget.","Good news: in "+mname+" no category is over budget.")}];
  const total=over.reduce((s,o)=>s+o.over,0);
  return [{text:T("In "+mname+" zit je boven budget bij:\n","In "+mname+" you are over budget on:\n")
    + over.map(o=>"• "+o.name+": "+money(o.spent)+T(" van "," of ")+money(o.budget)+" ("+money(o.over)+T(" te veel"," too much")+")").join("\n")
    + "\n\n"+T("Totaal boven budget: ","Total over budget: ")+money(total),
    actions:[{label:T("Toon besparingstips","Show saving tips"), fn:()=>buddyRun("save")}]}];
}

function rBal(){
  const r=sumMonth(NOW,false);
  const mname=monthsFull[NOW];
  let txt=T("In "+mname+": inkomsten "+money(r.inc)+", uitgaven "+money(r.exp)+", gespaard "+money(r.sav)+".\nOver: "+money(r.rest)+".",
            "In "+mname+": income "+money(r.inc)+", expenses "+money(r.exp)+", saved "+money(r.sav)+".\nLeft: "+money(r.rest)+".");
  if(r.inc>0){
    if(r.rest>0) txt+="\n"+T("Je zou dit bedrag kunnen sparen.","You could save this amount.");
    else if(r.rest<0) txt+="\n"+T("Je geeft meer uit dan je binnenkrijgt. Zullen we kijken waar je kunt besparen?","You spend more than you earn. Shall we look at where you can save?");
  }
  return [{text:txt}];
}

function rMem(){
  const p=prefs();
  const fx=Object.keys(p.fixed).filter(k=>p.fixed[k]);
  const nf=Object.keys(p.fixed).filter(k=>!p.fixed[k]);
  const kp=Object.keys(p.keep).filter(k=>p.keep[k]);
  const auto=buddyExpenses(NOW).filter(e=>p.fixed[bkey(e.label)]===undefined && p.fixed[bkey(e.cat)]===undefined && autoFixed(e.label,e.cat)).map(e=>e.label);
  let txt=T("Dit heb ik van jou geleerd:\n","Here is what I have learned from you:\n");
  if(!fx.length && !nf.length && !kp.length) txt+=T("• Nog niets. Zeg bijvoorbeeld “huur is vast” of “ik wil niet besparen op sport”.","• Nothing yet. Say for example “rent is fixed” or “I don't want to save on sports”.");
  if(fx.length) txt+="• "+T("Vaste kosten (jij zei): ","Fixed costs (you said): ")+fx.join(", ")+"\n";
  if(nf.length) txt+="• "+T("Geen vaste kost (jij zei): ","Not fixed (you said): ")+nf.join(", ")+"\n";
  if(kp.length) txt+="• "+T("Hier wil je niet op besparen: ","You don't want to cut: ")+kp.join(", ")+"\n";
  if(auto.length) txt+="\n"+T("Zelf herkend als vaste kost: ","Recognised as fixed by me: ")+auto.join(", ")+".";
  const keys=[...new Set([...fx,...nf,...kp])].slice(0,8);
  return [{text:txt.trim(), actions:keys.map(k=>({label:T("Vergeet: ","Forget: ")+k, fn:()=>forgetPref(k)}))}];
}

function rLookup(text){
  const names=new Set();
  data.categories.forEach(top=>{ names.add(top.name); (function walk(c){ if(c!==top) names.add(c.name); c.items.forEach(i=>names.add(i.label)); c.children.forEach(walk); })(top); });
  const found=[...names].filter(n=>n && n.trim().length>=3 && text.indexOf(bkey(n))>-1).sort((a,b)=>b.length-a.length)[0];
  if(!found) return null;
  const k=bkey(found);
  const ex=buddyExpenses(NOW);
  const hit=ex.find(e=>bkey(e.label)===k);
  let amt=hit?hit.amt:ex.filter(e=>bkey(e.cat)===k).reduce((s,e)=>s+e.amt,0);
  const probe=hit||{label:found,cat:found};
  const status=isFixed(probe)?T("een vaste kost","a fixed cost"):(isKept(probe)?T("iets waar je niet op wilt besparen","something you want to keep"):T("een uitgave waar je op kunt letten","an expense you can look at"));
  return [{text:T("“"+found+"”: "+money(amt)+" in "+monthsFull[NOW]+". Voor mij is dit "+status+".",
                  "“"+found+"”: "+money(amt)+" in "+monthsFull[NOW]+". To me this is "+status+"."),
    actions:[
      {label:T("Niet besparen op "+found,"Don't cut "+found), fn:()=>learnKeep(found)},
      {label:T(found+" is vast",found+" is fixed"), fn:()=>learnFixed(found)}
    ]}];
}

/* Typ je zelf “huur is vast” of “niet besparen op sport”? Dan leert Buddy dat meteen. */
function tryLearn(raw){
  const text=bkey(raw).replace(/[.!?]+$/,"");
  let m=text.match(/(?:niet|nooit|geen)\s+(?:wil\s+)?(?:ik\s+)?(?:be)?sparen\s+op\s+(.+)$/) ||
        text.match(/(?:don'?t|do not|never)\s+(?:want\s+to\s+)?(?:save|cut)\s+(?:on|back on)\s+(.+)$/) ||
        text.match(/(?:niet|nooit)\s+(?:be)?sparen\s+op\s+(.+)$/);
  if(m){ return {kind:"keep", target:m[1].trim()}; }
  m=text.match(/^(.+?)\s+(?:is|zijn|are)\s+(?:een\s+|a\s+)?(?:vast|vaste kost|vaste kosten|fixed|fixed cost)$/);
  if(m){ return {kind:"fixed", target:m[1].trim()}; }
  return null;
}
function resolveName(target){
  const names=new Set();
  data.categories.forEach(top=>{ names.add(top.name); (function walk(c){ c.items.forEach(i=>names.add(i.label)); c.children.forEach(w=>{ names.add(w.name); walk(w); }); })(top); });
  const k=bkey(target);
  const hit=[...names].find(n=>bkey(n)===k) || [...names].find(n=>bkey(n).indexOf(k)>-1 || k.indexOf(bkey(n))>-1);
  return hit || target;
}

function buddyIntent(text){
  const s=bkey(text);
  if(/(weet|geleerd|onthou|onthouden|vergeet|know about me|remember|learned|forget)/.test(s)) return "mem";
  if(/(budget|boven mijn|over budget|overschrij)/.test(s)) return "budget";
  if(/(grootste|meeste|duurste|top uitgaven|biggest|largest|most expensive|top expenses)/.test(s)) return "top";
  if(/(bespa|bezuinig|minder uitgeven|tips|besparen|save|saving|cut|reduce|cheaper|economi)/.test(s)) return "save";
  if(/(houd ik over|hoeveel over|overschot|saldo|balans|over heb|balance|how much (do i )?have left|left over|surplus)/.test(s)) return "bal";
  if(/^(hoi|hallo|hey|hi|hello|goedendag|dag)\b/.test(s)) return "hi";
  return null;
}

function buddyRun(intent){
  let replies;
  if(intent==="save") replies=rSave();
  else if(intent==="top") replies=rTop();
  else if(intent==="budget") replies=rBudget();
  else if(intent==="bal") replies=rBal();
  else if(intent==="mem") replies=rMem();
  else replies=[{text:T("Hoi! Waar kan ik je mee helpen?","Hi! What can I help you with?")}];
  replies.forEach(r=>buddyPush("buddy", r.text, r.actions));
  renderBuddyPage();
}

function buddyAIReady(){ return typeof window.buddyAI === "function"; }
let buddyBusy=false;

function buddyContext(){
  const p=prefs();
  const r=sumMonth(NOW,false);
  const ex=buddyExpenses(NOW).map(e=>({label:e.label, category:e.cat, amount:Math.round(e.amt*100)/100, fixed:isFixed(e), keep:isKept(e)}));
  const budgets=data.categories.filter(c=>c.budget>0).map(c=>({category:c.name, budget:c.budget, spent:Math.round(catTotal(c,"uitgave",i=>calcItem(i,NOW))*100)/100}));
  return {
    month:monthsFull[NOW], currency:"EUR",
    income:Math.round(r.inc*100)/100, expenses_total:Math.round(r.exp*100)/100, saved:Math.round(r.sav*100)/100, left:Math.round(r.rest*100)/100,
    expenses:ex, budgets:budgets,
    prefs:{ fixed:Object.keys(p.fixed).filter(k=>p.fixed[k]), keep:Object.keys(p.keep).filter(k=>p.keep[k]) }
  };
}

function buddyAskAI(question){
  if(buddyBusy) return;
  buddyBusy=true;
  const history=buddyMsgs.filter(m=>!m.pending).slice(-11).map(m=>({from:m.from, text:m.text}));
  const pend={from:"buddy", text:T("Buddy zoekt het voor je uit… (dit kan even duren)","Buddy is looking into it… (this can take a moment)"), actions:null, pending:true};
  buddyMsgs.push(pend);
  renderBuddyPage();
  const done=()=>{ buddyBusy=false; const ix=buddyMsgs.indexOf(pend); if(ix>-1) buddyMsgs.splice(ix,1); };
  window.buddyAI({question:question, lang:lang, history:history, context:buddyContext()}).then(r=>{
    done();
    buddyPush("buddy", r.answer || T("Ik kreeg geen antwoord. Probeer het nog eens.","I didn't get an answer. Please try again."));
    const p=prefs(), learned=[];
    (r.fixed||[]).forEach(n=>{ const k=bkey(resolveName(String(n))); if(k){ p.fixed[k]=true; delete p.keep[k]; learned.push(k); } });
    (r.keep||[]).forEach(n=>{ const k=bkey(resolveName(String(n))); if(k){ p.keep[k]=true; learned.push(k); } });
    if(learned.length) buddyPush("buddy", T("Ik heb onthouden: ","I have remembered: ")+learned.join(", ")+".");
    refreshAll();
  }).catch(e=>{
    console.error(e);
    done();
    buddyPush("buddy", T("Sorry, Buddy kon het antwoord niet ophalen. Probeer het later opnieuw.","Sorry, Buddy could not fetch the answer. Please try again later."));
    renderBuddyPage();
  });
}

function buddyHandleText(raw){
  const text=String(raw||"").trim();
  if(!text || buddyBusy) return;
  buddyPush("user", text);
  /* Zegt de gebruiker “huur is vast” of “niet besparen op sport”? Dat leert Buddy meteen zelf. */
  const learn=tryLearn(text);
  if(learn){
    const name=resolveName(learn.target);
    if(learn.kind==="keep") learnKeep(name); else learnFixed(name);
    return;
  }
  /* Met AI beantwoordt Buddy alles: je cijfers, tips van het internet en gewone vragen */
  if(buddyAIReady()){ buddyAskAI(text); return; }
  /* Zonder AI: Buddy's eigen regelwerk */
  const intent=buddyIntent(text);
  if(intent){ buddyRun(intent); return; }
  const lk=rLookup(bkey(text));
  if(lk){ lk.forEach(r=>buddyPush("buddy", r.text, r.actions)); renderBuddyPage(); return; }
  buddyPush("buddy", T("Daar kan ik nog niet goed op antwoorden. Probeer bijvoorbeeld: “waarop kan ik besparen?”, “wat zijn mijn grootste uitgaven?” of “zit ik boven mijn budget?”. Met de AI-versie van Buddy kan je me ook gewone vragen stellen.",
                       "I can't answer that well yet. Try for example: “where can I save?”, “what are my biggest expenses?” or “am I over budget?”. With the AI version of Buddy you can also ask me general questions."));
  renderBuddyPage();
}

/* ----- Chat tekenen ----- */
let buddyMsgs=[];
function buddyPush(from,text,actions){ buddyMsgs.push({from, text, actions:actions||null}); }

function renderBuddyPage(){
  $("buddyHint").textContent=T("Buddy kijkt naar jouw eigen cijfers en leert van wat je zegt. Het is geen financieel advies.",
                               "Buddy looks at your own numbers and learns from what you say. This is not financial advice.")
    + (buddyAIReady() ? T(" Voor vragen en tips van het internet wordt een samenvatting van je cijfers naar een AI-dienst gestuurd."," For questions and tips from the internet, a summary of your figures is sent to an AI service.") : "");
  $("buddyInput").placeholder=buddyAIReady() ? T("Vraag Buddy iets, wat je maar wil…","Ask Buddy anything…") : T("Stel je vraag aan Buddy…","Ask Buddy something…");
  $("buddySend").textContent=T("Verstuur","Send");
  if(!buddyMsgs.length){
    buddyPush("buddy", T("Hoi! Ik ben Buddy. Ik kijk met je mee naar je uitgaven en help je zoeken waar je kunt besparen. Op vaste kosten zoals huur of de afbetaling van een lening kan je moeilijk besparen, dus die laat ik buiten mijn tips. Zeg me gerust waar jij niet op wilt besparen, dan onthoud ik dat.",
                         "Hi! I'm Buddy. I look at your expenses with you and help you find where to save. Fixed costs like rent or a loan repayment are hard to cut, so I leave those out of my tips. Tell me what you don't want to cut and I will remember it."));
  }
  const chat=$("buddyChat");
  chat.innerHTML="";
  buddyMsgs.forEach(m=>{
    const d=document.createElement("div");
    d.className="msg "+m.from+(m.pending?" pending":"");
    d.appendChild(document.createTextNode(m.text));
    if(m.actions && m.actions.length){
      const box=document.createElement("div");
      box.className="macts";
      m.actions.forEach(a=>{
        const b=document.createElement("button");
        b.textContent=a.label;
        b.onclick=()=>{ m.actions=null; a.fn(); };
        box.appendChild(b);
      });
      d.appendChild(box);
    }
    chat.appendChild(d);
  });
  chat.scrollTop=chat.scrollHeight;

  const chips=$("buddyChips");
  chips.innerHTML="";
  [[T("Waarop kan ik besparen?","Where can I save?"),"save"],
   [T("Wat zijn mijn grootste uitgaven?","What are my biggest expenses?"),"top"],
   [T("Zit ik boven mijn budget?","Am I over budget?"),"budget"],
   [T("Hoeveel houd ik over?","How much do I have left?"),"bal"],
   [T("Wat weet Buddy over mij?","What does Buddy know about me?"),"mem"]].forEach(c=>{
    const b=document.createElement("button");
    b.textContent=c[0];
    b.onclick=()=>{ buddyPush("user", c[0]); buddyRun(c[1]); };
    chips.appendChild(b);
  });
}
$("buddySend").addEventListener("click", ()=>{ const i=$("buddyInput"); const v=i.value; i.value=""; buddyHandleText(v); });
$("buddyInput").addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); $("buddySend").click(); } });

function refreshAll(){
  renderNav();
  $("pageMonth").style.display = page==="month" ? "block" : "none";
  $("pageGeneral").style.display = page==="general" ? "block" : "none";
  $("pageBudget").style.display = page==="budget" ? "block" : "none";
  $("pageBuddy").style.display = page==="buddy" ? "block" : "none";
  try {
    if(page==="month") renderMonthPage();
    else if(page==="general") renderGeneralPage();
    else if(page==="budget") renderBudgetPage();
    else renderBuddyPage();
  } catch(e){ console.error(e); }
}

applyLang();
