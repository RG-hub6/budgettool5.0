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

function addItem() {
  const name = document.getElementById("name").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  const recurring = document.getElementById("recurring").value;

  if (!name || isNaN(amount)) return;

  data[currentMonth].push({ name, amount, type, recurring });

  if (recurring === "maand") {
    let start = months.indexOf(currentMonth);
    for (let i = start + 1; i < months.length; i++) {
      data[months[i]].push({ name, amount, type, recurring });
    }
  }

  document.getElementById("name").value = "";
  document.getElementById("amount").value = "";

  renderAll();
}

function renderList() {
  const ul = document.getElementById("list");
  ul.innerHTML = "";
  data[currentMonth].forEach(item => {
    const li = document.createElement("li");
    li.innerText = `${item.name} — €${item.amount} (${item.type})`;
    ul.appendChild(li);
  });
}

function calculate() {
  let income = 0;
  let expense = 0;

  data[currentMonth].forEach(i => {
    if (i.type === "income") income += i.amount;
    else expense += i.amount;
  });

  return { income, expense, balance: income - expense };
}

function renderSummary() {
  const r = calculate();
  document.getElementById("total-income").innerText = r.income.toFixed(2);
  document.getElementById("total-expense").innerText = r.expense.toFixed(2);
  document.getElementById("balance").innerText = r.balance.toFixed(2);
}

function renderChart() {
  const c = document.getElementById("chart");
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);

  const r = calculate();
  const values = [r.income, r.expense, r.balance];
  const colors = ["#4caf50","#f44336","#2196f3"];
  const max = Math.max(...values, 1);

  values.forEach((v,i) => {
    const h = (v/max)*150;
    ctx.fillStyle = colors[i];
    ctx.fillRect(60+i*110, 180-h, 50, h);
  });
}

function renderAll() {
  renderMonthButtons();
  renderList();
  renderSummary();
  renderChart();
}

renderAll();
