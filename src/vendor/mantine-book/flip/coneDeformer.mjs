'use client';
function buildConeMesh(cols, rows) {
  const vw = cols + 1;
  const vh = rows + 1;
  const vertexCount = vw * vh;
  const texcoords = new Float32Array(vertexCount * 2);
  for (let y = 0; y < vh; y++) {
    for (let x = 0; x < vw; x++) {
      const i = y * vw + x;
      texcoords[i * 2 + 0] = x / cols;
      texcoords[i * 2 + 1] = y / rows;
    }
  }
  const indices = new Uint16Array(cols * rows * 6);
  let k = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = y * vw + x;
      const b = a + 1;
      const c = a + vw;
      const d = c + 1;
      indices[k++] = a;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = d;
      indices[k++] = c;
    }
  }
  return { texcoords, indices, vertexCount };
}

export { buildConeMesh };
