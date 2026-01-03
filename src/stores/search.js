import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../utils/api'

export const useSearchStore = defineStore('search', () => {
  const searchAddress = ref('')
  const searchDistance = ref(10) // miles
  const searchCenter = ref(null) // { lat, lng }
  const loading = ref(false)
  const error = ref(null)
  const quota = ref({
    used: 0,
    limit: 10,
    resetTime: null
  })

  const quotaRemaining = computed(() => quota.value.limit - quota.value.used)
  const canSearch = computed(() => quotaRemaining.value > 0)

  // Check if input looks like lat/long coordinates
  function parseCoordinates(input) {
    // Match patterns like "30.44833, -97.75740" or "30.44833,-97.75740"
    const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
    const match = input.trim().match(coordPattern)

    if (match) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])

      // Validate reasonable lat/lng ranges
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    }

    return null
  }

  async function geocodeAddress(address) {
    // First check if input is lat/long coordinates
    const coords = parseCoordinates(address)
    if (coords) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        placeName: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
      }
    }

    // Otherwise geocode the address via Mapbox
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    const encoded = encodeURIComponent(address)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=US&types=address,postcode,place&access_token=${token}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      return {
        lat,
        lng,
        placeName: data.features[0].place_name
      }
    }

    throw new Error('Address not found')
  }

  async function searchTennisCourts() {
    if (!canSearch.value) {
      throw new Error('Daily search limit reached. Please try again tomorrow.')
    }

    if (!searchAddress.value) {
      throw new Error('Please enter an address or zip code')
    }

    loading.value = true
    error.value = null

    try {
      // First geocode the address
      const location = await geocodeAddress(searchAddress.value)
      searchCenter.value = location

      // Search for tennis courts via our API
      const response = await api.post('/api/search-courts', {
        lat: location.lat,
        lng: location.lng,
        distanceMiles: searchDistance.value
      })

      // Update quota
      if (response.quota) {
        quota.value = response.quota
      }

      return response.courts || []
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchQuota() {
    try {
      const response = await api.get('/api/quota')
      quota.value = response
    } catch (err) {
      // Ignore quota fetch errors
    }
  }

  function clearError() {
    error.value = null
  }

  function reset() {
    searchAddress.value = ''
    searchDistance.value = 10
    searchCenter.value = null
    error.value = null
  }

  return {
    searchAddress,
    searchDistance,
    searchCenter,
    loading,
    error,
    quota,
    quotaRemaining,
    canSearch,
    geocodeAddress,
    searchTennisCourts,
    fetchQuota,
    clearError,
    reset
  }
})
