<script lang="ts">
  import { Canvas, T } from '@threlte/core'
  import { OrbitControls, Stars, HTML, interactivity } from '@threlte/extras'
  import { browser } from '$app/environment'
  import { AdditiveBlending, BackSide } from 'three'
  import { onMount, onDestroy } from 'svelte'
  import { TextureLoader, RepeatWrapping, LinearFilter } from 'three'
  import { SRGBColorSpace, LinearSRGBColorSpace } from 'three'
  import Pin from '$lib/components/Pin.svelte'
  import { pins } from '$lib/pins'
  import { latLonToCartesian } from '$lib/globe/coords'
  import { goto } from '$app/navigation'

  
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
  let flyRaf = 0

  function flyTo(lat: number, lon: number) {
    const globeCenter: [number, number, number] = [0, 0, 0]
    const surfacePos = latLonToCartesian(1.03, lat, lon)

    // Normalize pin direction from globe center
    const len = Math.hypot(surfacePos[0], surfacePos[1], surfacePos[2]) || 1
    const n: [number, number, number] = [
      surfacePos[0] / len,
      surfacePos[1] / len,
      surfacePos[2] / len
    ]

    // Distance from center to camera for fly-to
    const distance = 2.1
    const camGoal: [number, number, number] = [
      n[0] * distance,
      n[1] * distance,
      n[2] * distance
    ]

    const camStart: [number, number, number] = [...cameraPos]
    const t0 = performance.now()
    const duration = 1000
    const ease = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

    controlsEnabled = false
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / duration)
      const k = ease(t)
      cameraPos = [
        camStart[0] + (camGoal[0] - camStart[0]) * k,
        camStart[1] + (camGoal[1] - camStart[1]) * k,
        camStart[2] + (camGoal[2] - camStart[2]) * k
      ]
      // Keep orbit target fixed on globe center
      target = globeCenter

      if (t < 1) flyRaf = requestAnimationFrame(step)
      else controlsEnabled = true
    }

    if (flyRaf) cancelAnimationFrame(flyRaf)
    flyRaf = requestAnimationFrame(step)
  }


  function handlePinClick(pin: { id: string; lat: number; lon: number; href: string }) {
    selected = pin.id
    console.log('Clicked pin:', pin.id)
    flyTo(pin.lat, pin.lon)
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

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;

    void main () {
      vUv = uv;                         // pass UVs to fragment
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;


  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform float time;
    uniform sampler2D uMask;
    uniform float uOffset;

    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec2 uv = vUv;
      uv.x = fract(uv.x + uOffset);

      // Sample mask and build land/water
      float maskValue = texture2D(uMask, uv).r;
      float land = 1.0 - maskValue;

      // Base colors
      vec3 waterColor = vec3(0.02, 0.25, 0.65);
      vec3 landColor  = vec3(0.941, 0.823, 0.620);

      // Coastline highlight (a narrow band around land edges)
      float edge = smoothstep(0.47, 0.50, maskValue) - smoothstep(0.50, 0.53, maskValue);
      vec3 coastColor = vec3(1.0, 0.95, 0.75);  // light golden rim
      vec3 base = mix(waterColor, landColor, land);
      base = mix(base, coastColor, edge * 1.5);

      // Lighting
      vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0));
      float lighting = clamp(dot(normalize(vNormal), lightDir), 0.0, 1.0);
      base *= lighting + 0.3;

      // Atmosphere/fresnel
      float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 3.0);
      base += vec3(0.1, 0.2, 0.4) * fresnel * 0.8;

      gl_FragColor = vec4(base, 1.0);
    }

  `;





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

  const cloudVertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const cloudFragmentShader = /* glsl */ `
    precision highp float;
    uniform sampler2D uClouds;
    uniform float uOffset;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec2 uv = vUv;
      uv.x = fract(uv.x + uOffset);
      float c = texture2D(uClouds, uv).r;      // white clouds on black bg

      // Subtle blue-white clouds with soft alpha
      vec3 cloudColor = vec3(0.9, 0.95, 1.0);
      float alpha = c * 0.4;                   // semi-transparent
      gl_FragColor = vec4(cloudColor, alpha);
    }
  `;



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
      <Canvas dpr={dpr} >
        {#key browser}
          {interactivity()}
        {/key}
        <T.PerspectiveCamera makeDefault position={cameraPos}>
          <OrbitControls target={target} enabled={controlsEnabled} enableDamping={true} dampingFactor={0.05} />
        </T.PerspectiveCamera>
        

        <T.AmbientLight intensity={0.6} />
        <T.DirectionalLight position={[3, 3, 3]} intensity={1.1} />

        <Stars radius={50} depth={20} count={3000} factor={2} saturation={0} fade={true} />

        
        <!-- Atmosphere glow -->
        <T.Mesh bind:this={atmoMesh}>
          <T.SphereGeometry args={[1.05, 64, 64]} />
          <T.MeshBasicMaterial color="#6fc4ff" transparent={true} opacity={0.12} side={BackSide} blending={AdditiveBlending} />
        </T.Mesh>

        <!-- Planet with procedural islands + pins -->
        <T.Group bind:this={group} rotation={[0.4, 0.8, 0]}>
          <T.Mesh>
            <T.SphereGeometry args={[1, 128, 128]} />
            <T.ShaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
          </T.Mesh>

          {#each pins as p}
            <Pin
              position={latLonToCartesian(1.03, p.lat, p.lon)}
              color={p.color || '#22d3ee'}
              on:click={() => handlePinClick(p)}
            />
            <!-- {#if selected === p.id}
              <HTML position={latLonToCartesian(1.10, p.lat, p.lon)} transform>
                <button
                  class="px-3 py-1 rounded-md text-sm font-medium shadow bg-slate-950/80 backdrop-blur border border-slate-700 text-slate-100 hover:bg-slate-800"
                  on:click={() => goto(p.href)}
                >{p.label}</button>
              </HTML>
            {/if} -->
          {/each}
        </T.Group>

        <!-- Cloud layer -->
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

        


      </Canvas>
    </div>
  {:else}
    <p class="text-slate-400">Loading 3D…</p>
  {/if}
</div>

<style> 
  :global(canvas) { pointer-events: auto !important; } 
  :global([style*="touch-action: none"]) { pointer-events: auto !important; touch-action: auto !important; } 
</style>
