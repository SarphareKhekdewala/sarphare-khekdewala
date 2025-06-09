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
      small: 650,
      medium: 750,
      big5: 800,
      big4: 850,
      big3: 900,
      big2: 1000,
      'green-small': 100,
      'green-medium': 2000,
      'green-large': 2800
    };
    const value = e.target.value;
    if (prices[value] !== undefined) {
      document.getElementById('price').value = prices[value];
    }
  });

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('filterDate').addEventListener('change', () => manager.loadOrders());
  document.getElementById('filterType').addEventListener('change', () => manager.loadOrders());
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterType').value = '';
    manager.loadOrders();
  });

  document.getElementById('downloadReport').addEventListener('click', () => manager.downloadCSV());
});

class OrderManager {
  constructor() {
    this.ordersContainer = document.getElementById('ordersContainer');
    this.totalOrdersEl = document.getElementById('totalOrders');
    this.totalKgEl = document.getElementById('totalKg');
    this.totalAmountEl = document.getElementById('totalAmount');
  }

  formatDate(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  async loadOrders() {
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const rows = await res.json();

      const filterDate = document.getElementById('filterDate').value;
      const filterType = document.getElementById('filterType').value;

      this.ordersContainer.innerHTML = '';
      let totalOrders = 0;
      let totalAmount = 0;
      let totalKg = 0;

      rows.slice(1).forEach((r, i) => {
        const [timestamp, name, phone, address, type, desc, qtyRaw, priceRaw, totalRaw, delivery] = r;

        const qty = parseFloat(qtyRaw || 0);
        const price = parseFloat(priceRaw || 0);
        const total = parseFloat(totalRaw || 0);

        const deliveryDateOnly = delivery.split(' ')[0];
        const matchesDate = !filterDate || deliveryDateOnly === filterDate;
        const matchesType = !filterType || type === filterType;

        if (!matchesDate || !matchesType) return;

        totalOrders++;
        totalAmount += total;
        totalKg += qty;

        const tile = document.createElement('div');
        tile.className = 'order-tile';
        tile.innerHTML = `
          <h4>Order #${totalOrders}</h4>
          <p><strong>Order Date:</strong> ${timestamp}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Crab Type:</strong> ${type}</p>
          <p><strong>Description:</strong> ${desc}</p>
          <p><strong>Quantity:</strong> ${qty} kg</p>
          <p><strong>Price/kg:</strong> ₹${price}</p>
          <p><strong>Total:</strong> ₹${total}</p>
          <p><strong>Delivery Date:</strong> ${delivery}</p>
        `;
        this.ordersContainer.appendChild(tile);
      });

      this.totalOrdersEl.textContent = totalOrders;
      this.totalAmountEl.textContent = totalAmount.toFixed(2);
      this.totalKgEl.textContent = totalKg.toFixed(1);
    } catch (err) {
      console.error('Error loading orders', err);
    }
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
      row: JSON.stringify([now, name, phone, addr, type, desc, qty, price, total, `${delDate} (${day})`])
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
    const rows = [['Order #', 'Order Date', 'Customer', 'Phone', 'Address', 'Crab Type', 'Description', 'Qty', 'Price/kg', 'Total', 'Delivery']];
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
