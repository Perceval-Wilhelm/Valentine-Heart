/**
 * Draws `text` in `font` and returns points on its strokes as x, y pairs in heart units, centred and
 * scaled to fit `width` × `height`. The font must already be loaded.
 */
export function sampleText(text: string, font: string, width = 2.3, height = 0.95, step = 3): Float32Array {
  const size = 160;
  const sized = font.replace(/[\d.]+px/, `${size}px`);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return new Float32Array();

  context.font = sized;
  canvas.width = Math.ceil(context.measureText(text).width + size);
  canvas.height = Math.ceil(size * 1.6);
  // Resizing a canvas resets its drawing state.
  context.font = sized;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (data[(y * canvas.width + x) * 4 + 3] > 128) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  if (xs.length === 0) return new Float32Array();

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(width / Math.max(maxX - minX, 1), height / Math.max(maxY - minY, 1));
  const points = new Float32Array(xs.length * 2);
  for (let i = 0; i < xs.length; i++) {
    points[i * 2] = (xs[i] - (minX + maxX) / 2) * scale;
    // Canvas y grows downward; heart units grow upward.
    points[i * 2 + 1] = ((minY + maxY) / 2 - ys[i]) * scale;
  }
  return points;
}
