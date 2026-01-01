<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../utils/api'

const emit = defineEmits(['close'])

const authStore = useAuthStore()

const loading = ref(false)
const invalidating = ref(false)
const apiUsage = ref(null)
const error = ref(null)
const successMessage = ref(null)

onMounted(async () => {
  await fetchApiUsage()
})

async function fetchApiUsage() {
  loading.value = true
  error.value = null

  try {
    const response = await api.get('/api/admin-usage')
    apiUsage.value = response
  } catch (err) {
    error.value = 'Failed to load API usage data'
  } finally {
    loading.value = false
  }
}

async function handleInvalidateAll() {
  if (!confirm('This will invalidate ALL active sessions, including your own. You will need to log in again. Continue?')) {
    return
  }

  invalidating.value = true
  error.value = null
  successMessage.value = null

  try {
    await authStore.invalidateAllTokens()
    successMessage.value = 'All tokens invalidated. Redirecting to login...'
    setTimeout(() => {
      window.location.href = '/login'
    }, 2000)
  } catch (err) {
    error.value = err.message || 'Failed to invalidate tokens'
  } finally {
    invalidating.value = false
  }
}

function formatNumber(num) {
  if (num === undefined || num === null) return '-'
  return num.toLocaleString()
}

function getUsagePercent(used, limit) {
  if (!limit) return 0
  return Math.round((used / limit) * 100)
}

function getUsageColor(percent) {
  if (percent >= 90) return 'text-red-600'
  if (percent >= 70) return 'text-amber-600'
  return 'text-green-600'
}
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900">Admin Panel</h2>
          <p class="text-sm text-gray-500">Manage application settings and view usage</p>
        </div>
        <button
          @click="emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Messages -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {{ error }}
        </div>
        <div v-if="successMessage" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {{ successMessage }}
        </div>

        <!-- API Usage Section -->
        <section>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">API Usage Dashboard</h3>
            <button
              @click="fetchApiUsage"
              :disabled="loading"
              class="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <svg :class="['w-4 h-4 mr-1', loading && 'animate-spin']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh
            </button>
          </div>

          <div v-if="loading && !apiUsage" class="text-center py-8">
            <div class="spinner w-8 h-8 mx-auto"></div>
            <p class="text-gray-500 mt-2">Loading usage data...</p>
          </div>

          <div v-else-if="apiUsage" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Mapbox Geocoding -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-gray-700">Mapbox Geocoding</span>
                <span :class="['text-sm font-semibold', getUsageColor(getUsagePercent(apiUsage.mapbox?.geocoding?.used, apiUsage.mapbox?.geocoding?.limit))]">
                  {{ getUsagePercent(apiUsage.mapbox?.geocoding?.used, apiUsage.mapbox?.geocoding?.limit) }}%
                </span>
              </div>
              <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  class="h-full bg-primary-500 rounded-full"
                  :style="{ width: `${getUsagePercent(apiUsage.mapbox?.geocoding?.used, apiUsage.mapbox?.geocoding?.limit)}%` }"
                ></div>
              </div>
              <p class="text-sm text-gray-500">
                {{ formatNumber(apiUsage.mapbox?.geocoding?.used) }} / {{ formatNumber(apiUsage.mapbox?.geocoding?.limit) }} requests
              </p>
            </div>

            <!-- Mapbox Map Loads -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-gray-700">Mapbox Map Loads</span>
                <span :class="['text-sm font-semibold', getUsageColor(getUsagePercent(apiUsage.mapbox?.mapLoads?.used, apiUsage.mapbox?.mapLoads?.limit))]">
                  {{ getUsagePercent(apiUsage.mapbox?.mapLoads?.used, apiUsage.mapbox?.mapLoads?.limit) }}%
                </span>
              </div>
              <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  class="h-full bg-primary-500 rounded-full"
                  :style="{ width: `${getUsagePercent(apiUsage.mapbox?.mapLoads?.used, apiUsage.mapbox?.mapLoads?.limit)}%` }"
                ></div>
              </div>
              <p class="text-sm text-gray-500">
                {{ formatNumber(apiUsage.mapbox?.mapLoads?.used) }} / {{ formatNumber(apiUsage.mapbox?.mapLoads?.limit) }} loads
              </p>
            </div>

            <!-- Overpass API -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-gray-700">Overpass API (Today)</span>
                <span class="text-sm text-gray-500">Fair Use</span>
              </div>
              <p class="text-2xl font-bold text-gray-900">
                {{ formatNumber(apiUsage.overpass?.requestsToday) }}
              </p>
              <p class="text-sm text-gray-500">requests today</p>
            </div>

            <!-- Resend Email -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-gray-700">Resend Emails</span>
                <span :class="['text-sm font-semibold', getUsageColor(getUsagePercent(apiUsage.resend?.sent, apiUsage.resend?.limit))]">
                  {{ getUsagePercent(apiUsage.resend?.sent, apiUsage.resend?.limit) }}%
                </span>
              </div>
              <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  class="h-full bg-primary-500 rounded-full"
                  :style="{ width: `${getUsagePercent(apiUsage.resend?.sent, apiUsage.resend?.limit)}%` }"
                ></div>
              </div>
              <p class="text-sm text-gray-500">
                {{ formatNumber(apiUsage.resend?.sent) }} / {{ formatNumber(apiUsage.resend?.limit) }} emails this month
              </p>
            </div>
          </div>

          <p v-else class="text-gray-500 text-center py-4">
            Unable to load API usage data
          </p>
        </section>

        <!-- Session Management -->
        <section class="border-t border-gray-200 pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Session Management</h3>

          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 class="font-medium text-red-800 mb-2">Invalidate All Sessions</h4>
            <p class="text-sm text-red-700 mb-4">
              This will immediately log out all users, including yourself. Use this if you suspect unauthorized access or need to force everyone to re-authenticate.
            </p>
            <button
              @click="handleInvalidateAll"
              :disabled="invalidating"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
            >
              <span v-if="invalidating" class="flex items-center">
                <span class="spinner w-4 h-4 mr-2 border-white border-t-transparent"></span>
                Invalidating...
              </span>
              <span v-else class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                </svg>
                Invalidate All Tokens
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
