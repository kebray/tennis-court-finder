import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../utils/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.isAdmin || false)
  const userEmail = computed(() => user.value?.email || null)

  async function checkAuth() {
    if (initialized.value) return

    try {
      loading.value = true
      const response = await api.get('/api/auth-check')
      if (response.authenticated) {
        user.value = {
          email: response.email,
          isAdmin: response.isAdmin
        }
      }
    } catch (err) {
      // Not authenticated, that's fine
      user.value = null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function requestMagicLink(email) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/api/auth-request-link', { email })
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function verifyToken(token) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/api/auth-verify', { token })
      if (response.success) {
        user.value = {
          email: response.email,
          isAdmin: response.isAdmin
        }
      }
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await api.post('/api/auth-logout')
    } catch (err) {
      // Ignore logout errors
    } finally {
      user.value = null
    }
  }

  async function invalidateAllTokens() {
    if (!isAdmin.value) {
      throw new Error('Admin access required')
    }

    loading.value = true
    error.value = null

    try {
      const response = await api.post('/api/auth-invalidate-all')
      // After invalidating, we need to log out
      user.value = null
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    initialized,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    userEmail,
    checkAuth,
    requestMagicLink,
    verifyToken,
    logout,
    invalidateAllTokens,
    clearError
  }
})
