document.addEventListener('DOMContentLoaded', async () => {
    const config = window.CONFIG;
    console.log('CONFIG:', config); // Debug log
    const auth = new GoogleAuth(config);
    const manager = new OrderManager(auth);
    await manager.loadOrders();

    document.getElementById('orderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await manager.addOrder();
    });

    document.getElementById('downloadReport').addEventListener('click', () => {
        manager.downloadCSV();
    });

    const deliveryDate = document.getElementById('deliveryDate');
    const deliveryDay = document.getElementById('deliveryDay');
    deliveryDate.addEventListener('change', () => {
        const date = new Date(deliveryDate.value);
        const options = { weekday: 'long' };
        deliveryDay.textContent = date.toLocaleDateString('en-IN', options);
    });

    function updateDateTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString();
        document.getElementById('currentDate').textContent = now.toLocaleDateString();
    }
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

        this.SHEET_ID = this.auth.config.SHEET_ID;
        this.SHEET_NAME = this.auth.config.SHEET_NAME;
        this.API_KEY = this.auth.config.API_KEY;
    }

    async loadOrders() {
        const rows = await this.auth.getAllRows();
        this.ordersTable.innerHTML = '';
        let totalAmount = 0;
        let totalQty = 0;

        rows.slice(1).forEach((row, index) => {
            const tr = document.createElement('tr');
            const total = parseFloat(row[7] || 0) * parseFloat(row[6] || 0);
            totalAmount += total;
            totalQty += parseFloat(row[6] || 0);

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${row[2]}</td>
                <td>${row[3]}</td>
                <td>${row[4]}</td>
                <td>${row[6]} kg</td>
                <td>₹${row[7]}</td>
                <td>₹${total.toFixed(2)}</td>
                <td>-</td>
            `;
            this.ordersTable.appendChild(tr);
        });

        this.totalOrdersEl.textContent = rows.length - 1;
        this.totalAmountEl.textContent = totalAmount.toFixed(2);
        this.totalQtyEl.textContent = `${totalQty.toFixed(1)} kg`;
        this.totalSumEl.textContent = `₹${totalAmount.toFixed(2)}`;
    }

    async addOrder() {
        const now = new Date();
        const time = now.toLocaleTimeString();
        const name = document.getElementById('customerName').value;
        const phone = document.getElementById('customerPhone').value;
        const address = document.getElementById('customerAddress').value;
        const type = document.getElementById('crabType').value;
        const qty = parseFloat(document.getElementById('quantity').value).toFixed(1);
        const price = parseFloat(document.getElementById('price').value).toFixed(2);
        const deliveryDate = document.getElementById('deliveryDate').value;

        const row = [time, name, phone, address, type, deliveryDate, qty, price];
        await this.auth.appendRow(row);
        document.getElementById('orderForm').reset();
        await this.loadOrders();
    }

    downloadCSV() {
        const rows = [["Order #", "Time", "Customer", "Contact", "Address", "Crab Type", "Quantity", "Price/kg", "Total"]];
        document.querySelectorAll('#ordersTable tbody tr').forEach((tr, index) => {
            const cells = [...tr.children];
            rows.push(cells.slice(0, 9).map(td => td.textContent));
        });

        const csv = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'orders_report.csv';
        a.click();
    }
}
