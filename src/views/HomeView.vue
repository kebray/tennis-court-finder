<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSearchStore } from '../stores/search'
import { useResultsStore } from '../stores/results'
import AppHeader from '../components/AppHeader.vue'
import SearchForm from '../components/SearchForm.vue'
import MapView from '../components/MapView.vue'
import ResultsTable from '../components/ResultsTable.vue'
import QuotaDisplay from '../components/QuotaDisplay.vue'
import AdminPanel from '../components/AdminPanel.vue'

const authStore = useAuthStore()
const searchStore = useSearchStore()
const resultsStore = useResultsStore()

const showAdmin = ref(false)
const notification = ref({ show: false, message: '', type: 'success' })

onMounted(() => {
  resultsStore.loadFromStorage()
  searchStore.fetchQuota()
})

watch(() => resultsStore.courts, () => {
  resultsStore.saveToStorage()
}, { deep: true })

async function handleSearch() {
  try {
    const courts = await searchStore.searchTennisCourts()
    resultsStore.setCourts(courts)

    if (courts.length === 0) {
      showNotification('No tennis courts found in this area. Try expanding your search distance.', 'info')
    } else {
      showNotification(`Found ${courts.length} tennis court${courts.length === 1 ? '' : 's'}!`, 'success')
    }
  } catch (err) {
    showNotification(err.message, 'error')
  }
}

function handleExportCSV() {
  resultsStore.exportToCSV()
  showNotification('CSV file downloaded!', 'success')
}

function handleCopyAddresses() {
  const count = resultsStore.copyAddressesToClipboard()
  showNotification(`${count} addresses copied to clipboard!`, 'success')
}

function showNotification(message, type = 'success') {
  notification.value = { show: true, message, type }
  setTimeout(() => {
    notification.value.show = false
  }, 4000)
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <AppHeader @toggle-admin="showAdmin = !showAdmin" />

    <!-- Notification Toast -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-[-100%] opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-[-100%] opacity-0"
    >
      <div
        v-if="notification.show"
        class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg"
        :class="{
          'bg-green-600 text-white': notification.type === 'success',
          'bg-red-600 text-white': notification.type === 'error',
          'bg-blue-600 text-white': notification.type === 'info'
        }"
      >
        {{ notification.message }}
      </div>
    </Transition>

    <!-- Admin Panel -->
    <AdminPanel v-if="showAdmin && authStore.isAdmin" @close="showAdmin = false" />

    <!-- Main Content -->
    <main class="flex-1 container mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Search & Results -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Quota Display -->
          <QuotaDisplay />

          <!-- Search Form -->
          <SearchForm @search="handleSearch" />

          <!-- Results Table -->
          <ResultsTable
            v-if="resultsStore.courts.length > 0"
            @export-csv="handleExportCSV"
            @copy-addresses="handleCopyAddresses"
          />
        </div>

        <!-- Right Column: Map -->
        <div class="lg:col-span-2">
          <MapView />
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 py-4">
      <div class="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
        <p>&copy; {{ new Date().getFullYear() }} Tennis Court Finder</p>
        <div class="flex space-x-4 mt-2 sm:mt-0">
          <router-link to="/about" class="hover:text-gray-700">About</router-link>
          <router-link to="/terms" class="hover:text-gray-700">Terms of Use</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>
