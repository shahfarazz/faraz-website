<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { T } from '@threlte/core'
  import * as THREE from 'three'

  export let position: [number, number, number]
  export let color = '#ff0000'

  const dispatch = createEventDispatcher()

  let rotation: [number, number, number] = [0, 0, 0]
  $: {
    const dir = new THREE.Vector3(...position).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir
    )
    const e = new THREE.Euler().setFromQuaternion(q)
    rotation = [e.x, e.y, e.z]
  }
</script>

<T.Group position={position} rotation={rotation} scale={1.5}>
  <!-- Stick -->
  <T.Mesh position={[0, -0.05, 0]}>
    <T.CylinderGeometry args={[0.003, 0.003, 0.1, 12]} />
    <T.MeshStandardMaterial color="#555" metalness={0.9} roughness={0.3} />
  </T.Mesh>

  <!-- Head -->
  <T.Mesh
    position={[0, 0.02, 0]}
    onclick={(e) => {
      e.stopPropagation()
      dispatch('click') // fires Svelte event
    }}
  >
    <T.SphereGeometry args={[0.02, 32, 32]} />
    <T.MeshBasicMaterial color={color} toneMapped={false} />
  </T.Mesh>
</T.Group>
