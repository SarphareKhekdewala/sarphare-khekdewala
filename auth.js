class GoogleAuthManager {
    constructor() {
        this.initializeConfig();
        this.tokenClient = null;
        this.isAuthenticated = false;
        this.lastError = null;
    }

    initializeConfig() {
        try {
            // Debug log to check if CONFIG is loaded
            console.log('Initializing with window.CONFIG:', 
                window.CONFIG ? 'Present' : 'Missing');

            // Validate CONFIG existence
            if (!window.CONFIG) {
                throw new Error('Configuration not loaded');
            }

            // Check each required field
            const required = ['CLIENT_ID', 'API_KEY', 'SHEET_ID'];
            required.forEach(key => {
                const value = window.CONFIG[key];
                if (!value || typeof value !== 'string') {
                    throw new Error(`Missing ${key}`);
                }
                if (value.includes('#{') || value.includes('#}')) {
                    throw new Error(`${key} not properly injected by GitHub Actions`);
                }
            });

            // Set up configuration
            this.config = {
                CLIENT_ID: window.CONFIG.CLIENT_ID,
                API_KEY: window.CONFIG.API_KEY,
                SHEET_ID: window.CONFIG.SHEET_ID,
                SHEET_NAME: window.CONFIG.SHEET_NAME || 'Orders',
                SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
                DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4'
            };

            console.log('✅ Auth configuration initialized');
        } catch (error) {
            this.lastError = error;
            console.error('❌ Configuration error:', error);
            throw error;
        }
    }

    async initialize() {
        try {
            if (this.lastError) {
                throw this.lastError;
            }

            await this.loadGAPIClient();
            await this.initializeGISClient();
            console.log('✅ Google Auth initialized successfully');
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
                    console.log('✅ GAPI client loaded');
                    resolve();
                } catch (error) {
                    console.error('❌ GAPI client load failed:', error);
                    reject(error);
                }
            });
        });
    }

    async initializeGISClient() {
        if (!google?.accounts?.oauth2) {
            throw new Error('Google Identity Services not available');
        }

        try {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.config.CLIENT_ID,
                scope: this.config.SCOPES,
                callback: '', // Set during getToken call
                error_callback: (err) => {
                    console.error('❌ Token client error:', err);
                    this.isAuthenticated = false;
                }
            });
            console.log('✅ Token client initialized');
        } catch (error) {
            console.error('❌ Token client initialization failed:', error);
            throw error;
        }
    }

    async getToken() {
        if (!this.tokenClient) {
            throw new Error('Auth not initialized. Call initialize() first.');
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
                    console.log('✅ Token acquired successfully');
                    resolve(resp.access_token);
                };

                if (gapi.client.getToken() === null) {
                    this.tokenClient.requestAccessToken();
                } else {
                    resolve(gapi.client.getToken().access_token);
                }
            } catch (error) {
                console.error('❌ Token request failed:', error);
                reject(error);
            }
        });
    }

    async validateAccess() {
        try {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.config.SHEET_ID
            });
            const isValid = response.status === 200;
            console.log(`${isValid ? '✅' : '❌'} Sheet access validation:`, isValid);
            return isValid;
        } catch (error) {
            console.error('❌ Sheet access validation failed:', error);
            return false;
        }
    }

    logout() {
        try {
            const token = gapi.client.getToken();
            if (token) {
                google.accounts.oauth2.revoke(token.access_token, () => {
                    gapi.client.setToken(null);
                    this.isAuthenticated = false;
                    console.log('✅ Logged out successfully');
                });
            }
        } catch (error) {
            console.error('❌ Logout failed:', error);
        }
    }

    getAuthStatus() {
        return {
            isInitialized: !!this.tokenClient,
            isAuthenticated: this.isAuthenticated,
            lastError: this.lastError?.message
        };
    }
}
