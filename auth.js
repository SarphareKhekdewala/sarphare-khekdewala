class GoogleAuth {
    constructor(config) {
        this.config = config;
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
    }

    async init() {
        await new Promise(resolve => gapi.load('client', resolve));
        await gapi.client.init({
            apiKey: this.config.API_KEY,
            discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        });
        this.gapiInited = true;

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.config.CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: '', // Will be set on request
        });
        this.gisInited = true;
    }

    async requestAccessToken() {
        return new Promise((resolve, reject) => {
            this.tokenClient.callback = async (resp) => {
                if (resp.error) {
                    reject(resp);
                } else {
                    resolve(resp);
                }
            };
            this.tokenClient.requestAccessToken({ prompt: '' });
        });
    }

    async appendRow(data) {
        if (!this.gapiInited || !this.gisInited) {
            await this.init();
        }
        await this.requestAccessToken();

        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: this.config.SHEET_ID,
            range: `${this.config.SHEET_NAME}!A:J`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [data]
            }
        });
        return response;
    }

    async getAllRows() {
        if (!this.gapiInited || !this.gisInited) {
            await this.init();
        }
        await this.requestAccessToken();

        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: this.config.SHEET_ID,
            range: `${this.config.SHEET_NAME}!A:J`,
        });
        return response.result.values || [];
    }
}
