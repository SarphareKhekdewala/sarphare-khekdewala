class GoogleAuthManager {
    constructor() {
        // Remove trim() from initial config load
        this.config = window.CONFIG;
        this.tokenClient = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    // Initialize Google API client
                    await gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                    });

                    // Initialize Google Identity Services client
                    google.accounts.oauth2.initTokenClient({
                        client_id: this.config.CLIENT_ID,
                        scope: this.config.SCOPES,
                        callback: (tokenResponse) => {
                            if (tokenResponse.error) {
                                reject(tokenResponse);
                                return;
                            }
                            this.tokenClient = tokenResponse;
                            this.isInitialized = true;
                            resolve();
                        }
                    }).requestAccessToken();

                } catch (error) {
                    console.error('Initialization error:', error);
                    reject(error);
                }
            });
        });
    }

    async getToken() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.tokenClient.access_token;
    }

    async saveToSheet(values) {
        try {
            const token = await this.getToken();
            return await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.config.SHEET_ID,
                range: `${this.config.SHEET_NAME}!A:J`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [values] }
            });
        } catch (error) {
            console.error('Sheet save error:', error);
            throw new Error(`Failed to save to sheet: ${error.message}`);
        }
    }
}
