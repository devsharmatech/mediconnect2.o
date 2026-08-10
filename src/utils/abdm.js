import axios from 'axios';

const ABDM_BASE_URL = process.env.ABDM_BASE_URL || "https://dev.abdm.gov.in/gateway";
const CLIENT_ID = process.env.ABDM_CLIENT_ID;
const CLIENT_SECRET = process.env.ABDM_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;

export const abdmApi = axios.create({
    baseURL: ABDM_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

/**
 * Get Access Token from ABDM Gateway
 * Uses Client Credentials Flow
 */
export const getGatewayToken = async () => {
    // Return cached token if valid
    if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
        return accessToken;
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.warn("ABDM_CLIENT_ID or ABDM_CLIENT_SECRET is missing. Using Mock Token.");
        return "MOCK_TOKEN_MISSING_ENV";
    }

    try {
        const response = await axios.post(`${ABDM_BASE_URL}/v0.5/sessions`, {
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET
        });

        const { accessToken: token, expiresIn } = response.data;
        accessToken = token;
        // Set expiry 10 seconds before actual expiry to be safe
        tokenExpiry = new Date(new Date().getTime() + (expiresIn - 10) * 1000);

        return accessToken;
    } catch (error) {
        console.error("Failed to get ABDM Gateway Token:", error.response?.data || error.message);
        throw new Error("Failed to authenticate with ABDM Gateway");
    }
}

/**
 * Helper to make authenticated requests
 */
export const makeAbdmRequest = async (method, endpoint, data = null, headers = {}) => {
    const token = await getGatewayToken();

    // Add Authorization header
    const authHeaders = {
        ...headers,
        'Authorization': `Bearer ${token}`,
        'X-CM-ID': 'sbx', // Sandbox CM ID usually
    };

    try {
        const config = {
            method,
            url: endpoint,
            headers: authHeaders,
            data
        };
        const response = await abdmApi(config);
        return response.data;
    } catch (error) {
        console.error(`ABDM Request Failed [${endpoint}]:`, error.response?.data || error.message);
        throw error;
    }
};
