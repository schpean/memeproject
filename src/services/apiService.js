import { API_BASE_URL } from '../utils/config';

// Interceptor pentru adăugarea automată a headerelor
const addHeaders = (headers = {}) => {
  const defaultHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  // Adăugăm user-id din localStorage dacă există
  const user = localStorage.getItem('memeUser');
  if (user) {
    const { uid } = JSON.parse(user);
    defaultHeaders['user-id'] = uid;
  }

  return {
    ...defaultHeaders,
    ...headers
  };
};

// Interceptor pentru gestionarea răspunsurilor
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
    } catch (e) {
      errorMessage = `HTTP error! status: ${response.status}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

// Funcție helper pentru construirea URL-urilor
const buildUrl = (endpoint) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  return url;
};

// Serviciul API principal
const apiService = {
  // GET request
  get: async (endpoint, options = {}) => {
    const url = buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'GET',
      headers: addHeaders(options.headers),
      ...options
    });
    return handleResponse(response);
  },

  // POST request
  post: async (endpoint, data, options = {}) => {
    const url = buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'POST',
      headers: addHeaders(options.headers),
      body: JSON.stringify(data),
      ...options
    });
    return handleResponse(response);
  },

  // PUT request
  put: async (endpoint, data, options = {}) => {
    const url = buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'PUT',
      headers: addHeaders(options.headers),
      body: JSON.stringify(data),
      ...options
    });
    return handleResponse(response);
  },

  // DELETE request
  delete: async (endpoint, options = {}) => {
    const url = buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: addHeaders(options.headers),
      ...options
    });
    return handleResponse(response);
  },

  // Upload file (multipart/form-data)
  upload: async (endpoint, formData, options = {}) => {
    const url = buildUrl(endpoint);
    const headers = addHeaders();
    // Ștergem Content-Type pentru că va fi setat automat cu boundary-ul corect
    delete headers['Content-Type'];
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: formData,
      ...options
    });
    return handleResponse(response);
  }
};

export default apiService; 