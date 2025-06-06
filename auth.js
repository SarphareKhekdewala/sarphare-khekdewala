class GoogleAuthManager {
    constructor() {
        this.config = window.CONFIG;
        this.tokenClient = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: this.config.API_KEY.trim(),
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                    });

                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.config.CLIENT_ID.trim(),
                        scope: 'https://www.googleapis.com/auth/spreadsheets',
                        callback: ''
                    });

                    this.isInitialized = true;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async getToken() {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Auth not initialized'));
                return;
            }

            this.tokenClient.callback = (response) => {
                if (response.error) {
                    reject(response);
                    return;
                }
                resolve(response.access_token);
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
            await this.getToken();
            return await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.config.SHEET_ID.trim(),
                range: `${this.config.SHEET_NAME}!A:J`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [values] }
            });
        } catch (error) {
            throw new Error(`Failed to save to sheet: ${error.message}`);
        }
    }
}
