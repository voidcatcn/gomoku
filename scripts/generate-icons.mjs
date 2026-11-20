import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/icons");

const icon = await readFile(resolve(root, "public/favicon.svg"));
const maskable = await readFile(resolve(outDir, "icon-maskable.svg"));

await mkdir(outDir, { recursive: true });

const targets = [
  { name: "icon-192.png", source: icon, size: 192 },
  { name: "icon-512.png", source: icon, size: 512 },
  { name: "icon-maskable-512.png", source: maskable, size: 512 },
  { name: "apple-touch-icon.png", source: icon, size: 180 },
];

await Promise.all(
  targets.map(({ name, source, size }) =>
    sharp(source, { density: 384 })
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(resolve(outDir, name)),
  ),
);

console.log(
  `Generated ${targets.length} icons in public/icons:\n${targets
    .map(({ name }) => `  · ${name}`)
    .join("\n")}`,
);
