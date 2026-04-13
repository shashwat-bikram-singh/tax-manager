import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

// Get base URL from environment variable or use default
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:44398"

// Create axios instance
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add Bearer token to all requests (except login)
axiosInstance.interceptors.request.use(
    (config) => {
        // Don't add token for login endpoint
        if (config.url?.includes('/api/token')) {
            return config
        }
        const token = useAuthStore.getState().token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const { pathname } = window.location

            // Prevent infinite redirect loop
            if (pathname !== '/login') {
                useAuthStore.getState().logout()
                window.location.href = '/login'
            }
        }

        return Promise.reject(error)
    }
)


export default axiosInstance

