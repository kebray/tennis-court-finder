<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const status = ref('verifying') // 'verifying', 'success', 'error'
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Invalid or missing verification token.'
    return
  }

  try {
    await authStore.verifyToken(token)
    status.value = 'success'

    // Redirect to home after brief delay
    setTimeout(() => {
      router.push({ name: 'home' })
    }, 1500)
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err.message || 'Verification failed. The link may have expired.'
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
    <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
      <!-- Verifying -->
      <template v-if="status === 'verifying'">
        <div class="spinner w-12 h-12 mx-auto mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Verifying your link...</h2>
        <p class="text-gray-600">Please wait while we sign you in.</p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">You're signed in!</h2>
        <p class="text-gray-600">Redirecting you to the app...</p>
      </template>

      <!-- Error -->
      <template v-else-if="status === 'error'">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
        <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
        <router-link
          to="/login"
          class="inline-block py-2 px-6 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition"
        >
          Back to Login
        </router-link>
      </template>
    </div>
  </div>
</template>
