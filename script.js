const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysjYAyqWlV8PNv5JSbwOPk6zaH5ooSMo3slK2OacFdo-0nab84xY6I2s14DCpA_ulz/exec';
function showLoading(show) {
  let loader = document.getElementById('loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loader);
  }
  loader.style.display = show ? 'flex' : 'none';
}

function showPopup(message) {
  let popup = document.getElementById('popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'popup';
    popup.className = 'popup';
    popup.innerHTML = `<div class="popup-content"><span id="popupMsg"></span><button id="closePopup">OK</button></div>`;
    document.body.appendChild(popup);
    document.getElementById('closePopup').onclick = () => popup.style.display = 'none';
  }
  document.getElementById('popupMsg').textContent = message;
  popup.style.display = 'flex';
}

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
      big3: 900, big2: 1000, 'green-small': 1000,
      'green-medium': 2000, 'green-large': 2800
    };
    document.getElementById('price').value = prices[e.target.value] || '';
    updateTotalPrice();
  });

  document.getElementById('quantity').addEventListener('input', updateTotalPrice);
  document.getElementById('price').addEventListener('input', updateTotalPrice);

  function updateTotalPrice() {
    const qty = parseFloat(document.getElementById('quantity').value) || 0;
    const price = parseFloat(document.getElementById('price').value) || 0;
    document.getElementById('totalPrice').value = (qty * price).toFixed(2);
  }

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

  document.getElementById('closePopup').onclick = () => {
    document.getElementById('popup').style.display = 'none';
  };
});

class OrderManager {
  constructor() {
    this.orders = [];
    this.ordersContainer = document.getElementById('ordersContainer');
    this.totalOrdersEl = document.getElementById('totalOrders');
    this.totalAmountEl = document.getElementById('totalAmount');
    this.totalQtyEl = document.getElementById('totalQty');
    this.editingIndex = null;

    // Event delegation for edit/delete
    this.ordersContainer.addEventListener('click', async (e) => {
      if (e.target.classList.contains('edit-btn')) {
        const idx = e.target.dataset.index;
        this.editOrder(idx);
      }
      if (e.target.classList.contains('delete-btn')) {
        const idx = e.target.dataset.index;
        await this.deleteOrder(idx);
      }
    });
  }

  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
  }

  async loadOrders() {
    showLoading(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const rows = await res.json();
      this.orders = rows.slice(1);
      this.applyFilters();
    } catch (err) {
      console.error('Error loading orders', err);
    } finally {
      showLoading(false);
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
        <button class="btn edit-btn" data-index="${i}">✏️ Edit</button>
        <button class="btn delete-btn" data-index="${i}">🗑️ Delete</button>
      `;
      this.ordersContainer.appendChild(tile);
    });

    this.totalOrdersEl.textContent = totalOrders;
    this.totalQtyEl.textContent = totalQty.toFixed(1);
    this.totalAmountEl.textContent = totalAmount.toFixed(2);
  }

  editOrder(idx) {
    const r = this.orders[idx];
    document.getElementById('customerName').value = r[1];
    document.getElementById('customerPhone').value = r[2];
    document.getElementById('customerAddress').value = r[3];
    document.getElementById('crabType').value = r[4];
    document.getElementById('description').value = r[5];
    document.getElementById('quantity').value = r[6];
    document.getElementById('price').value = r[7];
    document.getElementById('deliveryDate').value = r[9].split(' ')[0];
    document.getElementById('deliveryDay').textContent = r[9].split('(')[1]?.replace(')', '') || '';
    document.getElementById('totalPrice').value = r[8];
    this.editingIndex = idx;
    document.querySelector('.submit-btn').textContent = '✏️ Update Order';
    document.querySelector('.tab-button[data-tab="formTab"]').click();
  }

  async addOrder() {
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    showLoading(true);

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
      action: this.editingIndex != null ? 'update' : 'append',
      index: this.editingIndex,
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
        document.getElementById('totalPrice').value = '';
        this.editingIndex = null;
        document.querySelector('.submit-btn').textContent = '➕ Add Order';
        await this.loadOrders();
        showPopup('Order added successfully!');
      } else {
        alert('Error adding/updating order.');
      }
    } catch (err) {
      console.error('Add/Update order failed:', err);
    } finally {
      showLoading(false);
      submitBtn.disabled = false;
    }
  }

  async deleteOrder(idx) {
    if (!confirm('Delete this order?')) return;
    showLoading(true);
    const payload = { action: 'delete', index: idx };
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString()
      });
      const result = await res.json();
      if (result.success) await this.loadOrders();
      else alert('Error deleting order.');
    } catch (err) {
      console.error('Delete order failed:', err);
    } finally {
      showLoading(false);
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
