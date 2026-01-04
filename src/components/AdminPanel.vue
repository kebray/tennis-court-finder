<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../utils/api'

const emit = defineEmits(['close'])

const authStore = useAuthStore()

const activeTab = ref('usage') // 'usage', 'logs', 'metrics'
const loading = ref(false)
const invalidating = ref(false)
const apiUsage = ref(null)
const error = ref(null)
const successMessage = ref(null)

// Logs state
const logsLoading = ref(false)
const dashboardData = ref(null)
const searchEmail = ref('')
const searchResults = ref(null)
const recentLogs = ref([])
const rotatingLogs = ref(false)

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

async function fetchDashboard() {
  logsLoading.value = true
  error.value = null

  try {
    const response = await api.get('/api/admin-logs?action=dashboard')
    dashboardData.value = response
    recentLogs.value = response.recentActivity || []
  } catch (err) {
    error.value = 'Failed to load usage logs'
  } finally {
    logsLoading.value = false
  }
}

async function searchLogs() {
  if (!searchEmail.value.trim()) return

  logsLoading.value = true
  error.value = null

  try {
    const response = await api.get(`/api/admin-logs?action=search-email&email=${encodeURIComponent(searchEmail.value)}&days=90`)
    searchResults.value = response
  } catch (err) {
    error.value = 'Failed to search logs'
  } finally {
    logsLoading.value = false
  }
}

function clearSearch() {
  searchEmail.value = ''
  searchResults.value = null
}

async function rotateLogs() {
  if (!confirm('This will archive old logs and generate metrics. Continue?')) {
    return
  }

  rotatingLogs.value = true
  error.value = null

  try {
    const response = await api.post('/api/admin-rotate-logs')
    successMessage.value = response.message || 'Logs rotated successfully'
    await fetchDashboard()
  } catch (err) {
    error.value = 'Failed to rotate logs: ' + (err.message || 'Unknown error')
  } finally {
    rotatingLogs.value = false
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function formatAction(action) {
  const actionLabels = {
    'login': 'Login',
    'search': 'Search',
    'waitlist': 'Waitlist Signup',
    'admin:rotate-logs': 'Log Rotation'
  }
  return actionLabels[action] || action
}

function getActionColor(action) {
  if (action === 'login') return 'bg-blue-100 text-blue-800'
  if (action === 'search') return 'bg-green-100 text-green-800'
  if (action === 'waitlist') return 'bg-purple-100 text-purple-800'
  if (action?.startsWith('admin:')) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

async function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'logs' && !dashboardData.value) {
    await fetchDashboard()
  }
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

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button
            @click="switchTab('usage')"
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition',
              activeTab === 'usage'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            API Usage
          </button>
          <button
            @click="switchTab('logs')"
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition',
              activeTab === 'logs'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Usage Logs
          </button>
          <button
            @click="switchTab('sessions')"
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition',
              activeTab === 'sessions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Sessions
          </button>
        </nav>
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

        <!-- API Usage Tab -->
        <section v-show="activeTab === 'usage'">
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

        <!-- Usage Logs Tab -->
        <section v-show="activeTab === 'logs'" class="space-y-6">
          <!-- Summary Cards -->
          <div v-if="dashboardData?.current" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-blue-50 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-blue-900">{{ dashboardData.current.uniqueUsers }}</p>
              <p class="text-sm text-blue-700">Unique Users (30d)</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-green-900">{{ dashboardData.current.totalSearches }}</p>
              <p class="text-sm text-green-700">Searches (30d)</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-purple-900">{{ dashboardData.current.totalLogins }}</p>
              <p class="text-sm text-purple-700">Logins (30d)</p>
            </div>
            <div class="bg-amber-50 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-amber-900">{{ dashboardData.current.avgResultsPerSearch }}</p>
              <p class="text-sm text-amber-700">Avg Results/Search</p>
            </div>
          </div>

          <!-- Top Users -->
          <div v-if="dashboardData?.current?.topUsers?.length" class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-3">Top Users (by searches)</h4>
            <div class="space-y-2">
              <div v-for="user in dashboardData.current.topUsers" :key="user.email" class="flex justify-between text-sm">
                <span class="text-gray-700">{{ user.email }}</span>
                <span class="font-medium text-gray-900">{{ user.count }} searches</span>
              </div>
            </div>
          </div>

          <!-- Search Logs -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-3">Search Logs by User</h4>
            <div class="flex space-x-2 mb-4">
              <input
                v-model="searchEmail"
                type="text"
                placeholder="Enter email to search..."
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                @keyup.enter="searchLogs"
              />
              <button
                @click="searchLogs"
                :disabled="logsLoading || !searchEmail.trim()"
                class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
              >
                Search
              </button>
              <button
                v-if="searchResults"
                @click="clearSearch"
                class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Clear
              </button>
            </div>

            <!-- Search Results -->
            <div v-if="searchResults" class="mb-4">
              <p class="text-sm text-gray-600 mb-2">Found {{ searchResults.count }} events for "{{ searchResults.searchEmail }}"</p>
              <div class="max-h-48 overflow-y-auto space-y-1">
                <div v-for="(log, idx) in searchResults.logs.slice(0, 50)" :key="idx" class="text-xs bg-white p-2 rounded border border-gray-200">
                  <div class="flex justify-between">
                    <span :class="['px-2 py-0.5 rounded text-xs', getActionColor(log.action)]">{{ formatAction(log.action) }}</span>
                    <span class="text-gray-500">{{ formatDate(log.timestamp) }}</span>
                  </div>
                  <div v-if="log.resultCount !== undefined" class="text-gray-600 mt-1">
                    {{ log.resultCount }} results
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-medium text-gray-900">Recent Activity</h4>
              <button
                @click="fetchDashboard"
                :disabled="logsLoading"
                class="text-sm text-primary-600 hover:text-primary-700"
              >
                Refresh
              </button>
            </div>

            <div v-if="logsLoading && !recentLogs.length" class="text-center py-4">
              <div class="spinner w-6 h-6 mx-auto"></div>
            </div>

            <div v-else-if="recentLogs.length" class="max-h-64 overflow-y-auto space-y-1">
              <div v-for="(log, idx) in recentLogs" :key="idx" class="text-xs bg-white p-2 rounded border border-gray-200">
                <div class="flex justify-between items-start">
                  <div>
                    <span :class="['px-2 py-0.5 rounded text-xs', getActionColor(log.action)]">{{ formatAction(log.action) }}</span>
                    <span class="text-gray-700 ml-2">{{ log.email }}</span>
                  </div>
                  <span class="text-gray-500">{{ formatDate(log.timestamp) }}</span>
                </div>
              </div>
            </div>

            <p v-else class="text-gray-500 text-center py-4 text-sm">
              No recent activity logged
            </p>
          </div>

          <!-- Log Rotation -->
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 class="font-medium text-amber-800 mb-2">Log Rotation</h4>
            <p class="text-sm text-amber-700 mb-3">
              Archive old logs and generate aggregate metrics. Logs older than 3 months will be archived, and metrics will be retained for 18 months.
            </p>
            <button
              @click="rotateLogs"
              :disabled="rotatingLogs"
              class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm flex items-center"
            >
              <span v-if="rotatingLogs" class="flex items-center">
                <span class="spinner w-4 h-4 mr-2 border-white border-t-transparent"></span>
                Rotating...
              </span>
              <span v-else>Rotate Logs Now</span>
            </button>
          </div>
        </section>

        <!-- Session Management Tab -->
        <section v-show="activeTab === 'sessions'">
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
