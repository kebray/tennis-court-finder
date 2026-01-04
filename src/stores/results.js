import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useResultsStore = defineStore('results', () => {
  const courts = ref([])
  const selectedCourt = ref(null)
  const filters = ref({
    type: 'all', // 'all', 'private', 'multi-family', 'public', 'club'
    verified: false,
    hasRealAddress: false // filter to only show courts with actual addresses (not lat/long)
  })
  const sortBy = ref('distance') // 'distance', 'type', 'address'
  const sortOrder = ref('asc')

  const filteredCourts = computed(() => {
    let result = [...courts.value]

    // Apply type filter
    if (filters.value.type !== 'all') {
      result = result.filter(court => court.type === filters.value.type)
    }

    // Apply verified filter
    if (filters.value.verified) {
      result = result.filter(court => court.verified)
    }

    // Apply real address filter (exclude lat/long only entries)
    if (filters.value.hasRealAddress) {
      result = result.filter(court => {
        // If address equals coords, it's just lat/long
        if (!court.address || court.address === court.coords) return false
        // Check if address looks like coordinates (starts with numbers and comma)
        const coordsPattern = /^-?\d+\.\d+,\s*-?\d+\.\d+$/
        return !coordsPattern.test(court.address)
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy.value) {
        case 'distance':
          comparison = (a.distance || 0) - (b.distance || 0)
          break
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '')
          break
        case 'address':
          comparison = (a.address || '').localeCompare(b.address || '')
          break
      }
      return sortOrder.value === 'asc' ? comparison : -comparison
    })

    return result
  })

  // Helper to check if court has a real address (not just lat/long)
  function hasRealAddress(court) {
    if (!court.address || court.address === court.coords) return false
    const coordsPattern = /^-?\d+\.\d+,\s*-?\d+\.\d+$/
    return !coordsPattern.test(court.address)
  }

  const courtCounts = computed(() => ({
    total: courts.value.length,
    private: courts.value.filter(c => c.type === 'private').length,
    'multi-family': courts.value.filter(c => c.type === 'multi-family').length,
    public: courts.value.filter(c => c.type === 'public').length,
    club: courts.value.filter(c => c.type === 'club').length,
    verified: courts.value.filter(c => c.verified).length
  }))

  // Separate computed for withAddress count that respects current filters
  const withAddressCount = computed(() => {
    const typeFilter = filters.value.type
    const verifiedFilter = filters.value.verified

    let filtered = courts.value

    if (typeFilter !== 'all') {
      filtered = filtered.filter(court => court.type === typeFilter)
    }

    if (verifiedFilter) {
      filtered = filtered.filter(court => court.verified)
    }

    return filtered.filter(c => hasRealAddress(c)).length
  })

  // Separate computed for verified count that respects current type filter
  const verifiedCount = computed(() => {
    const typeFilter = filters.value.type

    let filtered = courts.value

    if (typeFilter !== 'all') {
      filtered = filtered.filter(court => court.type === typeFilter)
    }

    return filtered.filter(c => c.verified).length
  })

  function setCourts(newCourts) {
    courts.value = newCourts.map((court, index) => ({
      ...court,
      id: court.id || `court-${index}`
    }))
  }

  function selectCourt(court) {
    // Clear first to ensure reactivity triggers even when clicking the same row
    selectedCourt.value = null
    // Use nextTick-like behavior to ensure the watcher fires
    setTimeout(() => {
      selectedCourt.value = court
    }, 0)
  }

  function clearSelection() {
    selectedCourt.value = null
  }

  function setFilter(key, value) {
    filters.value[key] = value
  }

  function setSort(key, order = 'asc') {
    sortBy.value = key
    sortOrder.value = order
  }

  function toggleSortOrder() {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }

  function exportToCSV() {
    const headers = ['Address', 'Type', 'Verified', 'Distance (mi)', 'Latitude', 'Longitude']
    const rows = filteredCourts.value.map(court => [
      court.address || '',
      court.type || '',
      court.verified ? 'Yes' : 'No',
      court.distance?.toFixed(2) || '',
      court.lat || '',
      court.lng || ''
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tennis-courts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyAddressesToClipboard() {
    const addresses = filteredCourts.value
      .filter(court => court.address)
      .map(court => court.address)
      .join('\n')

    navigator.clipboard.writeText(addresses)
    return addresses.split('\n').length
  }

  function clear() {
    courts.value = []
    selectedCourt.value = null
    filters.value = { type: 'all', verified: false, hasRealAddress: false }
  }

  // Load from localStorage on init
  function loadFromStorage() {
    const saved = localStorage.getItem('tennis-court-results')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        courts.value = data.courts || []
      } catch (err) {
        // Ignore parse errors
      }
    }
  }

  // Save to localStorage
  function saveToStorage() {
    localStorage.setItem('tennis-court-results', JSON.stringify({
      courts: courts.value,
      savedAt: new Date().toISOString()
    }))
  }

  return {
    courts,
    selectedCourt,
    filters,
    sortBy,
    sortOrder,
    filteredCourts,
    courtCounts,
    withAddressCount,
    verifiedCount,
    setCourts,
    selectCourt,
    clearSelection,
    setFilter,
    setSort,
    toggleSortOrder,
    exportToCSV,
    copyAddressesToClipboard,
    clear,
    loadFromStorage,
    saveToStorage
  }
})
