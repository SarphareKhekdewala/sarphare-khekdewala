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
   class OrderManager {
    constructor() {
        try {
            console.log('Initializing OrderManager...');
            
            // Initialize properties
            this.orders = [];
            this.form = document.getElementById('orderForm');
            if (!this.form) throw new Error('Order form not found');

            // Initialize table
            const ordersTable = document.getElementById('ordersTable');
            if (!ordersTable) throw new Error('Orders table not found');
            this.table = ordersTable.getElementsByTagName('tbody')[0];
            
            // Initialize Google Auth
            this.auth = new GoogleAuthManager();
            this.initializeApp();
            
        } catch (error) {
            console.error('Constructor error:', error);
            throw error;
        }
    }

    async initializeApp() {
        try {
            await this.auth.initialize();
            this.initializeEventListeners();
            await this.loadOrders();
            console.log('App initialized successfully');
        } catch (error) {
            console.error('App initialization error:', error);
            throw error;
        }
    }
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
        console.log('Handling form submission...');
        
        try {
            // Show loading state
            this.showToast('Processing order...', 'info');
            
            // Validate form data
            const formData = {
                customerName: document.getElementById('customerName').value,
                customerPhone: document.getElementById('customerPhone').value,
                customerAddress: document.getElementById('customerAddress').value,
                crabType: document.getElementById('crabType').value,
                quantity: parseFloat(document.getElementById('quantity').value),
                price: parseFloat(document.getElementById('price').value),
                deliveryDate: document.getElementById('deliveryDate').value
            };

            console.log('Form data:', formData);

            // Create order object
            const order = new Order(
                formData.customerName,
                formData.customerPhone,
                formData.customerAddress,
                formData.crabType,
                formData.quantity,
                formData.price,
                formData.deliveryDate
            );
            
            // First try to save to Google Sheets
            try {
                await this.saveToGoogleSheets(order);
                console.log('Saved to Google Sheets successfully');
            } catch (error) {
                console.error('Google Sheets error:', error);
                this.showToast('Saving locally - ' + error.message, 'warning');
            }
            
            // Add to local list and display
            this.addOrder(order);
            this.saveOrders();
            this.updateTotals(); // Make sure totals are updated
            
            // Reset form
            this.form.reset();
            
            // Set today's date again after reset
            const dateInput = document.getElementById('deliveryDate');
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
            
            this.showToast('Order saved successfully', 'success');
            
        } catch (error) {
            console.error('Submit error:', error);
            this.showToast('Failed to save order: ' + error.message, 'error');
        }
    }

    async saveToGoogleSheets(order) {
        try {
            // Get access token
            await this.auth.getToken();

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

            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.SHEET_ID,
                range: `${this.SHEET_NAME}!A:J`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [row]
                }
            });

            console.log('Google Sheets response:', response);
            return response;
        } catch (error) {
            console.error('Google Sheets API Error:', error);
            throw error;
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

        // Make sure to call updateTotals after adding new order
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
            console.log('Loading orders...');
            // First try to load from Google Sheets
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${this.SHEET_NAME}!A:J?key=${this.API_KEY}`;
            console.log('Fetching from URL:', url);
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Loaded data:', data);
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
                console.error('Failed to load from Google Sheets:', response.status, response.statusText);
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


// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    try {
        new OrderManager();
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to initialize the application. Check console for details.');
    }
});

