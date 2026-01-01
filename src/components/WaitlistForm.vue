<script setup>
import { ref } from 'vue'
import { api } from '../utils/api'

const props = defineProps({
  initialEmail: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['back'])

const email = ref(props.initialEmail)
const submitted = ref(false)
const loading = ref(false)
const error = ref(null)

async function handleSubmit() {
  if (!email.value) return

  loading.value = true
  error.value = null

  try {
    await api.post('/api/waitlist-add', { email: email.value })
    submitted.value = true
  } catch (err) {
    error.value = err.message || 'Failed to join waitlist. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-lg p-8">
    <!-- Not submitted yet -->
    <template v-if="!submitted">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
        <p class="text-gray-600">
          This application is currently invite-only. Join the waitlist to request access.
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="waitlist-email" class="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="waitlist-email"
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading || !email"
          class="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <span v-if="loading" class="flex items-center justify-center">
            <span class="spinner w-5 h-5 mr-2"></span>
            Joining...
          </span>
          <span v-else>Join Waitlist</span>
        </button>
      </form>

      <button
        @click="emit('back')"
        class="w-full mt-4 text-gray-600 hover:text-gray-900 text-sm font-medium"
      >
        &larr; Back to login
      </button>
    </template>

    <!-- Submitted successfully -->
    <template v-else>
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">You're on the list!</h2>
        <p class="text-gray-600 mb-6">
          Thanks for your interest! We've added <strong>{{ email }}</strong> to our waitlist.
          The administrator will be notified and you'll receive an email when access is granted.
        </p>
        <button
          @click="emit('back')"
          class="text-primary-600 hover:text-primary-700 font-medium"
        >
          &larr; Back to login
        </button>
      </div>
    </template>
  </div>
</template>
