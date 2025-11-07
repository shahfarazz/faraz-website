<script lang="ts">
  import { Canvas, T, useThrelte } from '@threlte/core'
  import { OrbitControls, Stars, HTML, interactivity, Billboard } from '@threlte/extras'
  import { browser } from '$app/environment'
  import { AdditiveBlending, BackSide } from 'three'
  import { onMount, onDestroy } from 'svelte'
  import { TextureLoader, RepeatWrapping, LinearFilter } from 'three'
  import { LinearSRGBColorSpace } from 'three'
  import Pin from '$lib/components/Pin.svelte'
  import { pins } from '$lib/pins'
  import { latLonToCartesian } from '$lib/globe/coords'
  import * as THREE from 'three'
  interactivity()

  
  let dpr = 1
  if (browser) dpr = Math.min(2, window.devicePixelRatio || 1)
  
  export let size = 600
  let group: any
  let raf = 0
  let start = 0
  let selected: string | null = null
  let controlsEnabled = true
  let cameraPos: [number, number, number] = [0, 0, 3]
  let target: [number, number, number] = [0, 0, 0]
  let flyRaf: number
  const { camera, invalidate } = useThrelte()
  let globe: THREE.Mesh | null = null

  // Convert lat/lon to 3D coordinates on the globe
  
  // fly to the selected pin
  export function flyTo(e) {
    const cam = $camera

    // console.log("✈️ Flying to", { lat, lon })

    if (!cam) {
      console.warn('⏳ Waiting for camera to attach...')
      // setTimeout(() => flyTo(lat, lon), 150)
      return
    }

    // Compute target & direction
    const hit = e.point.clone()
    const globeCenter = new THREE.Vector3()
    globe?.getWorldPosition(globeCenter)
    const direction = new THREE.Vector3().subVectors(hit, globeCenter).normalize()

    const lookStart = new THREE.Vector3()
    cam.getWorldDirection(lookStart)
    lookStart.add(cam.position)


    const distance = 2 // how far away the camera stays

    const camDest = hit.clone().add(direction.clone().multiplyScalar(distance))


    // Store start state
    const camStart = cam.position.clone()
    const duration = 1300
    const start = performance.now()
    const ease = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2


    function animate() {
      const t = Math.min(1, (performance.now() - start) / duration)
      const k = ease(t)

      // Interpolate spherical motion (rotation around globe)
      cam.position.lerpVectors(camStart, camDest, k)

      const lookAt = globeCenter.clone().lerp(hit, k * 1.2) // overshoot a bit for realism
      // Always look at globe center (pin ends up centered)
      cam.lookAt(lookAt)

      invalidate()

      if (t < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  function handlePinClick(e,p) {
    // console.log('📍 Pin clicked', e);
    selected = p.id;
    flyTo(e);
  }


  let atmoMesh: any
  let cloudMesh: any

  onMount(() => {
    if (!browser) return
    // no external textures; purely procedural continents
    start = performance.now()
    const loop = () => {
      const t = performance.now()
      const dt = (t - start) / 1000
      start = t
      if (group?.rotation) group.rotation.y += dt * 0.15
      
      // clouds animations
      uniformsClouds.time.value += dt
      uniformsClouds.uOffset.value = (uniformsClouds.uOffset.value + dt * 0.003) % 1.0

      uniforms.time.value += dt
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
     // turn off raycasting so these meshes don't steal clicks
    if (atmoMesh) atmoMesh.raycast = () => {}
    if (cloudMesh) cloudMesh.raycast = () => {}
  })

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf)
    if (flyRaf) cancelAnimationFrame(flyRaf)
  })

  // Shaders moved to $lib/globe/shaders for readability
  import { planetVertexShader as vertexShader, planetFragmentShader as fragmentShader, cloudVertexShader, cloudFragmentShader } from '$lib/globe/shaders'


  // fragment shader imported above





  const uniforms = {
    time: { value: 0 },
    uMask: { value: null },
    uOffset: { value: 0.0}
  }

  const uniformsClouds = {
    time: { value: 0 },
    uClouds: { value: null },
    uOffset: { value: 0.0 }
  }


  let cloudTex

  onMount(() => {
    if (!browser) return

    const loader = new TextureLoader()
    cloudTex = loader.load('/maps/clouds.jpg', (t) => {
      console.log('☁️ Cloud map loaded', t.image.width, t.image.height)
      t.wrapS = RepeatWrapping
      t.wrapT = RepeatWrapping
      t.minFilter = LinearFilter
      t.magFilter = LinearFilter
      t.colorSpace = LinearSRGBColorSpace
      uniformsClouds.uClouds.value = t
    })
  })

  // cloud shaders imported above



  let maskTex;

  onMount(() =>{
    if (!browser) return;

    const loader = new TextureLoader();
    maskTex = loader.load('/maps/landmask.jpg', (t) => {
      t.colorSpace = LinearSRGBColorSpace
      console.log('✅ Mask loaded', t.image.width, t.image.height)
      t.wrapS = RepeatWrapping
      t.wrapT = RepeatWrapping
      t.minFilter = LinearFilter
      t.magFilter = LinearFilter
      uniforms.uMask.value = t
    })

  });

  
</script>

<div class="w-full grid place-items-center">
  {#if browser}
    <div style={`width:${size}px;height:${size}px`}>

        <!-- ✅ Camera + Controls -->
        <T.PerspectiveCamera makeDefault position={[0, 0, 3]}>
          <OrbitControls enableDamping dampingFactor={0.05} />
        </T.PerspectiveCamera>


        <!-- ✅ Lights -->
        <T.AmbientLight intensity={0.6} />
        <T.DirectionalLight position={[3, 3, 3]} intensity={1.1} />

        <!-- ✅ Background stars -->
        <Stars
          radius={50}
          depth={20}
          count={3000}
          factor={2}
          saturation={0}
          fade={true}
        />

        <!-- ✅ Atmosphere -->
        <T.Mesh bind:this={atmoMesh}>
          <T.SphereGeometry args={[1.05, 64, 64]} />
          <T.MeshBasicMaterial
            color="#6fc4ff"
            transparent={true}
            opacity={0.12}
            side={BackSide}
            blending={AdditiveBlending}
          />
        </T.Mesh>

        <!-- ✅ Globe and pins -->
        <T.Group bind:this={group} rotation={[0.4, 0.8, 0]}>
          <T.Mesh>
            <T.SphereGeometry args={[1, 128, 128]} />
            <T.ShaderMaterial
              uniforms={uniforms}
              vertexShader={vertexShader}
              fragmentShader={fragmentShader}
            />
          </T.Mesh>

          {#each pins as p}
            <Pin
              position={latLonToCartesian(1.03, p.lat, p.lon)}
              color={p.color || '#22d3ee'}
              onClick={(e) => handlePinClick(e,p)}
            />
            
          {/each}
          
        </T.Group>

        <!-- ✅ Cloud layer -->
        <T.Mesh bind:this={cloudMesh}>
          <T.SphereGeometry args={[1.02, 128, 128]} />
          <T.ShaderMaterial
            transparent={true}
            depthWrite={false}
            uniforms={uniformsClouds}
            vertexShader={cloudVertexShader}
            fragmentShader={cloudFragmentShader}
          />
        </T.Mesh>
        <Billboard>
          <HTML position={[1, 0, 1]}>
            <div class="absolute top-1/2 -translate-y-1/2 w-20
              p-4 rounded-lg 
           bg-slate-900/80 text-slate-100 border border-slate-700 shadow 
           backdrop-blur pointer-events-auto">
              Globe Info
            </div>
          </HTML>
        </Billboard>
    </div>
    
  {:else}
    <p class="text-slate-400">Loading 3D…</p>
  {/if}
</div>

<!-- styles moved to src/app.css -->

