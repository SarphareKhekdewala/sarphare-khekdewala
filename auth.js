class GoogleAuthManager {
    constructor() {
        this.validateConfig();
        this.tokenClient = null;
        this.isAuthenticated = false;
    }

    validateConfig() {
        console.log('Validating config...');
        if (!window.CONFIG) {
            throw new Error('CONFIG not found');
        }

        const required = ['CLIENT_ID', 'API_KEY', 'SHEET_ID'];
        required.forEach(key => {
            const value = window.CONFIG[key];
            if (!value || value.includes('#{') || value.includes('}#')) {
                console.error(`Invalid ${key}:`, value);
                throw new Error(`${key} not properly configured`);
            }
        });

        this.config = {...window.CONFIG};
        console.log('Config validation passed');
    }

    async initialize() {
        try {
            console.log('Initializing Google Auth...');
            await this.loadGAPIClient();
            await this.initializeGISClient();
            console.log('Google Auth initialized successfully');
        } catch (error) {
            console.error('Auth initialization failed:', error);
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
            throw new Error('Google Identity Services not loaded');
        }

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.config.CLIENT_ID,
            scope: this.config.SCOPES,
            callback: ''
        });
    }
}
