class GoogleAuthManager {
    constructor() {
        try {
            this.validateConfig();
            this.tokenClient = null;
            this.isAuthenticated = false;
            console.log('✅ Auth manager initialized');
        } catch (error) {
            console.error('❌ Auth initialization failed:', error);
            throw new Error(`Auth Configuration Error: ${error.message}`);
        }
    }

   validateConfig() {
    if (!window.CONFIG) {
        throw new Error('Missing window.CONFIG');
    }

    ['CLIENT_ID', 'API_KEY', 'SHEET_ID'].forEach(key => {
        const value = window.CONFIG[key];
        if (!value || value.length < 10) {  // Simple length check
            throw new Error(`${key} is not properly configured`);
        }
    });

    this.config = window.CONFIG;
}
}
