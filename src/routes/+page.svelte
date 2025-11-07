<script lang="ts">
  import { Canvas } from '@threlte/core'
  import Globe from '$lib/components/Globe.svelte'
</script>

<main class="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
  <h1 class="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">
    Faraz — 3D Globe Portfolio
  </h1>

  <p class="text-slate-300 max-w-prose text-center">
    Threlte + Three.js on SvelteKit. Pins and sections coming next.
  </p>

  <!-- 🟢 Wrap the Canvas around your Globe component -->
  <div class="w-full max-w-[720px] aspect-square border border-slate-700 rounded-lg overflow-hidden">
    <Canvas dpr={2}>
      <Globe />
    </Canvas>
  </div>
</main>
