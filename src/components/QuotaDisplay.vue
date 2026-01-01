<script setup>
import { computed } from 'vue'
import { useSearchStore } from '../stores/search'

const searchStore = useSearchStore()

const percentUsed = computed(() => {
  if (!searchStore.quota.limit) return 0
  return Math.round((searchStore.quota.used / searchStore.quota.limit) * 100)
})

const barColor = computed(() => {
  if (percentUsed.value >= 90) return 'bg-red-500'
  if (percentUsed.value >= 70) return 'bg-amber-500'
  return 'bg-primary-500'
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-4">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium text-gray-700">Daily Search Quota</span>
      <span class="text-sm text-gray-500">
        {{ searchStore.quotaRemaining }} of {{ searchStore.quota.limit }} remaining
      </span>
    </div>

    <!-- Progress Bar -->
    <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        :class="['h-full rounded-full transition-all duration-300', barColor]"
        :style="{ width: `${percentUsed}%` }"
      ></div>
    </div>

    <!-- Warning -->
    <p
      v-if="percentUsed >= 90"
      class="mt-2 text-xs text-red-600"
    >
      You're running low on searches. Quota resets at midnight UTC.
    </p>
  </div>
</template>
