class GoogleAuthManager {
    constructor() {
        this.initializeConfig();
        this.tokenClient = null;
        this.isAuthenticated = false;
    }

    initializeConfig() {
        // Validate GitHub Actions injected config
        if (!window.CONFIG) {
            throw new Error('Configuration not found. Please ensure GitHub secrets are properly set.');
        }

        const requiredKeys = ['CLIENT_ID', 'API_KEY', 'SHEET_ID'];
        for (const key of requiredKeys) {
            if (!window.CONFIG[key] || window.CONFIG[key].includes('#')) {
                throw new Error(`Invalid ${key}. Please check GitHub secrets configuration.`);
            }
        }

        this.config = {
            ...window.CONFIG,
            SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
            DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4'
        };
    }

    async initialize() {
        try {
            await this.loadGAPIClient();
            await this.setupGISClient();
            console.log('🔐 Authentication system initialized');
            return true;
        } catch (error) {
            console.error('Authentication initialization failed:', error);
            throw new Error(`Auth Error: ${error.message}`);
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
                    reject(new Error('Failed to initialize GAPI client'));
                }
            });
        });
    }

    async setupGISClient() {
        if (!google?.accounts?.oauth2) {
            throw new Error('Google Identity Services not loaded');
        }

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.config.CLIENT_ID,
            scope: this.config.SCOPES,
            callback: '', // Will be set during getToken call
        });
    }

    async getToken() {
        if (!this.tokenClient) {
            throw new Error('Authentication not initialized');
        }

        return new Promise((resolve, reject) => {
            try {
                this.tokenClient.callback = (tokenResponse) => {
                    if (tokenResponse.error) {
                        reject(tokenResponse);
                        return;
                    }
                    this.isAuthenticated = true;
                    resolve(tokenResponse.access_token);
                };

                // Request token
                if (gapi.client.getToken() === null) {
                    this.tokenClient.requestAccessToken();
                } else {
                    resolve(gapi.client.getToken().access_token);
                }
            } catch (error) {
                reject(new Error('Token request failed'));
            }
        });
    }

    async validateSheet() {
        try {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.config.SHEET_ID
            });
            return response.status === 200;
        } catch (error) {
            console.error('Sheet validation failed:', error);
            return false;
        }
    }

    logout() {
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken(null);
            this.isAuthenticated = false;
            console.log('👋 Logged out successfully');
        }
    }
}
