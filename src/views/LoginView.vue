<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import WaitlistForm from '../components/WaitlistForm.vue'

const authStore = useAuthStore()

const email = ref('')
const submitted = ref(false)
const showWaitlist = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  if (!email.value) return

  errorMessage.value = ''

  try {
    const response = await authStore.requestMagicLink(email.value)

    if (response.success) {
      submitted.value = true
    } else if (response.notAllowed) {
      showWaitlist.value = true
    }
  } catch (err) {
    if (err.status === 403) {
      showWaitlist.value = true
    } else {
      errorMessage.value = err.message || 'Failed to send login link. Please try again.'
    }
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
    <div class="max-w-md w-full">
      <!-- Logo and Title -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <path stroke-width="2" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10"/>
            <ellipse cx="12" cy="12" rx="4" ry="10" stroke-width="2"/>
            <line x1="2" y1="12" x2="22" y2="12" stroke-width="2"/>
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900">Tennis Court Finder</h1>
        <p class="mt-2 text-gray-600">Find private tennis courts in your area</p>
      </div>

      <!-- Login Form -->
      <div v-if="!submitted && !showWaitlist" class="bg-white rounded-xl shadow-lg p-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Sign in to continue</h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              placeholder="you@example.com"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
              :disabled="authStore.loading"
            />
          </div>

          <div v-if="errorMessage" class="text-red-600 text-sm">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            :disabled="authStore.loading || !email"
            class="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <span v-if="authStore.loading" class="flex items-center justify-center">
              <span class="spinner w-5 h-5 mr-2"></span>
              Sending...
            </span>
            <span v-else>Send Magic Link</span>
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-gray-500">
          We'll email you a magic link to sign in instantly.
        </p>
      </div>

      <!-- Success Message -->
      <div v-else-if="submitted" class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
        <p class="text-gray-600 mb-4">
          We've sent a magic link to <strong>{{ email }}</strong>
        </p>
        <p class="text-sm text-gray-500">
          Click the link in the email to sign in. The link expires in 15 minutes.
        </p>
        <button
          @click="submitted = false; email = ''"
          class="mt-6 text-primary-600 hover:text-primary-700 font-medium text-sm"
        >
          Use a different email
        </button>
      </div>

      <!-- Waitlist Form -->
      <WaitlistForm
        v-else-if="showWaitlist"
        :initial-email="email"
        @back="showWaitlist = false; email = ''"
      />

      <!-- Footer -->
      <div class="mt-8 text-center">
        <router-link to="/about" class="text-sm text-gray-500 hover:text-gray-700 mx-2">
          About
        </router-link>
        <span class="text-gray-300">|</span>
        <router-link to="/terms" class="text-sm text-gray-500 hover:text-gray-700 mx-2">
          Terms of Use
        </router-link>
      </div>
    </div>
  </div>
</template>
