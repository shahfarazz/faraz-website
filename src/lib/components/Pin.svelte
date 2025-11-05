<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'

  export let position: [number, number, number]
  export let color: string
  export let onClick: (() => void) | undefined

  // --- compute rotation so stick points to globe center ---
  let rotation: [number, number, number] = [0, 0, 0]

  $: {
    // vector from center to surface
    const dir = new THREE.Vector3(...position).normalize()
    // rotate +Y to align with dir
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir
    )
    const e = new THREE.Euler().setFromQuaternion(q)
    rotation = [e.x, e.y, e.z]
  }
</script>

<T.Group position={position} rotation={rotation} scale={1.5}>
  <!-- Stick (points toward globe center) -->
  <T.Mesh position={[0, -0.05, 0]}>
    <T.CylinderGeometry args={[0.003, 0.003, 0.1, 12]} />
    <T.MeshStandardMaterial
      color="#666"
      metalness={0.9}
      roughness={0.3}
    />
  </T.Mesh>

  <!-- Head (facing outward) -->
  <T.Mesh position={[0, 0.02, 0]} on:click={() => onClick?.()}>
    <T.SphereGeometry args={[0.02, 32, 32]} />
    <T.MeshBasicMaterial color={color} toneMapped={false} />
  </T.Mesh>
</T.Group>
