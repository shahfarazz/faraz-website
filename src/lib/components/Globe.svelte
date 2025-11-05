<script lang="ts">
  import { Canvas, T } from '@threlte/core'
  import { OrbitControls, Stars } from '@threlte/extras'
  import { browser } from '$app/environment'
  import { AdditiveBlending, BackSide } from 'three'
  import { onMount, onDestroy } from 'svelte'
  import { TextureLoader, RepeatWrapping, LinearFilter } from 'three'
  import { SRGBColorSpace, LinearSRGBColorSpace } from 'three'

  
  let dpr = 1
  if (browser) dpr = Math.min(2, window.devicePixelRatio || 1)
  
  export let size = 600
  let group: any
  let raf = 0
  let start = 0

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
  })

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf)
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
      <Canvas dpr={dpr}>
        <T.PerspectiveCamera makeDefault position={[0, 0, 3]}>
          <OrbitControls enableDamping={true} dampingFactor={0.05} />
        </T.PerspectiveCamera>
        <T.AmbientLight intensity={0.6} />
        <T.DirectionalLight position={[3, 3, 3]} intensity={1.1} />

        <Stars radius={50} depth={20} count={3000} factor={2} saturation={0} fade={true} />

        <!-- Atmosphere glow -->
        <T.Mesh>
          <T.SphereGeometry args={[1.05, 64, 64]} />
          <T.MeshBasicMaterial color="#6fc4ff" transparent={true} opacity={0.12} side={BackSide} blending={AdditiveBlending} />
        </T.Mesh>

        <!-- Planet with procedural islands -->
        <T.Group bind:this={group} rotation={[0.4, 0.8, 0]}>
          <T.Mesh>
            <T.SphereGeometry args={[1, 128, 128]} />
            <T.ShaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
          </T.Mesh>
        </T.Group>

        <!-- Cloud layer -->
        <T.Mesh>
          <T.SphereGeometry args={[1.02, 128, 128]} /> <!-- slightly larger than planet -->
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
  div { min-height: 400px }
</style>
