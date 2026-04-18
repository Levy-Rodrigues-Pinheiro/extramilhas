import axios, { AxiosError } from 'axios'
import { getSession } from 'next-auth/react'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data
    }
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Dashboard
export const getDashboardMetrics = () => api.get('/admin/dashboard')

// Users
export const getUsers = (params?: Record<string, unknown>) =>
  api.get('/admin/users', { params })
export const getUserById = (id: string) => api.get(`/admin/users/${id}`)
export const updateUserPlan = (id: string, plan: string) =>
  api.patch(`/admin/users/${id}/plan`, { plan })

// Offers
export const getOffers = (params?: Record<string, unknown>) =>
  api.get('/admin/offers', { params })
export const getOfferById = (id: string) => api.get(`/admin/offers/${id}`)
export const createOffer = (data: Record<string, unknown>) =>
  api.post('/admin/offers', data)
export const updateOffer = (id: string, data: Record<string, unknown>) =>
  api.put(`/admin/offers/${id}`, data)
export const deleteOffer = (id: string) => api.delete(`/admin/offers/${id}`)

// Programs
export const getPrograms = (params?: Record<string, unknown>) =>
  api.get('/admin/programs', { params })
export const getProgramById = (id: string) => api.get(`/admin/programs/${id}`)
export const createProgram = (data: Record<string, unknown>) =>
  api.post('/admin/programs', data)
export const updateProgram = (id: string, data: Record<string, unknown>) =>
  api.put(`/admin/programs/${id}`, data)
export const toggleProgramStatus = (id: string) =>
  api.patch(`/admin/programs/${id}/toggle`)

// Articles
export const getArticles = (params?: Record<string, unknown>) =>
  api.get('/admin/articles', { params })
export const getArticleById = (id: string) => api.get(`/admin/articles/${id}`)
export const createArticle = (data: Record<string, unknown>) =>
  api.post('/admin/articles', data)
export const updateArticle = (id: string, data: Record<string, unknown>) =>
  api.put(`/admin/articles/${id}`, data)
export const deleteArticle = (id: string) => api.delete(`/admin/articles/${id}`)

// Notifications
export const sendNotification = (data: Record<string, unknown>) =>
  api.post('/admin/notifications/broadcast', data)
export const getNotificationHistory = (params?: Record<string, unknown>) =>
  api.get('/admin/notifications/history', { params })

// Award Charts
export const getAwardCharts = (params?: Record<string, unknown>) =>
  api.get('/admin/award-charts', { params })
export const createAwardChart = (data: Record<string, unknown>) =>
  api.post('/admin/award-charts', data)
export const updateAwardChart = (id: string, data: Record<string, unknown>) =>
  api.put(`/admin/award-charts/${id}`, data)
export const deleteAwardChart = (id: string) =>
  api.delete(`/admin/award-charts/${id}`)
