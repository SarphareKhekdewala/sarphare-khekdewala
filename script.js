const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAIJjgGz1HkadgC4fLv_BSd-9Xsaoq_K_JBHrMMian7UvJV_rkT4jT9gXH3Cu6T-Qb/exec';

document.addEventListener('DOMContentLoaded', async () => {
  const manager = new OrderManager();
  await manager.loadOrders();

  document.getElementById('orderForm').addEventListener('submit', async e => {
    e.preventDefault();
    await manager.addOrder();
  });

  document.getElementById('deliveryDate').addEventListener('change', e => {
    const date = new Date(e.target.value);
    const day = date.toLocaleDateString('en-IN', { weekday: 'long' });
    document.getElementById('deliveryDay').textContent = day;
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
  constructor() {
    this.ordersTable = document.querySelector('#ordersTable tbody');
    this.totalOrdersEl = document.getElementById('totalOrders');
    this.totalAmountEl = document.getElementById('totalAmount');
    this.totalQtyEl = document.getElementById('totalQty');
    this.totalSumEl = document.getElementById('totalSum');
  }

  async loadOrders() {
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const rows = await res.json();

      this.ordersTable.innerHTML = '';
      let totAmt = 0, totQty = 0;

      rows.slice(1).forEach((r, i) => {
        const qty = parseFloat(r[5] || 0);
        const price = parseFloat(r[6] || 0);
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
          <td>${r[8] || '-'}</td>
        `;
        this.ordersTable.appendChild(tr);
      });

      this.totalOrdersEl.textContent = Math.max(rows.length - 1, 0);
      this.totalAmountEl.textContent = totAmt.toFixed(2);
      this.totalQtyEl.textContent = `${totQty.toFixed(1)} kg`;
      this.totalSumEl.textContent = `₹${totAmt.toFixed(2)}`;
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  }

  async addOrder() {
    const now = new Date().toISOString();
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const addr = document.getElementById('customerAddress').value;
    const crabType = document.getElementById('crabType');
    const typeValue = crabType.value;
    const typeLabel = crabType.options[crabType.selectedIndex].text;
    const qty = parseFloat(document.getElementById('quantity').value).toFixed(1);
    const price = parseFloat(document.getElementById('price').value).toFixed(2);
    const delDate = document.getElementById('deliveryDate').value;
    const day = new Date(delDate).toLocaleDateString('en-IN', { weekday: 'long' });
    const delDisplay = `${delDate} (${day})`;

    const payload = {
      action: 'append',
      row: JSON.stringify([now, name, phone, addr, typeValue, qty, price, (qty * price), delDisplay, typeLabel])
    };

    try {
      const formData = new URLSearchParams(payload).toString();

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      const result = await res.json();
      if (result.success) {
        document.getElementById('orderForm').reset();
        document.getElementById('deliveryDay').textContent = '';
        await this.loadOrders();
      } else {
        alert('Error saving order.');
        console.error(result.error);
      }
    } catch (err) {
      console.error('Failed to add order:', err);
    }
  }

  downloadCSV() {
    const rows = [["Order #","Time","Customer","Contact","Address","Crab Type","Quantity","Price/kg","Total","Display Type"]];
    document.querySelectorAll('#ordersTable tbody tr').forEach(tr => {
      rows.push(Array.from(tr.cells).slice(0, 10).map(td => td.textContent));
    });

    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orders_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
