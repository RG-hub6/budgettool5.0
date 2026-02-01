const months = [
  "Januari","Februari","Maart","April","Mei","Juni",
  "Juli","Augustus","September","Oktober","November","December"
];

let currentMonth = "Januari";

let data = {};
months.forEach(m => data[m] = []);

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

function addEntry() {
  const path = document.getElementById("categoryPath").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;

  if (!path || isNaN(amount)) return;

  data[currentMonth].push({
    path: path.split(">").map(p => p.trim()),
    amount,
    type
  });

  document.getElementById("amount").value = "";
  renderAll();
}

function calculateTotals() {
  let income = 0;
  let expense = 0;

  data[currentMonth].forEach(e => {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  });

  return { income, expense, balance: income - expense };
}

function renderOverview() {
  const div = document.getElementById("overview");
  div.innerHTML = "";

  data[currentMonth].forEach(e => {
    const d = document.createElement("div");
    d.className = "category";
    d.innerText = `${e.path.join(" > ")} — €${e.amount} (${e.type})`;
    div.appendChild(d);
  });
}

function renderSummary() {
  const t = calculateTotals();
  document.getElementById("income").innerText = t.income.toFixed(2);
  document.getElementById("expense").innerText = t.expense.toFixed(2);
  document.getElementById("balance").innerText = t.balance.toFixed(2);
}

function renderChart() {
  const c = document.getElementById("chart");
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);

  const t = calculateTotals();
  const vals = [t.income, t.expense, t.balance];
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
  renderOverview();
}

renderAll();
