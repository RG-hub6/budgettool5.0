const months = [
  "Januari","Februari","Maart","April","Mei","Juni",
  "Juli","Augustus","September","Oktober","November","December"
];
let currentMonth = 0;

// Elke maand heeft zijn eigen categorieboom
let data = {};
months.forEach(m => data[m]={categories:{}});

// Render maandknoppen
function renderMonths() {
  const div = document.getElementById("months");
  div.innerHTML = "";
  months.forEach((m,i)=>{
    const b=document.createElement("button");
    b.innerText = m;
    if(i===currentMonth) b.className="active";
    b.onclick=()=>{currentMonth=i; render();}
    div.appendChild(b);
  });
}

// Voeg een item toe
function addEntry() {
  const pathStr = document.getElementById("categoryPath").value.trim();
  const itemName = document.getElementById("itemName").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const kind = document.getElementById("kind").value;
  const freq = document.getElementById("frequency").value;
  if(!pathStr || !itemName || isNaN(amount)) return;

  const path = pathStr.split(">").map(p=>p.trim());

  let obj = data[months[currentMonth]].categories;
  path.forEach(p=>{
    if(!obj[p]) obj[p]={items:[], sub:{}};
    obj = obj[p].sub;
  });

  let parent = data[months[currentMonth]].categories;
  path.forEach(p=>{parent=parent[p]});
  parent.items.push({name:itemName, amount, kind, freq});

  document.getElementById("categoryPath").value="";
  document.getElementById("itemName").value="";
  document.getElementById("amount").value="";
  render();
}

// Controleer of item van toepassing is deze maand
function appliesThisMonth(item,m) {
  if(item.freq==="once") return m===currentMonth;
  if(item.freq==="month") return true;
  if(item.freq==="year") return m===0;
  if(item.freq==="week") return true;
  return false;
}

// Bereken totaal inkomsten/uitgaven
function calculate() {
  let inc=0, exp=0;
  function walk(categ){
    Object.values(categ).forEach(cat=>{
      cat.items.forEach(item=>{
        if(appliesThisMonth(item,currentMonth)){
          if(item.kind==="income") inc+=item.amount;
          else exp+=item.amount;
        }
      });
      walk(cat.sub);
    });
  }
  walk(data[months[currentMonth]].categories);
  return {inc, exp, bal: inc-exp};
}

// Render overzicht categorieën/items
function renderOverview() {
  const div = document.getElementById("overview");
  div.innerHTML="";
  function walk(categ, container){
    Object.keys(categ).forEach(key=>{
      const cat = categ[key];
      const catDiv = document.createElement("div");
      catDiv.className="category";
      const title = document.createElement("strong");
      title.innerText=key;
      catDiv.appendChild(title);

      // Subcategorie toevoegen
      const addSub = document.createElement("button");
      addSub.innerText="+Sub";
      addSub.className="small";
      addSub.onclick=()=>{
        const subName=prompt("Naam subcategorie:");
        if(!subName) return;
        cat.sub[subName]={items:[], sub:{}};
        render();
      };
      catDiv.appendChild(addSub);

      // Items in categorie
      cat.items.forEach(item=>{
        if(appliesThisMonth(item,currentMonth)){
          const iDiv=document.createElement("div");
          iDiv.innerText=`${item.name} — €${item.amount} (${item.kind}, ${item.freq})`;
          iDiv.style.marginLeft="20px";
          catDiv.appendChild(iDiv);
        }
      });

      container.appendChild(catDiv);
      walk(cat.sub, catDiv);
    });
  }
  walk(data[months[currentMonth]].categories, div);
}

// Render grafiek
function renderChart(t){
  const c=document.getElementById("chart");
  const ctx=c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
  const vals=[t.inc,t.exp];
  const cols=["#4caf50","#f44336"];
  const max=Math.max(...vals,1);
  vals.forEach((v,i)=>{
    const h=(v/max)*150;
    ctx.fillStyle=cols[i];
    ctx.fillRect(80+i*140,180-h,60,h);
  });
}

// Render alles
function render(){
  renderMonths();
  const t = calculate();
  document.getElementById("income").innerText=t.inc.toFixed(2);
  document.getElementById("expense").innerText=t.exp.toFixed(2);
  document.getElementById("balance").innerText=t.bal.toFixed(2);
  renderChart(t);
  renderOverview();
}

render();

