import { useEffect, useRef, type ComponentProps } from "react"
import { cn } from "@/lib/utils"

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color_a;
uniform vec3 u_color_b;
uniform vec3 u_color_c;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;
  float t = u_time;
  float wave_a = sin(p.x * 1.45 + t * 0.36) * 0.17 + sin(p.x * 2.8 - t * 0.22) * 0.08;
  float wave_b = -0.32 + sin(p.x * 1.1 - t * 0.24) * 0.14;
  float ribbon_a = exp(-pow((p.y - wave_a) * 2.5, 2.0));
  float ribbon_b = exp(-pow((p.y - wave_b) * 3.0, 2.0)) * 0.62;
  float glow = clamp(ribbon_a + ribbon_b, 0.0, 1.0);
  float blend = smoothstep(-1.0, 1.0, p.x + sin(p.y * 2.0 + t * 0.16) * 0.25);
  vec3 color = mix(u_color_a, u_color_b, blend);
  color = mix(color, u_color_c, clamp(ribbon_b * 0.55, 0.0, 0.7));
  float vignette = 1.0 - smoothstep(0.45, 1.55, length(p * vec2(0.7, 1.0)));
  gl_FragColor = vec4(color * (0.35 + glow * 0.75), glow * vignette * 0.82);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!match) return [0.1, 0.55, 0.65]
  return [Number.parseInt(match[1], 16) / 255, Number.parseInt(match[2], 16) / 255, Number.parseInt(match[3], 16) / 255]
}

interface AuroraShaderProps extends ComponentProps<"canvas"> {
  colorA?: string
  colorB?: string
  colorC?: string
  speed?: number
}

/** Fond aurora WebGL léger : rendu statique sans WebGL et sans boucle si reduced-motion est actif. */
export function AuroraShader({ className, colorA = "#10b5a4", colorB = "#5854d6", colorC = "#db5e9a", speed = 1, ...props }: AuroraShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" })
    if (!canvas || !gl) return

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertex || !fragment) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return

    const buffer = gl.createBuffer()
    if (!buffer) return
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const activateShader = gl.useProgram.bind(gl)
    activateShader(program)
    const position = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const resolution = gl.getUniformLocation(program, "u_resolution")
    const time = gl.getUniformLocation(program, "u_time")
    const ca = gl.getUniformLocation(program, "u_color_a")
    const cb = gl.getUniformLocation(program, "u_color_b")
    const cc = gl.getUniformLocation(program, "u_color_c")
    const rgbA = hexToRgb(colorA)
    const rgbB = hexToRgb(colorB)
    const rgbC = hexToRgb(colorC)
    let frame = 0
    let lastTime = 0
    let startedAt = performance.now()
    let inViewport = false
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)")

    const draw = (seconds: number) => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = Math.max(1, Math.round(bounds.width * ratio))
      const height = Math.max(1, Math.round(bounds.height * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(resolution, width, height)
      gl.uniform1f(time, seconds)
      gl.uniform3f(ca, ...rgbA)
      gl.uniform3f(cb, ...rgbB)
      gl.uniform3f(cc, ...rgbC)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const animate = (now: number) => {
      lastTime = (now - startedAt) * 0.001 * Math.max(0, speed)
      draw(lastTime)
      if (!document.hidden && inViewport && !motionPreference.matches && speed > 0) frame = requestAnimationFrame(animate)
    }
    const refresh = () => {
      cancelAnimationFrame(frame)
      if (document.hidden || !inViewport || motionPreference.matches || speed === 0) {
        draw(0)
      } else {
        startedAt = performance.now() - (lastTime / Math.max(speed, 0.001)) * 1000
        frame = requestAnimationFrame(animate)
      }
    }
    const resize = () => draw(motionPreference.matches ? 0 : lastTime)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    const viewportObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting
      refresh()
    })
    viewportObserver.observe(canvas)
    document.addEventListener("visibilitychange", refresh)
    motionPreference.addEventListener("change", refresh)
    refresh()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      viewportObserver.disconnect()
      document.removeEventListener("visibilitychange", refresh)
      motionPreference.removeEventListener("change", refresh)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [colorA, colorB, colorC, speed])

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("aurora-shader", className)} {...props} />
}
