<script lang="ts">
  import { Canvas, T } from '@threlte/core'
  import { OrbitControls, Stars } from '@threlte/extras'
  import { browser } from '$app/environment'
  import { AdditiveBlending, BackSide } from 'three'
  import { onMount, onDestroy } from 'svelte'
  
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
      if (group) group.rotation.y += dt * 0.15
      uniforms.time.value += dt
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
  })

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf)
  })

  // Vertex shader
  const vertexShader = /*glsl*/`
    varying vec3 vNormalView;
    varying vec3 vWorldNormal;
    varying vec3 vViewPos;
    void main(){
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPos = mvPosition.xyz;
      vNormalView = normalize(normalMatrix * normal);
      vWorldNormal = normalize(normal);
      gl_Position = projectionMatrix * mvPosition;
    }
  `

  const fragmentShader = /*glsl*/`
    precision highp float;
    varying vec3 vNormalView;
    varying vec3 vWorldNormal;
    varying vec3 vViewPos;
    uniform float time;

    // noise helpers
    float n3(vec3 p){
      return sin(p.x)*0.5 + sin(1.3*p.y + 0.7)*0.3 + sin(0.7*p.z + 1.1)*0.2;
    }
    float fbm(vec3 p){
      float f=0.0,a=0.5; for(int i=0;i<3;i++){ f+=a*n3(p); p*=1.9; a*=0.55; } return f;
    }
    float ridged(vec3 p){ return 1.0 - abs(n3(p)); }

    // continents composed of 3 lobes each (metaball-like), with anisotropy
    const int CONT=5; const int LOBES=3; const int TOTAL = CONT*LOBES;
    vec3 base[CONT]; vec3 axes[CONT]; float radii[CONT]; float elong[CONT];
    vec3 off[LOBES]; vec3 seeds[TOTAL];

    void setup(){
      base[0]=normalize(vec3( 0.88,  0.05,  0.47));
      base[1]=normalize(vec3(-0.72,  0.10,  0.62));
      base[2]=normalize(vec3( 0.15,  0.92, -0.35));
      base[3]=normalize(vec3(-0.30, -0.62, -0.72));
      base[4]=normalize(vec3( 0.52, -0.28,  0.81));

      axes[0]=normalize(vec3(0.2,1.0,0.1));
      axes[1]=normalize(vec3(1.0,0.2,0.0));
      axes[2]=normalize(vec3(0.4,0.8,0.4));
      axes[3]=normalize(vec3(0.9,0.1,0.3));
      axes[4]=normalize(vec3(0.3,0.6,0.7));

      // larger, varied sizes
      radii[0]=0.60; radii[1]=0.52; radii[2]=0.48; radii[3]=0.55; radii[4]=0.45;
      elong[0]=0.40; elong[1]=0.30; elong[2]=0.25; elong[3]=0.35; elong[4]=0.22;

      // three lobe offsets (relative); creates peninsulas/irregularities
      off[0]=vec3( 0.35, 0.00, 0.10);
      off[1]=vec3(-0.10, 0.28,-0.22);
      off[2]=vec3(-0.18,-0.22, 0.26);

      // build seeds
      for(int i=0;i<CONT;i++){
        for(int j=0;j<LOBES;j++){
          seeds[i*LOBES+j] = normalize(base[i] + off[j]);
        }
      }
    }

    void main(){
      vec3 n = normalize(vWorldNormal);
      setup();

      // Procedural continents (fallback)
      vec3 wv = vec3(
        n3(n*5.0 + vec3(1.2,2.3,3.4)),
        n3(n*5.0 + vec3(4.5,5.6,6.7)),
        n3(n*5.0 + vec3(7.8,8.9,9.1))
      );
      vec3 nw = normalize(n + 0.10 * (wv - 0.5));

      float coastFeather = 0.02;
      float procMask=0.0; float shallowProc=0.0;
      for(int i=0;i<CONT;i++){
        float minAng = 10.0;
        for(int j=0;j<LOBES;j++){
          float d = clamp(dot(nw, seeds[i*LOBES+j]), -1.0, 1.0);
          float ang = acos(d);
          minAng = min(minAng, ang);
        }
        float aniso = pow(dot(nw, axes[i]), 2.0);
        float rEff = radii[i]*(1.0 + elong[i]*(aniso - 0.5));
        float jag = (ridged(n*6.0 + float(i)*1.7) - 0.5) * 0.06;
        float island = 1.0 - smoothstep(rEff, rEff + coastFeather, minAng + jag);
        procMask = max(procMask, island);
        float shallow = 1.0 - smoothstep(rEff + 0.02, rEff + 0.12, minAng + jag);
        shallowProc = max(shallowProc, shallow);
      }

      // palette
      vec3 landBase = vec3(0.941, 0.824, 0.620); // #F0D29E
      vec3 oceanDeep = vec3(0.035, 0.17, 0.36);
      vec3 oceanShallow = vec3(0.08, 0.40, 0.70);
      float grain = 0.5 + 0.5 * fbm(n*6.0);
      vec3 landCol = mix(landBase*0.94, landBase*1.06, grain);
      vec3 oceanCol = mix(oceanDeep, oceanShallow, shallowProc);
      vec3 baseCol = mix(oceanCol, landCol, procMask);

      // lighting
      vec3 L = normalize(vec3(0.6,0.8,0.5));
      float ndotl = max(dot(n, L), 0.0);
      vec3 col = baseCol * (0.35 + 0.85*ndotl);

      // subtle rim
      vec3 V = normalize(-vViewPos);
      float rim = pow(1.0 - max(dot(normalize(vNormalView), V), 0.0), 2.2);
      col += rim * vec3(0.10,0.18,0.40) * 0.45;

      gl_FragColor = vec4(col,1.0);
    }
  `

  const uniforms = {
    time: { value: 0 }
  }
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

      </Canvas>
    </div>
  {:else}
    <p class="text-slate-400">Loading 3D…</p>
  {/if}
</div>

<style>
  div { min-height: 400px }
</style>
