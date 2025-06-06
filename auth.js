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

        console.log('Validating CONFIG:', {
            hasClientId: !!window.CONFIG.CLIENT_ID,
            hasApiKey: !!window.CONFIG.API_KEY,
            hasSheetId: !!window.CONFIG.SHEET_ID
        });

        ['CLIENT_ID', 'API_KEY', 'SHEET_ID'].forEach(key => {
            const value = window.CONFIG[key];
            if (!value || value.includes('#{')) {
                throw new Error(`${key} is not properly configured`);
            }
        });

        this.config = window.CONFIG;
    }

    async initialize() {
        try {
            await this.loadGAPIClient();
            await this.initializeGISClient();
            console.log('✅ Google Auth initialized');
            return true;
        } catch (error) {
            console.error('❌ Auth initialization failed:', error);
            throw error;
        }
    }

    async loadGAPIClient() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: [this.config.DISCOVERY_DOC]
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async initializeGISClient() {
        if (!google?.accounts?.oauth2) {
            throw new Error('Google Identity Services not available');
        }

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.config.CLIENT_ID,
            scope: this.config.SCOPES,
            callback: '', // Set during getToken call
        });
    }

    async getToken() {
        if (!this.tokenClient) {
            throw new Error('Auth not initialized');
        }

        return new Promise((resolve, reject) => {
            try {
                this.tokenClient.callback = (resp) => {
                    if (resp.error) {
                        this.isAuthenticated = false;
                        reject(resp);
                        return;
                    }
                    this.isAuthenticated = true;
                    resolve(resp.access_token);
                };

                if (gapi.client.getToken() === null) {
                    this.tokenClient.requestAccessToken();
                } else {
                    resolve(gapi.client.getToken().access_token);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    logout() {
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken(null);
            this.isAuthenticated = false;
        }
    }
}
