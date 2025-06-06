document.addEventListener('DOMContentLoaded', async () => {
  const config = window.CONFIG;
  console.log('CONFIG:', config); // debug: ensure placeholders are replaced

  const auth = new GoogleAuth(config);
  const manager = new OrderManager(auth);
  await manager.loadOrders();

  document.getElementById('orderForm').addEventListener('submit', async e => {
    e.preventDefault();
    await manager.addOrder();
  });

  document.getElementById('deliveryDate').addEventListener('change', e => {
    const date = new Date(e.target.value);
    document.getElementById('deliveryDay').textContent = date.toLocaleDateString('en-IN', { weekday: 'long' });
  });

  document.getElementById('downloadReport').addEventListener('click', () => manager.downloadCSV());

  const updateDateTime = () => {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-IN');
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };
  setInterval(updateDateTime, 1000);
  updateDateTime();
});

class OrderManager {
  constructor(auth) {
    this.auth = auth;
    this.ordersTable = document.querySelector('#ordersTable tbody');
    this.totalOrdersEl = document.getElementById('totalOrders');
    this.totalAmountEl = document.getElementById('totalAmount');
    this.totalQtyEl = document.getElementById('totalQty');
    this.totalSumEl = document.getElementById('totalSum');
  }

  async loadOrders() {
    const rows = await this.auth.getAllRows();
    this.ordersTable.innerHTML = '';
    let totAmt = 0, totQty = 0;

    rows.slice(1).forEach((r, i) => {
      const qty = parseFloat(r[6] || 0);
      const price = parseFloat(r[7] || 0);
      const total = qty * price;
      totQty += qty;
      totAmt += total;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[2]}</td>
        <td>${r[3]}</td>
        <td>${r[4]}</td>
        <td>${qty.toFixed(1)} kg</td>
        <td>₹${price.toFixed(2)}</td>
        <td>₹${total.toFixed(2)}</td>
        <td>-</td>
      `;
      this.ordersTable.appendChild(tr);
    });

    this.totalOrdersEl.textContent = Math.max(rows.length - 1, 0);
    this.totalAmountEl.textContent = totAmt.toFixed(2);
    this.totalQtyEl.textContent = `${totQty.toFixed(1)} kg`;
    this.totalSumEl.textContent = `₹${totAmt.toFixed(2)}`;
  }

  async addOrder() {
    const now = new Date().toLocaleTimeString('en-IN');
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const addr = document.getElementById('customerAddress').value;
    const type = document.getElementById('crabType').value;
    const qty = parseFloat(document.getElementById('quantity').value).toFixed(1);
    const price = parseFloat(document.getElementById('price').value).toFixed(2);
    const delDate = document.getElementById('deliveryDate').value;

    await this.auth.appendRow([now, name, phone, addr, type, delDate, qty, price]);
    document.getElementById('orderForm').reset();
    await this.loadOrders();
  }

  downloadCSV() {
    const rows = [["Order #","Time","Customer","Contact","Address","Crab Type","Quantity","Price/kg","Total"]];
    document.querySelectorAll('#ordersTable tbody tr').forEach(tr => {
      rows.push(Array.from(tr.cells).slice(0, 9).map(td => td.textContent));
    });

    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orders_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
