import axios from "axios";
import { CTraderAuthParameters, CTraderTokenInfo } from "#CTraderConnectionParameters";

export class CTraderAuth {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;

    constructor(clientId: string, clientSecret: string, redirectUri: string = "http://localhost:3000/callback") {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    /**
     * Generates the authentication URL for the cTrader Open API
     * @param scope - The scope of access requested ('trading' or 'accounts')
     * @param baseUri - The base URI for authentication (optional)
     * @returns The full authentication URL
     */
    public getAuthUri(scope: 'trading' | 'accounts' = 'trading', baseUri: string = "https://connect.spotware.com/apps/auth"): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: scope
        });
        
        return `${baseUri}?${params.toString()}`;
    }

    /**
     * Exchanges authorization code for access token
     * @param authCode - The authorization code received from callback
     * @param baseUri - The base URI for token endpoint (optional)
     * @returns Promise resolving to token information
     */
    public async getToken(authCode: string, baseUri: string = "https://connect.spotware.com/apps/token"): Promise<CTraderTokenInfo> {
        try {
            const response = await axios.post(baseUri, {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: authCode,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresIn: response.data.expires_in,
                scope: response.data.scope
            };
        } catch (error) {
            throw new Error(`Failed to get access token: ${error}`);
        }
    }

    /**
     * Refreshes an expired access token using refresh token
     * @param refreshToken - The refresh token
     * @param baseUri - The base URI for token endpoint (optional)
     * @returns Promise resolving to new token information
     */
    public async refreshToken(refreshToken: string, baseUri: string = "https://connect.spotware.com/apps/token"): Promise<CTraderTokenInfo> {
        try {
            const response = await axios.post(baseUri, {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresIn: response.data.expires_in,
                scope: response.data.scope
            };
        } catch (error) {
            throw new Error(`Failed to refresh token: ${error}`);
        }
    }

    /**
     * Validates an access token by getting profile information
     * @param accessToken - The access token to validate
     * @returns Promise resolving to profile information
     */
    public static async validateToken(accessToken: string): Promise<any> {
        try {
            const response = await axios.get(`https://api.spotware.com/connect/profile?access_token=${accessToken}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to validate token: ${error}`);
        }
    }

    /**
     * Gets trading accounts associated with an access token
     * @param accessToken - The access token
     * @returns Promise resolving to array of trading accounts
     */
    public static async getTradingAccounts(accessToken: string): Promise<any[]> {
        try {
            const response = await axios.get(`https://api.spotware.com/connect/tradingaccounts?access_token=${accessToken}`);
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            throw new Error(`Failed to get trading accounts: ${error}`);
        }
    }
}