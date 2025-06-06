class GoogleAuthManager {
    constructor() {
        this.config = {
            ...window.CONFIG,
            SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
            DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4'
        };
        this.tokenClient = null;
        // Debug: Log full config
        console.log('Current Config:', this.config);
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: [this.config.DISCOVERY_DOC]
                    });

                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.config.CLIENT_ID,
                        scope: this.config.SCOPES,
                        callback: ''
                    });

                    resolve();
                } catch (error) {
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
            await this.getToken();
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
