import * as THREE from 'three';

export function createSurfaceTextures(scene, sky, settled) {
  const loader = new THREE.TextureLoader();
  const maps = {};
  for (const name of ['sky', 'water', 'limestone', 'wood']) {
    maps[name] = loader.load(`./assets/textures/${name}.png`, texture => {
      if (name === 'sky') {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        sky.visible = false;
      }
      settled(true);
    }, undefined, () => settled(false));
    maps[name].colorSpace = THREE.SRGBColorSpace;
    if (name !== 'sky') maps[name].wrapS = maps[name].wrapT = THREE.RepeatWrapping;
    maps[name].anisotropy = 8;
  }
  function decorate(root) {
    root.traverse(mesh => {
      if (!mesh.isMesh) return;
      if (/background_(cloud|foam|rock|distant)/.test(mesh.name)) { mesh.visible = false; return; }
      const water = /background_sea/.test(mesh.name);
      const wood = /_(wood|wood_light)$/.test(mesh.name);
      const stone = /_(limestone|ivory|stone_shadow|tile|tile_warm|tile_blush|terracotta)$/.test(mesh.name);
      if (!water && !wood && !stone) return;
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      const p = g.attributes.position, uv = new Float32Array(p.count * 2);
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
      const scale = water ? .12 : wood ? .7 : 1.3;
      for (let i = 0; i < p.count; i += 3) {
        a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i+1); c.fromBufferAttribute(p, i+2);
        normal.crossVectors(b.sub(a), c.sub(a));
        const axis = Math.abs(normal.y) > Math.max(Math.abs(normal.x), Math.abs(normal.z)) ? 'y' : Math.abs(normal.x) > Math.abs(normal.z) ? 'x' : 'z';
        for (let j = i; j < i+3; j++) {
          uv[j*2] = (axis === 'x' ? p.getZ(j) : p.getX(j)) * scale;
          uv[j*2+1] = (axis === 'y' ? p.getZ(j) : p.getY(j)) * scale;
        }
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      mesh.geometry = g;
      mesh.material = mesh.material.clone();
      const m = mesh.material;
      m.map = maps[water ? 'water' : wood ? 'wood' : 'limestone'];
      m.bumpMap = m.map;
      m.bumpScale = water ? .035 : .018;
      m.roughness = water ? .3 : .86;
      if (water || wood) m.color.lerp(new THREE.Color('white'), water ? .85 : .6);
      m.needsUpdate = true;
    });
  }
  return { decorate };
}
