import assert from 'node:assert/strict';
import { Box3, Vector3, Raycaster, Group, MeshBasicMaterial } from 'three';
import { loadGeometry } from './load-geometry.mjs';
import { createBridgeCollision, EYE_HEIGHT } from '../src/bridge-collision.js';

const model = await loadGeometry('public/assets/models/stone-bridge.glb');
const size = new Box3().setFromObject(model).getSize(new Vector3());
if (size.x > size.z) model.rotation.y = Math.PI / 2;
model.scale.setScalar(4.05 / Math.max(size.x,size.z));
model.updateMatrixWorld(true);
const bounds = new Box3().setFromObject(model), center = bounds.getCenter(new Vector3());
model.position.set(-center.x,-bounds.min.y,-center.z-12.13);
const bridge = createBridgeCollision(model);
const ray = new Raycaster(new Vector3(),new Vector3(0,-1,0));
let highest = 0;
for (const lane of [-bridge.halfWalk,0,bridge.halfWalk]) for (const direction of [-1,1]) {
  let position = new Vector3(lane,EYE_HEIGHT,direction === -1 ? -9 : -15.2);
  for (let i=0;i<83;i++) {
    const wanted=position.clone();wanted.z+=direction*.075;
    position=bridge.move(position,wanted,true);
    assert.ok(Math.abs(position.z-wanted.z)<1e-6,'the bridge must be traversable in both directions');
    highest=Math.max(highest,position.y);
    if(position.z>bridge.south+.1 && position.z<bridge.north-.1){
      ray.ray.origin.set(position.x,4,position.z);
      const surface=ray.intersectObject(model,true)[0].point.y;
      assert.ok(position.y-EYE_HEIGHT>=surface-.008,'feet must stay on or above the real GLB deck');
    }
  }
  assert.ok(Math.abs(position.y-EYE_HEIGHT)<1e-6,'return to island ground height after crossing');
}
assert.ok(highest>EYE_HEIGHT+.85,'eye height must follow the raised arch');
for(const side of [-1,1]){
  let position=new Vector3(0,EYE_HEIGHT+bridge.heightAt(0,-12.13),-12.13);
  for(let i=0;i<40;i++){
    const wanted=position.clone();wanted.x+=side*.08;
    position=bridge.move(position,wanted,true);
  }
  assert.ok(Math.abs(position.x)<=bridge.halfWalk+.0001,'rails must stop lateral walking');
}
for(const enabled of [false,true]){
  const x=enabled?2:0;
  let position=new Vector3(x,EYE_HEIGHT,-9.8);
  for(let i=0;i<50;i++){
    const wanted=position.clone();wanted.z-=.1;
    position=bridge.move(position,wanted,enabled);
  }
  assert.ok(position.z>=-10.55,'missing bridge and water beside it must remain blocked');
}
const ramps=new Group();bridge.addRamps(ramps,new MeshBasicMaterial());
ramps.updateMatrixWorld(true);
for(const ramp of ramps.children){
  const box=new Box3().setFromObject(ramp);
  ray.ray.origin.set(0,4,(box.min.z+box.max.z)/2);
  assert.ok(ray.intersectObject(ramp).length,'ramp top must face upward and render with front-side materials');
}
console.log(`Production GLB: both directions grounded; peak eye height ${highest.toFixed(3)} m; rails, water barriers, and ramp faces passed.`);
