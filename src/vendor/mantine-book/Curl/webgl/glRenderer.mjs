'use client';
import { buildConeMesh } from '../../flip/coneDeformer.mjs';

const VERTEX_SRC = `#version 300 es
in vec3 aPos;      // play-zone pixels: x \u2208 [0, 2W], y \u2208 [0, H], z = depth px
in vec3 aNormal;
in vec2 aUv;
uniform vec2 uResolution;  // (2W, H + 2\xB7pad)
uniform float uDepth;      // depth range used to normalise z into clip space
out vec3 vNormal;
out vec2 vUv;
void main() {
  vec2 p = aPos.xy / uResolution;          // 0..1
  vec2 clip = vec2(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);
  // Higher z (toward the viewer) \u2192 smaller clip z \u2192 drawn in front.
  float z = clamp(-aPos.z / uDepth, -1.0, 1.0);
  gl_Position = vec4(clip, z, 1.0);
  vNormal = aNormal;
  vUv = aUv;
}`;
const FRAGMENT_SRC = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUv;
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform bool uHasBack;
uniform vec3 uLightDir;
uniform float uShadow;      // self-shadow strength on the curl (0\u20131, = shadowOpacity)
uniform vec3 uShadowColor;  // shadow tint (= shadowColor), default near-black
out vec4 fragColor;
void main() {
  vec3 N = normalize(vNormal);
  // Pick the face by which way the surface actually faces the viewer (robust
  // through the 3D deform + rotation, unlike gl_FrontFacing/winding): the part
  // still facing us shows the front; the wrapped-over part (facing away) shows
  // the back, mirrored so it reads correctly.
  bool front = N.z >= 0.0;
  vec3 Nl = front ? N : -N;                // lighting normal always toward viewer
  vec4 base;
  if (front) {
    base = texture(uFront, vUv);
  } else {
    base = uHasBack ? texture(uBack, vec2(1.0 - vUv.x, vUv.y)) : vec4(1.0, 1.0, 1.0, 1.0);
  }
  vec3 L = normalize(uLightDir);
  vec3 V = vec3(0.0, 0.0, 1.0);            // orthographic view, looking at +z
  float diff = max(dot(Nl, L), 0.0);
  vec3 R = reflect(-L, Nl);
  float spec = pow(max(dot(R, V), 0.0), 80.0);  // tight glossy ridge at the roll apex
  // Normalized to the FLAT-page response (a flat page facing the viewer has
  // diff = L.z): a page lying flat reads EXACTLY its base color \u2014 the same
  // value as the DOM face it hands off to at the start and end of a turn.
  // Without this the landed page sat at ~94% brightness and the handoff
  // popped ~6% brighter in one frame (read as "a shadow vanishing").
  float flatLight = 0.58 + 0.42 * max(L.z, 0.0);
  float light = (0.58 + 0.42 * diff) / flatLight;
  // Edge-on-ness: 0 when the surface lies flat (facing the viewer OR fully
  // turned over onto the far side), 1 at the vertical roll ridge. Both the back
  // darkening and the self-shadow scale by it, so they peak at the ridge and
  // fade to nothing as the page flattens onto either side \u2014 the wrapped-over
  // back no longer stays dark through the whole turn and then pops bright at the
  // DOM handoff. On the front face (N.z \u2265 0) this equals the previous (1 \u2212 N.z).
  float edge = 1.0 - abs(N.z);
  if (!front) {
    light *= mix(1.0, 0.82, edge);         // curled-under back darkens at the ridge, bright once flat
  }
  vec3 rgb = base.rgb * clamp(light, 0.0, 1.3) + vec3(spec * 0.6); // additive specular highlight
  // Self-shadow on the curling page, tinted TOWARD uShadowColor (= shadowColor),
  // the same quantity shadowOpacity shades on the lifted flap in the flat
  // variant. Peaks at the ridge, zero on the flat resting region. The default
  // shadowColor is near-black, so this matches the old darken-toward-black look.
  rgb = mix(rgb, uShadowColor, uShadow * 0.5 * edge);
  fragColor = vec4(rgb, base.a);
}`;
function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Curl WebGL shader compile failed: ${log}`);
  }
  return sh;
}
function makeTexture(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([255, 255, 255, 255])
  );
  return tex;
}
const _CurlGlRenderer = class _CurlGlRenderer {
  constructor(canvas, cols = 56, rows = 40) {
    this.hasBack = false;
    this.W = 1;
    this.H = 1;
    /** Vertical headroom (px each side) so the curl can extend past the page. */
    this.padY = 0;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true
    });
    if (!gl) {
      throw new Error("WebGL2 not available");
    }
    this.gl = gl;
    this.cols = cols;
    this.rows = rows;
    const mesh = buildConeMesh(cols, rows);
    this.texcoords = mesh.texcoords;
    this.indices = mesh.indices;
    this.scaledPos = new Float32Array(mesh.vertexCount * 3);
    this.normals = new Float32Array(mesh.vertexCount * 3);
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Curl WebGL link failed: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const aPos = gl.getAttribLocation(program, "aPos");
    const aNormal = gl.getAttribLocation(program, "aNormal");
    const aUv = gl.getAttribLocation(program, "aUv");
    this.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.scaledPos.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    this.normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aNormal);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.texcoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.frontTex = makeTexture(gl);
    this.backTex = makeTexture(gl);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  /** Size the drawing buffer to the play-zone (2W × (H + 2·pad)) at the given DPR. */
  resize(sheetWidth, sheetHeight, dpr) {
    const padY = Math.round(sheetHeight * _CurlGlRenderer.PAD_RATIO);
    const canvas = this.gl.canvas;
    const bufW = Math.round(2 * sheetWidth * dpr);
    const bufH = Math.round((sheetHeight + 2 * padY) * dpr);
    if (this.W === sheetWidth && this.H === sheetHeight && canvas.width === bufW && canvas.height === bufH) {
      return;
    }
    this.W = sheetWidth;
    this.H = sheetHeight;
    this.padY = padY;
    canvas.width = bufW;
    canvas.height = bufH;
    this.gl.viewport(0, 0, bufW, bufH);
  }
  /**
   * Clear the drawing buffer to transparent. Called on every lease acquire:
   * the pooled canvas still holds the LAST page's final frame, and without
   * the clear it would show through for the gap before this fold's first
   * draw (the resize above no longer implicitly clears when sizes match).
   */
  clear() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
  upload(tex, source) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }
  setFront(source) {
    this.upload(this.frontTex, source);
  }
  setBack(source) {
    this.hasBack = source !== null;
    if (source) {
      this.upload(this.backTex, source);
    }
  }
  /** Recompute per-vertex smooth normals from the scaled positions. */
  computeNormals() {
    const pos = this.scaledPos;
    const idx = this.indices;
    const n = this.normals;
    n.fill(0);
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3;
      const b = idx[i + 1] * 3;
      const c = idx[i + 2] * 3;
      const ux = pos[b] - pos[a];
      const uy = pos[b + 1] - pos[a + 1];
      const uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a];
      const vy = pos[c + 1] - pos[a + 1];
      const vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      n[a] += nx;
      n[a + 1] += ny;
      n[a + 2] += nz;
      n[b] += nx;
      n[b + 1] += ny;
      n[b + 2] += nz;
      n[c] += nx;
      n[c + 1] += ny;
      n[c + 2] += nz;
    }
    for (let i = 0; i < n.length; i += 3) {
      const len = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      n[i] /= len;
      n[i + 1] /= len;
      n[i + 2] /= len;
    }
  }
  /**
   * Render the curl by wrapping the page around the CREASE line (cylinder model,
   * kivy/Hung). The crease — its midpoint and normal — comes straight from the
   * reflection fold, so the curl follows the drag in EVERY direction (horizontal,
   * vertical, diagonal) with the correct sign, and there is no fixed-axis spike.
   *
   * @param creaseMidX page-coord crease midpoint x (spine at x=0)
   * @param creaseMidY page-coord crease midpoint y
   * @param nx,ny      crease normal (unit), pointing toward the grabbed edge:
   *                   page points with positive distance along it are the flap
   *                   that wraps; the spine side stays flat.
   * @param radius     curl radius in px (larger = gentler wrap)
   * @param sheetLeft  page x of the sheet's spine edge: 0 at rest, −W when flipped
   * @param shadowStrength 0–1 self-shadow strength shading the curl as it curves away
   * @param shadowColor RGB (0–1) the self-shadow tints toward (= shadowColor); default near-black
   */
  render(creaseMidX, creaseMidY, nx, ny, radius, sheetLeft, shadowStrength, shadowColor = [0.1, 0.1, 0.12]) {
    const gl = this.gl;
    const { W, H, padY } = this;
    const PI = Math.PI;
    const r = Math.max(radius, 0.05);
    const tc = this.texcoords;
    const sp = this.scaledPos;
    const count = tc.length / 2;
    for (let i = 0; i < count; i++) {
      const px = sheetLeft + tc[i * 2] * W;
      const py = tc[i * 2 + 1] * H;
      const d = (px - creaseMidX) * nx + (py - creaseMidY) * ny;
      let wx = px;
      let wy = py;
      let wz = 0;
      if (d > 0) {
        const dr = d / r;
        if (dr <= PI) {
          const f = r * Math.sin(dr) - d;
          wx = px + nx * f;
          wy = py + ny * f;
          wz = r * (1 - Math.cos(dr));
        } else {
          const f = PI * r - 2 * d;
          wx = px + nx * f;
          wy = py + ny * f;
          wz = 2 * r;
        }
      }
      sp[i * 3] = W + wx;
      sp[i * 3 + 1] = padY + wy;
      sp[i * 3 + 2] = wz;
    }
    const depthScale = 2 * r;
    this.computeNormals();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sp);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.normals);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(gl.getUniformLocation(this.program, "uResolution"), 2 * W, H + 2 * padY);
    gl.uniform1f(gl.getUniformLocation(this.program, "uDepth"), depthScale * 2);
    const lightX = sheetLeft < 0 ? -0.3 : 0.3;
    gl.uniform3f(gl.getUniformLocation(this.program, "uLightDir"), lightX, -0.4, 0.85);
    gl.uniform1f(gl.getUniformLocation(this.program, "uShadow"), shadowStrength);
    gl.uniform3f(
      gl.getUniformLocation(this.program, "uShadowColor"),
      shadowColor[0],
      shadowColor[1],
      shadowColor[2]
    );
    gl.uniform1i(gl.getUniformLocation(this.program, "uHasBack"), this.hasBack ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frontTex);
    gl.uniform1i(gl.getUniformLocation(this.program, "uFront"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.backTex);
    gl.uniform1i(gl.getUniformLocation(this.program, "uBack"), 1);
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }
  dispose() {
    const gl = this.gl;
    gl.bindVertexArray(null);
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.posBuf);
    gl.deleteBuffer(this.normBuf);
    gl.deleteTexture(this.frontTex);
    gl.deleteTexture(this.backTex);
    gl.deleteProgram(this.program);
  }
  /**
   * Full teardown: drop the GL objects AND return the context slot to the
   * browser. Safe here (unlike a React effect cleanup) because the pool owns
   * BOTH the renderer and its canvas — a recreated pool gets a fresh canvas,
   * so StrictMode double-mounts never reuse a lost context.
   */
  loseContext() {
    this.dispose();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
};
/** Vertical headroom as a fraction of the sheet height (each side). */
_CurlGlRenderer.PAD_RATIO = 0.18;
let CurlGlRenderer = _CurlGlRenderer;

export { CurlGlRenderer };
