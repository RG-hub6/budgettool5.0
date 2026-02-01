const months = [
  "Januari","Februari","Maart","April","Mei","Juni",
  "Juli","Augustus","September","Oktober","November","December"
];

let currentMonth = "Januari";

let data = {};
months.forEach(m => data[m] = { categories: {} });

/* ======================
   MAANDEN
====================== */
function renderMonthButtons() {
  const div = document.getElementById("month-buttons");
  div.innerHTML = "";
  months.forEach(m => {
    const b = document.createElement("button");
    b.innerText = m;
    if (m === currentMonth) b.classList.add("active");
    b.onclick = () => {
      currentMonth = m;
      renderAll();
    };
    div.appendChild(b);
  });
}

/* ======================
   CATEGORIEËN
====================== */
function addCategory(parentPath = []) {
  const name = prompt("Naam categorie:");
  if (!name) return;

  let obj = data[currentMonth].categories;
  parentPath.forEach(p => obj = obj[p].sub);

  obj[name] = { amount: 0, type: "expense", sub: {} };
  renderAll();
}

function renderCategories(obj, container, path = []) {
  Object.keys(obj).forEach(key => {
    const item = obj[key];

    const div = document.createElement("div");
    div.style.marginLeft = path.length * 20 + "px";
    div.style.background = "#fff";
    div.style.padding = "6px";
    div.style.marginTop = "6px";
    div.style.borderRadius = "6px";

    div.innerHTML = `
      <strong>${key}</strong>
      <button onclick='addCategory(${JSON.stringify([...path, key])})'>+ sub</button>
      <br>
      <input type="number" placeholder="€"
        value="${item.amount}"
        onchange='updateAmount(${JSON.stringify([...path, key])}, this.value)'>
      <select onchange='updateType(${JSON.stringify([...path, key])}, this.value)'>
        <option value="expense" ${item.type==="expense"?"selected":""}>Uitgave</option>
        <option value="income" ${item.type==="income"?"selected":""}>Inkomen</option>
      </select>
    `;

    container.appendChild(div);
    renderCategories(item.sub, container, [...path, key]);
  });
}

function updateAmount(path, value) {
  let obj = data[currentMonth].categories;
  path.forEach(p => obj = obj[p].sub ?? obj[p]);
  obj.amount = parseFloat(value) || 0;
  renderAll();
}

function updateType(path, value) {
  let obj = data[currentMonth].categories;
  path.forEach(p => obj = obj[p].sub ?? obj[p]);
  obj.type = value;
  renderAll();
}

/* ======================
   BEREKENINGEN
====================== */
function calculateTotals() {
  let income = 0;
  let expense = 0;

  function walk(obj) {
    Object.values(obj).forEach(i => {
      if (i.amount) {
        i.type === "income"
          ? income += i.amount
          : expense += i.amount;
      }
      walk(i.sub);
    });
  }

  walk(data[currentMonth].categories);
  return { income, expense, balance: income - expense };
}

/* ======================
   RENDER
====================== */
function renderSummary() {
  const r = calculateTotals();
  document.getElementById("total-income").innerText = r.income.toFixed(2);
  document.getElementById("total-expense").innerText = r.expense.toFixed(2);
  document.getElementById("balance").innerText = r.balance.toFixed(2);
}

function renderChart() {
  const c = document.getElementById("chart");
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);

  const r = calculateTotals();
  const vals = [r.income, r.expense, r.balance];
  const cols = ["#4caf50","#f44336","#2196f3"];
  const max = Math.max(...vals,1);

  vals.forEach((v,i)=>{
    const h = (v/max)*150;
    ctx.fillStyle = cols[i];
    ctx.fillRect(60+i*110,180-h,50,h);
  });
}

function renderAll() {
  renderMonthButtons();
  renderSummary();
  renderChart();

  const app = document.getElementById("app");
  app.innerHTML = "<button onclick='addCategory()'>+ Categorie</button>";
  renderCategories(data[currentMonth].categories, app);
}

renderAll();
