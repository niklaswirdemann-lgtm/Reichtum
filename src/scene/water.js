import * as THREE from 'three';
import { WATER_Y } from './terrain.js';

// Nordsee mit Shader-Wellen: Vertex-Verschiebung aus überlagerten Sinuswellen,
// facettierte Low-Poly-Normalen per Derivate, Himmelsreflexion (Fresnel), Sonnenglanz, Nebel.
const vertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  #include <fog_pars_vertex>

  float wave(vec2 p, vec2 dir, float freq, float speed, float amp) {
    return sin(dot(p, dir) * freq + uTime * speed) * amp;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 p = world.xz;
    // Wellenhöhe nimmt zur Küste hin ab (flaches Watt)
    float coast = smoothstep(-60.0, -160.0, p.y);
    float h = wave(p, normalize(vec2(0.3, 1.0)), 0.18, 1.3, 0.22)
            + wave(p, normalize(vec2(-0.8, 0.6)), 0.31, 1.9, 0.12)
            + wave(p, normalize(vec2(0.9, 0.2)), 0.07, 0.8, 0.35);
    world.y += h * (0.35 + 0.65 * coast);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  void main() {
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (n.y < 0.0) n = -n;
    vec3 v = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float coast = smoothstep(-60.0, -220.0, vWorld.z);
    vec3 base = mix(uShallow, uDeep, coast);
    float diff = max(dot(n, uSunDir), 0.0);
    vec3 col = base * (0.55 + 0.45 * diff);
    col = mix(col, uSky, clamp(fres * 0.85 + 0.12, 0.0, 1.0));
    vec3 h = normalize(uSunDir + v);
    float spec = pow(max(dot(n, h), 0.0), 90.0);
    col += uSunColor * spec * 0.9;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createWater(quality) {
  const seg = quality === 'high' ? 220 : 110;
  const geo = new THREE.PlaneGeometry(3400, 1500, seg, Math.round(seg * 0.45));
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -50 - 750);

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#1d4f68') },
      uShallow: { value: new THREE.Color('#4f8a8c') },
      uSky: { value: new THREE.Color('#bcd6e6') },
      uSunColor: { value: new THREE.Color('#fff2dc') },
      uSunDir: { value: new THREE.Vector3(0.4, 0.6, 0.2).normalize() },
    },
  ]);
  const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, fog: true });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = WATER_Y;
  mesh.frustumCulled = false;

  return {
    mesh,
    uniforms,
    update(t) { uniforms.uTime.value = t; },
  };
}
