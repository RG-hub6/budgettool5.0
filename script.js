// --- Globale data ---
let budgetData = {};
let currentMonth = null;

// --- Kleuren per niveau ---
const colors = ["#ff9999", "#99ccff", "#99ff99", "#ffcc99", "#cc99ff"];

// --- Maand toevoegen ---
function addNewMonth() {
  const month = prompt("Naam van de nieuwe maand:");
  if (!month || budgetData[month]) return;
  budgetData[month] = { income: 0, categories: {}, balance: 0 };
  currentMonth = month;
  renderMonthButtons();
  renderMonth();
}

// --- Render maand knoppen ---
function renderMonthButtons() {
  const container = document.getElementById("month-buttons");
  container.innerHTML = "";
  for (let month in budgetData) {
    const btn = document.createElement("button");
    btn.className = "month-button" + (month===currentMonth ? " active" : "");
    btn.innerText = month;
    btn.onclick = () => { currentMonth = month; renderMonth(); };
    container.appendChild(btn);
  }
}

// --- Render maand content ---
function renderMonth() {
  const container = document.getElementById("app");
  container.innerHTML = "";
  if (!currentMonth) return;

  const monthData = budgetData[currentMonth];

  const monthDiv = document.createElement("div");
  monthDiv.className = "month-block";
  monthDiv.innerHTML = `
    <h2>${currentMonth}</h2>
    <label>Inkomen (€):</label>
    <input type="number" id="income" value="${monthData.income}">
    <button onclick="updateIncome()">Opslaan</button>
    <p>Saldo: €<span id="balance">${monthData.balance.toFixed(2)}</span></p>
    <button onclick="addCategory(null)">+ Nieuwe categorie</button>
    <div id="categories"></div>
  `;
  container.appendChild(monthDiv);
  renderCategories();
}

// --- Inkomsten opslaan ---
function updateIncome() {
  const val = parseFloat(document.getElementById("income").value);
  if (!isNaN(val)) {
    budgetData[currentMonth].income = val;
    updateBalance();
  }
}

// --- Balans berekenen ---
function updateBalance() {
  const monthData = budgetData[currentMonth];
  let totalIncome = monthData.income;
  let totalExpenses = calculateTotals(monthData.categories);
  monthData.balance = totalIncome - totalExpenses.expenses + totalExpenses.incomes;
  document.getElementById("balance").innerText = monthData.balance.toFixed(2);
}

// --- Recursief inkomsten en uitgaven berekenen ---
function calculateTotals(categories) {
  let expenses = 0;
  let incomes = 0;
  for (let key in categories) {
    const item = categories[key];
    if (item.amount) {
      if(item.type==="expense") expenses += item.amount;
      else incomes += item.amount;
    }
    if(item.sub) {
      const subTotals = calculateTotals(item.sub);
      expenses += subTotals.expenses;
      incomes += subTotals.incomes;
    }
  }
  return {expenses, incomes};
}

// --- Categorie/subcategorie toevoegen ---
function addCategory(parent) {
  const name = prompt("Naam van categorie/subcategorie:");
  if (!name) return;

  const container = parent ? parent.querySelector(".sub") : document.getElementById("categories");
  const newDiv = document.createElement("div");
  newDiv.className = parent ? "sub-category" : "category";
  const level = parent ? (parent.dataset.level ? parseInt(parent.dataset.level)+1 : 1) : 0;
  newDiv.style.backgroundColor = colors[level % colors.length];
  newDiv.dataset.level = level;

  newDiv.innerHTML = `
    <strong onclick="toggleSub(this)">${name}</strong>
    <button onclick="addCategory(this.parentNode)">+ Subcategorie</button>
    <input type="number" placeholder="Bedrag (€)" oninput="updateAmount(this,'${name}')">
    <select onchange="updateType(this,'${name}')">
      <option value="expense">Uitgave</option>
      <option value="income">Inkomen</option>
    </select>
    <select onchange="updateRecurring(this,'${name}')">
      <option value="">Geen</option>
      <option value="dag">Dag</option>
      <option value="week">Week</option>
      <option value="maand">Maand</option>
      <option value="jaar">Jaar</option>
      <option value="eenmalig">Eenmalig</option>
    </select>
    <div class="sub"></div>
  `;
  container.appendChild(newDiv);

  // Data opslaan
  const monthData = budgetData[currentMonth];
  if (!parent) monthData.categories[name] = { amount:0, type:"expense", recurring:"", sub:{} };
  else {
    let path = getPath(parent);
    let obj = monthData.categories;
    for (let p of path) obj = obj[p].sub;
    obj[name] = { amount:0, type:"expense", recurring:"", sub:{} };
  }
}

// --- Toggle subcategorie inklappen ---
function toggleSub(el) {
  const subDiv = el.parentNode.querySelector(".sub");
  subDiv.style.display = (subDiv.style.display==="none")?"block":"none";
}

// --- Uitgaven/Inkomen updaten ---
function updateAmount(input,name){
  const val = parseFloat(input.value);
  const monthData = budgetData[currentMonth];
  const path = getPath(input.parentNode);
  let obj = monthData.categories;
  for (let p of path) obj = obj[p].sub;
  obj[name].amount = isNaN(val)?0:val;

  applyRecurring(name,obj[name]);
  updateBalance();
}

// --- Type updaten ---
function updateType(select,name){
  const monthData = budgetData[currentMonth];
  const path = getPath(select.parentNode);
  let obj = monthData.categories;
  for (let p of path) obj = obj[p].sub;
  obj[name].type = select.value;

  applyRecurring(name,obj[name]);
  updateBalance();
}

// --- Recurring updaten ---
function updateRecurring(select,name){
  const monthData = budgetData[currentMonth];
  const path = getPath(select.parentNode);
  let obj = monthData.categories;
  for (let p of path) obj = obj[p].sub;
  obj[name].recurring = select.value;

  applyRecurring(name,obj[name]);
  updateBalance();
}

// --- Helper: pad van parent naar root bepalen ---
function getPath(node){
  const path = [];
  while(node && !node.id){
    const strong = node.querySelector("strong");
    if(strong) path.unshift(strong.innerText);
    node = node.parentNode.closest(".category, .sub-category");
  }
  return path;
}

// --- Recurring automatisch toepassen naar volgende maanden ---
function applyRecurring(name,item){
  if(!item.recurring || item.recurring==="eenmalig") return;

  const months = Object.keys(budgetData);
  const currentIndex = months.indexOf(currentMonth);
  const repeatMonths = months.slice(currentIndex+1);

  repeatMonths.forEach(month=>{
    const monthObj = budgetData[month];
    if(!monthObj.categories[name]) monthObj.categories[name] = { ...item, sub:{...item.sub} };
  });
}

// --- Start met 12 maanden standaard ---
["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"].forEach(m => {
  budgetData[m] = { income: 0, categories: {}, balance:0 };
});
currentMonth = "Januari";
renderMonthButtons();
renderMonth();
