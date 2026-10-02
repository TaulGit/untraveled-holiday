import assert from 'node:assert/strict';
import {Vector3,Box3,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {createWorldCollision} from '../src/world-collision.js';
import {loadGeometry} from './load-geometry.mjs';
const world=createWorldCollision();
for(const name of ['office','coast'])world.register(name,await loadGeometry(`public/assets/scenery/${name}.glb`));
function walk(start,end,collision=world){let p=new Vector3(...start); const target=new Vector3(...end);for(let i=0;i<500&&p.distanceTo(target)>.03;i++){const step=target.clone().sub(p);step.y=0;step.clampLength(0,.05);p=collision.move(p,p.clone().add(step));}return p;}
for(const [start,end] of [[[0,1.68,6.5],[0,1.68,.55]],[[0,1.68,.55],[0,1.68,-7.15]],[[0,1.68,-14.8],[0,1.68,-17.2]]]){const p=walk(start,end);assert.ok(p.distanceTo(new Vector3(...end))<.1,`main route blocked at ${p.toArray()}`);}
const wallWorld=createWorldCollision();const wall=new Mesh(new BoxGeometry(.3,3,4),new MeshBasicMaterial());wall.position.set(1,1.5,0);wallWorld.register('wall',wall);
const stopped=walk([0,1.68,0],[2,1.68,0],wallWorld);assert.ok(stopped.x<.8,'wall blocks walking');
const slide=walk([.65,1.68,-1],[2,1.68,1],wallWorld);assert.ok(slide.z>.8,'slides along wall');
for(const [name,height,x,z,rotate] of [['coastal-arch',3.75,0,-5.25,true],['lighthouse',4.9,-3.5,-20.6,false],['seaside-gazebo',3.75,0,-22.1,false]]){
 const model=await loadGeometry(`public/assets/models/${name}.glb`);const size=new Box3().setFromObject(model).getSize(new Vector3());if(rotate&&size.z>size.x)model.rotation.y=Math.PI/2;if(name==='seaside-gazebo')model.rotation.y=-Math.PI/2;model.scale.setScalar(height/size.y);model.updateMatrixWorld(true);const box=new Box3().setFromObject(model);const c=box.getCenter(new Vector3());model.position.set(x-c.x,-box.min.y,z-c.z);world.register(name,model,()=>true,name==='seaside-gazebo');
}
assert.ok(walk([0,1.68,-4.5],[0,1.68,-7.15]).z<-7,'arch opening is accessible');
const tower=walk([-3.5,1.68,-18],[-3.5,1.68,-20.6]);assert.ok(tower.z>-20.2,'lighthouse blocks player');
const gazebo=walk([0,1.68,-18.8],[0,1.68,-22.1]);assert.ok(gazebo.z<-21,'gazebo entrance is accessible');
console.log('World collision checks passed', {tower:tower.toArray(),gazebo:gazebo.toArray()});

