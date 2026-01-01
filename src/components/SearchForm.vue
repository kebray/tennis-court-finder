<script setup>
import { ref } from 'vue'
import { useSearchStore } from '../stores/search'

const emit = defineEmits(['search'])

const searchStore = useSearchStore()
const showTooltip = ref(false)
const isExpanded = ref(true)

const distanceOptions = [5, 10, 15, 20, 25, 30, 50]

function handleSubmit() {
  emit('search')
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm overflow-hidden">
    <!-- Collapsible Header -->
    <button
      type="button"
      @click="toggleExpanded"
      class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition"
    >
      <h2 class="text-lg font-semibold text-gray-900">Find Tennis Courts</h2>
      <svg
        class="w-5 h-5 text-gray-500 transition-transform duration-200"
        :class="{ 'rotate-180': isExpanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    <!-- Collapsible Content -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-96 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="max-h-96 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-show="isExpanded" class="px-6 pb-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Address Input -->
      <div>
        <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
          Starting Address or Zip Code
        </label>
        <input
          id="address"
          v-model="searchStore.searchAddress"
          type="text"
          placeholder="e.g., 123 Main St, Austin, TX or 78701"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
          :disabled="searchStore.loading"
        />
      </div>

      <!-- Distance Selector -->
      <div>
        <label for="distance" class="block text-sm font-medium text-gray-700 mb-1">
          Maximum Driving Distance
        </label>
        <select
          id="distance"
          v-model="searchStore.searchDistance"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition bg-white"
          :disabled="searchStore.loading"
        >
          <option v-for="d in distanceOptions" :key="d" :value="d">
            {{ d }} miles
          </option>
        </select>
      </div>

      <!-- Search Button -->
      <div class="flex items-center space-x-2">
        <button
          type="submit"
          :disabled="searchStore.loading || !searchStore.canSearch || !searchStore.searchAddress"
          class="flex-1 py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <span v-if="searchStore.loading" class="flex items-center justify-center">
            <span class="spinner w-5 h-5 mr-2"></span>
            Searching...
          </span>
          <span v-else class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Search Tennis Courts
          </span>
        </button>

        <!-- Info Tooltip -->
        <div class="relative">
          <button
            type="button"
            @mouseenter="showTooltip = true"
            @mouseleave="showTooltip = false"
            @focus="showTooltip = true"
            @blur="showTooltip = false"
            class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>

          <!-- Tooltip -->
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div
              v-if="showTooltip"
              class="absolute right-0 bottom-full mb-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10"
            >
              <p class="leading-relaxed">
                Results are based on OpenStreetMap community data. Coverage is best in metropolitan areas and may be limited in rural regions.
              </p>
              <div class="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Quota Warning -->
      <p
        v-if="!searchStore.canSearch"
        class="text-sm text-amber-600 flex items-center"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        Daily search limit reached. Resets at midnight UTC.
      </p>

      <!-- Error Display -->
      <p
        v-if="searchStore.error"
        class="text-sm text-red-600 flex items-center"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {{ searchStore.error }}
      </p>
        </form>
      </div>
    </Transition>
  </div>
</template>
