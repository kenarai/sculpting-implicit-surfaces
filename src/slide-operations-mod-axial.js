import Fragment from './slide-fragment'

export default Fragment(`
precision mediump float;

uniform float iGlobalTime;
uniform vec2  iResolution;
uniform vec2  iMouse;

vec2 doModel(vec3 p);
float sphere(vec3 p, float r);

#pragma glslify: raytrace = require('glsl-raytrace', map = doModel, steps = 90)
#pragma glslify: normal = require('glsl-sdf-normal', map = doModel)
#pragma glslify: camera = require('glsl-turntable-camera')
#pragma glslify: gauss = require('glsl-specular-gaussian')
#pragma glslify: ruler = require('glsl-ruler/color')
#pragma glslify: smin = require('glsl-smooth-min')
#pragma glslify: box = require('glsl-sdf-box')
#pragma glslify: fog = require('glsl-fog')
#pragma glslify: PI = require('glsl-pi')

float modAngle(inout vec2 p, float a) {
  float a1 = atan(p.y, p.x);
  float a2 = mod(a1 + a * 0.5, a) - a * 0.5;

  p = vec2(cos(a2), sin(a2)) * length(p);

  return mod(floor(a1 / a + 0.5), 2.0 * PI / a);
}

float modRot(inout vec2 p, float i) {
  return modAngle(p, 2.0 * PI / i);
}

vec2 doModel(vec3 p) {
  float period = 0.25 + iMouse.x / iResolution.x * 3.;

  modRot(p.xz, 4. + iMouse.y / iResolution.y * 12.);
  p.x -= period;
  p.x = mod(p.x + period * 0.5, period) - period * 0.5;

  return vec2(sphere(p, 0.5), 0.0);
}

float sphere(vec3 p, float r) {
  return length(p) - r;
}

vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
  return a + b*cos( 6.28318*(c*t+d) );
}

vec3 bg(vec3 ro, vec3 rd) {
  float t = rd.y * 0.4 + 0.4;
  vec3 grad = vec3(0.1, 0.05, 0.15) + palette(t
    , vec3(0.55, 0.5, 0.5)
    , vec3(0.6, 0.6, 0.5)
    , vec3(0.9, 0.6, 0.45)
    , vec3(0.03, 0.15, 0.25)
  );

  return grad;
}

float intersectPlane(vec3 ro, vec3 rd, vec3 nor, float dist) {
  float denom = dot(rd, nor);
  float t = -(dot(ro, nor) + dist) / denom;

  return t;
}

void main() {
  vec3 color = vec3(1.0);
  vec3 ro, rd;

  float rotation = iGlobalTime * 0.5;
  float height   = 3.5;
  float dist     = 4.0;
  camera(rotation, height, dist, iResolution.xy, ro, rd);

  float u = intersectPlane(ro, rd, vec3(0, 1, 0), 0.0);
  vec2  t = raytrace(ro, rd, 75., 0.01);

  if (max(t.x, u) < 0.0) {
    gl_FragColor = vec4(1);
    return;
  }

  bool plane = (u > 0.0 && t.x > u) || (t.x < 0.0 && u > 0.0);

  if (plane) {
    vec3 pos = ro + rd * u;
    vec3 nor = vec3(0, 1, 0);
    color = ruler(doModel(pos).x);
  } else {
    vec3 pos = ro + rd * t.x;
    vec3 nor = normal(pos);

    vec3 ldir1 = normalize(vec3(-0.25, 1, -1));
    vec3 ldir2 = normalize(vec3(0, -0.8, 1));

    color = reflect(nor, rd) * 0.5 + 0.5;
    color += 0.4 * gauss(ldir1, -rd, nor, 0.5);
    color.g = smoothstep(-0.09, 1.1, color.g);
    color.r = smoothstep(0.0, 1.02, color.r);
    color.b += 0.015;
  }

  color = mix(color, vec3(1.5, 1.2, 1), fog(plane ? u : t.x, 0.08125));
  color = pow(color, vec3(0.75));

  gl_FragColor.rgb = color.rgb;
  gl_FragColor.a   = 1.0;
}
`.trim())
