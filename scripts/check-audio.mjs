import assert from 'node:assert/strict';
import {createAudio} from '../src/audio.js';
const changes=[],listeners={};let started=0;
global.document={hidden:false,addEventListener:(name,fn)=>listeners[name]=fn};
const media=[];global.Audio=class {paused=true;constructor(url){this.url=url;media.push(this);}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}};
global.window = { AudioContext: class {
  currentTime = 0;
  destination = {};
  async resume() {}
  async decodeAudioData() { return {duration: 60}; }
  createGain() { return {gain: {value: 0, setTargetAtTime: (v,t,c) => changes.push([v,c])}, connect() {}}; }
  createBufferSource() { return {connect() {}, start() { started++; }}; }
}};
global.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
const a=createAudio();a.setEnabled(true);await new Promise(r=>setTimeout(r,0));assert.equal(started,1);assert.equal(changes.at(-1)[0],.004);a.ambience(true);assert.equal(changes.at(-1)[0],.055);const n=changes.length;a.ambience(true);assert.equal(changes.length,n);document.hidden=true;listeners.visibilitychange();assert.equal(changes.at(-1)[0],0);document.hidden=false;listeners.visibilitychange();assert.equal(changes.at(-1)[0],.055);a.setEnabled(false);assert.equal(changes.at(-1)[0],0);a.setEnabled(true);await new Promise(r=>setTimeout(r,0));assert.equal(started,1);console.log('Audio: one loop, smooth levels, background mute and toggle passed.');

assert.equal(media.find(a=>a.url.endsWith('coastal-calm.mp3')).paused,false);a.setEnabled(false);assert.equal(media.find(a=>a.url.endsWith('coastal-calm.mp3')).paused,true);console.log('Music toggle and resume passed.');
