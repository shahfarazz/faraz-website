<script lang="ts">
  import { T, useThrelte } from '@threlte/core'
  import { OrbitControls, interactivity } from '@threlte/extras'
  import * as THREE from 'three'

  const { camera, invalidate } = useThrelte()
  let cube: THREE.Mesh | null = null

  interactivity()

  function handleCubeClick(e) {
    const cam = $camera
    if (!cam || !cube) {
      console.warn('❌ Missing camera or cube', { cam, cube })
      return
    }

    // ✅ exact point on cube clicked
    const hit = e.point.clone()

    // 🧭 direction from cube center to that point
    const cubeCenter = new THREE.Vector3()
    cube.getWorldPosition(cubeCenter)
    const direction = new THREE.Vector3().subVectors(hit, cubeCenter).normalize()

    // 🎯 final camera position: back off from hit point along direction
    const distance = 3 // how far away the camera stays
    const camDest = hit.clone().add(direction.clone().multiplyScalar(distance))

    const camStart = cam.position.clone()
    const lookStart = new THREE.Vector3()
    cam.getWorldDirection(lookStart)
    lookStart.add(cam.position)

    const duration = 1200
    const start = performance.now()
    const ease = (x) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

    function animate() {
      const t = Math.min(1, (performance.now() - start) / duration)
      const k = ease(t)

      // Move position
      cam.position.lerpVectors(camStart, camDest, k)

      // Smoothly rotate toward target point
      const lookAt = cubeCenter.clone().lerp(hit, k * 1.2) // overshoot a bit for realism
      cam.lookAt(lookAt)

      invalidate()
      if (t < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} near={0.1} far={100}>
  <OrbitControls enableDamping dampingFactor={0.05} />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.8} />
<T.DirectionalLight position={[3, 3, 3]} intensity={1} />

<T.Mesh bind:ref={cube} onclick={handleCubeClick}>
  <T.BoxGeometry args={[1, 1, 1]} />
  <T.MeshStandardMaterial color="limegreen" />
</T.Mesh>
