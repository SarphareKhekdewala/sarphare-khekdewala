class GoogleAuthManager {
    constructor(config) {
        this.config = config;
        this.tokenClient = null;
        this.accessToken = null;
    }

    async initialize() {
        try {
            // Load the Google API client library
            await new Promise((resolve, reject) => {
                gapi.load('client', { callback: resolve, onerror: reject });
            });

            // Initialize the client
            await gapi.client.init({
                apiKey: this.config.API_KEY,
                discoveryDocs: [this.config.DISCOVERY_DOC],
            });

            // Initialize the token client
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.config.CLIENT_ID,
                scope: this.config.SCOPES,
                callback: '', // Will be set during getToken call
            });

            console.log('Google Auth initialized successfully');
        } catch (error) {
            console.error('Auth initialization error:', error);
            throw error;
        }
    }

    async getToken() {
        try {
            return new Promise((resolve, reject) => {
                if (!this.tokenClient) {
                    reject(new Error('Token client not initialized'));
                    return;
                }

                this.tokenClient.callback = (response) => {
                    if (response.error) {
                        reject(response);
                        return;
                    }
                    resolve(response.access_token);
                };

                this.tokenClient.requestAccessToken();
            });
        } catch (error) {
            console.error('Error getting token:', error);
            throw error;
        }
    }
}
