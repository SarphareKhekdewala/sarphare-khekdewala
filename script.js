const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAIJjgGz1HkadgC4fLv_BSd-9Xsaoq_K_JBHrMMian7UvJV_rkT4jT9gXH3Cu6T-Qb/exec';

document.addEventListener('DOMContentLoaded', () => {
  const manager = new OrderManager();
  manager.loadOrders();

  document.getElementById('orderForm').addEventListener('submit', async e => {
    e.preventDefault();
    await manager.addOrder();
  });

  document.getElementById('deliveryDate').addEventListener('change', e => {
    const date = new Date(e.target.value);
    const day = date.toLocaleDateString('en-IN', { weekday: 'long' });
    document.getElementById('deliveryDay').textContent = day;
  });

  document.getElementById('crabType').addEventListener('change', e => {
    const prices = {
      small: 650, medium: 750, big5: 800, big4: 850,
      big3: 900, big2: 1000, green-small: 1000,
      green-medium: 2000, green-large: 2800
    };
    document.getElementById('price').value = prices[e.target.value] || '';
  });

  document.getElementById('downloadReport').addEventListener('click', () => manager.downloadCSV());

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('filterDate').addEventListener('input', () => manager.applyFilters());
  document.getElementById('filterCrabType').addEventListener('change', () => manager.applyFilters());
});

class OrderManager {
  constructor() {
    this.orders = [];
    this.ordersContainer = document.getElementById('ordersContainer');
    this.totalOrdersEl = document.getElementById('totalOrders');
    this.totalAmountEl = document.getElementById('totalAmount');
    this.totalQtyEl = document.getElementById('totalQty');
  }

  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
  }

  async loadOrders() {
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const rows = await res.json();
      this.orders = rows.slice(1);
      this.applyFilters();
    } catch (err) {
      console.error('Error loading orders', err);
    }
  }

  applyFilters() {
    const dateFilter = document.getElementById('filterDate').value;
    const typeFilter = document.getElementById('filterCrabType').value;

    this.ordersContainer.innerHTML = '';
    let totalAmount = 0, totalQty = 0, totalOrders = 0;

    this.orders.forEach((r, i) => {
      const delDate = r[9].split(' ')[0];
      const crabType = r[4];

      if ((dateFilter && delDate !== dateFilter) || (typeFilter && crabType !== typeFilter)) return;

      const qty = parseFloat(r[6]);
      const price = parseFloat(r[7]);
      const total = parseFloat(r[8]);

      totalQty += qty;
      totalAmount += total;
      totalOrders++;

      const tile = document.createElement('div');
      tile.className = 'order-tile';
      tile.innerHTML = `
        <h4>Order #${i + 1}</h4>
        <p><strong>Date:</strong> ${r[0]}</p>
        <p><strong>Name:</strong> ${r[1]}</p>
        <p><strong>Phone:</strong> ${r[2]}</p>
        <p><strong>Address:</strong> ${r[3]}</p>
        <p><strong>Crab Type:</strong> ${r[4]}</p>
        <p><strong>Description:</strong> ${r[5]}</p>
        <p><strong>Quantity:</strong> ${qty} kg</p>
        <p><strong>Price/kg:</strong> ₹${price}</p>
        <p><strong>Total:</strong> ₹${total}</p>
        <p><strong>Delivery:</strong> ${r[9]}</p>
      `;
      this.ordersContainer.appendChild(tile);
    });

    this.totalOrdersEl.textContent = totalOrders;
    this.totalQtyEl.textContent = totalQty.toFixed(1);
    this.totalAmountEl.textContent = totalAmount.toFixed(2);
  }

  async addOrder() {
    const now = this.formatDate(new Date());
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const addr = document.getElementById('customerAddress').value;
    const type = document.getElementById('crabType').value;
    const desc = document.getElementById('description').value;
    const qty = parseFloat(document.getElementById('quantity').value).toFixed(1);
    const price = parseFloat(document.getElementById('price').value).toFixed(2);
    const total = (qty * price).toFixed(2);
    const delDate = document.getElementById('deliveryDate').value;
    const day = new Date(delDate).toLocaleDateString('en-IN', { weekday: 'long' });

    const payload = {
      action: 'append',
      row: JSON.stringify([now.split(' ')[0], name, phone, addr, type, desc, qty, price, total, `${delDate} (${day})`])
    };

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString()
      });

      const result = await res.json();
      if (result.success) {
        document.getElementById('orderForm').reset();
        document.getElementById('deliveryDay').textContent = '';
        await this.loadOrders();
      } else {
        alert('Error adding order.');
      }
    } catch (err) {
      console.error('Add order failed:', err);
    }
  }

  downloadCSV() {
    const rows = [['Order #', 'Time', 'Customer', 'Phone', 'Address', 'Crab Type', 'Description', 'Qty', 'Price/kg', 'Total', 'Delivery']];
    document.querySelectorAll('.order-tile').forEach((tile, i) => {
      const cols = Array.from(tile.querySelectorAll('p')).map(p => p.textContent.split(': ')[1]);
      rows.push([`${i + 1}`, ...cols]);
    });
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'orders.csv';
    a.click();
  }
}

