// Planet (land/water) shaders
export const planetVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main () {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const planetFragmentShader = `
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
`

// Clouds shaders
export const cloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const cloudFragmentShader = `
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
`

