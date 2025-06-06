class GoogleAuthManager {
    constructor() {
        this.config = window.CONFIG;
        this.tokenClient = null;
    }

    async initialize() {
        await this.loadGAPIClient();
        await this.initializeGISClient();
    }

    async loadGAPIClient() {
        return new Promise((resolve) => {
            gapi.load('client', async () => {
                await gapi.client.init({
                    apiKey: this.config.API_KEY,
                    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                });
                resolve();
            });
        });
    }

    async initializeGISClient() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.config.CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: ''
        });
    }

    async getToken() {
        return new Promise((resolve) => {
            this.tokenClient.callback = (resp) => resolve(resp.access_token);
            this.tokenClient.requestAccessToken();
        });
    }
}
