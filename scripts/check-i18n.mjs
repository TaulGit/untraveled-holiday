import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {installLanguages,translate} from '../src/i18n.js';
const {document,window}=parseHTML(await readFile('index.html','utf8'));
global.document=document;global.MutationObserver=window.MutationObserver;
const store=new Map();global.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
const locales=[];installLanguages(l=>locales.push(l));
const tick=()=>new Promise(r=>setTimeout(r,0));
const toggle=document.getElementById('language-toggle');toggle.click();await tick();
assert.equal(document.documentElement.lang,'en');assert.match(document.title,/Untraveled/);
assert.equal(document.getElementById('start-button').textContent.trim(),'Start →');
const hint=document.getElementById('hint-title');hint.textContent='去凉亭';await tick();assert.equal(hint.textContent,'Go to the gazebo');
const action=document.getElementById('action-button');action.innerHTML='放下照片 <kbd>F</kbd>';await tick();assert.equal(action.textContent,'Place photo F');assert.ok(action.querySelector('kbd'));
document.getElementById('loading-status').textContent='加载中 · 8 / 17';await tick();assert.equal(document.getElementById('loading-status').textContent,'Loading · 8 / 17');
for(let i=0;i<4;i++){toggle.click();await tick();}
assert.equal(hint.textContent,'Go to the gazebo');toggle.click();await tick();assert.equal(hint.textContent,'去凉亭');assert.equal(store.get('holiday.language'),'zh');
assert.equal(translate('照片 03 / 03','en'),'Photo 03 / 03');assert.equal(translate('南 岬 · 07.26 / PHOTO 01','en'),'SOUTH CAPE · 07.26 / PHOTO 01');
// No untranslated Chinese in the initial English UI, apart from the language switch.
toggle.click();await tick();
const walker=document.createTreeWalker(document.body,4);let node;while(node=walker.nextNode()){if(node.parentElement?.id==='language-toggle'||['SCRIPT','STYLE'].includes(node.parentElement?.tagName))continue;assert.ok(!/[\u4e00-\u9fff]/.test(node.nodeValue),node.nodeValue);}
console.log('Chinese/English: initial UI, dynamic hints, controls, progress, switching and persistence passed.');
