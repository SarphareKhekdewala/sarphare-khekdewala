class GoogleAuthManager {
    constructor() {
        if (!window.CONFIG) {
            throw new Error('CONFIG not found');
        }
        // Store original config without modification
        this.config = window.CONFIG;
        this.tokenClient = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            // Load GAPI client
            gapi.load('client', async () => {
                try {
                    // Log API key format (first 5 chars) for debugging
                    console.log('API Key format check:', {
                        length: this.config.API_KEY.length,
                        startsWithAI: this.config.API_KEY.startsWith('AI'),
                        containsPlaceholder: this.config.API_KEY.includes('#{')
                    });

                    // Initialize the Google API client
                    await gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                    });

                    // Initialize OAuth client
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.config.CLIENT_ID,
                        scope: 'https://www.googleapis.com/auth/spreadsheets',
                        callback: '' // Will be set in getToken
                    });

                    console.log('Google API initialized successfully');
                    resolve();
                } catch (error) {
                    console.error('Google API initialization failed:', error);
                    reject(error);
                }
            });
        });
    }

    async getToken() {
        if (!this.tokenClient) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = (resp) => {
                if (resp.error) {
                    reject(resp);
                    return;
                }
                resolve(resp.access_token);
            };

            if (gapi.client.getToken() === null) {
                this.tokenClient.requestAccessToken();
            } else {
                resolve(gapi.client.getToken().access_token);
            }
        });
    }

    async saveToSheet(values) {
        try {
            await this.getToken(); // Ensure we have a valid token
            return await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.config.SHEET_ID,
                range: `${this.config.SHEET_NAME}!A:J`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [values] }
            });
        } catch (error) {
            console.error('Sheet save failed:', error);
            throw error;
        }
    }
}
