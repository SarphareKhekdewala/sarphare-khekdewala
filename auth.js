class GoogleAuthManager {
    constructor() {
        this.config = window.CONFIG;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                    });

                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.config.CLIENT_ID,
                        scope: 'https://www.googleapis.com/auth/spreadsheets',
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
        return new Promise((resolve) => {
            this.tokenClient.callback = (response) => {
                if (response.access_token) {
                    resolve(response.access_token);
                }
            };
            this.tokenClient.requestAccessToken();
        });
    }
}
