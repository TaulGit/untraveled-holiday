import { Box3, Vector3, Raycaster, MathUtils, BufferGeometry, Float32BufferAttribute, Mesh } from 'three';

export const EYE_HEIGHT = 1.68;
const RADIUS = 0.18;
const GAP_NORTH = -10.55;
const GAP_SOUTH = -13.68;

/** Sample the actual normalized Tripo mesh once, then use a cheap heightfield. */
export function createBridgeCollision(model) {
  model.updateWorldMatrix(true, true);
  const bounds = new Box3().setFromObject(model);
  const halfDeck = Math.min(.66, (bounds.max.x - bounds.min.x) * .285);
  const halfWalk = halfDeck - RADIUS;
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const south = bounds.min.z, north = bounds.max.z;
  const columns = 12, rows = 96;
  const heights = new Float32Array((columns + 1) * (rows + 1));
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, bounds.max.y - bounds.min.y + 3);
  model.traverse((part) => { if (part.isMesh) part.geometry.computeBoundingBox(); });
  for (let row = 0; row <= rows; row++) {
    const z = MathUtils.lerp(south + .035, north - .035, row / rows);
    for (let col = 0; col <= columns; col++) {
      const x = centerX + MathUtils.lerp(-halfDeck, halfDeck, col / columns);
      ray.ray.origin.set(x, bounds.max.y + 1, z);
      const hit = ray.intersectObject(model, true)[0];
      heights[row * (columns + 1) + col] = hit ? hit.point.y : bounds.min.y + .2;
    }
  }
  function sample(x, z) {
    const u = MathUtils.clamp((x - centerX + halfDeck) / (2 * halfDeck), 0, 1) * columns;
    const v = MathUtils.clamp((z - south - .035) / (north - south - .07), 0, 1) * rows;
    const c = Math.min(columns - 1, Math.floor(u)), r = Math.min(rows - 1, Math.floor(v));
    const a = heights[r * (columns + 1) + c], b = heights[r * (columns + 1) + c + 1];
    const d = heights[(r + 1) * (columns + 1) + c], e = heights[(r + 1) * (columns + 1) + c + 1];
    return MathUtils.lerp(MathUtils.lerp(a, b, u - c), MathUtils.lerp(d, e, u - c), v - r);
  }
  // A small support footprint avoids clipping uneven individual paving stones.
  function deckHeight(x, z) {
    let y = sample(x,z);
    for (const dx of [-.14, .14]) for (const dz of [-.11, .11]) y = Math.max(y, sample(x + dx, z + dz));
    return y + .035;
  }
  const rampLength = .8;
  const northHeight = Math.max(...[-halfWalk,0,halfWalk].map(x=>deckHeight(centerX+x,north)));
  const southHeight = Math.max(...[-halfWalk,0,halfWalk].map(x=>deckHeight(centerX+x,south)));
  function heightAt(x,z) {
    if (Math.abs(x-centerX) > halfWalk + .002) return 0;
    if (z >= south && z <= north) return deckHeight(x,z);
    if (z > north && z < north+rampLength) return northHeight * (north+rampLength-z)/rampLength;
    if (z < south && z > south-rampLength) return southHeight * (z-south+rampLength)/rampLength;
    return 0;
  }
  const rails = [
    { minX: bounds.min.x, maxX: centerX-halfDeck, minZ: south, maxZ: north },
    { minX: centerX+halfDeck, maxX: bounds.max.x, minZ: south, maxZ: north },
  ];
  function move(previous, desired, enabled) {
    const next = desired.clone();
    if (enabled) {
      // Slide along expanded rail boxes; the radius keeps the body off the stone.
      for (const box of rails) {
        const minX=box.minX-RADIUS,maxX=box.maxX+RADIUS,minZ=box.minZ-RADIUS,maxZ=box.maxZ+RADIUS;
        if (previous.z>minZ && previous.z<maxZ && next.x>minX && next.x<maxX) {
          next.x = previous.x <= minX ? minX : previous.x >= maxX ? maxX : previous.x;
        }
        if (next.x>minX && next.x<maxX && next.z>minZ && next.z<maxZ) {
          next.z = previous.z <= minZ ? minZ : previous.z >= maxZ ? maxZ : previous.z;
        }
      }
    }
    if (next.z < GAP_NORTH && next.z > GAP_SOUTH && (!enabled || Math.abs(next.x-centerX)>halfWalk+.002)) {
      next.z = previous.z >= GAP_NORTH ? GAP_NORTH : previous.z <= GAP_SOUTH ? GAP_SOUTH : previous.z;
      if (previous.z < GAP_NORTH && previous.z > GAP_SOUTH) next.x = previous.x;
    }
    next.y = EYE_HEIGHT + (enabled ? heightAt(next.x,next.z) : 0);
    return next;
  }
  function addRamps(parent, material) {
    for (const [edge, end, height] of [[north,north+rampLength,northHeight],[south,south-rampLength,southHeight]]) {
      const l=centerX-halfDeck,r=centerX+halfDeck;
      const points=[[l,height,edge],[r,height,edge],[r,.015,end],[l,.015,end],[l,0,edge],[r,0,edge]];
      const geometry = new BufferGeometry();
      geometry.setAttribute('position',new Float32BufferAttribute(points.flat(),3));
      const indices=[0,1,2,0,2,3,4,0,3,5,2,1,4,5,1,4,1,0,4,3,2,4,2,5];
      if (end>edge) for(let i=0;i<indices.length;i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
      geometry.setIndex(indices);geometry.computeVertexNormals();
      const ramp=new Mesh(geometry,material);ramp.name='Bridge approach ramp';ramp.receiveShadow=true;ramp.castShadow=true;parent.add(ramp);
    }
  }
  return { move, heightAt, addRamps, north, south, halfWalk, centerX, bounds };
}
