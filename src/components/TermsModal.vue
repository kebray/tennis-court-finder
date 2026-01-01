<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const showModal = ref(false)
const STORAGE_KEY = 'tennis-court-finder-terms-accepted'

onMounted(() => {
  checkTermsAcceptance()
})

watch(() => authStore.isAuthenticated, () => {
  checkTermsAcceptance()
})

function checkTermsAcceptance() {
  if (!authStore.isAuthenticated) {
    showModal.value = false
    return
  }

  const accepted = localStorage.getItem(STORAGE_KEY)
  if (!accepted) {
    showModal.value = true
  }
}

function acceptTerms() {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString())
  showModal.value = false
}
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Terms of Use</h2>
          <p class="text-sm text-gray-500 mt-1">Please review and accept before continuing</p>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4 text-sm text-gray-600">
          <p>
            By using Tennis Court Finder, you agree to the following terms:
          </p>

          <div class="bg-gray-50 rounded-lg p-4 space-y-3">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span><strong>Respectful Use:</strong> You will use this service only for lawful purposes and treat property owners with respect.</span>
            </div>

            <div class="flex items-start">
              <svg class="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span><strong>No Harassment:</strong> You will not use addresses obtained to harass, stalk, or harm anyone.</span>
            </div>

            <div class="flex items-start">
              <svg class="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span><strong>Accept Refusals:</strong> You will gracefully accept "no" as an answer from property owners.</span>
            </div>

            <div class="flex items-start">
              <svg class="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span><strong>Data Accuracy:</strong> You understand that data may be inaccurate and will verify before taking action.</span>
            </div>

            <div class="flex items-start">
              <svg class="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span><strong>No Liability:</strong> The service is provided "as is" without warranties. You release the operators from liability.</span>
            </div>
          </div>

          <p class="text-xs text-gray-500">
            For the complete Terms of Use, please visit the
            <router-link to="/terms" class="text-primary-600 hover:underline">Terms of Use page</router-link>.
          </p>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            @click="acceptTerms"
            class="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition"
          >
            I Accept the Terms of Use
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
