import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { assessAlignment } from '../src/photo-alignment.js';

const marks = [[-1.22,.84,-10.35],[1.22,.84,-10.35],[-1.22,.84,-13.68],[1.22,.84,-13.68],[-1.22,.06,-10.35],[1.22,.06,-10.35]];
for (const [width,height] of [[1440,900],[1920,1080],[390,844],[844,390]]) {
  const target = new PerspectiveCamera(69,width/height,.05,180);
  target.position.set(0,1.68,-7.15);
  const live = target.clone();
  const measure = (ready = false) => assessAlignment(live,target,marks,width,height,ready);
  assert.equal(measure().error,0,'matching viewpoints must have no projection error');
  live.position.x = .15;
  live.position.z += .18;
  live.rotation.y = -.015;
  assert.ok(measure().ready,'small lateral, depth and angle error should be accepted');
  live.position.x = 2.5;
  assert.ok(!measure().ready,'different viewpoint must not unlock photo');
  live.position.copy(target.position);
  live.rotation.y = Math.PI;
  assert.ok(!measure().ready,'facing away must not unlock photo');
  live.rotation.y=0;
  // Measure an actual projected boundary instead of duplicating the threshold formula.
  const threshold=measure().tolerance;
  live.position.x=.1;
  const pixelsPerMeter=measure().error/.1;
  live.position.x=threshold*1.1/pixelsPerMeter;
  assert.ok(!measure(false).ready && measure(true).ready,'hysteresis must retain a just-unlocked placement');
  console.log(`${width}x${height}: exact pose, relaxed placement, rejection and hysteresis passed`);
}
