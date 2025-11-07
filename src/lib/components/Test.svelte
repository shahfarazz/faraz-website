<script lang="ts">
  import { Canvas } from '@threlte/core'
  import Scene from './Scene.svelte' // new child component
</script>

<div class="w-[600px] h-[600px] border border-slate-700 rounded-lg overflow-hidden">
  <Canvas dpr={2}>
    <Scene />
  </Canvas>
</div>
