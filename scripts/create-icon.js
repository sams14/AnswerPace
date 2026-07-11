import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const size = 64;
const pixelBytes = size * size * 4;
const maskRowBytes = Math.ceil(size / 32) * 4;
const maskBytes = maskRowBytes * size;
const imageBytes = 40 + pixelBytes + maskBytes;
const fileBytes = 6 + 16 + imageBytes;
const buffer = Buffer.alloc(fileBytes);

let offset = 0;
buffer.writeUInt16LE(0, offset);
offset += 2;
buffer.writeUInt16LE(1, offset);
offset += 2;
buffer.writeUInt16LE(1, offset);
offset += 2;

buffer.writeUInt8(size, offset);
offset += 1;
buffer.writeUInt8(size, offset);
offset += 1;
buffer.writeUInt8(0, offset);
offset += 1;
buffer.writeUInt8(0, offset);
offset += 1;
buffer.writeUInt16LE(1, offset);
offset += 2;
buffer.writeUInt16LE(32, offset);
offset += 2;
buffer.writeUInt32LE(imageBytes, offset);
offset += 4;
buffer.writeUInt32LE(22, offset);
offset += 4;

buffer.writeUInt32LE(40, offset);
offset += 4;
buffer.writeInt32LE(size, offset);
offset += 4;
buffer.writeInt32LE(size * 2, offset);
offset += 4;
buffer.writeUInt16LE(1, offset);
offset += 2;
buffer.writeUInt16LE(32, offset);
offset += 2;
buffer.writeUInt32LE(0, offset);
offset += 4;
buffer.writeUInt32LE(pixelBytes, offset);
offset += 4;
buffer.writeInt32LE(2835, offset);
offset += 4;
buffer.writeInt32LE(2835, offset);
offset += 4;
buffer.writeUInt32LE(0, offset);
offset += 4;
buffer.writeUInt32LE(0, offset);
offset += 4;

for (let y = size - 1; y >= 0; y -= 1) {
  for (let x = 0; x < size; x += 1) {
    const color = getPixel(x, y);
    buffer.writeUInt8(color.b, offset);
    buffer.writeUInt8(color.g, offset + 1);
    buffer.writeUInt8(color.r, offset + 2);
    buffer.writeUInt8(color.a, offset + 3);
    offset += 4;
  }
}

mkdirSync(join(process.cwd(), "src-tauri", "icons"), { recursive: true });
writeFileSync(join(process.cwd(), "src-tauri", "icons", "icon.ico"), buffer);

function getPixel(x, y) {
  const teal = { r: 15, g: 107, b: 93, a: 255 };
  const ink = { r: 8, g: 39, b: 36, a: 255 };
  const white = { r: 245, g: 250, b: 248, a: 255 };
  const amber = { r: 180, g: 83, b: 9, a: 255 };

  const radius = 10;
  if (
    (x < radius && y < radius && distance(x, y, radius, radius) > radius) ||
    (x >= size - radius && y < radius && distance(x, y, size - radius - 1, radius) > radius) ||
    (x < radius && y >= size - radius && distance(x, y, radius, size - radius - 1) > radius) ||
    (x >= size - radius && y >= size - radius && distance(x, y, size - radius - 1, size - radius - 1) > radius)
  ) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (x > 44 && y > 6 && y < 58) {
    return amber;
  }

  if (x > 18 && x < 27 && y > 14 && y < 50) {
    return white;
  }

  if (x > 26 && x < 43 && y > 14 && y < 22) {
    return white;
  }

  if (x > 26 && x < 43 && y > 28 && y < 36) {
    return white;
  }

  if (x > 38 && x < 46 && y > 18 && y < 32) {
    return white;
  }

  if ((x + y) % 17 === 0) {
    return ink;
  }

  return teal;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}
