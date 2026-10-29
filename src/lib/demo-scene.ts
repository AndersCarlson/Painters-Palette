/**
 * A procedural stand-in for a photograph, so the tool can be tried without one
 * to hand. It is built from the kind of colour a painter actually has to solve:
 * a warm sky against cool distance, reflected light in water, and a near-black
 * foreground that is still a colour rather than black.
 */
export function drawDemoScene(width = 960, height = 640): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  const horizon = height * 0.52

  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, "#1f3a52")
  sky.addColorStop(0.45, "#6d7f8e")
  sky.addColorStop(0.78, "#d9a06a")
  sky.addColorStop(1, "#f2cf9a")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, horizon)

  const glow = ctx.createRadialGradient(width * 0.68, horizon * 0.88, 0, width * 0.68, horizon * 0.88, height * 0.42)
  glow.addColorStop(0, "rgba(255, 232, 180, 0.95)")
  glow.addColorStop(0.3, "rgba(246, 186, 108, 0.5)")
  glow.addColorStop(1, "rgba(246, 186, 108, 0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, horizon)

  ctx.fillStyle = "#fdeec4"
  ctx.beginPath()
  ctx.arc(width * 0.68, horizon * 0.86, height * 0.038, 0, Math.PI * 2)
  ctx.fill()

  // Far ridge, cooled and lightened by the air between.
  ctx.fillStyle = "#6a6b86"
  ctx.beginPath()
  ctx.moveTo(0, horizon)
  ctx.lineTo(0, horizon - height * 0.1)
  for (let x = 0; x <= width; x += 24) {
    const t = x / width
    ctx.lineTo(x, horizon - height * (0.07 + 0.05 * Math.sin(t * 7.1) + 0.03 * Math.sin(t * 2.3)))
  }
  ctx.lineTo(width, horizon)
  ctx.closePath()
  ctx.fill()

  // Near bank, warm and dark.
  ctx.fillStyle = "#3f4a33"
  ctx.beginPath()
  ctx.moveTo(0, horizon)
  for (let x = 0; x <= width; x += 18) {
    const t = x / width
    ctx.lineTo(x, horizon - height * (0.015 + 0.025 * Math.sin(t * 11 + 1.4)))
  }
  ctx.lineTo(width, horizon)
  ctx.closePath()
  ctx.fill()

  const water = ctx.createLinearGradient(0, horizon, 0, height)
  water.addColorStop(0, "#9a7a5c")
  water.addColorStop(0.22, "#5d6472")
  water.addColorStop(0.65, "#2f3b4a")
  water.addColorStop(1, "#1b232d")
  ctx.fillStyle = water
  ctx.fillRect(0, horizon, width, height - horizon)

  // Broken reflection under the sun.
  for (let y = horizon; y < height; y += 5) {
    const depth = (y - horizon) / (height - horizon)
    const spread = width * (0.04 + depth * 0.22)
    const alpha = 0.3 * (1 - depth) ** 1.6
    ctx.fillStyle = `rgba(242, 196, 134, ${alpha.toFixed(3)})`
    const wobble = Math.sin(y * 0.7) * width * 0.02
    ctx.fillRect(width * 0.68 - spread / 2 + wobble, y, spread, 2.4)
  }

  ctx.fillStyle = "#231c18"
  ctx.beginPath()
  ctx.moveTo(0, height)
  ctx.lineTo(0, height * 0.9)
  for (let x = 0; x <= width * 0.42; x += 16) {
    const t = x / (width * 0.42)
    ctx.lineTo(x, height * (0.9 - 0.04 * Math.sin(t * 5.2)))
  }
  ctx.lineTo(width * 0.42, height)
  ctx.closePath()
  ctx.fill()

  // Film-grain-scale noise, so the histogram sees paint-like variation.
  const noise = ctx.getImageData(0, 0, width, height)
  for (let i = 0; i < noise.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 9
    noise.data[i] = Math.max(0, Math.min(255, noise.data[i] + n))
    noise.data[i + 1] = Math.max(0, Math.min(255, noise.data[i + 1] + n))
    noise.data[i + 2] = Math.max(0, Math.min(255, noise.data[i + 2] + n))
  }
  ctx.putImageData(noise, 0, 0)

  return canvas
}
