<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900">About Tennis Court Finder</h1>
        <button
          @click="router.back()"
          class="text-gray-600 hover:text-gray-900 flex items-center"
        >
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Back
        </button>
      </div>
    </header>

    <!-- Content -->
    <main class="container mx-auto px-4 py-8 max-w-3xl">
      <div class="bg-white rounded-xl shadow-sm p-8 space-y-8">
        <!-- What is this app -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-4">What is Tennis Court Finder?</h2>
          <p class="text-gray-600 leading-relaxed">
            Tennis Court Finder helps you discover tennis courts in your area.
            The goal is to enable you to reach out to homeowners and politely request permission
            to use their tennis court for occasional play.
          </p>
        </section>

        <!-- How it works -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
          <ol class="list-decimal list-inside space-y-3 text-gray-600">
            <li>Enter your starting address or zip code</li>
            <li>Set the maximum driving distance you're willing to travel</li>
            <li>Browse the map and list of tennis court locations</li>
            <li>Export addresses to send polite letters requesting access</li>
          </ol>
        </section>

        <!-- Data Sources & Limitations -->
        <section class="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 class="text-2xl font-bold text-amber-900 mb-4">
            <svg class="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Data Sources & Limitations
          </h2>

          <div class="space-y-4 text-amber-800">
            <div>
              <h3 class="font-semibold mb-1">Data Source</h3>
              <p>
                Tennis court locations are sourced from <a href="https://www.openstreetmap.org" target="_blank" rel="noopener" class="underline hover:text-amber-900">OpenStreetMap</a>,
                a collaborative mapping project maintained by volunteers worldwide.
              </p>
            </div>

            <div>
              <h3 class="font-semibold mb-1">Coverage Varies by Region</h3>
              <p>
                <strong>Metropolitan areas</strong> generally have excellent coverage with most tennis courts mapped.
                <strong>Rural areas</strong> may have incomplete data, meaning some tennis courts might not appear in results.
              </p>
            </div>

            <div>
              <h3 class="font-semibold mb-1">Verification Status</h3>
              <ul class="list-disc list-inside ml-2 space-y-1">
                <li><strong>Verified:</strong> OpenStreetMap data explicitly marks this as a residential tennis court</li>
                <li><strong>Likely Residential:</strong> Located in a residential zone, not associated with commercial buildings</li>
                <li><strong>Unverified:</strong> Classification could not be automatically determined</li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold mb-1">Always Verify Before Contacting</h3>
              <p>
                We recommend verifying addresses using satellite imagery (Google Maps, etc.) before sending any letters.
                Data may be outdated or inaccurate.
              </p>
            </div>

            <div>
              <h3 class="font-semibold mb-1">Help Improve the Data</h3>
              <p>
                You can contribute to OpenStreetMap by adding or correcting tennis court data in your area.
                Visit <a href="https://www.openstreetmap.org/help" target="_blank" rel="noopener" class="underline hover:text-amber-900">openstreetmap.org/help</a> to learn how.
              </p>
            </div>
          </div>
        </section>

        <!-- Court Classification -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Court Classification</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center mb-2">
                <span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span class="font-semibold text-green-800">Private Residential</span>
              </div>
              <p class="text-sm text-green-700">
                Tennis courts on private residential properties. These are the primary targets for outreach.
              </p>
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center mb-2">
                <span class="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                <span class="font-semibold text-blue-800">Public Facility</span>
              </div>
              <p class="text-sm text-blue-700">
                Public parks, schools, or community centers with tennis courts open to the public.
              </p>
            </div>

            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div class="flex items-center mb-2">
                <span class="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                <span class="font-semibold text-orange-800">Private Club</span>
              </div>
              <p class="text-sm text-orange-700">
                Tennis clubs, country clubs, or membership-based facilities.
              </p>
            </div>
          </div>
        </section>

        <!-- Privacy -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Privacy & Respectful Use</h2>
          <p class="text-gray-600 leading-relaxed">
            This tool is designed to help you find tennis courts and reach out respectfully.
            Please always be courteous in your communications and respect homeowners' privacy and decisions.
            A "no" should always be accepted gracefully.
          </p>
        </section>
      </div>
    </main>
  </div>
</template>
