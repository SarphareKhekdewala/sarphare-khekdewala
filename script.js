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

  document.getElementById('downloadReport').addEventListener('click', () => manager.downloadCSV());

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
});

class OrderManager {
  constructor() {
    this.ordersContainer = document.getElementById('ordersContainer');
    this.totalOrdersEl = document.getElementById('totalOrders');
    this.totalAmountEl = document.getElementById('totalAmount');
  }

  formatDate(date) {
    return date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0];
  }

  async loadOrders() {
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const rows = await res.json();

      this.ordersContainer.innerHTML = '';
      let totalOrders = 0;
      let totalAmount = 0;

      rows.slice(1).forEach((r, i) => {
        const qty = parseFloat(r[6] || 0);
        const price = parseFloat(r[7] || 0);
        const total = qty * price;
        totalAmount += total;
        totalOrders++;

        const tile = document.createElement('div');
        tile.className = 'order-tile';
        tile.innerHTML = `
          <h4>Order #${i + 1}</h4>
          <p><strong>Time:</strong> ${r[0]}</p>
          <p><strong>Name:</strong> ${r[1]}</p>
          <p><strong>Phone:</strong> ${r[2]}</p>
          <p><strong>Address:</strong> ${r[3]}</p>
          <p><strong>Crab Type:</strong> ${r[4]}</p>
          <p><strong>Description:</strong> ${r[5]}</p>
          <p><strong>Quantity:</strong> ${r[6]} kg</p>
          <p><strong>Price/kg:</strong> ₹${r[7]}</p>
          <p><strong>Total:</strong> ₹${r[8]}</p>
          <p><strong>Delivery Date:</strong> ${r[9]}</p>
          <label><input type="checkbox"> Delivered</label>
        `;
        this.ordersContainer.appendChild(tile);
      });

      this.totalOrdersEl.textContent = totalOrders;
      this.totalAmountEl.textContent = totalAmount.toFixed(2);
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
      row: JSON.stringify([now, name, phone, addr, type, desc, qty, price, total, `${delDate} (${day})`, ""])
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

