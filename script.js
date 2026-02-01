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
          case "day": amount *= 30; break;
          case "week": amount *= 4.33; break;
          case "year": amount /= 12; break;
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

      // Items weergeven
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
        const freqSelect = document.createElement("select");
        ["once","day","week","month","year"].forEach(f=>{
          const opt=document.createElement("option");
          opt.value=f; opt.innerText=f;
          if(f===item.freq) opt.selected=true;
          freqSelect.appendChild(opt);
        });
        freqSelect.onchange=()=>{item.freq=freqSelect.value; render();}

        const kindSelect = document.createElement("select");
        ["income","expense"].forEach(k=>{
          const opt=document.createElement("option");
          opt.value=k; opt.innerText=k;
          if(k===item.kind) opt.selected=true;
          kindSelect.appendChild(opt);
        });
        kindSelect.onchange=()=>{item.kind=kindSelect.value; render();}

        const delBtn = document.createElement("button");
        delBtn.innerText="❌";
        delBtn.className="small";
        delBtn.onclick=()=>{
          cat.items.splice(i,1);
          render();
        };

        iDiv.appendChild(nameInput);
        iDiv.appendChild(amtInput);
        iDiv.appendChild(freqSelect);
        iDiv.appendChild(kindSelect);
        iDiv.appendChild(delBtn);

        catDiv.appendChild(iDiv);
      });

      // +Nieuw vak voor inline toevoegen
      const newDiv = document.createElement("div");
      newDiv.className="new-entry";

      const nameInp = document.createElement("input"); nameInp.placeholder="Naam";
      const amtInp = document.createElement("input"); amtInp.placeholder="Bedrag"; amtInp.type="number";
      const freqInp = document.createElement("select");
      ["once","day","week","month","year"].forEach(f=>{
        const opt=document.createElement("option"); opt.value=f; opt.innerText=f; freqInp.appendChild(opt);
      });
      const kindInp = document.createElement("select");
      ["income","expense"].forEach(k=>{
        const opt=document.createElement("option"); opt.value=k; opt.innerText=k; kindInp.appendChild(opt);
      });
      const addBtn = document.createElement("button"); addBtn.innerText="+Toevoegen";
      addBtn.onclick = ()=>{
        const n = nameInp.value.trim();
        let a = parseFloat(amtInp.value);
        if(!n || isNaN(a)) return;
        cat.items.push({name:n, amount:a, freq:freqInp.value, kind:kindInp.value});
        render();
      };

      newDiv.appendChild(nameInp);
      newDiv.appendChild(amtInp);
      newDiv.appendChild(freqInp);
      newDiv.appendChild(kindInp);
      newDiv.appendChild(addBtn);

      catDiv.appendChild(newDiv);

      container.appendChild(catDiv);

      // Recursief voor subcategorieën
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
