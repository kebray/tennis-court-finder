<script setup>
import { ref } from 'vue'
import { useResultsStore } from '../stores/results'

const emit = defineEmits(['export-csv', 'copy-addresses'])

const resultsStore = useResultsStore()
const copiedId = ref(null)

const typeLabels = {
  private: 'Private Residential',
  'multi-family': 'Multi-Family',
  public: 'Public Facility',
  club: 'Private Club'
}

const typeColors = {
  private: 'bg-green-100 text-green-800',
  'multi-family': 'bg-purple-100 text-purple-800',
  public: 'bg-blue-100 text-blue-800',
  club: 'bg-orange-100 text-orange-800'
}

function toggleSort(key) {
  if (resultsStore.sortBy === key) {
    resultsStore.toggleSortOrder()
  } else {
    resultsStore.setSort(key, 'asc')
  }
}

function getSortIcon(key) {
  if (resultsStore.sortBy !== key) return '↕'
  return resultsStore.sortOrder === 'asc' ? '↑' : '↓'
}

function copyAddress(court, event) {
  event.stopPropagation() // Prevent row click from triggering
  if (court.address) {
    navigator.clipboard.writeText(court.address)
    copiedId.value = court.id
    setTimeout(() => {
      copiedId.value = null
    }, 1500)
  }
}

function getGoogleMapsUrl(court) {
  // Use coordinates with satellite view enabled (!3m1!1e3 = satellite layer)
  return `https://www.google.com/maps/@${court.lat},${court.lng},18z/data=!3m1!1e3`
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-gray-900">
          Results
          <span class="text-sm font-normal text-gray-500">
            ({{ resultsStore.filteredCourts.length }} of {{ resultsStore.courtCounts.total }})
          </span>
        </h2>
        <div class="flex space-x-2">
          <button
            @click="emit('copy-addresses')"
            class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
            </svg>
            Copy
          </button>
          <button
            @click="emit('export-csv')"
            class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- Coverage Notice -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        Found {{ resultsStore.courtCounts.total }} tennis courts. Note: Data coverage varies by region—metro areas typically have more complete data.
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2 mt-3">
        <button
          @click="resultsStore.setFilter('type', 'all')"
          :class="[
            'px-3 py-1 text-sm rounded-full transition',
            resultsStore.filters.type === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
        >
          All ({{ resultsStore.courtCounts.total }})
        </button>
        <button
          @click="resultsStore.setFilter('type', 'private')"
          :class="[
            'px-3 py-1 text-sm rounded-full transition',
            resultsStore.filters.type === 'private'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          ]"
        >
          Private ({{ resultsStore.courtCounts.private }})
        </button>
        <button
          @click="resultsStore.setFilter('type', 'multi-family')"
          :class="[
            'px-3 py-1 text-sm rounded-full transition',
            resultsStore.filters.type === 'multi-family'
              ? 'bg-purple-600 text-white'
              : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
          ]"
        >
          Multi-Family ({{ resultsStore.courtCounts['multi-family'] }})
        </button>
        <button
          @click="resultsStore.setFilter('type', 'public')"
          :class="[
            'px-3 py-1 text-sm rounded-full transition',
            resultsStore.filters.type === 'public'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          ]"
        >
          Public ({{ resultsStore.courtCounts.public }})
        </button>
        <button
          @click="resultsStore.setFilter('type', 'club')"
          :class="[
            'px-3 py-1 text-sm rounded-full transition',
            resultsStore.filters.type === 'club'
              ? 'bg-orange-600 text-white'
              : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
          ]"
        >
          Club ({{ resultsStore.courtCounts.club }})
        </button>
        <label class="flex items-center px-3 py-1 text-sm text-gray-700">
          <input
            type="checkbox"
            :checked="resultsStore.filters.hasRealAddress"
            @change="resultsStore.setFilter('hasRealAddress', $event.target.checked)"
            class="mr-2 rounded text-primary-600 focus:ring-primary-500"
          />
          With address ({{ resultsStore.withAddressCount }})
          <span class="relative ml-1 group">
            <svg class="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              Only show courts with actual street<br/>addresses. Excludes results that only<br/>have latitude/longitude coordinates.
            </span>
          </span>
        </label>
        <label class="flex items-center px-3 py-1 text-sm text-gray-700">
          <input
            type="checkbox"
            :checked="resultsStore.filters.verified"
            @change="resultsStore.setFilter('verified', $event.target.checked)"
            class="mr-2 rounded text-primary-600 focus:ring-primary-500"
          />
          Verified ({{ resultsStore.verifiedCount }})
          <span class="relative ml-1 group">
            <svg class="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              Verified courts have explicit access tags in<br/>OpenStreetMap data (e.g., "access=private").<br/>Unverified classifications are inferred from<br/>names, operators, or other metadata.
            </span>
          </span>
        </label>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto max-h-80 overflow-y-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 sticky top-0">
          <tr>
            <th
              @click="toggleSort('address')"
              class="px-4 py-2 text-left text-gray-700 font-medium cursor-pointer hover:bg-gray-100"
            >
              Address {{ getSortIcon('address') }}
            </th>
            <th
              @click="toggleSort('type')"
              class="px-4 py-2 text-left text-gray-700 font-medium cursor-pointer hover:bg-gray-100"
            >
              Type {{ getSortIcon('type') }}
            </th>
            <th
              @click="toggleSort('distance')"
              class="px-4 py-2 text-left text-gray-700 font-medium cursor-pointer hover:bg-gray-100"
            >
              Distance {{ getSortIcon('distance') }}
            </th>
            <th class="px-2 py-2 text-center text-gray-700 font-medium w-12">
              Copy
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="court in resultsStore.filteredCourts"
            :key="court.id"
            @click="resultsStore.selectCourt(court)"
            :class="[
              'cursor-pointer transition',
              resultsStore.selectedCourt?.id === court.id
                ? 'bg-primary-50'
                : 'hover:bg-gray-50'
            ]"
          >
            <td class="px-4 py-3">
              <div class="flex flex-col">
                <div class="flex items-start">
                  <span class="text-gray-900">{{ court.address || 'Unknown Address' }}</span>
                  <a
                    :href="getGoogleMapsUrl(court)"
                    target="_blank"
                    rel="noopener noreferrer"
                    @click.stop
                    class="ml-2 text-gray-400 hover:text-blue-600 transition"
                    title="Open in Google Maps"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                  <span
                    v-if="court.verified"
                    class="ml-1 text-green-600"
                    title="Verified"
                  >
                    ✓
                  </span>
                  <span
                    v-if="court.addressType === 'poi'"
                    class="ml-1 text-xs text-amber-600"
                    title="This is a point of interest, not an exact street address"
                  >
                    (POI)
                  </span>
                </div>
                <span v-if="court.coords && court.address !== court.coords" class="text-xs text-gray-400 mt-0.5">
                  {{ court.coords }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-col items-start">
                <span :class="['px-2 py-1 rounded-full text-xs font-medium', typeColors[court.type] || 'bg-gray-100 text-gray-800']">
                  {{ typeLabels[court.type] || court.type || 'Unknown' }}
                </span>
                <span v-if="court.courtCount > 1" class="text-xs text-gray-500 mt-1">
                  {{ court.courtCount }} courts
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-gray-600">
              {{ court.distance ? `${court.distance.toFixed(1)} mi` : '-' }}
            </td>
            <td class="px-2 py-3 text-center">
              <button
                @click="copyAddress(court, $event)"
                class="p-1.5 rounded-lg hover:bg-gray-200 transition"
                :title="copiedId === court.id ? 'Copied!' : 'Copy address'"
              >
                <svg
                  v-if="copiedId !== court.id"
                  class="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                <svg
                  v-else
                  class="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div
        v-if="resultsStore.filteredCourts.length === 0"
        class="p-8 text-center text-gray-500"
      >
        No courts match the current filters.
      </div>
    </div>
  </div>
</template>
