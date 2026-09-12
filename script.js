const STORAGE_KEY = "sales_tracker";

let sales = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const form = document.getElementById("sales-form");
const rowsEl = document.getElementById("rows");
const totalSalesEl = document.getElementById("total-sales");
const totalCostEl = document.getElementById("total-cost");
const totalProfitEl = document.getElementById("total-profit");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const sale = {
    id: Date.now(),
    product: document.getElementById("product").value.trim(),
    price: parseFloat(document.getElementById("price").value),
    cost: parseFloat(document.getElementById("cost").value),
    quantity: parseInt(document.getElementById("quantity").value, 10),
  };

  sales.push(sale);
  save();
  render();
  form.reset();
  document.getElementById("quantity").value = 1;
  document.getElementById("product").focus();
});

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

function money(n) {
  return n.toFixed(2);
}

function render() {
  rowsEl.innerHTML = "";

  if (sales.length === 0) {
    rowsEl.innerHTML = '<tr><td colspan="7" class="empty">No sales yet.</td></tr>';
  }

  let totalSales = 0;
  let totalCost = 0;

  for (const s of sales) {
    const lineTotal = s.price * s.quantity;
    const lineCost = s.cost * s.quantity;
    const profit = lineTotal - lineCost;
    totalSales += lineTotal;
    totalCost += lineCost;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(s.product)}</td>
      <td>${money(s.price)}</td>
      <td>${money(s.cost)}</td>
      <td>${s.quantity}</td>
      <td>${money(lineTotal)}</td>
      <td>${money(profit)}</td>
      <td class="del"><button class="del-btn" data-id="${s.id}">Delete</button></td>
    `;
    rowsEl.appendChild(tr);
  }

  totalSalesEl.textContent = money(totalSales);
  totalCostEl.textContent = money(totalCost);
  totalProfitEl.textContent = money(totalSales - totalCost);
}

rowsEl.addEventListener("click", (e) => {
  if (!e.target.classList.contains("del-btn")) return;
  const id = Number(e.target.dataset.id);
  sales = sales.filter((s) => s.id !== id);
  save();
  render();
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

render();