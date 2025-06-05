class Order {
    constructor(customerName, customerPhone, customerAddress, crabType, quantity, price, deliveryDate) {
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.customerAddress = customerAddress;
        this.crabType = crabType;
        this.quantity = quantity;
        this.price = price;
        this.total = quantity * price;
        this.orderDate = new Date();
        this.deliveryDate = new Date(deliveryDate);
    }
}

class OrderManager {
    constructor() {
        this.orders = [];
        this.form = document.getElementById('orderForm');
        this.table = document.getElementById('ordersTable').getElementsByTagName('tbody')[0];
        this.downloadBtn = document.getElementById('downloadReport');
        
        // Initialize with config values
        this.SHEET_ID = CONFIG.SHEET_ID;
        this.API_KEY = CONFIG.API_KEY;
        this.SHEET_NAME = 'Orders';

        // Initialize event listeners
        this.initializeEventListeners();
        this.loadOrders();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        
        console.log('OrderManager initialized');
        this.form.addEventListener('submit', (e) => {
            console.log('Form submitted');
            this.handleSubmit(e);
        });
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-IN');
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    initializeEventListeners() {
        // Remove any existing listeners first
        const newForm = this.form.cloneNode(true);
        this.form.parentNode.replaceChild(newForm, this.form);
        this.form = newForm;
        
        // Add the submit listener
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Add download listener
        if (this.downloadBtn) {
            const newBtn = this.downloadBtn.cloneNode(true);
            this.downloadBtn.parentNode.replaceChild(newBtn, this.downloadBtn);
            this.downloadBtn = newBtn;
            this.downloadBtn.addEventListener('click', () => this.downloadReport());
        }
        
        // Add date change listener
        const dateInput = document.getElementById('deliveryDate');
        dateInput.addEventListener('change', (e) => {
            const date = new Date(e.target.value);
            const day = date.toLocaleDateString('en-IN', { weekday: 'long' });
            document.getElementById('deliveryDay').textContent = day;
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        try {
            // Create order object from form data
            const order = new Order(
                document.getElementById('customerName').value,
                document.getElementById('customerPhone').value,
                document.getElementById('customerAddress').value,
                document.getElementById('crabType').value,
                parseFloat(document.getElementById('quantity').value),
                parseFloat(document.getElementById('price').value),
                document.getElementById('deliveryDate').value
            );
            
            // Save to Google Sheets first
            await this.saveToGoogleSheets(order);
            
            // Add to local list and display
            this.addOrder(order);
            this.saveOrders();
            
            // Reset form and show success message
            this.form.reset();
            this.showToast('Order added successfully');
            
        } catch (error) {
            console.error('Error saving order:', error);
            this.showToast('Failed to save order: ' + error.message, 'error');
        }
    }

    async saveToGoogleSheets(order) {
        console.log('Saving to Google Sheets:', order);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${this.SHEET_NAME}!A:J:append?valueInputOption=RAW&key=${this.API_KEY}`;
        
        const row = [
            order.orderDate.toISOString(),
            order.customerName,
            order.customerPhone,
            order.customerAddress,
            order.crabType,
            order.quantity,
            order.price,
            order.total,
            order.deliveryDate.toISOString(),
            this.getCrabTypeDisplay(order.crabType)
        ];

        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors', // Add CORS mode
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin // Add origin header
                },
                body: JSON.stringify({
                    values: [row]
                })
            });

            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 403) {
                    throw new Error('API access denied. Check API key and permissions.');
                }
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to save to Google Sheets');
            }

            // If successful, save to local storage as backup
            this.saveOrders();
            return await response.json();
        } catch (error) {
            console.error('Google Sheets API Error:', error);
            // Fall back to local storage if API fails
            this.saveOrders();
            throw new Error(`Failed to save to Google Sheets: ${error.message}. Data saved locally.`);
        }
    }

    addOrder(order) {
        console.log('Adding order:', order);
        this.orders.push(order);
        this.displayOrder(order);
    }

    displayOrder(order) {
        const row = this.table.insertRow();
        const orderTime = order.orderDate.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const deliveryDate = order.deliveryDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        row.innerHTML = `
            <td>${this.orders.length}</td>
            <td>${orderTime}</td>
            <td>${order.customerName}</td>
            <td>${order.customerPhone}</td>
            <td>${order.customerAddress}</td>
            <td>${deliveryDate}</td>
            <td>${this.getCrabTypeDisplay(order.crabType)}</td>
            <td>${order.quantity} kg</td>
            <td>₹${order.price}</td>
            <td>₹${order.total.toFixed(2)}</td>
            <td>
                <button class="delete-btn" title="Delete Order">❌</button>
            </td>
        `;

        row.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteOrder(order);
            row.remove();
            this.updateTotals();
        });

        this.updateTotals();
    }

    deleteOrder(order) {
        const index = this.orders.indexOf(order);
        if (index > -1) {
            this.orders.splice(index, 1);
            this.saveOrders();
        }
    }

    saveOrders() {
        localStorage.setItem('crabOrders', JSON.stringify(this.orders));
    }

    async loadOrders() {
        try {
            // First try to load from Google Sheets
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${this.SHEET_NAME}!A:J?key=${this.API_KEY}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.values && data.values.length > 1) { // Skip header row
                    this.orders = data.values.slice(1).map(row => ({
                        orderDate: new Date(row[0]),
                        customerName: row[1],
                        customerPhone: row[2],
                        customerAddress: row[3],
                        crabType: row[4],
                        quantity: parseFloat(row[5]),
                        price: parseFloat(row[6]),
                        total: parseFloat(row[7]),
                        deliveryDate: new Date(row[8])
                    }));
                }
            } else {
                // Fallback to local storage if API fails
                const savedOrders = localStorage.getItem('crabOrders');
                if (savedOrders) {
                    this.orders = JSON.parse(savedOrders);
                }
            }

            // Clear and reload table
            this.table.innerHTML = '';
            this.orders.forEach(order => this.displayOrder(order));
            this.updateTotals();
            
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showToast('Error loading orders', 'error');
        }
    }

    generateReport() {
        const today = new Date().toLocaleDateString('en-IN');
        const time = new Date().toLocaleTimeString('en-IN');
        
        let reportText = `🦀 SARPHARE KHEKDEWALA 🦀\n`;
        reportText += `Fresh Crab Order Management\n`;
        reportText += `==================================\n\n`;
        reportText += `📅 Date: ${today}\n`;
        reportText += `⏰ Time: ${time}\n\n`;
        reportText += `📋 Orders Summary:\n`;
        reportText += `------------------\n\n`;

        let totalAmount = 0;

        if (this.orders.length === 0) {
            reportText += "No orders for today\n";
        } else {
            this.orders.forEach((order, index) => {
                reportText += `Order #${index + 1}\n`;
                reportText += `👤 Customer: ${order.customerName}\n`;
                reportText += `📞 Contact: ${order.customerPhone}\n`;
                reportText += `📍 Address: ${order.customerAddress}\n`;
                reportText += `📅 Delivery: ${new Date(order.deliveryDate).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}\n`;
                reportText += `🦀 Type: ${this.getCrabTypeDisplay(order.crabType)}\n`;
                reportText += `⚖️ Quantity: ${order.quantity} kg\n`;
                reportText += `💰 Price: ₹${order.price}/kg\n`;
                reportText += `💵 Total: ₹${order.total.toFixed(2)}\n`;
                reportText += `-------------------------\n`;
                
                totalAmount += order.total;
            });

            reportText += `\n📊 Daily Total: ₹${totalAmount.toFixed(2)}\n`;
        }

        reportText += `\n=================================\n`;
        reportText += `Generated on: ${today} at ${time}`;
        
        return reportText;
    }

    async downloadReport() {
        try {
            const report = this.generateReport();
            const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const today = new Date().toISOString().split('T')[0];
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Khekdewala_Report_${today}.txt`;
            
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report. Please try again.');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        }, 100);
    }

    getCrabTypeDisplay(value) {
        const types = {
            'small': 'Small (9-10 crabs)',
            'medium': 'Medium (6-7 crabs)',
            'big5': 'Big (5 crabs)',
            'big4': 'Big (4 crabs)',
            'big3': 'Big (3 crabs)',
            'big2': 'Big (2 crabs)',
            'green-small': 'Green Crabs (500-700g)',
            'green-large': 'Green Crabs (800g-1.5kg)'
        };
        return types[value] || value;
    }

    updateTotals() {
        const totalQty = this.orders.reduce((sum, order) => sum + order.quantity, 0);
        const totalAmount = this.orders.reduce((sum, order) => sum + order.total, 0);
        
        document.getElementById('totalOrders').textContent = this.orders.length;
        document.getElementById('totalAmount').textContent = totalAmount.toFixed(2);
        document.getElementById('totalQty').textContent = `${totalQty} kg`;
        document.getElementById('totalSum').textContent = `₹${totalAmount.toFixed(2)}`;
    }
}


// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof CONFIG === 'undefined') {
        console.error('Configuration not found! Please check config.js');
        return;
    }
    new OrderManager();
});

