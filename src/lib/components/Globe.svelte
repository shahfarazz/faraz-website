<script lang="ts">
  import { Canvas, T } from '@threlte/core'
  import { OrbitControls } from '@threlte/extras'

  export let size = 600
</script>

<div class="w-full h-full grid place-items-center">
  <Canvas style={`width:${size}px;height:${size}px`} dpr={[1, 2]}>
    <T.PerspectiveCamera makeDefault position={[0, 0, 3]} />
    <T.AmbientLight intensity={0.6} />
    <T.DirectionalLight position={[3, 3, 3]} intensity={1.2} />

    <T.Mesh rotation={[0.4, 0.8, 0]}>
      <T.SphereGeometry args={[1, 64, 64]} />
      <T.MeshStandardMaterial color="#2b6cb0" metalness={0.1} roughness={0.9} />
    </T.Mesh>

    <OrbitControls enableDamping={true} dampingFactor={0.05} />
  </Canvas>
</div>

<style>
  div { min-height: 400px }
</style>

