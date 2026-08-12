import axios from 'axios';
import { API_BASE_URL, HTTP_METHODS, DEFAULT_TIMEOUT } from './websiteApiConstants';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for cookies, authorization headers with HTTPS
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken') || localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response.data;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    const errorResponse = {
      status: error.response?.status || 500,
      message: error.response?.data?.message || 'An error occurred',
      data: error.response?.data,
    };
    
    console.warn('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: errorResponse.status,
      message: errorResponse.message,
    });
    
    return Promise.reject(errorResponse);
  }
);

/**
 * A reusable API call utility function using Axios
 * @param {string} endpoint - The API endpoint (e.g., '/auth/patient/register')
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {Object} data - Request payload (for POST, PUT, PATCH)
 * @param {Object} params - URL parameters (for GET requests)
 * @param {Object} customHeaders - Custom headers to be sent with the request
 * @param {boolean} useBaseUrl - Whether to use the base URL (default: true)
 * @returns {Promise<Object>} - The response data
 */
const apiCall = async ({
  endpoint,
  method = HTTP_METHODS.GET,
  data = null,
  params = {},
  customHeaders = {},
  useBaseUrl = true,
} = {}) => {
  const config = {
    method,
    url: endpoint,
    data,
    params,
    headers: {
      ...customHeaders,
    },
  };

  if (!useBaseUrl) {
    config.baseURL = '';
  }

  try {
    const response = await apiClient(config);
    // The response is already unwrapped by the interceptor
    // Check if it's already in our API response format
    if (response && typeof response === 'object' && 'success' in response) {
      return response;
    }
    // If not, wrap it
    return {
      success: true,
      data: response,
      status: response?.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'An error occurred',
      status: error.status,
      data: error.data,
    };
  }
};

// Helper methods for common HTTP methods
const api = {
  get: (endpoint, params = {}, headers = {}) =>
    apiCall({ endpoint, method: HTTP_METHODS.GET, params, customHeaders: headers }),

  post: (endpoint, data = {}, headers = {}) =>
    apiCall({ endpoint, method: HTTP_METHODS.POST, data, customHeaders: headers }),

  put: (endpoint, data = {}, headers = {}) =>
    apiCall({ endpoint, method: HTTP_METHODS.PUT, data, customHeaders: headers }),

  patch: (endpoint, data = {}, headers = {}) =>
    apiCall({ endpoint, method: HTTP_METHODS.PATCH, data, customHeaders: headers }),

  delete: (endpoint, data = {}, headers = {}) =>
    apiCall({ endpoint, method: HTTP_METHODS.DELETE, data, customHeaders: headers }),
};

// Export the api object as default and the apiCall function as a named export
export { api as default, apiCall };