import axios from 'axios';

const API = axios.create({
    baseURL:         import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true, // Send HTTP-only cookies automatically
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─── Request Interceptor: Attach JWT from localStorage ────
API.interceptors.request.use(
    (config) => {
        const profile = localStorage.getItem('placeiq_profile');
        if (profile) {
            try {
                const { token } = JSON.parse(profile);
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch {
                // Silently ignore malformed profile data
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 (auto logout) ──────
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear stale auth data
            localStorage.removeItem('placeiq_profile');
            // Only redirect if not already on login/register page
            const publicPaths = ['/login', '/register', '/'];
            if (!publicPaths.includes(window.location.pathname)) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default API;
