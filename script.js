const mymonths = [
  "Januari","Februari","Maart","April","Mei","Juni",
  "Juli","Augustus","September","Oktober","November","December"
];
let currentMonth = 0;

// Data per maand
let data = {};
mymonths.forEach(m => data[m] = {categories:{}});

// Helper: maak automatisch een lege supercategorie als er geen categorie is
function ensureCategoryExists(month){
  const cat = data[month].categories;
  if(Object.keys(cat).length === 0){
    cat["Algemeen"] = {items:[], sub:{}};
  }
}

// Maandknoppen
function renderMonths(){
  const div = document.getElementById("months");
  div.innerHTML = "";
  mymonths.forEach((m,i)=>{
    const b = document.createElement("button");
    b.innerText = m;
    if(i===currentMonth) b.className="active";
    b.onclick = () => {currentMonth=i; render();}
    div.appendChild(b);
  });
}

// Bereken totaal inkomsten/uitgaven
function calculate(){
  let inc=0, exp=0;
  function walk(categ){
    Object.values(categ).forEach(cat=>{
      cat.items.forEach(item=>{
        let amt = item.amount;
        switch(item.freq){
          case "day": amt *= 30; break;
          case "week":
