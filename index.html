const months = [
  "Januari","Februari","Maart","April","Mei","Juni",
  "Juli","Augustus","September","Oktober","November","December"
];
let currentMonth = 0;

// Data per maand
let data = {};
months.forEach(m => data[m] = {categories:{}});

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

// Bereken totaal inkomsten/uitgaven
function calculate() {
  let inc=0, exp=0;
  function walk(categ){
    Object.values(categ).forEach(cat=>{
      cat.items.forEach(item=>{
        let amount = item.amount;
        switch(item.freq){
          case "week": amount*=4.33; break;
          case "year": amount/=12; break;
        }
        if(item.kind==="income") inc+=amount;
        else exp+=amount;
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
  div.innerHTML = "";
  
  function walk(categ, container){
    Object.keys(categ).forEach(key=>{
      const cat = categ[key];
      const catDiv = document.createElement("div");
      catDiv.className = "category";

      const titleDiv = document.createElement("div");
      titleDiv.innerHTML = `<strong>${key}</strong>`;
      catDiv.appendChild(titleDiv);

      // +Sub categorie knop
      const addSub = document.createElement("button");
      addSub.innerText = "+Sub";
      addSub.className="small";
      addSub.onclick = ()=>{
        const name = prompt("Naam subcategorie:");
        if(!name) return;
        cat.sub[name]={items:[], sub:{}};
        render();
      };
      titleDiv.appendChild(addSub);

      // +Nieuw item knop
      const addItemBtn = document.createElement("button");
      addItemBtn.innerText = "+Nieuw";
      addItemBtn.className="small";
      addItemBtn.onclick = ()=>{
        const name = prompt("Naam item:");
        if(!name) return;
        let amt = parseFloat(prompt("Bedrag:"));
        if(isNaN(amt)) return;
        let kind = prompt("income of expense? (i/e):");
        kind = (kind==="i")?"income":"expense";
        let freq = prompt("frequentie: once, day, week, month, year:");
        if(!["once","day","week","month","year"].includes(freq)) freq="once";
        cat.items.push({name, amount:amt, kind, freq});
        render();
      };
      titleDiv.appendChild(addItemBtn);

      // Items tonen
      cat.items.forEach((item,i)=>{
        const iDiv = document.createElement("div");
        iDiv.className="item";
        const nameInput = document.createElement("input");
        nameInput.value = item.name;
        nameInput.onchange=()=>{item.name=nameInput.value; render();}
        const amtInput = document.createElement("input");
        amtInput.value = item.amount.toFixed(2);
        amtInput.type="number";
        amtInput.onchange=()=>{item.amount=parseFloat(amtInput.value); render();}
        const delBtn = document.createElement("button");
        delBtn.innerText="❌";
        delBtn.className="small";
        delBtn.onclick=()=>{
          cat.items.splice(i,1);
          render();
        };
        iDiv.appendChild(nameInput);
        iDiv.appendChild(amtInput);
        iDiv.appendChild(delBtn);
        catDiv.appendChild(iDiv);
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
