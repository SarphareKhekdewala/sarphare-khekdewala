class GoogleAuthManager {
    constructor() {
        this.config = null;
        this.tokenClient = null;
        this.initializeConfig();
    }

    initializeConfig() {
        const config = window.CONFIG;
        
        // Clean the config values
        this.config = {
            CLIENT_ID: config.CLIENT_ID.replace(/['"#{}]/g, '').trim(),
            API_KEY: config.API_KEY.replace(/['"#{}]/g, '').trim(),
            SHEET_ID: config.SHEET_ID.replace(/['"#{}]/g, '').trim(),
            SHEET_NAME: config.SHEET_NAME
        };
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    // Initialize Google API client
                    await gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                    });

                    // Initialize OAuth client
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.config.CLIENT_ID,
                        scope: 'https://www.googleapis.com/auth/spreadsheets',
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
            throw new Error('Auth not initialized');
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
            const token = await this.getToken();
            return await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.config.SHEET_ID,
                range: `${this.config.SHEET_NAME}!A:J`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [values] }
            });
        } catch (error) {
            console.error('Failed to save to sheet:', error);
            throw error;
        }
    }
}
