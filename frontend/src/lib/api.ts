import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8001/api/v1'

export const AUTH_TOKEN_KEY = 'auth_token'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      const current = window.location.pathname
      if (!current.startsWith('/login') && !current.startsWith('/register')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined

    if (responseData?.errors) {
      const firstErrorGroup = Object.values(responseData.errors)[0]
      if (firstErrorGroup && firstErrorGroup.length > 0) {
        return firstErrorGroup[0] ?? 'Validation error.'
      }
    }

    if (responseData?.message) {
      return responseData.message
    }
  }

  return 'Something went wrong. Please try again.'
}
