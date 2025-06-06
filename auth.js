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

        // Debug log the exact values (sanitized)
        console.log('Config Values Check:', {
            clientIdLength: window.CONFIG.CLIENT_ID?.length || 0,
            apiKeyLength: window.CONFIG.API_KEY?.length || 0,
            sheetIdLength: window.CONFIG.SHEET_ID?.length || 0
        });

        ['CLIENT_ID', 'API_KEY', 'SHEET_ID'].forEach(key => {
            const value = window.CONFIG[key];
            if (!value || 
                value === '#{GOOGLE_' + key + '}#' || 
                value.includes('#{') || 
                value.includes('}#')) {
                throw new Error(`${key} is not properly configured`);
            }
        });

        this.config = window.CONFIG;
    }
}
