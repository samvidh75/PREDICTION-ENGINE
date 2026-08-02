(function () {
  const container = document.getElementById("raycast-fluid-viewport");
  const canvas = document.getElementById("fluid-canvas");
  if (!container || !canvas) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) return; // CSS gradient placeholder stays as-is

  const gl =
    canvas.getContext("webgl", { antialias: false, alpha: true }) ||
    canvas.getContext("experimental-webgl", { antialias: false, alpha: true });
  if (!gl) return; // no WebGL support — fall back to CSS placeholder

  const VERTEX_SRC = `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  // Layered curl-noise-style flow field. Cheap (no texture lookups),
  // tuned to read as slow organic fluid rather than a busy pattern.
  const FRAGMENT_SRC = `
    precision mediump float;
    uniform vec2 uResolution;
    uniform float uTime;

    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.55;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p *= 2.02;
        amplitude *= 0.55;
      }
      return value;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0) * 2.2;

      float t = uTime * 0.045;
      vec2 flow = vec2(fbm(p + t), fbm(p - t + 4.2));
      float field = fbm(p + flow * 1.4 + t * 0.6);

      // Deep charcoal → slightly lighter neutral, matching the Raycast token set.
      vec3 base = vec3(0.043, 0.043, 0.047);   // ~#0b0b0c
      vec3 mid  = vec3(0.106, 0.106, 0.114);   // ~#1b1b1d
      vec3 hi   = vec3(0.173, 0.173, 0.184);   // ~#2c2c2e

      vec3 color = mix(base, mid, smoothstep(-0.2, 0.4, field));
      color = mix(color, hi, smoothstep(0.35, 0.75, field));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // Full-screen triangle — cheaper than a quad, no seam.
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );

  const aPosition = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, "uResolution");
  const uTime = gl.getUniformLocation(program, "uTime");

  const MAX_DPR = 1.5; // cap device pixel ratio to protect frame time
  const MAX_DIMENSION = 2200; // absolute clamp so ultrawide/4K viewports can't blow up shader cost
  let rafId = null;
  let startTime = null;
  let running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = Math.min(
      MAX_DIMENSION,
      Math.max(1, Math.floor(container.clientWidth * dpr))
    );
    const height = Math.min(
      MAX_DIMENSION,
      Math.max(1, Math.floor(container.clientHeight * dpr))
    );
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function frame(now) {
    if (!running) return;
    if (startTime === null) startTime = now;
    resize();
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - startTime) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Pause when the tab is hidden — no point burning GPU on a background tab.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resize).observe(container);
  } else {
    window.addEventListener("resize", resize);
  }

  resize();
  start();

  // Reveal the canvas only once a frame has actually rendered, and fade
  // the CSS placeholder out beneath it.
  requestAnimationFrame(() => {
    canvas.style.opacity = "1";
    const placeholder = container.querySelector(".fluid-placeholder");
    if (placeholder) {
      placeholder.style.transition = "opacity 700ms ease-out";
      placeholder.style.opacity = "0";
    }
  });
})();
