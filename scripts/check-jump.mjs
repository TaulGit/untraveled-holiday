import assert from 'node:assert/strict';import {createJump} from '../src/jump.js';
for(const dt of [1/30,1/60,1/144]){const jump=createJump();jump.start();let peak=0;for(let i=0;i<Math.ceil(1/dt);i++){jump.update(dt);peak=Math.max(peak,jump.height);if(i===5)jump.start();}assert.ok(peak>.7&&peak<.75,'consistent jump height; no midair double jump');assert.equal(jump.height,0,'lands exactly at ground');jump.start();jump.update(dt);jump.reset();assert.equal(jump.height,0);}
console.log('Jump passed: 30/60/144 fps, no double jump, landing and reset.');
