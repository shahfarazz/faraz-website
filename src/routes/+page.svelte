<script lang="ts">
  import Globe from '$lib/components/Globe.svelte'
</script>

<main class="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
  <h1 class="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">Faraz — 3D Globe Portfolio</h1>
  <p class="text-slate-300 max-w-prose text-center">Threlte + Three.js on SvelteKit. Pins and sections coming next.</p>
  <div class="w-full max-w-[720px] aspect-square">
    <Globe size={640} />
  </div>
</main>

