<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900">Terms of Use</h1>
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
      <div class="bg-white rounded-xl shadow-sm p-8 prose prose-gray max-w-none">
        <p class="text-sm text-gray-500 mb-6">Last updated: {{ new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using Tennis Court Finder ("the Service"), you accept and agree to be bound by these Terms of Use.
          If you do not agree to these terms, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Tennis Court Finder is a tool that helps users locate tennis courts, including private residential tennis courts,
          within a specified geographic area. The Service provides location data sourced from third-party providers,
          primarily OpenStreetMap.
        </p>

        <h2>3. No Warranty; Accuracy Disclaimer</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
          We do not warrant that:
        </p>
        <ul>
          <li>The location data is accurate, complete, or current</li>
          <li>The classification of courts (private, public, club) is correct</li>
          <li>The addresses provided are valid or deliverable</li>
          <li>The Service will be uninterrupted or error-free</li>
        </ul>
        <p>
          Users are solely responsible for verifying all information before taking any action based on it.
        </p>

        <h2>4. User Responsibilities</h2>
        <p>By using this Service, you agree to:</p>
        <ul>
          <li>Use the Service only for lawful purposes</li>
          <li>Respect the privacy and property rights of others</li>
          <li>Not use the information obtained to harass, stalk, or otherwise harm any person</li>
          <li>Accept any response (including rejection) from property owners gracefully</li>
          <li>Comply with all applicable local, state, and federal laws regarding mail, solicitation, and property rights</li>
          <li>Not attempt to circumvent any rate limiting or access controls</li>
        </ul>

        <h2>5. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR
          INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
        </p>
        <ul>
          <li>Your use or inability to use the Service</li>
          <li>Any errors, inaccuracies, or omissions in the data provided</li>
          <li>Any action taken based on information obtained through the Service</li>
          <li>Any unauthorized access to or use of our servers</li>
          <li>Any third-party conduct or content on the Service</li>
        </ul>

        <h2>6. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless the Service operators and their affiliates from and against
          any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of
          or in any way connected with your use of the Service or violation of these Terms.
        </p>

        <h2>7. Third-Party Data</h2>
        <p>
          The Service relies on data from third-party sources, including OpenStreetMap and Mapbox.
          Your use of this data is also subject to their respective terms of service and licenses.
          OpenStreetMap data is available under the Open Database License (ODbL).
        </p>

        <h2>8. Rate Limiting</h2>
        <p>
          To ensure fair use and protect our API quotas, the Service implements rate limiting.
          Each user is limited to a certain number of searches per day. Attempting to circumvent
          these limits may result in account suspension.
        </p>

        <h2>9. Privacy</h2>
        <p>
          We collect and store your email address for authentication purposes. Search queries and results
          are stored locally in your browser and are not transmitted to our servers beyond what is necessary
          to perform the search. We may use aggregated, anonymized usage data to improve the Service.
        </p>

        <h2>10. Modifications to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Continued use of the Service after
          any changes constitutes acceptance of the new Terms. We encourage you to review these Terms periodically.
        </p>

        <h2>11. Termination</h2>
        <p>
          We reserve the right to terminate or suspend your access to the Service at any time, without notice,
          for any reason, including violation of these Terms.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the United States,
          without regard to its conflict of law provisions.
        </p>

        <h2>13. Contact</h2>
        <p>
          For questions about these Terms, please contact the Service administrator.
        </p>

        <div class="mt-8 p-4 bg-gray-100 rounded-lg">
          <p class="text-sm text-gray-600">
            By using Tennis Court Finder, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.prose h2 {
  @apply text-xl font-bold text-gray-900 mt-8 mb-4;
}

.prose p {
  @apply text-gray-600 mb-4 leading-relaxed;
}

.prose ul {
  @apply list-disc list-inside mb-4 text-gray-600 space-y-1;
}
</style>
