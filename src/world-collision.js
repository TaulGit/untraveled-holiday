import { Vector3, Triangle, Raycaster } from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';

// Small capsule, exact mesh surfaces: doorways remain open and foliage is soft.
export function createWorldCollision() {
  const layers = new Map();
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, .8);
  function register(key, root, enabled = () => true, stepSurface = false) {
    root.updateWorldMatrix(true, true);
    const tree = new Octree();
    root.traverse(mesh => {
      if (!mesh.isMesh || /foliage|background|paving|rug/.test(mesh.name)) return;
      const p = mesh.geometry.attributes.position, index = mesh.geometry.index;
      for (let i = 0; i < (index?.count ?? p.count); i += 3) {
        const vertices = [0, 1, 2].map(n => new Vector3().fromBufferAttribute(p, index ? index.getX(i + n) : i + n).applyMatrix4(mesh.matrixWorld));
        const triangle = new Triangle(...vertices);
        // Ignore overhead geometry and ground; keep low furniture and planters.
        if (Math.min(...vertices.map(v => v.y)) > 2.5 || Math.max(...vertices.map(v => v.y)) < .09) continue;
        tree.addTriangle(triangle);
      }
    });
    tree.build();
    layers.set(key, { tree, root, enabled, stepSurface });
  }
  function move(previous, desired) {
    const active = [...layers.values()].filter(layer => layer.enabled());
    const result = previous.clone();
    const steps = Math.max(1, Math.ceil(previous.distanceTo(desired) / .06));
    const delta = desired.clone().sub(previous).divideScalar(steps);
    for (let i = 0; i < steps; i++) {
      result.add(delta);
      result.y = desired.y;
      for (const layer of active.filter(l => l.stepSurface)) {
        for (const [dx, dz] of [[0,0], [.2,0], [-.2,0], [0,.2], [0,-.2]]) {
          ray.ray.origin.set(result.x + dx, .72, result.z + dz);
          const hit = ray.intersectObject(layer.root, true).find(h => h.face.normal.clone().transformDirection(h.object.matrixWorld).y > .65);
          if (hit) result.y = Math.max(result.y, 1.68 + hit.point.y + .015);
        }
      }
      for (let pass = 0; pass < 3; pass++) {
        const feet = result.y - 1.68;
        const capsule = new Capsule(new Vector3(result.x, feet + .25, result.z), new Vector3(result.x, feet + 1.38, result.z), .16);
        for (const layer of active) {
          const hit = layer.tree.capsuleIntersect(capsule);
          if (!hit || hit.depth < .0001) continue;
          const push = hit.normal.multiplyScalar(hit.depth + .001);
          // Vertical ground handling is separate; walls only slide horizontally.
          push.y = 0;
          capsule.translate(push);
          result.add(push);
        }
      }
    }
    return result;
  }
  return { register, move };
}
