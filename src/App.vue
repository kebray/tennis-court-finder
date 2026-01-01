<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import TermsModal from './components/TermsModal.vue'

const authStore = useAuthStore()

onMounted(async () => {
  await authStore.checkAuth()
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <router-view />
    <TermsModal />
  </div>
</template>
