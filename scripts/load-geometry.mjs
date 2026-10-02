// Parse production geometry in Node without requiring browser image decoding.
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadGeometry(filename) {
  const data = await readFile(filename);
  const size = data.readUInt32LE(12);
  const json = JSON.parse(data.toString('utf8',20,20+size));
  delete json.images; delete json.textures; delete json.materials;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  const encoded=Buffer.from(JSON.stringify(json));
  const padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,0x20); encoded.copy(padded);
  const binary=data.subarray(20+size);
  const glb=Buffer.alloc(20+padded.length+binary.length);
  glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
  glb.writeUInt32LE(padded.length,12);glb.writeUInt32LE(0x4e4f534a,16);
  padded.copy(glb,20);binary.copy(glb,20+padded.length);
  return (await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength), '')).scene;
}
