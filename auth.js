class GoogleAuthManager {
    constructor() {
        this.config = null;
        this.tokenClient = null;
        this.validateAndSetConfig();
    }

    validateAndSetConfig() {
        if (!window.CONFIG) throw new Error('CONFIG not found');
        
        // Create a clean config object without any placeholder values
        this.config = {
            CLIENT_ID: window.CONFIG.CLIENT_ID.replace(/[#{}]/g, '').trim(),
            API_KEY: window.CONFIG.API_KEY.replace(/[#{}]/g, '').trim(),
            SHEET_ID: window.CONFIG.SHEET_ID.replace(/[#{}]/g, '').trim(),
            SHEET_NAME: window.CONFIG.SHEET_NAME,
            SCOPES: window.CONFIG.SCOPES,
            DISCOVERY_DOC: window.CONFIG.DISCOVERY_DOC
        };
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    // Initialize the Google API client
                    await gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: [this.config.DISCOVERY_DOC]
                    });

                    // Set up the OAuth2 client
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.config.CLIENT_ID,
                        scope: this.config.SCOPES,
                        callback: '' // Will be set in getToken
                    });

                    resolve();
                } catch (error) {
                    console.error('Failed to initialize:', error);
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
            try {
                this.tokenClient.callback = (resp) => {
                    if (resp.error) reject(resp);
                    else resolve(resp.access_token);
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

    async saveToSheet(values) {
        try {
            await this.getToken();
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.config.SHEET_ID,
                range: `${this.config.SHEET_NAME}!A:J`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [values] }
            });
            return response.result;
        } catch (error) {
            console.error('Failed to save:', error);
            throw error;
        }
    }
}
