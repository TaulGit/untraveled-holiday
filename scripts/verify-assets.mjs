import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/assets/models');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const credits = JSON.parse(await readFile(path.join(root, 'credits.json'), 'utf8'));
const names = Object.keys(manifest);
if (names.length !== credits.length) throw new Error(`manifest has ${names.length} models, credits has ${credits.length}`);

let totalBytes = 0;
for (const name of names) {
  const entry = credits.find((item) => item.name === name);
  if (!entry || !entry.taskId || entry.credits <= 0) throw new Error(`missing provenance for ${name}`);
  const filename = path.join(root, manifest[name]);
  const data = await readFile(filename);
  if (data.toString('ascii', 0, 4) !== 'glTF' || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) {
    throw new Error(`invalid GLB header: ${name}`);
  }
  if (data.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`missing GLB JSON chunk: ${name}`);
  const jsonLength = data.readUInt32LE(12);
  const gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength));
  for (const resource of [...(gltf.buffers || []), ...(gltf.images || [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw new Error(`external resource in ${name}: ${resource.uri}`);
  }
  const preview = path.join(root, 'previews', `${name}.png`);
  await stat(preview);
  totalBytes += data.length;
  process.stdout.write(`${name}: ${(data.length / 1048576).toFixed(2)} MiB, ${gltf.meshes?.length || 0} meshes\n`);
}
process.stdout.write(`${names.length} self-contained GLBs, ${(totalBytes / 1048576).toFixed(2)} MiB total, ${credits.reduce((sum, item) => sum + item.credits, 0)} Tripo credits recorded\n`);

const sceneryRoot = path.resolve('public/assets/scenery');
const scenery = JSON.parse(await readFile(path.join(sceneryRoot, 'manifest.json'), 'utf8'));
for (const layer of scenery.layers) {
  const data = await readFile(path.join(sceneryRoot, layer));
  if (data.toString('ascii', 0, 4) !== 'glTF' || data.readUInt32LE(8) !== data.length) throw new Error(`invalid scenery GLB: ${layer}`);
  const gltf = JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12)));
  if (!gltf.meshes?.length) throw new Error(`empty scenery: ${layer}`);
  for (const resource of [...(gltf.buffers || []), ...(gltf.images || [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw new Error(`external scenery resource: ${layer}`);
  }
  for (const accessor of gltf.accessors || []) {
    for (const value of [...(accessor.min || []), ...(accessor.max || [])]) {
      if (!Number.isFinite(value)) throw new Error(`non-finite geometry in ${layer}`);
    }
  }
  process.stdout.write(`Blender ${layer}: ${gltf.meshes.length} meshes, ${(data.length / 1048576).toFixed(2)} MiB\n`);
}
