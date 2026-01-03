<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const emit = defineEmits(['toggle-admin'])

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="bg-white shadow-sm sticky top-0 z-40">
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <!-- Logo & Title -->
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <ellipse cx="12" cy="12" rx="4" ry="10" stroke-width="2"/>
            <line x1="2" y1="12" x2="22" y2="12" stroke-width="2"/>
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-bold text-gray-900">Tennis Court Finder</h1>
          <p class="text-xs text-gray-500">Find tennis courts in your area</p>
        </div>
      </div>

      <!-- User Menu -->
      <div class="flex items-center space-x-4">
        <!-- Admin Button -->
        <button
          v-if="authStore.isAdmin"
          @click="emit('toggle-admin')"
          class="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        >
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Admin
        </button>

        <!-- User Info -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600 hidden sm:inline">
            {{ authStore.userEmail }}
          </span>
          <button
            @click="handleLogout"
            class="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
