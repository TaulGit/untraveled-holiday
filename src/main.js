import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assessAlignment } from './photo-alignment.js';
import { createBridgeCollision, EYE_HEIGHT } from './bridge-collision.js';
import { createWorldCollision } from './world-collision.js';
import { createSurfaceTextures } from './surface-textures.js';
import { createJump } from './jump.js';
import { createAudio } from './audio.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const ui = {
  intro: $('intro'), ending: $('ending'), chapter: $('chapter'), hintCard: $('hint-card'),
  hintTitle: $('hint-title'), hintCopy: $('hint-copy'), action: $('action-button'),
  reticle: $('reticle'), targetHint: $('target-hint'), photo: $('photo-stage'),
  meter: $('align-meter'), fill: $('align-fill'), alignHelp: $('align-help'),
  photoFrame: $('photo-frame'), photoImage: $('photo-image'), controlsHint: $('controls-hint'),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color('#7bddf0');
scene.fog = new THREE.Fog('#c2e5df', 45, 150);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(69, window.innerWidth / window.innerHeight, 0.05, 240);
camera.rotation.order = 'YXZ';
const initialPosition = new THREE.Vector3(0, EYE_HEIGHT, 6.5);
camera.position.copy(initialPosition);
let yaw = 0;
let pitch = 0;

const hemi = new THREE.HemisphereLight('#d0f4ff', '#828ea1', 1.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4dc', 3.1);
sun.position.set(-9, 17, -8);
sun.target.position.set(0, 0, -11);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
sun.shadow.normalBias = 0.04;
scene.add(sun);

const sky = new THREE.Mesh(new THREE.SphereGeometry(165, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: {
    zenith: { value: new THREE.Color('#35b8df') },
    horizon: { value: new THREE.Color('#d3eee1') },
    sunlight: { value: new THREE.Color('#fff0cd') },
  },
  vertexShader: 'varying vec3 skyDirection; void main(){skyDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: `varying vec3 skyDirection; uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunlight;
    void main(){vec3 d=normalize(skyDirection); float h=pow(max(d.y,0.0),0.55);
    vec3 c=mix(horizon,zenith,h); float s=max(dot(d,normalize(vec3(-0.35,0.5,-0.7))),0.0);
    c+=sunlight*(pow(s,550.0)*0.7+pow(s,14.0)*0.12); gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
}));
sky.frustumCulled = false;
scene.add(sky);

function material(color, roughness = 0.9, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
const mat = {
  plaster: material('#e8eeeb'), trim: material('#bccbd0'), floor: material('#d8e5e1'),
  rug: material('#d38488'), wood: material('#9e7564'), paper: material('#f8f3df'),
  ink: material('#385565'), water: material('#26a7c2', 0.26), sand: material('#f1d5aa'),
  path: material('#e3b39a'), red: material('#d96b68'), cream: material('#fff3dc'),
  leaf: material('#27a878'), leafLight: material('#82c992'), lilac: material('#ba83bf'),
  glass: new THREE.MeshStandardMaterial({ color: '#c7eaf1', transparent: true, opacity: 0.36, roughness: 0.08 }),
};

function box(parent, w, h, d, x, y, z, m, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function plane(parent, w, h, x, y, z, m, rx = -Math.PI / 2) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.rotation.x = rx;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, rt, rb, h, x, y, z, m, segments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function labelTexture(text, bg, fg, width = 512, height = 200) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const cx = c.getContext('2d');
  cx.fillStyle = bg;
  cx.fillRect(0, 0, width, height);
  cx.strokeStyle = '#b69e7c';
  cx.lineWidth = 8;
  cx.strokeRect(14, 14, width - 28, height - 28);
  cx.fillStyle = fg;
  cx.font = 'bold 54px "Noto Sans SC", sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function plantCluster(parent, x, y, z, scale = 1, purple = false) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const colors = purple ? [mat.lilac, material('#e1a1c5'), material('#8384c3')] : [mat.leaf, mat.leafLight, material('#5fc59d')];
  for (let i = 0; i < 11; i++) {
    const angle = i * Math.PI * 2 / 11;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, (0.55 + (i % 3) * 0.12) * scale, 5), colors[i % 3]);
    leaf.position.set(Math.cos(angle) * 0.19 * scale, 0.33 * scale, Math.sin(angle) * 0.19 * scale);
    leaf.rotation.z = Math.cos(angle) * 0.34;
    leaf.rotation.x = -Math.sin(angle) * 0.34;
    leaf.castShadow = true;
    group.add(leaf);
  }
  parent.add(group);
  return group;
}

const office = new THREE.Group();
scene.add(office);
box(office, 9, 0.35, 13, 0, -0.17, 2.35, mat.floor, false);
box(office, 0.3, 1.05, 13, -4.5, 0.53, 2.35, mat.plaster, false);
box(office, 0.3, 0.8, 13, -4.5, 4.8, 2.35, mat.plaster, false);
for (const z of [-3.9, 0.2, 4.3, 8.5]) box(office, 0.34, 3.5, 0.28, -4.5, 2.55, z, mat.trim, false);
box(office, 0.3, 5.2, 13, 4.5, 2.6, 2.35, mat.plaster, false);
box(office, 9, 5.2, 0.28, 0, 2.6, 8.86, mat.plaster, false);
box(office, 3.1, 5.2, 0.3, -3.03, 2.6, -4.15, mat.plaster, false);
box(office, 3.1, 5.2, 0.3, 3.03, 2.6, -4.15, mat.plaster, false);
box(office, 3.0, 1.85, 0.32, 0, 4.28, -4.15, mat.plaster, false);
box(office, 3.03, 0.16, 0.43, 0, 3.37, -4.03, mat.trim);
box(office, 0.16, 3.4, 0.43, -1.49, 1.7, -4.03, mat.trim);
box(office, 0.16, 3.4, 0.43, 1.49, 1.7, -4.03, mat.trim);
box(office, 4.5, 0.02, 3.7, 0, 0.025, 3.25, mat.rug, false);
for (let x = -4; x <= 4; x += 1) box(office, 0.009, 0.008, 13, x, 0.014, 2.35, mat.trim, false);
for (let z = -3.6; z <= 8.4; z += 1) box(office, 9, 0.008, 0.009, 0, 0.014, z, mat.trim, false);
box(office, 9, 0.18, 13, 0, 5.25, 2.35, mat.plaster, false);

// Familiar office props keep the first scene readable without making it a maze.
box(office, 2.2, 0.16, 1.25, 1.7, 1.0, 2.65, mat.wood);
for (const dx of [-0.92, 0.92]) for (const dz of [-0.48, 0.48]) box(office, 0.13, 0.92, 0.13, 1.7 + dx, 0.48, 2.65 + dz, mat.wood);
box(office, 0.75, 0.1, 0.52, 0.82, 1.11, 2.52, mat.ink);
box(office, 0.74, 0.62, 0.08, 0.82, 1.45, 2.26, mat.ink);
box(office, 0.57, 0.43, 0.01, 0.82, 1.45, 2.21, new THREE.MeshBasicMaterial({ color: '#9eb7ae' }));
box(office, 0.28, 0.06, 0.3, 2.4, 1.12, 2.9, mat.paper);
box(office, 0.95, 0.9, 0.78, -2.7, 0.45, 5.2, mat.wood);
box(office, 2.2, 0.9, 0.18, -4.29, 2.25, 2.1, mat.trim);
box(office, 1.7, 0.65, 0.02, -4.17, 2.25, 2.1, new THREE.MeshBasicMaterial({ map: labelTexture('休 假 申 请', '#f5e6c7', '#9d6146') }));
for (const [x, z, s] of [[-3.7, 1.3, 1.15],[-3.65,-2.35,0.85],[3.65,-2.25,0.7]]) {
  cylinder(office, 0.36*s, 0.28*s, 0.48*s, x, 0.24*s, z, mat.cream, 10);
  plantCluster(office, x, 0.46*s, z, s);
}
const ceilingLamp = new THREE.PointLight('#ffdfab', 10, 12);
ceilingLamp.position.set(0, 3.6, 3.0);
office.add(ceilingLamp);
const shade = cylinder(office, 0.48, 0.6, 0.27, 0, 4.12, 3, mat.cream);
shade.material.side = THREE.DoubleSide;

const blankDoor = box(office, 2.78, 3.32, 0.11, 0, 1.67, -4.17,
  new THREE.MeshStandardMaterial({ color: '#9aaca8', roughness: 1, transparent: true, opacity: 1 }));
const doorTitle = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.76), new THREE.MeshBasicMaterial({ map: labelTexture('未 知 行 程', '#e8d9be', '#7b634f'), transparent: true }));
doorTitle.position.set(0, 2.0, -4.096);
office.add(doorTitle);

const beach = new THREE.Group();
scene.add(beach);
beach.visible = false;
box(beach, 22, 0.24, 6.9, 0, -0.12, -7.25, mat.sand, false);
box(beach, 22, 0.24, 11.2, 0, -0.12, -19.25, mat.sand, false);
plane(beach, 45, 33, 0, -1.25, -19, mat.water);
plane(beach, 5.2, 5.6, 0, 0.014, -7.6, mat.path);
plane(beach, 5.2, 8.7, 0, 0.014, -18.8, mat.path);
for (const [x,z,w,h,d] of [[-7.8,-8.9,1.9,3.9,4.0],[7.8,-8.9,2.2,5.3,4.0],[7.2,-20.2,3.1,6.7,3.6],[-7.2,-22.3,2.9,5.9,3.2]]) {
  box(beach, w, h, d, x, h/2, z, mat.plaster, false);
  box(beach, w + 0.12, 0.15, d + 0.12, x, h + 0.04, z, mat.trim, false);
}
for (const x of [-4.1,4.1]) {
  box(beach, 0.5, 0.65, 5.2, x, 0.33, -7.8, mat.plaster, false);
  box(beach, 0.7, 0.12, 5.2, x, 0.73, -7.8, mat.cream, false);
  box(beach, 0.5, 0.65, 8.6, x, 0.33, -19.15, mat.plaster, false);
  box(beach, 0.7, 0.12, 8.6, x, 0.73, -19.15, mat.cream, false);
  for (let i=0;i<4;i++) plantCluster(beach, x + (x<0?-0.17:0.17), 0.78, -5.9-i*1.28, 0.8+(i%3)*0.12, i%3===0);
  for (let i=0;i<6;i++) plantCluster(beach, x + (x<0?-0.17:0.17), 0.78, -15.2-i*1.35, 0.8+(i%3)*0.12, i%3===0);
}
for (const [x,z] of [[-6,-7.8],[-5.4,-9.6],[5.4,-9.2],[6,-7.1],[-5.2,-18.5],[5.1,-17.2],[-5.7,-22.1]]) {
  plantCluster(beach,x,0,z,1.4,true);
  plantCluster(beach,x+0.48,0,z+0.2,1.25,false);
}
const boardwalk = material('#a87755');
for (let i = 0; i < 8; i++) box(beach, 2.2, 0.08, 0.31, 0, 0.08, -5.0 - i * 0.62, boardwalk);
for (let i = 0; i < 12; i++) box(beach, 2.2, 0.08, 0.31, 0, 0.08, -15.1 - i * 0.65, boardwalk);
for (const x of [-1.28, 1.28]) for (let i = 0; i < 3; i++) cylinder(beach, 0.045, 0.06, 0.55, x, 0.3, -5.0 - i * 1.65, mat.wood, 8);
for (const z of [-10.35,-13.68,-20.0,-23.6]) for (const x of [-1.22,1.22]) {
  cylinder(beach,0.12,0.15,0.74,x,0.37,z,mat.plaster,8);
  box(beach,0.36,0.09,0.36,x,0.79,z,mat.cream);
}

for (const [x, z, s] of [[-5.1,-7.2,1],[-5.6,-19.5,.8],[5,-20.8,.9],[5.4,-7.6,.7]]) {
  cylinder(beach, 0.12*s, 0.15*s, 1.35*s, x, 0.69*s, z, mat.wood, 7);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.72*s, 1.45*s, 8), material('#668966'));
  leaf.position.set(x, 1.72*s, z);
  leaf.castShadow = true;
  beach.add(leaf);
}
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 12), new THREE.MeshBasicMaterial({ color: '#fff0bd' }));
sunDisc.position.set(8, 8.7, -42);
beach.add(sunDisc);
const cloudMaterial = new THREE.MeshBasicMaterial({color:'#f8fffa',transparent:true,opacity:0.78,depthWrite:false});
for (const [x,y,z,s] of [[-15,8,-35,1.1],[-12.7,8.3,-35,0.8],[1,9.2,-41,1.2],[3.4,9,-41,0.85],[15,7.4,-37,1]]) {
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(1,12,8),cloudMaterial);
  cloud.position.set(x,y,z);
  cloud.scale.set(s*2.3,s*0.42,s*0.65);
  beach.add(cloud);
}
for (const [x,z,r] of [[-16,-29,3.2],[14,-31,4.4],[-3,-39,5.4]]) {
  const island = new THREE.Mesh(new THREE.ConeGeometry(r,r*0.9,7),material('#89c8c5'));
  island.position.set(x,-0.5,z);
  island.receiveShadow=true;
  beach.add(island);
}
const foamMaterial=new THREE.MeshBasicMaterial({color:'#c5f9f1',transparent:true,opacity:0.48,depthWrite:false});
for (let i=0;i<23;i++) {
  const wave=plane(beach,1.2+(i%4)*0.57,0.045,-11+(i*7)%23,-1.225,-8.7-i*0.79,foamMaterial);
  wave.rotation.z=0.04*(i%3-1);
}
for (const x of [-6.6,6.6]) {
  box(beach,1.65,0.57,0.75,x,0.3,-17.4,mat.plaster);
  box(beach,1.78,0.12,0.85,x,0.67,-17.4,mat.cream);
  plantCluster(beach,x-0.33,0.7,-17.4,0.85,true);
  plantCluster(beach,x+0.34,0.7,-17.4,0.85,false);
}

function fallbackLighthouse() {
  const group = new THREE.Group();
  cylinder(group, 0.6, 0.87, 3.5, 0, 1.75, 0, mat.cream);
  cylinder(group, 0.64, 0.72, 0.72, 0, 1.2, 0, mat.red);
  cylinder(group, 0.55, 0.62, 0.72, 0, 2.55, 0, mat.red);
  cylinder(group, 0.78, 0.65, 0.2, 0, 3.58, 0, mat.wood);
  cylinder(group, 0.5, 0.5, 0.65, 0, 3.98, 0, mat.glass);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.55, 20), mat.red);
  roof.position.y = 4.57;
  group.add(roof);
  return group;
}
function fallbackSuitcase() {
  const group = new THREE.Group();
  box(group, 1.0, 0.67, 0.34, 0, 0.34, 0, material('#548e93'));
  box(group, 0.2, 0.7, 0.36, -0.37, 0.35, 0, mat.wood);
  box(group, 0.2, 0.7, 0.36, 0.37, 0.35, 0, mat.wood);
  box(group, 0.35, 0.09, 0.1, 0, 0.76, 0, mat.wood);
  box(group, 0.22, 0.14, 0.01, 0.18, 0.45, 0.18, mat.paper);
  return group;
}
function fallbackArch() {
  const group = new THREE.Group();
  box(group, 0.43, 3.3, 0.58, -1.45, 1.65, 0, mat.plaster);
  box(group, 0.43, 3.3, 0.58, 1.45, 1.65, 0, mat.plaster);
  box(group, 3.35, 0.62, 0.65, 0, 3.25, 0, mat.plaster);
  box(group, 3.55, 0.12, 0.74, 0, 3.62, 0, mat.trim);
  return group;
}
function fallbackBridge() {
  const group = new THREE.Group();
  box(group, 2.8, 0.24, 4.0, 0, 0.08, 0, mat.plaster);
  for (const x of [-1.28,1.28]) {
    for (const z of [-1.8,-0.6,0.6,1.8]) cylinder(group, 0.06, 0.07, 0.82, x, 0.5, z, mat.trim, 8);
    box(group, 0.13, 0.13, 3.95, x, 0.9, 0, mat.trim);
  }
  return group;
}
function fallbackPalm() {
  const group = new THREE.Group();
  cylinder(group, 0.15, 0.22, 3.4, 0, 1.7, 0, mat.wood, 10);
  for (let i=0;i<9;i++) {
    const a=i*Math.PI*2/9;
    const leaf=new THREE.Mesh(new THREE.ConeGeometry(0.35,2.6,5),i%2?mat.leaf:mat.leafLight);
    leaf.position.set(Math.cos(a)*1.04,3.35,Math.sin(a)*1.04);
    leaf.rotation.z=Math.cos(a)*1.05;
    leaf.rotation.x=-Math.sin(a)*1.05;
    group.add(leaf);
  }
  return group;
}
function fallbackCamera() {
  const group = new THREE.Group();
  box(group, 0.72, 0.53, 0.37, 0, 0.32, 0, mat.cream);
  cylinder(group, 0.19, 0.19, 0.18, 0, 0.34, 0.22, mat.ink, 20).rotation.x=Math.PI/2;
  box(group, 0.34, 0.08, 0.15, 0, 0.67, 0, mat.red);
  return group;
}
function fallbackUmbrella() {
  const group = new THREE.Group();
  cylinder(group, 0.05, 0.05, 2.25, 0, 1.13, 0, mat.wood);
  const top=new THREE.Mesh(new THREE.ConeGeometry(1.42,0.53,12),mat.red);
  top.position.y=2.37;group.add(top);
  return group;
}
function fallbackSailboat() {
  const group = new THREE.Group();
  box(group, 1.9, 0.34, 0.75, 0, 0.19, 0, mat.cream);
  cylinder(group, 0.04, 0.05, 1.7, 0, 1.12, 0, mat.wood);
  const sail=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0.48,0),new THREE.Vector3(0,1.95,0),new THREE.Vector3(0.84,0.48,0)]),new THREE.MeshBasicMaterial({color:'#4bb8c0',side:THREE.DoubleSide}));
  group.add(sail);
  return group;
}
function fallbackKiosk() {
  const group=new THREE.Group();
  box(group,1.4,2.0,0.83,0,1.0,0,mat.plaster);
  box(group,1.5,0.14,0.95,0,2.07,0,mat.cream);
  box(group,0.95,1.2,0.05,0,1.2,0.45,mat.water);
  box(group,0.7,0.08,0.08,0,0.93,0.51,mat.red);
  return group;
}
function fallbackGazebo() {
  const group=new THREE.Group();
  cylinder(group,2.15,2.15,0.25,0,0.12,0,mat.plaster,8);
  for (const x of [-1.4,1.4]) for (const z of [-1.4,1.4]) cylinder(group,0.13,0.16,2.65,x,1.47,z,mat.plaster,8);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(2.55,0.95,8),mat.trim);
  roof.position.y=3.35;group.add(roof);
  return group;
}

function assetAnchor(parent, position, fallback, rotation = 0) {
  const anchor = new THREE.Group();
  anchor.position.set(...position);
  anchor.rotation.y = rotation;
  anchor.userData.fallback = fallback;
  anchor.add(fallback);
  parent.add(anchor);
  return anchor;
}

const suitcaseAnchor = assetAnchor(office,[1.73,1.1,2.62],fallbackSuitcase(),-0.35);
const lighthouseAnchor = assetAnchor(beach,[-3.5,0.02,-20.6],fallbackLighthouse());
const archAnchor = assetAnchor(beach,[0,0,-5.25],fallbackArch());
const palmAnchors = [
  assetAnchor(beach,[-5.8,0,-6.9],fallbackPalm(),0.25),
  assetAnchor(beach,[5.7,0,-8.6],fallbackPalm(),-0.6),
  assetAnchor(beach,[5.7,0,-20.8],fallbackPalm(),1.2),
  assetAnchor(beach,[-5.9,0,-21.8],fallbackPalm(),-0.8),
];
const umbrellaAnchor = assetAnchor(beach,[-5.15,0,-9.0],fallbackUmbrella(),-0.4);
const sailboatAnchor = assetAnchor(beach,[7.6,-1.08,-13.0],fallbackSailboat(),0.7);
const kioskAnchor = assetAnchor(beach,[2.85,0,-7.75],fallbackKiosk(),-0.7);
const cameraAnchor = assetAnchor(beach,[2.7,0.95,-16.7],fallbackCamera(),-0.8);
box(beach,1.1,0.95,1.1,2.7,0.48,-16.7,mat.plaster);
const bridgeGroup = new THREE.Group();
bridgeGroup.visible = false;
beach.add(bridgeGroup);
box(bridgeGroup,2.55,0.08,4.12,0,0.01,-12.13,mat.cream,false);
const bridgeAnchor = assetAnchor(bridgeGroup,[0,0,-12.13],fallbackBridge());
let bridgeCollision = createBridgeCollision(bridgeAnchor);
const bridgeRamps = new THREE.Group();
bridgeGroup.add(bridgeRamps);
bridgeCollision.addRamps(bridgeRamps, mat.plaster);
const gazeboGroup = new THREE.Group();
gazeboGroup.visible = false;
beach.add(gazeboGroup);
const gazeboAnchor = assetAnchor(gazeboGroup,[0,0,-22.1],fallbackGazebo());

const memory = new THREE.Group();
memory.position.set(0, 1.65, -22.1);
const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.36), new THREE.MeshBasicMaterial({ color: '#ffe3a2' }));
memory.add(star);
const glow = new THREE.PointLight('#ffce76', 8, 4);
memory.add(glow);
beach.add(memory);
memory.visible = false;

const captureCamera = new THREE.PerspectiveCamera(69, window.innerWidth / window.innerHeight, 0.05, 240);
captureCamera.rotation.order = 'YXZ';
const photoStages = [
  {
    pose: new THREE.Vector3(0,1.68,0.55), yaw:0,
    marks:[[-1.49,0.08,-4.01],[1.49,0.08,-4.01],[-1.49,3.35,-4.01],[1.49,3.35,-4.01],[-3,2.25,-4],[3,2.25,-4]],
    caption:'01 · 海岸', stamp:'南 岬 · 07.26 / PHOTO 01',
    title:'对准门框', copy:'边框变绿后放下。',
  },
  {
    pose: new THREE.Vector3(0,1.68,-7.15), yaw:0,
    marks:[[-1.22,0.84,-10.35],[1.22,0.84,-10.35],[-1.22,0.84,-13.68],[1.22,0.84,-13.68],[-1.22,0.06,-10.35],[1.22,0.06,-10.35]],
    caption:'02 · 石桥', stamp:'南 岬 · 07.26 / PHOTO 02',
    title:'对准两岸', copy:'边框变绿后放下。',
  },
  {
    pose: new THREE.Vector3(0,1.68,-17.2), yaw:0,
    marks:[[-1.22,0.84,-20.0],[1.22,0.84,-20.0],[-1.22,0.84,-23.6],[1.22,0.84,-23.6],[-1.22,0.06,-20.0],[1.22,0.06,-20.0]],
    caption:'03 · 凉亭', stamp:'南 岬 · 07.26 / PHOTO 03',
    title:'对准凉亭', copy:'边框变绿后放下。',
  },
];

function positionPhotoCrop() {
  const bounds = ui.photoFrame.getBoundingClientRect();
  ui.photoImage.style.width = `${window.innerWidth}px`;
  ui.photoImage.style.height = `${window.innerHeight}px`;
  ui.photoImage.style.backgroundSize = `${window.innerWidth}px ${window.innerHeight}px`;
  ui.photoImage.style.left = `${-bounds.left}px`;
  ui.photoImage.style.top = `${-bounds.top}px`;
}

function capturePhoto(index) {
  const stage = photoStages[index];
  const width = Math.max(1, Math.floor(window.innerWidth));
  const height = Math.max(1, Math.floor(window.innerHeight));
  captureCamera.position.copy(stage.pose);
  captureCamera.rotation.set(0,stage.yaw,0);
  captureCamera.aspect = width / height;
  captureCamera.updateProjectionMatrix();
  captureCamera.updateMatrixWorld(true);
  const target = new THREE.WebGLRenderTarget(width, height, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, samples: 4 });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const oldTarget = renderer.getRenderTarget();
  const oldBeach = beach.visible;
  const oldDoor = blankDoor.visible;
  const oldDoorTitle = doorTitle.visible;
  const oldBridge = bridgeGroup.visible;
  const oldGazebo = gazeboGroup.visible;
  const oldMemory = memory.visible;
  beach.visible = true;
  blankDoor.visible = false;
  doorTitle.visible = false;
  bridgeGroup.visible = index >= 1;
  gazeboGroup.visible = index >= 2;
  memory.visible = index >= 2;
  renderer.setRenderTarget(target);
  renderer.render(scene, captureCamera);
  const pixels = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  renderer.setRenderTarget(oldTarget);
  beach.visible = oldBeach;
  blankDoor.visible = oldDoor;
  doorTitle.visible = oldDoorTitle;
  bridgeGroup.visible = oldBridge;
  gazeboGroup.visible = oldGazebo;
  memory.visible = oldMemory;
  target.dispose();
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = width;
  photoCanvas.height = height;
  const context = photoCanvas.getContext('2d');
  const image = context.createImageData(width, height);
  for (let row = 0; row < height; row++) {
    const source = (height - row - 1) * width * 4;
    image.data.set(pixels.subarray(source, source + width * 4), row * width * 4);
  }
  context.putImageData(image, 0, 0);
  ui.photoImage.style.backgroundImage = `url("${photoCanvas.toDataURL('image/jpeg', 0.93)}")`;
  positionPhotoCrop();
}

const contentStatus = { loaded: 0, failed: 0, total: 17 };
const worldCollision = createWorldCollision();
const surfaceTextures = createSurfaceTextures(scene, sky, contentSettled);
let seaHeight = -1.08;
function contentSettled(ok) {
  contentStatus.loaded++;
  if (!ok) contentStatus.failed++;
  const done = contentStatus.loaded === contentStatus.total;
  $('loading-status').textContent = done
    ? (contentStatus.failed ? '部分场景未载入，可刷新重试' : '准备好了')
    : `加载中 · ${contentStatus.loaded} / ${contentStatus.total}`;
  $('start-button').disabled = !done;
}

function loadGlb(path, anchors, fit, sizeTarget, orientation = null) {
  new GLTFLoader().load(path, (gltf) => {
    for (const anchor of anchors) {
      const model = gltf.scene.clone(true);
      const original = new THREE.Box3().setFromObject(model);
      const sourceSize = original.getSize(new THREE.Vector3());
      if (Math.max(sourceSize.x, sourceSize.y, sourceSize.z) <= 0) continue;
      if ((orientation === 'z' && sourceSize.x > sourceSize.z) || (orientation === 'x' && sourceSize.z > sourceSize.x)) model.rotation.y = Math.PI / 2;
      if (anchor === gazeboAnchor) model.rotation.y = -Math.PI / 2;
      const denominator = fit === 'height' ? sourceSize.y : Math.max(sourceSize.x, sourceSize.z);
      model.scale.setScalar(sizeTarget / Math.max(denominator, 0.01));
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= bounds.min.y;
      model.traverse((part) => { if (part.isMesh) { part.castShadow = true; part.receiveShadow = true; } });
      anchor.remove(anchor.userData.fallback);
      anchor.add(model);
      if (anchor !== bridgeAnchor) worldCollision.register(anchor, anchor, () => anchor === suitcaseAnchor || (beach.visible && (anchor !== gazeboAnchor || gazeboGroup.visible)), anchor === gazeboAnchor);
      if (anchor === bridgeAnchor) {
        bridgeCollision = createBridgeCollision(bridgeAnchor);
        for (const ramp of [...bridgeRamps.children]) { ramp.geometry.dispose(); bridgeRamps.remove(ramp); }
        bridgeCollision.addRamps(bridgeRamps, mat.plaster);
      }
    }
    if (state.phase === 'align') capturePhoto(state.activePhoto);
    contentSettled(true);
  }, undefined, (error) => { console.warn('模型载入失败，已使用占位模型', error); contentSettled(false); });
}
fetch('./assets/models/manifest.json').then((response) => response.json()).then((assets) => {
  const slots = {
    lighthouse: [[lighthouseAnchor], 'height', 4.9],
    suitcase: [[suitcaseAnchor], 'height', 0.82],
    'coastal-arch': [[archAnchor], 'height', 3.75, 'x'],
    'stone-bridge': [[bridgeAnchor], 'horizontal', 4.05, 'z'],
    'palm-tree': [palmAnchors, 'height', 4.25],
    'instant-camera': [[cameraAnchor], 'height', 0.54],
    'beach-umbrella': [[umbrellaAnchor], 'height', 2.65],
    sailboat: [[sailboatAnchor], 'height', 2.25],
    'postcard-kiosk': [[kioskAnchor], 'height', 2.3],
    'seaside-gazebo': [[gazeboAnchor], 'height', 3.75],
  };
  for (const [name, spec] of Object.entries(slots)) {
    if (assets[name]) loadGlb(`./assets/models/${assets[name]}`, ...spec);
    else contentSettled(false);
  }
}).catch(() => { for (let i = 0; i < 10; i++) contentSettled(false); });

function loadScenery(parent, name, preserve) {
  new GLTFLoader().load(`./assets/scenery/${name}.glb`, ({ scene: model }) => {
    for (const child of [...parent.children]) if (!preserve.has(child)) child.visible = false;
    model.traverse((part) => {
      if (!part.isMesh) return;
      part.castShadow = !part.name.includes('background');
      part.receiveShadow = true;
    });
    parent.add(model);
    surfaceTextures.decorate(model);
    worldCollision.register(name, model, () => parent.visible);
    if (name === 'coast') {
      seaHeight = -2.52;
      sailboatAnchor.position.y = seaHeight;
      cameraAnchor.position.y = 1.035;
    }
    if (state.phase === 'align') capturePhoto(state.activePhoto);
    contentSettled(true);
  }, undefined, (error) => { console.warn('场景载入失败，保留基础场景', error); contentSettled(false); });
}
loadScenery(office, 'office', new Set([blankDoor, doorTitle, ceilingLamp, suitcaseAnchor]));
loadScenery(beach, 'coast', new Set([lighthouseAnchor, archAnchor, ...palmAnchors, umbrellaAnchor, sailboatAnchor, kioskAnchor, cameraAnchor, bridgeGroup, gazeboGroup, memory]));

new GLTFLoader().load('./assets/scenery/mountains.glb', ({ scene: mountains }) => {
  beach.add(mountains);
  contentSettled(true);
}, undefined, () => contentSettled(false));

// The game is playable as a local Vite build; inside Star-letter the host supplies gameId.
if (window.parent !== window && window.GameSDK) {
  window.GameSDK.init().catch((error) => {
    if (window.GameSDK.isPlatformSDKError(error)) console.warn('平台 SDK 初始化失败', error.code);
    else console.error(error);
  });
}

const state = { phase: 'intro', activePhoto: null, photoPlaced: 0, alignment: 0, alignmentReady: false, transitionUntil: 0, snap: null, sound: true };
const keys = new Set();
const mobileKeys = new Set();
let dragging = false;
let lastX = 0;
let lastY = 0;
let desktopMouse = window.matchMedia('(pointer: fine)').matches;
let lookPaused = false;
let mouseFallback = false;
const jump = createJump();
const audio = createAudio();

function setHint(title, copy, kicker) {
  ui.hintTitle.textContent = title;
  ui.hintCopy.textContent = copy;
  ui.hintCopy.hidden = !copy;
  if (kicker) $('hint-kicker').textContent = kicker;
}
function setTargetHint(value) { ui.targetHint.textContent = value; ui.targetHint.classList.toggle('visible', Boolean(value)); }
function near(point, distance) { return camera.position.distanceTo(new THREE.Vector3(point[0], 1.68, point[1])) < distance; }
function updateAction() {
  const action = {
    office: [near([1.73,2.62],2.5) ? '拿照片 <kbd>F</kbd>' : '走近行李箱', near([1.73,2.62],2.5)],
    align: [state.alignmentReady ? '放下照片 <kbd>F</kbd>' : '对准照片', state.alignmentReady],
    'door-open': ['穿过门洞', false],
    shore: [near([2.85,-7.75],2.5) ? '拿照片 <kbd>F</kbd>' : '靠近明信片亭', near([2.85,-7.75],2.5)],
    bridge: ['过桥', false],
    island: [near([2.7,-16.7],2.25) ? '拿照片 <kbd>F</kbd>' : '靠近相机', near([2.7,-16.7],2.25)],
    final: [near([0,-22.1],2.3) ? '坐一会儿 <kbd>F</kbd>' : '去凉亭', near([0,-22.1],2.3)],
  }[state.phase];
  if (action) { ui.action.innerHTML = action[0]; ui.action.disabled = !action[1]; }
}
function beginPhoto(index) {
  audio.play('paper');
  const stage = photoStages[index];
  state.phase = 'align';
  state.activePhoto = index;
  state.alignmentReady = false;
  $('photo-caption').textContent = stage.caption;
  $('photo-stamp').textContent = stage.stamp;
  setHint(stage.title,stage.copy,`照片 0${index+1} / 03`);
  capturePhoto(index);
  ui.photo.classList.add('visible');
  ui.photo.setAttribute('aria-hidden','false');
  positionPhotoCrop();
  ui.meter.classList.add('visible');
  ui.meter.setAttribute('aria-hidden','false');
  setTargetHint('对准照片');
  updateAction();
}
function placePhoto() {
  if (state.snap) return;
  camera.position.y -= jump.height;
  jump.reset();
  state.snap = { startedAt: performance.now(), position: camera.position.clone(), yaw, pitch };
  state.transitionUntil = performance.now() + 360;
  ui.action.disabled = true;
  setTargetHint('');
}
function finishPhotoPlacement() {
  const index = state.activePhoto;
  const stage = photoStages[index];
  camera.position.copy(stage.pose);
  yaw = stage.yaw;
  pitch = 0;
  camera.rotation.set(0, yaw, 0);
  camera.updateMatrixWorld(true);
  state.transitionUntil = performance.now() + 480;
  state.photoPlaced = Math.max(state.photoPlaced,index+1);
  state.activePhoto = null;
  state.snap = null;
  if (index === 0) {
    state.phase = 'door-open';
    beach.visible = true;
    blankDoor.visible = false;
    doorTitle.visible = false;
    ui.chapter.textContent = '海岸';
    setHint('穿过门洞', '','照片 01 / 03');
  } else if (index === 1) {
    state.phase = 'bridge';
    bridgeGroup.visible = true;
    ui.chapter.textContent = '石桥';
    setHint('过桥', '','照片 02 / 03');
  } else {
    state.phase = 'final';
    gazeboGroup.visible = true;
    memory.visible = true;
    ui.chapter.textContent = '灯塔';
    setHint('去凉亭', '','照片 03 / 03');
  }
  ui.meter.classList.remove('visible');
  ui.photo.classList.remove('ready');
  ui.reticle.classList.remove('ready');
  $('scene-flash').classList.add('active');
  audio.play('place');
  window.setTimeout(() => $('scene-flash').classList.remove('active'),100);
  window.setTimeout(() => {
    ui.photo.classList.remove('visible');
    ui.photo.setAttribute('aria-hidden','true');
  },210);
  setTargetHint('');
  updateAction();
}
function interact() {
  if (lookPaused) return;
  if (state.phase === 'office' && near([1.73,2.62],2.5)) beginPhoto(0);
  else if (state.phase === 'shore' && near([2.85,-7.75],2.5)) beginPhoto(1);
  else if (state.phase === 'island' && near([2.7,-16.7],2.25)) beginPhoto(2);
  else if (state.phase === 'align' && state.alignmentReady) placePhoto();
  else if (state.phase === 'final' && near([0,-22.1],2.3)) {
    state.phase = 'complete';
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    audio.play('finish');
    ui.ending.classList.add('visible');
    ui.hintCard.style.display = 'none';
    ui.action.style.display = 'none';
    setTargetHint('');
  }
}

$('start-button').addEventListener('click', (event) => {
  audio.setEnabled(state.sound);
  ui.intro.classList.remove('visible');
  state.phase = 'office';
  if (event.pointerType === 'mouse') desktopMouse = true;
  requestMouseLook();
  updateAction();
});
$('replay-button').addEventListener('click', () => window.location.reload());
let galleryLoaded = false;
async function openGallery() {
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  const modal = $('gallery-modal');
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden','false');
  if (galleryLoaded) return;
  const grid = $('gallery-grid');
  try {
    const response = await fetch('./assets/models/credits.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = await response.json();
    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      const image = document.createElement('img');
      image.src = `./assets/models/previews/${item.name}.png`;
      image.alt = item.title;
      const title = document.createElement('strong');
      title.textContent = item.title;
      const detail = document.createElement('small');
      detail.textContent = 'Tripo 生成';
      card.append(image,title,detail);
      grid.append(card);
    }
    galleryLoaded = true;
  } catch {
    grid.textContent = '暂未载入';
  }
}
for (const id of ['gallery-open','gallery-open-ending']) $(id).addEventListener('click',openGallery);
$('gallery-close').addEventListener('click', () => {
  $('gallery-modal').classList.remove('visible');
  $('gallery-modal').setAttribute('aria-hidden','true');
});
ui.action.addEventListener('click', interact);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && $('gallery-modal').classList.contains('visible')) {
    $('gallery-close').click();
    return;
  }
  if (event.code === 'Escape' && desktopMouse && state.phase !== 'intro' && state.phase !== 'complete') {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    else pauseMouseLook();
    return;
  }
  if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyF','KeyE','Space'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.code === 'Space' && !event.repeat && !lookPaused && !state.snap && !['intro','complete'].includes(state.phase)) jump.start();
  if ((event.code === 'KeyF' || event.code === 'KeyE') && !event.repeat) interact();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
function pauseMouseLook() {
  keys.clear(); mobileKeys.clear(); dragging = false;
  if (!desktopMouse || state.phase === 'intro' || state.phase === 'complete') return;
  lookPaused = true;
  $('look-pause').hidden = false;
}
function enableMouseFallback() {
  // Some embedded hosts do not grant pointer lock. Mouse movement still turns
  // the camera directly, without requiring a held button.
  mouseFallback = true;
  lookPaused = false;
  $('look-pause').hidden = true;
  ui.controlsHint.textContent = 'WASD 移动 · 空格跳跃 · 鼠标移动转向 · F 互动 · Esc 暂停';
}
function requestMouseLook() {
  if (!desktopMouse || state.phase === 'intro' || state.phase === 'complete') return;
  lookPaused = false;
  $('look-pause').hidden = true;
  if (document.pointerLockElement === canvas) return;
  try {
    if (!canvas.requestPointerLock) { enableMouseFallback(); return; }
    const request = canvas.requestPointerLock();
    if (request?.catch) request.catch(enableMouseFallback);
  } catch { enableMouseFallback(); }
}
function turnView(dx,dy) {
  if (lookPaused || state.phase === 'intro' || state.phase === 'complete' || performance.now() < state.transitionUntil) return;
  yaw -= dx * .0013;
  pitch = THREE.MathUtils.clamp(pitch - dy * .0012, -1.25, 1.15);
}
$('resume-look').addEventListener('click',requestMouseLook);
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    mouseFallback = false; lookPaused = false; $('look-pause').hidden = true;
  } else if (!mouseFallback) pauseMouseLook();
});
document.addEventListener('pointerlockerror',enableMouseFallback);
document.addEventListener('mousemove',event => {
  if (document.pointerLockElement === canvas) turnView(event.movementX,event.movementY);
});
window.addEventListener('blur', () => { keys.clear(); mobileKeys.clear(); dragging = false; pauseMouseLook(); });
canvas.addEventListener('pointerdown', (event) => {
  if (state.phase === 'intro' || state.phase === 'complete') return;
  if (event.pointerType === 'mouse') { desktopMouse = true; requestMouseLook(); return; }
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'mouse') {
    if (mouseFallback && document.pointerLockElement !== canvas) turnView(event.movementX,event.movementY);
    return;
  }
  if (!dragging) return;
  if (performance.now() < state.transitionUntil) { lastX = event.clientX; lastY = event.clientY; return; }
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  yaw -= dx * 0.0030;
  pitch = THREE.MathUtils.clamp(pitch - dy * 0.0026, -0.7, 0.62);
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });
for (const button of document.querySelectorAll('.mobile-pad button')) {
  const key = button.dataset.move;
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); mobileKeys.add(key); });
  button.addEventListener('pointerup', () => mobileKeys.delete(key));
  button.addEventListener('pointercancel', () => mobileKeys.delete(key));
}
$('sound-toggle').addEventListener('click', () => {
  state.sound = !state.sound;
  $('sound-toggle').textContent = state.sound ? '♪ 开' : '♪ 关';
  audio.setEnabled(state.sound);
});

function updateAlignment() {
  if (state.snap) return;
  const stage = photoStages[state.activePhoto];
  const { error, tolerance, ready, progress } = assessAlignment(camera, captureCamera, stage.marks, window.innerWidth, window.innerHeight, state.alignmentReady);
  state.alignmentReady = ready;
  state.alignment = progress;
  ui.fill.style.width = `${Math.round(state.alignment * 100)}%`;
  ui.reticle.classList.toggle('ready', state.alignmentReady);
  ui.photo.classList.toggle('ready', state.alignmentReady);
  ui.alignHelp.textContent = Number.isFinite(error)
    ? (state.alignmentReady ? '可以放下了' : '移动视角，对准边缘')
    : '对准边缘';
  if (state.alignmentReady) setTargetHint('');
  else if (error < tolerance * 2) setTargetHint('');
  else setTargetHint('对准照片');
  updateAction();
}

const clock = new THREE.Clock();
let lastActionUpdate = 0;
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  if (state.snap) {
    const t = Math.min(1, (performance.now() - state.snap.startedAt) / 340);
    const ease = t * t * (3 - 2 * t);
    const stage = photoStages[state.activePhoto];
    camera.position.lerpVectors(state.snap.position, stage.pose, ease);
    const turn = Math.atan2(Math.sin(stage.yaw - state.snap.yaw), Math.cos(stage.yaw - state.snap.yaw));
    yaw = state.snap.yaw + turn * ease;
    pitch = state.snap.pitch * (1 - ease);
    camera.rotation.set(pitch, yaw, 0);
    if (t === 1) finishPhotoPlacement();
  }
  if (state.phase !== 'intro' && state.phase !== 'complete' && !lookPaused && performance.now() >= state.transitionUntil) {
    const forward = Number(keys.has('KeyW') || keys.has('ArrowUp') || mobileKeys.has('forward')) - Number(keys.has('KeyS') || keys.has('ArrowDown') || mobileKeys.has('back'));
    const sideways = Number(keys.has('KeyD') || keys.has('ArrowRight') || mobileKeys.has('right')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || mobileKeys.has('left'));
    const speed = state.phase === 'align' ? 2.25 : 3.45;
    const move = new THREE.Vector3(sideways, 0, -forward);
    if (move.lengthSq() > 0) {
      move.normalize().applyAxisAngle(new THREE.Vector3(0,1,0), yaw).multiplyScalar(speed * delta);
      const oldZ = camera.position.z;
      const previousPosition = camera.position.clone();
      camera.position.add(move);
      const inOffice = state.phase === 'office' || (state.phase === 'align' && state.activePhoto === 0);
      if (camera.position.z < -3.8 && Math.abs(camera.position.x) > 1.26 && oldZ >= -3.8) camera.position.z = -3.8;
      if (inOffice) camera.position.z = Math.max(camera.position.z, -3.05);
      else camera.position.z = Math.max(camera.position.z, -24.0);
      camera.position.z = Math.min(camera.position.z, 8.0);
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, camera.position.z < -4.3 ? -9.2 : -4.02, camera.position.z < -4.3 ? 9.2 : 4.02);
      camera.position.copy(bridgeCollision.move(previousPosition,camera.position,bridgeGroup.visible));
      const groundedPrevious = previousPosition.clone();
      groundedPrevious.y -= jump.height;
      camera.position.copy(worldCollision.move(groundedPrevious, camera.position));
      camera.position.y += jump.height;
    }
    camera.position.y += jump.update(delta);
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
  if (state.phase === 'align') updateAlignment();
  if (state.phase === 'door-open' && camera.position.z < -4.55) {
    state.phase = 'shore';
    setHint('去明信片亭', '右手边。','照片 02 / 03');
    ui.controlsHint.textContent = desktopMouse ? 'WASD 移动 · 空格跳跃 · 鼠标转向 · F 互动 · Esc 释放鼠标' : '方向键移动 · 触屏滑动环顾 · 点按钮互动';
    updateAction();
  }
  if (state.phase === 'bridge' && camera.position.z < -14.15) {
    state.phase = 'island';
    setHint('去拿相机', '右手边。','照片 03 / 03');
    updateAction();
  }
  if (state.phase !== 'align') {
    memory.position.y = 1.65 + Math.sin(elapsed * 1.7) * 0.17;
    memory.rotation.y += delta * 1.1;
    star.scale.setScalar(1 + Math.sin(elapsed * 2.1) * 0.09);
    sailboatAnchor.position.y = seaHeight + Math.sin(elapsed * 0.8) * 0.08;
  }
  if (elapsed - lastActionUpdate > 0.15 && state.phase !== 'align') { updateAction(); lastActionUpdate = elapsed; }
  audio.ambience(beach.visible && camera.position.z < -4);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (state.phase === 'align') capturePhoto(state.activePhoto);
});
