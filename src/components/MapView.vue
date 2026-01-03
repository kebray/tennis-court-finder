<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import { useSearchStore } from '../stores/search'
import { useResultsStore } from '../stores/results'

const searchStore = useSearchStore()
const resultsStore = useResultsStore()

const mapContainer = ref(null)
const map = ref(null)
const markers = ref([])
const isSatellite = ref(true)

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Court type colors
const typeColors = {
  private: '#22c55e', // green
  public: '#3b82f6',  // blue
  club: '#f97316'     // orange
}

onMounted(() => {
  mapboxgl.accessToken = MAPBOX_TOKEN

  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [-98.5795, 39.8283], // Center of US
    zoom: 4
  })

  map.value.addControl(new mapboxgl.NavigationControl(), 'top-right')
  map.value.addControl(new mapboxgl.ScaleControl(), 'bottom-left')
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
  }
})

// Watch for search center changes
watch(() => searchStore.searchCenter, (center) => {
  if (center && map.value) {
    map.value.flyTo({
      center: [center.lng, center.lat],
      zoom: 11,
      duration: 1500
    })
  }
})

// Watch for court results changes
watch(() => resultsStore.filteredCourts, (courts) => {
  updateMarkers(courts)
}, { deep: true })

// Watch for selected court changes - zoom to location when row is clicked
watch(() => resultsStore.selectedCourt, (court) => {
  if (court && map.value) {
    map.value.flyTo({
      center: [court.lng, court.lat],
      zoom: 16,
      duration: 1000
    })

    // Open the popup for the selected marker
    const marker = markers.value.find(m => {
      const lngLat = m.getLngLat()
      return lngLat.lng === court.lng && lngLat.lat === court.lat
    })
    if (marker) {
      marker.togglePopup()
    }
  }
})

function updateMarkers(courts) {
  // Remove existing markers
  markers.value.forEach(marker => marker.remove())
  markers.value = []

  if (!map.value || !courts.length) return

  // Add new markers
  courts.forEach(court => {
    const color = typeColors[court.type] || '#6b7280'

    // Create marker element
    const el = document.createElement('div')
    el.className = 'court-marker'
    el.style.cssText = `
      width: 24px;
      height: 24px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: box-shadow 0.2s, border-width 0.2s;
    `
    el.addEventListener('mouseenter', () => {
      el.style.boxShadow = '0 0 0 4px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.4)'
      el.style.borderWidth = '3px'
    })
    el.addEventListener('mouseleave', () => {
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
      el.style.borderWidth = '2px'
    })

    // Create popup
    const courtCountText = court.courtCount > 1 ? ` (${court.courtCount} courts)` : ''
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div class="p-2">
        <p class="font-semibold text-gray-900">${court.address || 'Unknown Address'}</p>
        <p class="text-sm text-gray-600 capitalize">${court.type || 'Unknown'}${courtCountText}</p>
        ${court.distance ? `<p class="text-sm text-gray-500">${court.distance.toFixed(1)} miles away</p>` : ''}
        ${court.verified ? '<p class="text-xs text-green-600 mt-1">✓ Verified</p>' : ''}
      </div>
    `)

    const marker = new mapboxgl.Marker(el)
      .setLngLat([court.lng, court.lat])
      .setPopup(popup)
      .addTo(map.value)

    // Select court on click
    el.addEventListener('click', () => {
      resultsStore.selectCourt(court)
    })

    markers.value.push(marker)
  })

  // Fit bounds to show all markers
  if (courts.length > 0) {
    const bounds = new mapboxgl.LngLatBounds()
    courts.forEach(court => {
      bounds.extend([court.lng, court.lat])
    })

    // Add search center to bounds
    if (searchStore.searchCenter) {
      bounds.extend([searchStore.searchCenter.lng, searchStore.searchCenter.lat])
    }

    map.value.fitBounds(bounds, {
      padding: 50,
      maxZoom: 14
    })
  }
}

function toggleMapStyle() {
  if (!map.value) return

  // Save current view state before changing style
  const savedCenter = [map.value.getCenter().lng, map.value.getCenter().lat]
  const savedZoom = map.value.getZoom()
  const savedPitch = map.value.getPitch()
  const savedBearing = map.value.getBearing()

  isSatellite.value = !isSatellite.value

  const style = isSatellite.value
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12'

  // Function to restore the view state
  const restoreView = () => {
    // Set each property individually to ensure they stick
    map.value.setCenter(savedCenter)
    map.value.setZoom(savedZoom)
    map.value.setPitch(savedPitch)
    map.value.setBearing(savedBearing)
    updateMarkers(resultsStore.filteredCourts)
  }

  // Set the new style
  map.value.setStyle(style)

  // Wait for style to load, then restore view with a delay
  map.value.once('style.load', () => {
    // First restore immediately
    restoreView()

    // Then restore again after a short delay to override any Mapbox animations
    setTimeout(() => {
      map.value.setCenter(savedCenter)
      map.value.setZoom(savedZoom)
    }, 50)
  })
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm overflow-hidden h-[600px] relative">
    <!-- Map Container -->
    <div ref="mapContainer" class="w-full h-full"></div>

    <!-- Map Controls Overlay -->
    <div class="absolute top-4 left-4 z-10 space-y-2">
      <!-- Satellite Toggle -->
      <button
        @click="toggleMapStyle"
        class="px-3 py-2 bg-white rounded-lg shadow-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center"
      >
        <svg v-if="!isSatellite" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
        {{ isSatellite ? 'Street View' : 'Satellite View' }}
      </button>
    </div>

    <!-- Legend -->
    <div class="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-3">
      <p class="text-xs font-semibold text-gray-700 mb-2">Legend</p>
      <div class="space-y-1">
        <div class="flex items-center text-xs">
          <span class="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
          <span class="text-gray-600">Private Residential</span>
        </div>
        <div class="flex items-center text-xs">
          <span class="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
          <span class="text-gray-600">Public Facility</span>
        </div>
        <div class="flex items-center text-xs">
          <span class="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
          <span class="text-gray-600">Private Club</span>
        </div>
      </div>
    </div>

    <!-- No Results Message -->
    <div
      v-if="resultsStore.courts.length === 0"
      class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75"
    >
      <div class="text-center p-6">
        <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <p class="text-gray-600 font-medium">Enter an address to search for tennis courts</p>
        <p class="text-sm text-gray-500 mt-1">Results will appear on the map</p>
      </div>
    </div>
  </div>
</template>
