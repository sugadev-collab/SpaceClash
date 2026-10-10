import {GRID,CELL,HALF,PLANE_R,DEF_TYPES,BUILDINGS,COMMAND_DEF,CATS,inBuildBounds} from './config/game-rules.js';
import * as THREE from 'three';
import { createBuildingModel, applyLevel } from './enhancements/buildings.js';
import { makeNebula, makePlanets, originalEnvironment, rockMap } from './enhancements/environment.js';
import {createSaveService} from './storage/save-state.js';
import {SKYBOXES,loadSkybox} from './enhancements/skyboxes.js';
import {createAsteroid} from './enhancements/asteroids.js';
import {createCruiseEffects} from './enhancements/cruise.js';
import { UNIT_DEFS, createUnit, preloadFleetAssets, assetStatus } from './enhancements/units.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// ============================================================
//  STELLAR CLASH — big base + categorized build + settings (offline)
// ============================================================
const ICON_PATHS={
  camp:"M3 20V8l9-5 9 5v12H3zm5 0v-8h8v8M3 8h18",
  builder:"M5 19l5-5m4-4l5-5M3 21l4-1-3-3-1 4zm13-18a5 5 0 0 0-6 6l5 5a5 5 0 0 0 6-6l-3 3-3-3 3-3z",
 extractor:'M4 8l5-4 11 7M9 4l2 5M10 10l-6 10m9-11 7 5', reactor:'M13 2L5 13h6l-1 9 9-13h-6z',
 solar:'M12 3v2m0 14v2M3 12h2m14 0h2M5.5 5.5l1.4 1.4m10.2 10.2 1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 drill:'M9 3h6v4H9zM12 7v14m-4-8 8-2m-8 7 8-2M5 21h14', storage:'M3 7l9-4 9 4v11l-9 4-9-4zM3 7l9 4 9-4M12 11v11',
 wall:'M3 5h18v14H3zM3 12h18M8 5v7m8-7v7m-4 0v7', turret:'M5 20h14M7 20v-6h10v6M8 14V9l5-3 4 3v5M15 8l5-5',
 pulse:'M12 13v8M8 21h8M9 6a5 5 0 0 0 6 8M5 3a10 10 0 0 0 14 14M12 11l7-7',
 missile:'M8 16l8-8m-9 9-3 3m4-4-4-1 3-5 4 1m2 2 1 4 5-3-1-4m-7-3c2-5 5-7 9-7 0 4-2 7-7 9z',
 cannon:'M4 20h16M7 20v-6h10v6M9 14l3-8 5 2-3 6M12 6l1-3 5 2-1 3',
 tesla:'M5 21h14M8 21v-6h8v6M10 15V7h4v8M7 9h10M7 12h10M15 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 sniper:'M3 18h9l8-12-3-2-8 12M6 18v3m6-3v3M17 4l2-2 3 2-2 2',
 shield:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',
 barracks:'M3 20V8l9-5 9 5v12H3M9 20v-7h6v7M7 9h10', starport:'M12 3l5 9-5-2-5 2zM12 10v8M4 17v4h16v-4',
 habitat:'M3 12l9-9 9 9M5 10v11h14V10M10 21v-7h4v7',
 settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M9 3h6l1 4 4 1v8l-4 1-1 4H9l-1-4-4-1V8l4-1z',
 frame:'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6M8 12h8M12 8v8',
 build:'M4 20L16 8M13 4l3-2 6 6-2 3-7-7M3 18l3 3',
 raid:'M4 3l15 15M20 3L5 18M3 16l5 5m8-1 5-5M3 3l1 5 4-4m12-1-1 5-4-4',
 save:'M4 3h13l3 3v15H4zM8 3v6h8V3M8 21v-8h8v8',
 load:'M3 7V4h7l2 3h9v13H3zM12 10v7m-3-3 3 3 3-3', reset:'M4 8a8 8 0 1 1 0 8M4 3v5h5', back:'M10 5l-7 7 7 7M3 12h18', crystal:'M12 2l8 7-8 13L4 9zM4 9h16M9 9l3 13 3-13'
};
function icon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[name]||ICON_PATHS.starport}"/></svg>`;}
function applyIcons(){
 const ids={raid:['raid','SIMULATE RAID'],attack:['starport','ATTACK OUTPOST'],'settings-btn':['settings','SETTINGS'],recenter:['frame','FRAME BASE'],save:['save','SAVE BASE'],load:['load','LOAD BASE'],reset:['reset','RESET BASE'],'build-toggle':['build','BUILD'],'fleet-go':['raid','LAUNCH ASSAULT'],'fleet-retreat':['back','RETREAT'],return:['back','RETURN']};
 for(const [id,[name,label]] of Object.entries(ids))document.getElementById(id).innerHTML=icon(name)+`<span>${label}</span>`;
 document.querySelector('#settings h4').innerHTML=icon('settings')+' SETTINGS';document.querySelector('#fleet-panel h4').innerHTML=icon('raid')+' ASSAULT FLEET';
 document.querySelector('.energy .ic').innerHTML=icon('reactor');document.querySelector('.crystal .ic').innerHTML=icon('crystal');
}

// ---- state ----
let renderer, scene, camera, controls, composer, sky, initCam;
let cameraFlight=null,cruise=null;
let starFlare=null, commandCenter=null, platform=null, stars=null;
const patrol=[];
const clock = new THREE.Clock();
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let ambienceTime=0, bannerTimer=null;
const hasMotion=()=>!motionQuery.matches;
const buildings=[], occupied=new Set(), interactives=[];
const effects=[], enemies=[], fighters=[], projectiles=[], deploying=[], asteroids=[];
let buildType=null, ghost=null, highlight=null, selected=null, selRing=null;
const resources={ energy:1400, crystal:800 };
let raidActive=false, wave=0, kills=0;
let mode='base', battleTimer=0;              // mode: 'base' | 'attack'
const enemyBuildings=[]; let enemyPlatform=null, enemyTop=null, enemyGroup=null;
let battleCenter=new THREE.Vector3(); let loot={energy:0,crystal:0};
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const tmpV=new THREE.Vector3(), tmpV2=new THREE.Vector3();
// ============================================================
//  AUDIO (free WebAudio — master gain + volume, no asset files)
// ============================================================
const saveService=createSaveService({buildingDefs:BUILDINGS,unitDefs:UNIT_DEFS,grid:GRID,planeRadius:PLANE_R,inBounds:inBuildBounds});
const preferences=saveService.getPreferences();
const Sound=(()=>{ let ctx=null,master=null,vol=preferences.volume,muted=preferences.muted;
  const ac=()=>{ if(!window.AudioContext&&!window.webkitAudioContext)return null; if(!ctx){ ctx=new (window.AudioContext||window.webkitAudioContext)(); master=ctx.createGain(); master.gain.value=muted?0:vol; master.connect(ctx.destination); } if(ctx.state==='suspended')ctx.resume().catch(()=>{}); return ctx; };
  function tone(freq,dur,type='sine',gain=0.08,slideTo=null){ if(muted)return; const c=ac(); if(!c)return; const o=c.createOscillator(),g=c.createGain(); o.type=type; o.frequency.value=freq; if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,c.currentTime+dur); g.gain.value=gain; g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur); o.connect(g).connect(master); o.start(); o.stop(c.currentTime+dur); }
  function noise(dur,gain=0.2){ if(muted)return; const c=ac(); if(!c)return; const b=c.createBuffer(1,c.sampleRate*dur,c.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length); const s=c.createBufferSource(); s.buffer=b; const g=c.createGain(); g.gain.value=gain; g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur); s.connect(g).connect(master); s.start(); }
  return { place:()=>tone(420,0.18,'triangle',0.12,860), error:()=>tone(150,0.2,'sawtooth',0.1,80),
    upgrade:()=>{tone(520,0.1,'square',0.08,720);setTimeout(()=>tone(740,0.13,'square',0.08,1040),90);},
    shoot:()=>tone(950,0.06,'square',0.035,320), explode:()=>noise(0.35,0.22), hit:()=>noise(0.08,0.12),
    click:()=>tone(620,0.05,'sine',0.05),
    success:()=>{tone(523,0.12,'triangle',0.1);setTimeout(()=>tone(659,0.12,'triangle',0.1),120);setTimeout(()=>tone(784,0.18,'triangle',0.1),240);},
    setVolume(v){vol=v; if(master&&!muted)master.gain.value=v;},
    toggleMute(){muted=!muted; if(master)master.gain.value=muted?0:vol; return muted;},
    isMuted(){return muted;} };
})();
// ============================================================
//  TEXTURE LOADING (all local)
// ============================================================
const SKIES=SKYBOXES;
let skyIndex=preferences.sky==='core'?1:0,skyLoading=false,skyRequest=0;
function makeClassicSky(){return makeNebula(skyIndex);}
async function applySky(idx){
 skyIndex=((idx%SKIES.length)+SKIES.length)%SKIES.length;const index=skyIndex,token=++skyRequest,def=SKIES[index];
 preferences.sky=def.id;saveService.setPreferences(preferences);
 const btn=document.getElementById('skybtn');btn.textContent='LOADING';skyLoading=true;
 try{
  const next=await loadSkybox(index);if(token!==skyRequest)return;
  if(sky!==next){if(sky?.userData.licensedSky)sky.removeFromParent();else if(sky)disposeObject(sky);sky=next;sky.rotation.y=0;scene.add(sky);}
  btn.textContent=def.label;
 }catch(error){if(token!==skyRequest)return;
  if(sky?.userData.licensedSky)sky.removeFromParent();else if(sky)disposeObject(sky);
  sky=makeNebula(index);scene.add(sky);btn.textContent=def.label+' · FALLBACK';toast('SKYBOX UNAVAILABLE — ORIGINAL BACKUP ACTIVE');
 }finally{if(token===skyRequest)skyLoading=false;}
}
function showLoadError(msg){const el=document.querySelector('#loader p');if(el)el.textContent='ERROR: '+msg;console.error(msg);}
setTimeout(async()=>{try{await preloadFleetAssets();buildScene();animate();window.__gameStarted=true;const l=document.getElementById('loader');l.style.opacity='0';setTimeout(()=>l.remove(),700);}catch(e){showLoadError(e.message);}},0);
// ============================================================
//  MATERIAL HELPERS
// ============================================================
const metal=(color,rough=0.48,met=0.68)=>new THREE.MeshStandardMaterial({color:new THREE.Color(color).lerp(new THREE.Color(0x9cabb8),.22),roughness:rough,metalness:Math.min(met,.72),map:alloyMap(),bumpMap:alloyMap(),bumpScale:0.035});
const glow=(color,intensity=2.2)=>new THREE.MeshStandardMaterial({color:0x0a0a0a,emissive:color,emissiveIntensity:intensity,roughness:0.4,metalness:0.1});
function radialSprite(color){ const cv=document.createElement('canvas'); cv.width=cv.height=128; const ctx=cv.getContext('2d');
  const g=ctx.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,color); g.addColorStop(0.4,color.replace('1)','0.5)')); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,128,128); const tex=new THREE.CanvasTexture(cv);
  return new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); }
// ============================================================
//  SCENE
// ============================================================
function buildScene(){
  const app=document.getElementById('app')||document.body;
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.5)); renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
  renderer.outputColorSpace=THREE.SRGBColorSpace; app.appendChild(renderer.domElement);
  scene=new THREE.Scene(); scene.background=new THREE.Color(0x02030a); scene.fog=new THREE.FogExp2(0x02030a,0.0016);
  sky=makeClassicSky(); scene.add(sky);                       // instant fallback dome, upgraded to GLB nebula below
  scene.environment=originalEnvironment(renderer).texture;
  scene.add(makePlanets());
  cruise=createCruiseEffects({fieldRadius:PLANE_R});scene.add(cruise.group);
  stars=makeStarfield(3400,600); scene.add(stars);
  for(let i=0;i<24;i++){const a=makeAsteroid();asteroids.push(a);scene.add(a);}
  scene.add(new THREE.HemisphereLight(0xa8c6de,0x35303d,2.4));
  const star=new THREE.DirectionalLight(0xbfe6ff,2.6); star.position.set(60,90,40);
  star.castShadow=true; star.shadow.mapSize.set(2048,2048);
  const sc=star.shadow.camera; sc.left=-PLANE_R;sc.right=PLANE_R;sc.top=PLANE_R;sc.bottom=-PLANE_R;sc.near=1;sc.far=260; star.shadow.bias=-0.0004;
  scene.add(star);
  const underlight=new THREE.DirectionalLight(0x98bad5,1.6);underlight.position.set(-24,-35,30);underlight.target.position.set(0,-9,0);scene.add(underlight,underlight.target);
  starFlare=radialSprite('rgba(180,225,255,1)'); starFlare.scale.setScalar(110); starFlare.material.fog=false;
  starFlare.position.copy(star.position).multiplyScalar(6); scene.add(starFlare);
  platform=makePlatform(); scene.add(platform);
  // patrol interceptors circling the base
  for(let i=0;i<3;i++){ const ship=createFighter(); patrol.push({m:ship,r:PLANE_R*(0.7+0.12*i),sp:0.22+0.06*i,ph:i*2.1,h:5+i*1.7}); scene.add(ship); }
  highlight=makeHighlight(); highlight.visible=false; scene.add(highlight);
  selRing=new THREE.Mesh(new THREE.TorusGeometry(CELL*0.62,0.07,12,48),new THREE.MeshBasicMaterial({color:0x39e6ff}));
  selRing.rotation.x=Math.PI/2; selRing.visible=false; scene.add(selRing);
  initCam=new THREE.Vector3(PLANE_R*1.04, PLANE_R*1.56, PLANE_R*1.9);
  camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,0.1,4000); camera.zoom=Math.min(1,camera.aspect/1.15);camera.updateProjectionMatrix();camera.position.copy(initCam);
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,0,0);controls.addEventListener('start',()=>{cameraFlight=null;}); controls.enableDamping=true; controls.dampingFactor=0.07;
  controls.minDistance=6.5; controls.maxDistance=260; controls.maxPolarAngle=Math.PI*0.63; controls.minPolarAngle=Math.PI*0.08;
  composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.32,0.45,1.1));
  composer.addPass(new OutputPass());
  applyIcons();setupInput();buildDock();wireControls();syncSnd();document.getElementById('vol').value=preferences.volume*100;
  preplaceCommand();setupHangar();installUnderbase();updateHUD();
  applySky(skyIndex);                                          // load saved / default GLB nebula dome
  setInterval(()=>{if(!document.hidden)tickIncome();},1000);
  document.addEventListener('visibilitychange',()=>clock.getDelta());
  addEventListener('resize',onResize);
}
// ---- world objects ----
function makeStarfield(count,radius){ const g=new THREE.BufferGeometry(); const pos=new Float32Array(count*3),col=new Float32Array(count*3),c=new THREE.Color();
  for(let i=0;i<count;i++){ const r=radius*(0.5+Math.random()*0.5),th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=Math.abs(r*Math.cos(ph))*0.7+10; pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    c.setHSL(0.55+Math.random()*0.12,0.4,0.7+Math.random()*0.3); col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b; }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return new THREE.Points(g,new THREE.PointsMaterial({size:1.3,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:0.9,depthWrite:false})); }
// ---- crystal-bearing asteroid planetoids ----
function makeAsteroid(){return createAsteroid({fieldRadius:PLANE_R,seed:Math.floor(Math.random()*2147483647)});}
// Procedural tech-panel texture for the landing pad (no more tiled static image).
let alloyTexture=null;
function alloyMap(){
  if(alloyTexture)return alloyTexture;
  const cv=document.createElement('canvas');cv.width=cv.height=256;
  const c=cv.getContext('2d');c.fillStyle='#c6ced6';c.fillRect(0,0,256,256);
  for(let y=0;y<256;y++){c.fillStyle=`rgba(55,70,85,${0.04+(y%7)*0.008})`;c.fillRect(0,y,256,1);}
  c.strokeStyle='#7b8997';c.lineWidth=3;c.strokeRect(4,4,248,248);
  for(const x of [14,242])for(const y of [14,242]){c.fillStyle='#5e6b78';c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();}
  alloyTexture=new THREE.CanvasTexture(cv);alloyTexture.colorSpace=THREE.SRGBColorSpace;return alloyTexture;
}
function makePadTexture(){
  const size=2048,cv=document.createElement('canvas');cv.width=cv.height=size;const c=cv.getContext('2d');
  c.fillStyle='#273544';c.fillRect(0,0,size,size);
  const tile=size/GRID;
  for(let row=0;row<GRID;row++)for(let col=0;col<GRID;col++){
    const x=col*tile,y=row*tile;
    c.fillStyle=(row+col)%2?'#344352':'#2d3c4b';c.fillRect(x+2,y+2,tile-4,tile-4);
    c.strokeStyle='rgba(176,201,224,.18)';c.lineWidth=1;c.strokeRect(x+6,y+6,tile-12,tile-12);
    for(const [dx,dy] of [[10,10],[tile-10,10],[10,tile-10],[tile-10,tile-10]]){
      c.fillStyle='#8b9ba8';c.beginPath();c.arc(x+dx,y+dy,1.7,0,Math.PI*2);c.fill();
    }
    c.fillStyle='rgba(5,12,20,.42)';for(let j=0;j<4;j++)c.fillRect(x+tile*.3,y+tile*.72+j*3,tile*.4,1);
  }
  c.save();c.translate(size/2,size/2);
  for(let i=0;i<12;i++){
    c.save();c.rotate(i*Math.PI/6);c.fillStyle='#516576';c.fillRect(-5,size*.30,10,size*.145);
    c.fillStyle='#70c3d3';c.fillRect(-2,size*.31,4,size*.075);
    c.fillStyle='#d3aa67';for(let k=0;k<5;k++)c.fillRect(-14,size*.41+k*7,28,3);c.restore();
  }
  for(const r of [.18,.38,.465]){c.strokeStyle=r===.465?'#7795a9':'rgba(118,155,181,.35)';c.lineWidth=r===.465?5:2;c.beginPath();c.arc(0,0,size*r,0,Math.PI*2);c.stroke();}
  c.font='600 25px monospace';c.textAlign='center';c.fillStyle='#a1b9cb';
  for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.fillText('SECTOR '+String(i+1).padStart(2,'0'),0,-size*.43);c.restore();}
  c.restore();const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
// Floating island: flat tech pad on top, jagged space-rock chunk below with glowing crystals.
function makePlatform(){
  const grp=new THREE.Group();
  // --- flat landing pad (top) ---
  const sideMat=new THREE.MeshStandardMaterial({color:0x1a2230,roughness:0.6,metalness:0.8});
  const padMat=new THREE.MeshStandardMaterial({map:makePadTexture(),roughness:0.64,metalness:0.5});
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(PLANE_R,PLANE_R*0.985,1.2,64),[sideMat,padMat,sideMat]);
  disc.position.y=-0.6; disc.receiveShadow=true; grp.add(disc);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(PLANE_R,0.12,12,128),glow(0x73d5ee,1.6)); rim.rotation.x=Math.PI/2; rim.position.y=0.06; grp.add(rim);
  const padRing=new THREE.Mesh(new THREE.TorusGeometry(PLANE_R*0.8,0.045,8,96),glow(0x73d5ee,0.7)); padRing.rotation.x=Math.PI/2; padRing.position.y=0.05; grp.add(padRing);
  // Segmented armor and support ribs beneath the deck.
  const armor=new THREE.MeshStandardMaterial({color:0x586b7b,metalness:.7,roughness:.48,map:alloyMap()});
  const ribs=new THREE.MeshStandardMaterial({color:0x23303d,metalness:.65,roughness:.65});
  const vents=[];
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12;
    const shell=part(new THREE.BoxGeometry(PLANE_R*.24,1.1,.55),armor,Math.sin(a)*(PLANE_R-.25),-.65,Math.cos(a)*(PLANE_R-.25));shell.rotation.y=a;grp.add(shell);
    const rib=part(new THREE.BoxGeometry(.65,3.6,1.25),ribs,Math.sin(a)*(PLANE_R-1.1),-2.25,Math.cos(a)*(PLANE_R-1.1));rib.rotation.y=a;grp.add(rib);
    const v=part(new THREE.BoxGeometry(.85,.14,.1),glow(i%3?0x6cbdd5:0xd8a460,.9),Math.sin(a)*(PLANE_R+.08),-.75,Math.cos(a)*(PLANE_R+.08),false);v.rotation.y=a;grp.add(v);vents.push(v);
  }
  // rim beacon pylons
  const beacons=[]; for(let i=0;i<6;i++){ const a=(i/6)*Math.PI*2;
    grp.add(part(new THREE.CylinderGeometry(0.09,0.15,1.1,8),metal(0x39424f,0.5,0.9),Math.cos(a)*(PLANE_R-0.5),0.55,Math.sin(a)*(PLANE_R-0.5)));
    const lamp=part(new THREE.SphereGeometry(0.17,10,8),glow(i%2?0xff8a3c:0x39e6ff,2.2),Math.cos(a)*(PLANE_R-0.5),1.2,Math.sin(a)*(PLANE_R-0.5),false);
    grp.add(lamp); beacons.push(lamp); }
  // --- jagged rock underside: calm at the flat top, ragged toward the tip ---
  const rockGeo=new THREE.CylinderGeometry(PLANE_R*1.06,PLANE_R*0.2,13,26,9,false);
  rockGeo.translate(0,-7.2,0);                       // top rim sits just under the pad
  const rp=rockGeo.attributes.position, rv=new THREE.Vector3(), seed=Math.random()*100;
  for(let i=0;i<rp.count;i++){ rv.fromBufferAttribute(rp,i);
    const k=Math.min(1,Math.max(0,(-rv.y-0.7)/13));  // 0 at the pad, 1 at the tip
    const ang=Math.atan2(rv.z,rv.x);
    const n=0.5+0.5*Math.sin(ang*3+seed)*Math.sin(k*5.2+seed*1.7);
    const n2=0.5+0.5*Math.sin(ang*7+seed*2.3)*Math.sin(k*9.1+seed*0.6);
    const f=1+(k*(n-0.5)*0.72+k*k*(n2-0.5)*0.5)-k*0.12;
    rv.x*=f; rv.z*=f; rv.y-=k*k*(0.5+0.5*n)*1.2;
    rp.setXYZ(i,rv.x,rv.y,rv.z); }
  rockGeo.computeVertexNormals();
  const rockMat=new THREE.MeshStandardMaterial({color:0x697078,roughness:0.95,metalness:0.05,map:rockMap(),bumpMap:rockMap(),bumpScale:.16,flatShading:true});
  grp.add(new THREE.Mesh(rockGeo,rockMat));
  // glowing crystal veins hanging under the rock
  const crystalMat=new THREE.MeshStandardMaterial({color:0x0c1016,emissive:0x39e6ff,emissiveIntensity:1.7,roughness:0.25,metalness:0.1});
  const shardGeo=new THREE.OctahedronGeometry(1,0), up=new THREE.Vector3(0,1,0);
  for(let i=0;i<9;i++){ const a=Math.random()*Math.PI*2, rr=PLANE_R*(0.25+Math.random()*0.6), depth=2.5+Math.random()*8.5;
    const dir=new THREE.Vector3(Math.sin(a)*0.55,-1,Math.cos(a)*0.55).normalize();
    const len=1.6+Math.random()*3.2, w=len*0.24;
    const shard=new THREE.Mesh(shardGeo,crystalMat);
    shard.position.set(Math.cos(a)*rr,-depth,Math.sin(a)*rr);
    shard.quaternion.setFromUnitVectors(up,dir); shard.rotateX((Math.random()-0.5)*0.5);
    shard.scale.set(w,len,w); grp.add(shard); }
  // small rock chunks drifting beneath the island
  const chunks=[]; for(let i=0;i<5;i++){ const c=new THREE.Mesh(new THREE.IcosahedronGeometry(0.5+Math.random()*1.1,1),rockMat);
    const a=Math.random()*Math.PI*2, rr=PLANE_R*(0.3+Math.random()*0.8);
    c.position.set(Math.cos(a)*rr,-13-Math.random()*7,Math.sin(a)*rr);
    c.userData={spin:(Math.random()-0.5)*0.01,bo:Math.random()*6,baseY:c.position.y}; grp.add(c); chunks.push(c); }
  const signalArcs=new THREE.Group();
  for(let i=0;i<3;i++){
    const arc=new THREE.Mesh(new THREE.RingGeometry(PLANE_R*.807,PLANE_R*.813,64,1,i*Math.PI*2/3,.26),new THREE.MeshBasicMaterial({color:0x8bd9e9,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));arc.rotation.x=-Math.PI/2;arc.position.y=.08;signalArcs.add(arc);
  }
  grp.add(signalArcs);grp.userData={rim,padRing,beacons,crystalMat,chunks,vents,signalArcs};
  const grid=new THREE.Mesh(new THREE.PlaneGeometry(GRID*CELL,GRID*CELL),new THREE.MeshBasicMaterial({map:makeGridTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); grid.rotation.x=-Math.PI/2; grid.position.y=0.035; grid.visible=false; grp.userData.grid=grid; grp.add(grid); return grp; }
function makeGridTexture(){ const size=1024,cv=document.createElement('canvas'); cv.width=cv.height=size; const ctx=cv.getContext('2d'); const half=(GRID/2)*CELL,toPx=w=>((w+half)/(2*half))*size;
  ctx.clearRect(0,0,size,size); ctx.strokeStyle='rgba(57,230,255,0.5)'; ctx.lineWidth=2; ctx.shadowColor='rgba(57,230,255,0.9)'; ctx.shadowBlur=6;
  for(let k=0;k<=GRID;k++){ const w=-half+k*CELL,p=toPx(w); ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,size);ctx.stroke(); ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(size,p);ctx.stroke(); }
  ctx.beginPath();ctx.arc(size/2,size/2,toPx(half)-toPx(0),0,Math.PI*2); ctx.strokeStyle='rgba(57,230,255,0.9)';ctx.lineWidth=4;ctx.stroke();
  ctx.globalCompositeOperation='destination-in'; ctx.beginPath();ctx.arc(size/2,size/2,(PLANE_R-1)/(GRID*CELL)*size,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; return t; }
function makeHighlight(){ const m=new THREE.Mesh(new THREE.PlaneGeometry(CELL*0.92,CELL*0.92),new THREE.MeshBasicMaterial({color:0x39e6ff,transparent:true,opacity:0.3,blending:THREE.AdditiveBlending,depthWrite:false})); m.rotation.x=-Math.PI/2; m.position.y=0.08; return m; }
// ============================================================
//  BUILDING FACTORIES
// ============================================================
function part(geo,mat,x=0,y=0,z=0,shadow=true){ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); if(shadow){m.castShadow=true;m.receiveShadow=true;} return m; }
function greeble(parent,mat,n,rMax,yMin,yMax){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,r=Math.random()*rMax; parent.add(part(new THREE.BoxGeometry(0.12,0.12+Math.random()*0.3,0.12),mat,Math.cos(a)*r,yMin+Math.random()*(yMax-yMin),Math.sin(a)*r)); } }
function createFighter(type='interceptor'){return createUnit(type);}
function createBuilding(type){return createBuildingModel(type);}
// ============================================================
//  PLACEMENT
// ============================================================
const cellToWorld=(i,j)=>new THREE.Vector3((i-HALF)*CELL,0,(j-HALF)*CELL);
const worldToCell=(x,z)=>({i:Math.round(x/CELL+HALF),j:Math.round(z/CELL+HALF)});
const inBounds=inBuildBounds;
const key=(i,j)=>`${i},${j}`;
function registerBuilding(b,i,j,def,instant=false){ b.userData.level=1; b.userData.maxHp=def.hp; b.userData.hp=def.hp; b.userData.def=def;
  b.userData.cell={i,j}; b.userData.deploying=!instant; b.position.copy(cellToWorld(i,j));
  scene.add(b); buildings.push(b); interactives.push(b); occupied.add(key(i,j));
  if(instant){ b.scale.setScalar(1); b.position.copy(cellToWorld(i,j)); }
  else { b.scale.setScalar(0.01); b.position.y=6; deploying.push({obj:b,t:0,target:cellToWorld(i,j)}); }
  if(!instant)spawnShockwave(cellToWorld(i,j),0x39e6ff); }
function preplaceCommand(){ const b=createBuilding('command'); commandCenter=b; registerBuilding(b,HALF,HALF,COMMAND_DEF); }
function tryPlace(i,j){ if(mode!=='base'||raidActive){toast('CANNOT BUILD NOW');return false;} const def=BUILDINGS[buildType]; if(!def)return false; if(!inBounds(i,j)||occupied.has(key(i,j)))return false;
  if(buildersBusy()>=builderCap()){toast('ALL BUILDERS BUSY');return false;}
  if(resources.energy<def.cost.energy||resources.crystal<def.cost.crystal){toast('INSUFFICIENT RESOURCES');Sound.error();return false;}
  resources.energy-=def.cost.energy; resources.crystal-=def.cost.crystal; const b=createBuilding(buildType); registerBuilding(b,i,j,def); Sound.place(); updateHUD(); return true; }
// ============================================================
//  INPUT + GHOST
// ============================================================
function setupInput(){ const el=renderer.domElement; let down=null;
  el.addEventListener('pointermove',e=>{setPointer(e);if(buildType)updateGhost();});
  el.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()};});
  el.addEventListener('pointerup',e=>{ if(!down)return; const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y),quick=performance.now()-down.t<350; down=null; if(moved>6||!quick)return; setPointer(e); if(buildType){const h=raycastCell();if(h){if(occupied.has(key(h.i,h.j)))toast('PAD OCCUPIED');else if(tryPlace(h.i,h.j))updateGhost();}} else selectAtPointer(); });
  el.addEventListener('pointercancel',()=>{down=null;});
  el.addEventListener('pointerleave',()=>{if(ghost)ghost.visible=false;if(highlight)highlight.visible=false;});
  el.addEventListener('contextmenu',e=>{e.preventDefault();cancelBuild();});
  addEventListener('keydown',e=>{if(e.key==='Escape'){cancelBuild();closeFleetPanel();document.getElementById('settings').style.display='none';document.getElementById('build-panel').style.display='none';document.getElementById('build-toggle').classList.remove('active');document.body.classList.remove('build-open');}}); }
function setPointer(e){ const r=renderer.domElement.getBoundingClientRect(); pointer.x=((e.clientX-r.left)/r.width)*2-1; pointer.y=-((e.clientY-r.top)/r.height)*2+1; }
function raycastCell(){ raycaster.setFromCamera(pointer,camera); const p=new THREE.Vector3(); if(!raycaster.ray.intersectPlane(groundPlane,p))return null; const {i,j}=worldToCell(p.x,p.z); return inBounds(i,j)?{i,j}:null; }
function updateGhost(){ if(mode!=='base'||raidActive){highlight.visible=false;if(ghost)ghost.visible=false;return;} const c=raycastCell(); if(!c){highlight.visible=false;if(ghost)ghost.visible=false;return;} const w=cellToWorld(c.i,c.j),free=!occupied.has(key(c.i,c.j)); highlight.visible=true; highlight.position.set(w.x,0.08,w.z); highlight.material.color.set(free?0x39e6ff:0xff3b5c); if(!ghost){ghost=makeGhost(buildType);scene.add(ghost);} ghost.visible=true; ghost.position.copy(w); }
function makeGhost(type){const g=createBuilding(type);g.traverse(o=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.transparent=true;m.opacity=.38;m.depthWrite=false;}o.castShadow=false;}});return g;}
function cancelBuild(){ buildType=null; document.querySelectorAll('.card').forEach(c=>c.classList.remove('active')); highlight.visible=false; if(ghost){disposeObject(ghost);ghost=null;} if(platform?.userData.grid)platform.userData.grid.visible=false; }
function selectAtPointer(){ if(mode!=='base')return; raycaster.setFromCamera(pointer,camera); const hits=raycaster.intersectObjects(interactives,true); if(!hits.length){deselect();return;} let o=hits[0].object; while(o&&!o.userData.type)o=o.parent; if(!o)return; selected=o; selRing.visible=true; selRing.position.set(o.position.x,0.1,o.position.z); showInfo(o); }
function deselect(){ selected=null;document.body.classList.remove('info-open'); selRing.visible=false; document.getElementById('info').style.display='none'; }
document.getElementById('demolish').onclick=()=>{ if(!canEditSelected())return; if(selected.userData.type==='command'){toast('CANNOT REMOVE HQ');Sound.error();return;}
  const i=Math.round(selected.position.x/CELL+HALF),j=Math.round(selected.position.z/CELL+HALF),def=selected.userData.def;
  resources.energy+=Math.floor(def.cost.energy*0.5); resources.crystal+=Math.floor(def.cost.crystal*0.5); occupied.delete(key(i,j)); disposeObject(selected);
  interactives.splice(interactives.indexOf(selected),1); buildings.splice(buildings.indexOf(selected),1); spawnExplosion(selected.position,0x39e6ff,1.2); Sound.explode(); deselect(); updateHUD(); };
document.getElementById('upgrade').onclick=()=>{ if(!canEditSelected())return; const u=selected.userData,lvl=u.level; if(lvl>=5){toast('MAX LEVEL');return;} const cost={energy:Math.ceil(u.def.cost.energy*0.8*lvl),crystal:Math.ceil(u.def.cost.crystal*0.8*lvl)}; if(resources.energy<cost.energy||resources.crystal<cost.crystal){toast('NEED MORE RESOURCES');Sound.error();return;} resources.energy-=cost.energy; resources.crystal-=cost.crystal; u.level++; u.maxHp=Math.round(u.def.hp*Math.pow(1.3,u.level-1)); u.hp=u.maxHp; applyLevel(selected,u.level); spawnShockwave(selected.position,0x7dffb0); Sound.upgrade(); showInfo(selected); updateHUD(); };
document.getElementById('train').onclick=trainFighter;
document.getElementById('focus-model').onclick=()=>{if(!selected||mode!=='base')return;const look=selected.position.clone().add(new THREE.Vector3(0,1.2,0));cameraFlight={from:camera.position.clone(),targetFrom:controls.target.clone(),to:look.clone().add(new THREE.Vector3(6,4.2,7)),look,t:0};};
function showInfo(o){ const u=o.userData,info=document.getElementById('info'); info.style.display='block';document.body.classList.add('info-open');
  document.getElementById('info-name').textContent=u.def.name; document.getElementById('info-lvl').textContent=u.level+(u.level>=5?' (MAX)':''); document.getElementById('info-hp').textContent=Math.ceil(u.hp)+' / '+u.maxHp;
  let out=u.def.out; if(u.type==='extractor'||u.type==='drill')out=`+${2*u.level} ◆/s`; else if(u.type==='reactor')out=`+${3*u.level} ⚡/s`; else if(u.type==='solar')out=`+${2*u.level} ⚡/s`; else if(u.type==='storage')out=`+${1500*u.level} cap`; else if(u.type==='camp')out=`+${20*u.level} fleet space`;else if(u.type==='builder')out=`+${u.level} builders`;
  document.getElementById('info-out').textContent=out; document.getElementById('info-hpbar').style.width=(100*u.hp/u.maxHp)+'%';
  const up=document.getElementById('upgrade'); if(u.level>=5){up.disabled=true;up.textContent='MAX LEVEL';} else {const c={energy:Math.ceil(u.def.cost.energy*0.8*u.level),crystal:Math.ceil(u.def.cost.crystal*0.8*u.level)}; up.disabled=raidActive||mode!=='base'||u.deploying; up.textContent=`UPGRADE ${c.energy}⚡ ${c.crystal}◆`;}
  document.getElementById('demolish').disabled=raidActive||mode!=='base'||u.deploying||u.type==='command';
  const tr=document.getElementById('train'); tr.disabled=raidActive||mode!=='base'||u.deploying; if(u.def.trains){tr.style.display='block';tr.textContent=`TRAIN INTERCEPTOR 60⚡ 30◆ (${fleetUsed()}/${fleetCap()} space)`;} else tr.style.display='none'; }
// ============================================================
//  HUD — categorized BUILD tray
// ============================================================
function buildDock(){ const tabs=document.getElementById('tabs'), cards=document.getElementById('cards');
  CATS.forEach(([id,label],i)=>{ const b=document.createElement('button'); b.className='tab'+(i===0?' active':''); b.textContent=label; b.onclick=()=>{ document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); b.classList.add('active'); renderCards(id); }; tabs.appendChild(b); });
  renderCards('all');
  document.getElementById('build-toggle').onclick=()=>{ const p=document.getElementById('build-panel'); const open=p.style.display==='flex'; if(!open){deselect();document.getElementById('settings').style.display='none';closeFleetPanel();}p.style.display=open?'none':'flex'; document.getElementById('build-toggle').classList.toggle('active',!open); document.body.classList.toggle('build-open',!open);if(open)cancelBuild(); }; }
function renderCards(cat){ const cards=document.getElementById('cards'); cards.innerHTML='';
  for(const [type,def] of Object.entries(BUILDINGS)){ if(cat!=='all'&&def.cat!==cat)continue; const card=document.createElement('button'); card.type='button'; card.className='card'+(buildType===type?' active':''); card.title=def.name; card.dataset.type=type; card.innerHTML=`<div class="em">${icon(type)}</div><div class="nm">${def.name}</div><div class="cost"><b>${def.cost.energy}⚡</b> ${def.cost.crystal}◆</div>`; card.onclick=()=>selectType(type,card); cards.appendChild(card); } }
function selectType(type,card){ Sound.click(); if(buildType===type){cancelBuild();return;} deselect(); buildType=type; document.querySelectorAll('.card').forEach(c=>c.classList.remove('active')); if(card)card.classList.add('active'); if(ghost){disposeObject(ghost);ghost=null;} ghost=makeGhost(type);ghost.visible=false;scene.add(ghost);if(platform?.userData.grid)platform.userData.grid.visible=true; }
function wireControls(){ document.getElementById('raid').onclick=startRaid; document.getElementById('attack').onclick=openFleetPanel; document.getElementById('return').onclick=()=>{ if(mode==='attack')endAttack(); };
  document.getElementById('fleet-go').onclick=()=>{ Sound.click(); closeFleetPanel(); startAttack(); };
  document.getElementById('fleet-cancel').onclick=()=>{ Sound.click(); closeFleetPanel(); };
  document.getElementById('fleet-retreat').onclick=()=>{ if(mode==='attack')endAttack(); };
  const set=document.getElementById('settings'); document.getElementById('settings-btn').onclick=()=>{const open=set.style.display!=='block';if(open){deselect();cancelBuild();closeFleetPanel();closeBuildTray();}set.style.display=open?'block':'none';}; document.getElementById('close-set').onclick=()=>{ set.style.display='none'; };
  document.getElementById('snd').onclick=()=>{ preferences.muted=Sound.toggleMute();saveService.setPreferences(preferences);syncSnd(); };
  document.getElementById('vol').oninput=(e)=>{preferences.volume=e.target.value/100;Sound.setVolume(preferences.volume);saveService.setPreferences(preferences);};
  document.getElementById('skybtn').onclick=()=>{ if(skyLoading){toast('DOME STILL LOADING…');return;} Sound.click(); applySky(skyIndex+1); };
  document.getElementById('save').onclick=saveBase; document.getElementById('load').onclick=loadBase; document.getElementById('reset').onclick=resetBase; document.getElementById('recenter').onclick=recenterView;
  document.getElementById('help-x').onclick=()=>document.getElementById('help').style.display='none'; }
function syncSnd(){ document.getElementById('snd').textContent=Sound.isMuted()?'OFF':'ON'; }
function recenterView(){cameraFlight=null; if(!initCam)return; if(mode==='attack'){camera.position.copy(battleCenter).add(new THREE.Vector3(34,26,44));controls.target.copy(battleCenter);}else{camera.position.copy(initCam);controls.target.set(0,0,0);} controls.update(); }
function capOf(){ let add=0; for(const b of buildings)if(b.userData.type==='storage')add+=1500*b.userData.level; return 2000+add; }
function fleetCap(){return Math.min(160,12+buildings.reduce((n,b)=>n+(b.userData.def?.trains?6:0)+(b.userData.type==='camp'?20*b.userData.level:0),0));}
function fleetUsed(){return fighters.reduce((n,f)=>n+UNIT_DEFS[f.type||'interceptor'].space,0);}
function builderCap(){return Math.min(12,1+buildings.reduce((n,b)=>n+(b.userData.type==='builder'?b.userData.level:0),0));}
function buildersBusy(){return deploying.filter(d=>d.obj.userData.type!=='command').length;}
function updateHUD(){syncBaseStatus(); const cap=capOf(); resources.energy=Math.min(resources.energy,cap); resources.crystal=Math.min(resources.crystal,cap);
  document.getElementById('energy').textContent=Math.floor(resources.energy);
  document.getElementById('crystal').textContent=Math.floor(resources.crystal);
  document.getElementById('efill').style.width=(100*resources.energy/cap)+'%';
  document.getElementById('cfill').style.width=(100*resources.crystal/cap)+'%';
  document.getElementById('cell-energy').classList.toggle('full',resources.energy>=cap*0.98);
  document.getElementById('cell-crystal').classList.toggle('full',resources.crystal>=cap*0.98);
  document.getElementById('cell-energy').title=`Energy ${Math.floor(resources.energy)} / ${cap}`;
  document.getElementById('cell-crystal').title=`Crystal ${Math.floor(resources.crystal)} / ${cap}`;
  const ext=buildings.filter(b=>b.userData.type==='extractor'||b.userData.type==='drill').reduce((s,b)=>s+b.userData.level,0);
  const rct=buildings.reduce((n,b)=>n+(b.userData.type==='reactor'?3:b.userData.type==='solar'?2:0)*b.userData.level,0);
  document.getElementById('crate').textContent=ext?`+${ext*2}/s`:''; document.getElementById('erate').textContent=rct?`+${rct}/s`:''; if(selected)showInfo(selected); }
function tickIncome(){ let e=0,c=0; for(const b of buildings){ const t=b.userData.type; if(t==='reactor')e+=3*b.userData.level; else if(t==='solar')e+=2*b.userData.level; else if(t==='extractor')c+=2*b.userData.level; else if(t==='drill')c+=2*b.userData.level; } if(e){resources.energy+=e;pulse('energy');} if(c){resources.crystal+=c;pulse('crystal');} updateHUD(); }
function pulse(id){ const el=document.getElementById(id).closest('.rescell'); if(!el)return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
let toastT; function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),1400); }
// ============================================================
//  BARRACKS / STARPORT — train friendly interceptors
// ============================================================
function trainFighter(type='interceptor'){
 if(typeof type!=='string')type='interceptor';
 if(!canEditSelected()||!selected.userData.def?.trains)return;
 const d=UNIT_DEFS[type];if(!d||selected.userData.level<d.level){toast('UPGRADE TRAINING FACILITY');return;}
 if(fleetUsed()+d.space>fleetCap()){toast('CAMP FULL — BUILD OR UPGRADE A CAMP');return;}
 if(resources.energy<d.energy||resources.crystal<d.crystal){toast('NEED RESOURCES');Sound.error();return;}
 resources.energy-=d.energy;resources.crystal-=d.crystal;spawnFighter(selected.position.clone(),type);Sound.upgrade();updateHUD();renderHangar();
}
function spawnFighter(home,type='interceptor'){
 const d=UNIT_DEFS[type],m=createFighter(type),a=Math.random()*Math.PI*2;
 m.position.set(home.x+Math.cos(a)*3,2.4,home.z+Math.sin(a)*3);scene.add(m);
 fighters.push({type,mesh:m,hp:d.hp,maxHp:d.hp,cd:0,home:home.clone(),phase:Math.random()*6});
}
// ============================================================
//  SAVE / LOAD / RESET
// ============================================================
// Dispose owned geometry/materials, not shared textures used elsewhere.
function disposeObject(obj){
  if(!obj)return;obj.removeFromParent();const geos=new Set(),mats=new Set();
  obj.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});
  geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  for(let i=deploying.length-1;i>=0;i--)if(deploying[i].obj===obj)deploying.splice(i,1);
}
function canEditSelected(){
  if(!selected)return false;
  if(raidActive||mode!=='base'){toast('EDITS LOCKED DURING BATTLE');return false;}
  if(selected.userData.deploying){toast('DEPLOYMENT IN PROGRESS');return false;}return true;
}
function baseIdle(){if(raidActive||mode!=='base'){toast('FINISH THE BATTLE FIRST');return false;}return true;}
function clearBase(){
  closeHangar();cameraFlight=null;cancelBuild();closeFleetPanel();for(const b of buildings)disposeObject(b);buildings.length=0;interactives.length=0;occupied.clear();commandCenter=null;
  for(const f of fighters)disposeObject(f.mesh);fighters.length=0;deploying.length=0;
  for(const e of effects)e.dispose();effects.length=0;deselect();
}
function saveBase(){
 if(!baseIdle())return;
 const r=saveService.save({resources,wave,buildings,fighters});
 if(r.ok){toast('BASE SAVED');Sound.click();}else toast('SAVE FAILED — STORAGE UNAVAILABLE OR INVALID STATE');
}
function validateSave(data){return saveService.validate(data);}
function loadBase(){
  if(!baseIdle())return;
  const r=saveService.load();if(!r.ok){toast('SAVE INVALID OR STORAGE UNAVAILABLE');return;}if(!r.found){toast('NO SAVE FOUND');return;}const data=r.value;
  clearBase();resources.energy=data.res.energy;resources.crystal=data.res.crystal;wave=data.wave||0;
  for(const b of data.buildings){const def=b.type==='command'?COMMAND_DEF:BUILDINGS[b.type],bb=createBuilding(b.type);registerBuilding(bb,b.i,b.j,def,true);bb.userData.level=b.level;bb.userData.maxHp=Math.round(def.hp*Math.pow(1.3,b.level-1));bb.userData.hp=Number.isFinite(b.hp)?Math.max(1,Math.min(b.hp,bb.userData.maxHp)):bb.userData.maxHp;applyLevel(bb,b.level);if(b.type==='command')commandCenter=bb;}
  for(const f of data.fighters||[]){spawnFighter(new THREE.Vector3(f.home.x,0,f.home.z),f.type||'interceptor');fighters.at(-1).hp=f.hp;}
  updateHUD();toast('BASE LOADED');Sound.click();
}
function resetBase(){if(!baseIdle()||!confirm('Reset your current base and fleet? Your saved base will not be deleted.'))return;clearBase();preplaceCommand();resources.energy=1400;resources.crystal=800;wave=0;updateHUD();toast('BASE RESET');Sound.click();}
// ============================================================
//  RAID / DEFENSE
// ============================================================
function startRaid(){ if(raidActive||mode==='attack')return;closeHangar();cameraFlight=null; closeFleetPanel(); const defN=buildings.filter(b=>DEF_TYPES.includes(b.userData.type)).length; const barN=buildings.filter(b=>b.userData.def&&b.userData.def.trains).length; if(defN+barN===0){toast('BUILD DEFENSE FIRST!');Sound.error();return;} cancelBuild();closeBuildTray();deselect();document.getElementById('settings').style.display='none';raidActive=true; wave=Math.min(wave+1,10000); const n=Math.min(60,6+wave*2); for(let i=0;i<n;i++)spawnDrone(); document.getElementById('raid').disabled=true; document.getElementById('attack').style.display='none'; Sound.success(); banner(`⚠ WAVE ${wave} — ${enemies.length} HOSTILES INBOUND`,'#ff8a3c'); }
function spawnDrone(){ const g=new THREE.Group(); const body=part(new THREE.ConeGeometry(0.55,1.6,8),new THREE.MeshStandardMaterial({color:0x551015,metalness:0.6,roughness:0.4,emissive:0x220000}),0,0,0); body.rotation.x=Math.PI/2; g.add(body); g.add(part(new THREE.BoxGeometry(1.6,0.12,0.6),metal(0x331015),0,0,0)); g.add(part(new THREE.SphereGeometry(0.26,12,8),glow(0xff2b3c,3),0,0,0.55,false)); g.add(part(new THREE.SphereGeometry(0.2,10,8),glow(0xff6a00,2),0,0,-0.85,false)); const a=Math.random()*Math.PI*2,r=PLANE_R+26+Math.random()*18; g.position.set(Math.cos(a)*r,3+Math.random()*6,Math.sin(a)*r); g.userData={hp:120+wave*18,maxHp:120+wave*18,speed:4+wave*0.4,target:pickTarget(),bob:Math.random()*6}; scene.add(g); enemies.push(g); }
function pickTarget(){ const valid=buildings.filter(b=>b.userData.type!=='command'&&b.userData.hp>0); return valid.length?valid[Math.floor(Math.random()*valid.length)]:(commandCenter?.userData.hp>0?commandCenter:null); }
function updateRaid(dt,t){ if(!raidActive)return;
  for(let k=enemies.length-1;k>=0;k--){ const e=enemies[k],u=e.userData; if(u.hp<=0){ spawnExplosion(e.position,0xff6a00,1.3); Sound.explode(); disposeObject(e); enemies.splice(k,1); kills++; continue; } if(!u.target||!buildings.includes(u.target)||u.target.userData.hp<=0)u.target=pickTarget(); if(!u.target){ e.position.x*=0.99; e.position.z*=0.99; e.rotation.y+=dt; continue; } const tp=u.target.position,dx=tp.x-e.position.x,dz=tp.z-e.position.z,dist=Math.hypot(dx,dz); if(dist>2.4){ const ang=Math.atan2(dx,dz); e.rotation.y+=angDiff(e.rotation.y,ang)*Math.min(1,dt*4); const step=Math.min(u.speed*dt,dist-2.4);e.position.x+=Math.sin(e.rotation.y)*step; e.position.z+=Math.cos(e.rotation.y)*step; } else { u.target.userData.hp-=30*dt; if(Math.random()<dt*8){spawnExplosion(tmpV.copy(u.target.position).setY(1),0xff8a3c,0.5);Sound.hit();} if(u.target.userData.hp<=0){if(u.target===commandCenter){endRaid(false);return;}destroyBuilding(u.target);} } e.position.y=(3+Math.sin(t*2+u.bob))*0.4+2; }
  for(const b of buildings){ const tu=b.userData.turret; if(!tu)continue; tu.cd-=dt; let nearest=null,nd=tu.range; for(const e of enemies){const d=e.position.distanceTo(b.position); if(d<nd){nd=d;nearest=e;}} if(nearest){ const dx=nearest.position.x-b.position.x,dz=nearest.position.z-b.position.z,ang=Math.atan2(dx,dz); tu.head.rotation.y+=angDiff(tu.head.rotation.y,ang)*Math.min(1,dt*6); if(tu.cd<=0){ tu.cd=(tu.kind==='pulse'?0.18:tu.kind==='missile'?1.6:tu.kind==='sniper'?2.2:0.42); tu.barrel.getWorldPosition(tmpV); fireAnimation(b,tu,tmpV); if(tu.kind==='missile'||tu.kind==='sniper'){ spawnProjectile(tmpV,nearest,0xff8a3c,tu.dmg,34); } else { spawnLaser(tmpV,nearest.position,tu.kind==='pulse'?0x39e6ff:0xff3b5c); } Sound.shoot(); if(tu.kind!=='missile'&&tu.kind!=='sniper')nearest.userData.hp-=tu.dmg; } } }
  for(const b of buildings){ const sh=b.userData.shield; if(!sh)continue; sh.cd-=dt; if(sh.cd<=0){ let hit=false; for(const e of enemies)if(e.position.distanceTo(b.position)<sh.range){e.userData.hp-=sh.dmg;hit=true;} if(hit){spawnShockwave(b.position,0x39e6ff);sh.cd=1.1;} } }
  for(let k=projectiles.length-1;k>=0;k--){ const p=projectiles[k]; p.t+=dt; const tg=p.target; if(!tg||tg.userData.hp<=0||p.t>3){ spawnExplosion(p.mesh.position,0xff8a3c,0.7); scene.remove(p.mesh); p.geo.dispose(); p.mat.dispose(); projectiles.splice(k,1); continue; } const dir=tmpV2.subVectors(tg.position,p.mesh.position); const d=dir.length(); if(d<1.2){ if(tg.userData.hp>0)tg.userData.hp-=p.dmg; spawnExplosion(p.mesh.position,0xff8a3c,0.8); scene.remove(p.mesh); p.geo.dispose(); p.mat.dispose(); projectiles.splice(k,1); continue; } p.mesh.position.addScaledVector(dir.normalize(),Math.min(d,p.speed*dt)); }
  banner(`⚠ WAVE ${wave} — HOSTILES: ${enemies.length}`,'#ff8a3c'); if(enemies.length===0)endRaid(); }
function updateFighters(dt,t){ const attacking=(mode==='attack'); const pool=attacking?enemyBuildings:enemies; 
  for(const f of fighters){ const def=UNIT_DEFS[f.type||'interceptor'],speed=attacking?def.speed:def.speed*.5; if(f.mesh.userData.exhaust)f.mesh.userData.exhaust.scale.y=hasMotion()?1+.15*Math.sin(t*12+f.phase):1;let tgt=null,nd=attacking?60:24; for(const e of pool){ if(e.userData.hp<=0)continue; const d=e.position.distanceTo(f.mesh.position); if(d<nd){nd=d;tgt=e;} }
    if(tgt){ const dx=tgt.position.x-f.mesh.position.x,dz=tgt.position.z-f.mesh.position.z,dist=Math.hypot(dx,dz),ang=Math.atan2(dx,dz);
      f.mesh.rotation.y+=angDiff(f.mesh.rotation.y,ang)*Math.min(1,dt*6);
      if(dist>6){ f.mesh.position.x+=Math.sin(f.mesh.rotation.y)*speed*dt; f.mesh.position.z+=Math.cos(f.mesh.rotation.y)*speed*dt; }
      f.cd-=dt; if(f.cd<=0){ f.cd=def.cooldown; spawnLaser(f.mesh.position.clone().setY(f.mesh.position.y+0.2),tgt.position,0x39e6ff); Sound.shoot(); tgt.userData.hp-=def.damage; if(tgt.userData.hp<=0&&attacking){destroyEnemyBuilding(tgt);if(enemyBuildings.length===0)break;} } }
    else if(attacking){ // nothing in range yet — fly the fleet toward the enemy outpost
      const dx=battleCenter.x-f.mesh.position.x,dz=battleCenter.z-f.mesh.position.z,dist=Math.hypot(dx,dz),ang=Math.atan2(dx,dz);
      f.mesh.rotation.y+=angDiff(f.mesh.rotation.y,ang)*Math.min(1,dt*5);
      if(dist>6){ f.mesh.position.x+=Math.sin(f.mesh.rotation.y)*speed*dt; f.mesh.position.z+=Math.cos(f.mesh.rotation.y)*speed*dt; }
      f.mesh.position.y+=(6-f.mesh.position.y)*Math.min(1,dt*1.6); }
    else { const a=t*0.8+f.phase,hx=f.home.x+Math.cos(a)*3,hz=f.home.z+Math.sin(a)*3; f.mesh.position.x+=(hx-f.mesh.position.x)*Math.min(1,dt*2); f.mesh.position.z+=(hz-f.mesh.position.z)*Math.min(1,dt*2); f.mesh.position.y=2.4+Math.sin(a*2)*0.5; f.mesh.rotation.y+=dt*0.6; } } }
function endRaid(success=true){ raidActive=false; for(const e of enemies)disposeObject(e);enemies.length=0;for(const p of projectiles)disposeObject(p.mesh);projectiles.length=0;if(commandCenter)commandCenter.userData.hp=commandCenter.userData.maxHp; const reward=success?{energy:150+wave*40,crystal:90+wave*25}:{energy:0,crystal:0}; resources.energy+=reward.energy; resources.crystal+=reward.crystal; document.getElementById('raid').disabled=false; document.getElementById('attack').style.display=''; if(success)Sound.success();else Sound.error(); banner(success?`DEFENSE SUCCESSFUL  +${reward.energy}⚡ +${reward.crystal}◆`:'BASE OVERRUN — HQ RESTORED',success?'#7dffb0':'#ff8a3c');scheduleBannerHide(2600); updateHUD(); }
function destroyBuilding(b){ if(b===commandCenter)return; occupied.delete(key(Math.round(b.position.x/CELL+HALF),Math.round(b.position.z/CELL+HALF))); spawnExplosion(b.position,0xff8a3c,1.6); Sound.explode(); disposeObject(b); interactives.splice(interactives.indexOf(b),1); buildings.splice(buildings.indexOf(b),1); if(selected===b)deselect(); updateHUD(); }
function angDiff(a,b){ let d=b-a; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return d; }
// ============================================================
//  OFFENSE — pick fleet, attack an AI enemy outpost
// ============================================================
function openFleetPanel(){
  if(!baseIdle())return;closeHangar();deselect();closeBuildTray();document.getElementById('settings').style.display='none';Sound.click(); cancelBuild(); closeFleetPanel();
  const list=document.getElementById('fleet-list'); list.innerHTML='';
  const empty=document.getElementById('fleet-empty'), go=document.getElementById('fleet-go');
  if(!fighters.length){ empty.style.display='block'; go.disabled=true; }
  else{
    empty.style.display='none'; go.disabled=false;
    fighters.forEach((f,i)=>{ if(i>=14)return; const c=document.createElement('div'); c.className='fchip';
      c.innerHTML=`<span>${icon('starport')}</span><span>${UNIT_DEFS[f.type||'interceptor'].name.toUpperCase()}</span><span class="hp"><i style="width:${Math.max(0,Math.round(100*f.hp/f.maxHp))}%"></i></span>`; list.appendChild(c); });
    if(fighters.length>14){ const more=document.createElement('div'); more.className='fchip'; more.innerHTML=`<span>+${fighters.length-14} MORE IN HANGAR</span>`; list.appendChild(more); }
  }
  document.getElementById('fleet-panel').style.display='block';
}
function closeBuildTray(){document.getElementById('build-panel').style.display='none';document.getElementById('build-toggle').classList.remove('active');document.body.classList.remove('build-open');}
function closeFleetPanel(){ const p=document.getElementById('fleet-panel'); if(p)p.style.display='none'; }
function generateOutpost(){
  enemyGroup=new THREE.Group(); enemyGroup.position.copy(battleCenter); scene.add(enemyGroup);
  enemyPlatform=new THREE.Mesh(new THREE.CylinderGeometry(13,12,1.2,64),metal(0x1a1320,0.5,0.8));
  enemyPlatform.position.y=-0.6; enemyPlatform.receiveShadow=true; enemyGroup.add(enemyPlatform);
  enemyTop=new THREE.Mesh(new THREE.CylinderGeometry(12.8,12.8,0.06,64),new THREE.MeshStandardMaterial({color:0x2a1a2a,roughness:0.7,metalness:0.5}));
  enemyTop.position.y=0; enemyGroup.add(enemyTop);
  const hq=createBuilding('command'); placeEnemy(hq,0,0);
  const types=['turret','missile','shield','cannon','tesla','sniper']; const n=12;
  for(let i=0;i<n;i++){ const t=types[Math.floor(Math.random()*types.length)]; const b=createBuilding(t);
    const ang=(i/n)*Math.PI*2,rad=9.2; placeEnemy(b,Math.cos(ang)*rad,Math.sin(ang)*rad); }
  for(let i=0;i<4;i++){ const c=createBuilding('storage'); const ang=(i+.5)*Math.PI/2,rad=4.7; placeEnemy(c,Math.cos(ang)*rad,Math.sin(ang)*rad); c.userData.cache=true; }
}
function placeEnemy(b,x,z){ b.userData.def=BUILDINGS[b.userData.type]||COMMAND_DEF; b.userData.level=1; b.userData.maxHp=b.userData.def.hp; b.userData.hp=b.userData.maxHp;
  b.position.set(battleCenter.x+x,0,battleCenter.z+z); b.scale.setScalar(1); scene.add(b); enemyBuildings.push(b); }
function startAttack(){
  if(mode==='attack'||raidActive)return;
  if(fighters.length===0){toast('TRAIN SHIPS FIRST!');Sound.error();return;}
  closeHangar();cameraFlight=null;cancelBuild();deselect();mode='attack'; loot={energy:0,crystal:0}; battleTimer=70;
  battleCenter.set(0,0,-PLANE_R*5);
  generateOutpost();
  controls.target.copy(battleCenter); camera.position.set(battleCenter.x+34,battleCenter.y+26,battleCenter.z+44); controls.update();
  document.getElementById('raid').style.display='none'; document.getElementById('attack').style.display='none'; document.getElementById('return').style.display='none';
  document.getElementById('build-toggle').style.display='none';
  const bp=document.getElementById('build-panel'); bp.style.display='none'; document.getElementById('build-toggle').classList.remove('active');document.body.classList.remove('build-open');
  document.getElementById('fleet-bar').style.display='flex';
  toast('⚔ DEPLOYING FLEET'); Sound.success();
}
function updateAttack(dt,t){
  if(mode!=='attack')return; battleTimer-=dt;
  for(const b of enemyBuildings){ const tu=b.userData.turret; if(!tu)continue; tu.cd-=dt; let nearest=null,nd=tu.range;
    for(const f of fighters){ const d=f.mesh.position.distanceTo(b.position); if(d<nd){nd=d;nearest=f;} }
    if(nearest){ const dx=nearest.mesh.position.x-b.position.x,dz=nearest.mesh.position.z-b.position.z,ang=Math.atan2(dx,dz);
      tu.head.rotation.y+=angDiff(tu.head.rotation.y,ang)*Math.min(1,dt*6);
      if(tu.cd<=0){ tu.cd=(tu.kind==='missile'?1.6:tu.kind==='sniper'?2.2:tu.kind==='pulse'?0.18:0.42); tu.barrel.getWorldPosition(tmpV); fireAnimation(b,tu,tmpV); spawnLaser(tmpV,nearest.mesh.position,0xff3b5c); Sound.shoot(); nearest.hp-=tu.dmg;
        if(nearest.hp<=0){ disposeObject(nearest.mesh); const fi=fighters.indexOf(nearest); if(fi>=0)fighters.splice(fi,1); } } } }
  const alive=enemyBuildings.filter(b=>b.userData.hp>0).length;
  const hp=fighters.reduce((s,f)=>s+Math.max(0,f.hp),0), mx=fighters.reduce((s,f)=>s+f.maxHp,0)||1;
  const fst=document.getElementById('fleet-status'); if(fst)fst.textContent=`FLEET ${fighters.length} · HP ${Math.round(100*hp/mx)}%`;
  if(alive===0||fighters.length===0||battleTimer<=0){ endAttack(); return; }
  banner(`⚔ RAIDING OUTPOST — ENEMY: ${alive} · FLEET: ${fighters.length}`,'#ff8a3c');
}
function destroyEnemyBuilding(b){ spawnExplosion(b.position,0xff6a00,1.4); Sound.explode();
  if(b.userData.cache){ const g=Math.round(150+wave*40),c=Math.round(90+wave*25); loot.energy+=g; loot.crystal+=c; }
  if(b.userData.type==='command'){ loot.energy+=300; loot.crystal+=200; }
  const i=enemyBuildings.indexOf(b); if(i>=0)enemyBuildings.splice(i,1); disposeObject(b); }
function endAttack(){
  if(mode!=='attack')return;mode='base'; const win=enemyBuildings.length===0;
  resources.energy+=loot.energy; resources.crystal+=loot.crystal;
  if(enemyGroup){disposeObject(enemyGroup);enemyGroup=null;}
  for(const b of enemyBuildings)disposeObject(b);
  enemyBuildings.length=0; enemyPlatform=null; enemyTop=null;
  const hc=commandCenter?commandCenter.position:new THREE.Vector3(); fighters.forEach((f,i)=>{ f.home=new THREE.Vector3(hc.x+Math.cos(i)*4,2.4,hc.z+Math.sin(i)*4);f.mesh.position.copy(f.home); });
  if(initCam){ camera.position.copy(initCam); controls.target.set(0,0,0); controls.update(); }
  document.getElementById('raid').style.display=''; document.getElementById('attack').style.display=''; document.getElementById('return').style.display='none';
  document.getElementById('build-toggle').style.display='';
  document.getElementById('fleet-bar').style.display='none'; closeFleetPanel();
  banner(win?`✓ OUTPOST RAIDED  +${Math.floor(loot.energy)}⚡ +${Math.floor(loot.crystal)}◆`:`⚔ RETREAT — LOOTED +${Math.floor(loot.energy)}⚡ +${Math.floor(loot.crystal)}◆`, win?'#7dffb0':'#ff8a3c');
  scheduleBannerHide(3000);updateHUD();
  loot={energy:0,crystal:0}; Sound.success();
}
// ============================================================
//  EFFECTS
// ============================================================
function spawnShockwave(pos,color){if(!hasMotion()||effects.length>=180)return; const geo=new THREE.RingGeometry(0.3,0.5,40); const mat=new THREE.MeshBasicMaterial({color,transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}); const m=new THREE.Mesh(geo,mat); m.rotation.x=-Math.PI/2; m.position.set(pos.x,0.12,pos.z); scene.add(m); effects.push({t:0,life:0.7,update(dt){this.t+=dt;const s=1+this.t*9;m.scale.set(s,s,s);mat.opacity=.35*Math.max(0,1-this.t/this.life);return this.t<this.life;},dispose(){scene.remove(m);geo.dispose();mat.dispose();}}); }
function spawnExplosion(pos,color,scale=1){ if(effects.length>=180)return; const n=hasMotion()?20:6,g=new THREE.BufferGeometry(),p=new Float32Array(n*3),v=[]; for(let i=0;i<n;i++){p[i*3]=pos.x;p[i*3+1]=pos.y+0.5;p[i*3+2]=pos.z; v.push(new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize().multiplyScalar((2+Math.random()*4)*scale));} g.setAttribute('position',new THREE.BufferAttribute(p,3)); const m=new THREE.PointsMaterial({color,size:0.45*scale,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}); const pts=new THREE.Points(g,m); scene.add(pts); effects.push({t:0,life:0.6,update(dt){this.t+=dt;const a=g.attributes.position.array; for(let i=0;i<n;i++){a[i*3]+=v[i].x*dt;a[i*3+1]+=v[i].y*dt;a[i*3+2]+=v[i].z*dt;v[i].multiplyScalar(Math.pow(.93,dt*60));} g.attributes.position.needsUpdate=true; m.opacity=Math.max(0,1-this.t/this.life); m.size*=Math.pow(.98,dt*60); return this.t<this.life;},dispose(){scene.remove(pts);g.dispose();m.dispose();}}); }
function spawnLaser(from,to,color){if(effects.length>=180)return; const dir=tmpV2.subVectors(to,from),len=dir.length(); const geo=new THREE.CylinderGeometry(0.06,0.06,1,6); const mat=new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}); const m=new THREE.Mesh(geo,mat); m.position.copy(from).addScaledVector(dir,0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize()); m.scale.set(1,len,1); scene.add(m); effects.push({t:0,life:0.12,update(dt){this.t+=dt;mat.opacity=Math.max(0,1-this.t/this.life);return this.t<this.life;},dispose(){scene.remove(m);geo.dispose();mat.dispose();}}); }
function spawnProjectile(from,target,color,dmg,speed){ const geo=new THREE.SphereGeometry(0.22,12,10); const mat=new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}); const m=new THREE.Mesh(geo,mat); m.position.copy(from); scene.add(m); projectiles.push({mesh:m,target,dmg,speed,t:0,geo,mat}); }
function scheduleBannerHide(ms){clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{if(!raidActive&&mode!=='attack')document.getElementById('banner').style.display='none';},ms);}
function banner(text,color){ const b=document.getElementById('banner'); b.textContent=text; b.style.color=color; b.style.borderColor=color; b.style.textShadow=`0 0 10px ${color}`; b.style.display='block'; }
// ============================================================
//  LOOP
// ============================================================
function animate(){ requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime;
  if(document.hidden)return;ambienceTime+=hasMotion()?dt:0;const at=ambienceTime;
  sky.rotation.y+=hasMotion()?dt*0.004:0;
  if(starFlare&&hasMotion())starFlare.material.rotation+=dt*0.1;
  for(const a of asteroids){ const u=a.userData; u.orb.a+=hasMotion()?u.orb.sp*dt:0; a.rotation.y+=hasMotion()?u.spin*dt*60:0; a.rotation.x+=hasMotion()?u.spin*dt*36:0;
    if(u.lane){if(hasMotion()){u.lane.z+=dt*u.lane.speed;if(u.lane.z>240)u.lane.z-=480;}a.position.set(u.lane.x+Math.sin(at*.1+u.orb.ph)*1.2,u.orb.y+Math.sin(at*.2+u.orb.ph)*.6,u.lane.z);}
    else a.position.set(Math.cos(u.orb.a)*u.orb.r,u.orb.y+Math.sin(u.orb.a*1.5+u.orb.ph)*u.orb.incl,Math.sin(u.orb.a)*u.orb.r);
    if(u.crystalMat)u.crystalMat.emissiveIntensity=u.base+Math.sin(at*1.2+u.orb.ph)*0.025; }
  // living-base ambience: rim pulse, beacon blink, crystal glow, star twinkle, patrol ships
  if(platform){ const P=platform.userData;if(P.signalArcs)P.signalArcs.rotation.y=at*.09;
    if(P.rim)P.rim.material.emissiveIntensity=1.25+Math.sin(at*.7)*.16;
    if(P.padRing)P.padRing.material.emissiveIntensity=.65+Math.sin(at*.8+1)*.12;
    if(P.beacons)P.beacons.forEach((b,i)=>{ b.material.emissiveIntensity=1.0+.4*(0.5+0.5*Math.sin(at*1.4+i*1.05)); });
    if(P.crystalMat)P.crystalMat.emissiveIntensity=1.1+Math.sin(at*.8)*.2;
    if(P.chunks)P.chunks.forEach(c=>{ c.rotation.y+=hasMotion()?c.userData.spin*dt*60:0; c.position.y=c.userData.baseY+Math.sin(at*.7+c.userData.bo)*.18; }); }
  if(stars)stars.material.opacity=.84+.04*Math.sin(at*.9);
  for(const p of patrol){ const a=at*p.sp+p.ph; p.m.position.set(Math.cos(a)*p.r,p.h+Math.sin(a*2.3)*0.9,Math.sin(a)*p.r); p.m.rotation.y=-a; p.m.rotation.z=Math.sin(a)*0.3; }
  for(const b of buildings){if(b.userData.update)b.userData.update(at);updateRecoil(b,dt);}
  for(const b of enemyBuildings){if(b.userData.update)b.userData.update(at);updateRecoil(b,dt);}
  for(let i=deploying.length-1;i>=0;i--){const d=deploying[i];d.t+=dt;const k=hasMotion()?Math.min(1,d.t/0.7):1,e=1-Math.pow(1-k,3); d.obj.scale.setScalar((0.01+e*0.99)); d.obj.position.set(d.target.x,(1-e)*4,d.target.z); if(k>=1){d.obj.scale.setScalar(1);d.obj.position.copy(d.target);d.obj.userData.deploying=false;deploying.splice(i,1);}}
  if(raidActive) updateRaid(dt,t); else if(mode==='attack') updateAttack(dt,t);
  updateFighters(dt,hasMotion()?t:0);
  for(let i=effects.length-1;i>=0;i--){if(!effects[i].update(dt)){effects[i].dispose();effects.splice(i,1);}}
  if(cameraFlight){const f=cameraFlight;f.t+=dt;const k=hasMotion()?Math.min(1,f.t/.75):1,e=k*k*(3-2*k);camera.position.lerpVectors(f.from,f.to,e);controls.target.lerpVectors(f.targetFrom,f.look,e);if(k===1)cameraFlight=null;}
  updateBuilders(at);updateHangar(dt);cruise?.update(dt,at,hasMotion());controls.update(); composer.render(); }
function onResize(){renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.5)); camera.aspect=innerWidth/innerHeight;camera.zoom=Math.min(1,camera.aspect/1.15); camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight); }
// ============================================================
// HANGAR / original troop previews / builder availability
// ============================================================
let hangarType='interceptor',previewRenderer=null,previewScene=null,previewCamera=null,previewModel=null;
let hangarReturnFocus=null,hangarTimer=0;
const builderDrones=[];
function setupHangar(){
 document.getElementById('hangar-open').onclick=openHangar;
 document.getElementById('manage-troops').onclick=openHangar;
 document.getElementById('hangar-close').onclick=closeHangar;
 const dialog=document.getElementById('hangar');dialog.addEventListener('cancel',e=>{e.preventDefault();closeHangar();});
 dialog.addEventListener('click',e=>{if(e.target===dialog)closeHangar();});
 document.getElementById('hangar-train').onclick=()=>trainFighter(hangarType);
 for(const [type,def]of Object.entries(UNIT_DEFS)){
 const btn=document.createElement('button');btn.className='unit-card';btn.dataset.unit=type;
 btn.innerHTML=`<span class="unit-mark">${icon(type==='sentinel'?'shield':'starport')}</span><strong>${def.name}</strong><small>${def.role} · ${def.space} space</small>`;
 btn.onclick=()=>{hangarType=type;setUnitPreview();renderHangar();};document.getElementById('unit-types').append(btn);
 }
}
function openHangar(){
 if(!baseIdle())return;cancelBuild();closeBuildTray();closeFleetPanel();document.getElementById('settings').style.display='none';
 if(!selected?.userData.def?.trains||selected.userData.deploying){selected=buildings.filter(b=>b.userData.def?.trains&&!b.userData.deploying).sort((a,b)=>b.userData.level-a.userData.level)[0]||null;}
 hangarReturnFocus=document.activeElement;document.getElementById('hangar').showModal();
 if(!previewRenderer){
 previewRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true});previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.25));previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;
 document.getElementById('unit-preview').append(previewRenderer.domElement);
 previewScene=new THREE.Scene();previewScene.add(new THREE.HemisphereLight(0xd8edff,0x253e51,3));
 const l=new THREE.DirectionalLight(0xffffff,3);l.position.set(4,5,3);previewScene.add(l);
 previewCamera=new THREE.PerspectiveCamera(35,1,.1,30);previewCamera.position.set(3.7,2.6,4.6);previewCamera.lookAt(0,0,0);
 }
 setUnitPreview();renderHangar();Sound.click();
}
function closeHangar(){const d=document.getElementById('hangar');if(!d?.open)return;d.close();if(previewModel){disposeObject(previewModel);previewModel=null;}hangarReturnFocus?.focus();}
function setUnitPreview(){if(!previewScene)return;if(previewModel)disposeObject(previewModel);previewModel=createUnit(hangarType);previewScene.add(previewModel);const bounds=new THREE.Box3().setFromObject(previewModel),size=bounds.getSize(new THREE.Vector3());const distance=Math.max(size.x,size.y,size.z)*1.3;previewCamera.position.set(distance*.7,distance*.5,distance*.86);previewCamera.lookAt(bounds.getCenter(new THREE.Vector3()));}
function renderHangar(){
 if(!document.getElementById('hangar')?.open)return;
 const d=UNIT_DEFS[hangarType],facility=selected?.userData.def?.trains?selected:null;
 document.getElementById('hangar-cap').textContent=`${fleetUsed()} / ${fleetCap()} camp space · ${fighters.length} ${fighters.length===1?'troop':'troops'}`;
 document.getElementById('unit-name').textContent=d.name;
 document.getElementById('unit-stats').textContent=`${d.hp} HP  /  ${d.damage} damage  /  ${d.space} camp space`;
 const valid=facility&&facility.userData.level>=d.level;
 document.getElementById('unit-unlock').textContent=facility?`${facility.userData.def.name} · level ${facility.userData.level} / requires level ${d.level}`:`Build a Barracks or Starport to train. Requires facility level ${d.level}.`;
 const tr=document.getElementById('hangar-train');tr.textContent=`TRAIN · ${d.energy} ⚡  ${d.crystal} ◆`;
 tr.disabled=!valid||raidActive||mode!=='base'||fleetUsed()+d.space>fleetCap()||resources.energy<d.energy||resources.crystal<d.crystal;
 for(const btn of document.querySelectorAll('.unit-card')){btn.classList.toggle('chosen',btn.dataset.unit===hangarType);btn.setAttribute('aria-pressed',String(btn.dataset.unit===hangarType));}
 const roster=document.getElementById('hangar-roster');roster.replaceChildren();
 for(const [type,def]of Object.entries(UNIT_DEFS)){const n=fighters.filter(f=>(f.type||'interceptor')===type).length;if(!n)continue;
 const row=document.createElement('div');row.className='roster-row';const label=document.createElement('span');label.textContent=`${def.name} × ${n}`;
 const remove=document.createElement('button');remove.textContent='Dismiss one';remove.setAttribute('aria-label',`Dismiss one ${def.name}`);
 remove.onclick=()=>{if(!baseIdle())return;const i=fighters.findLastIndex(f=>(f.type||'interceptor')===type);if(i>=0){disposeObject(fighters[i].mesh);fighters.splice(i,1);renderHangar();updateHUD();}};row.append(label,remove);roster.append(row);
 }
 if(!fighters.length){const p=document.createElement('p');p.className='roster-empty';p.textContent='Your fleet is empty. Train an escort to get started.';roster.append(p);}
}
function updateHangar(dt){
 hangarTimer+=dt;if(hangarTimer>.5){hangarTimer=0;syncBaseStatus();if(document.getElementById('hangar')?.open)renderHangar();}
 if(!document.getElementById('hangar')?.open||!previewModel)return;
 const area=document.getElementById('unit-preview'),w=area.clientWidth,h=area.clientHeight;
 if(previewRenderer.domElement.width!==Math.floor(w*previewRenderer.getPixelRatio())||previewRenderer.domElement.height!==Math.floor(h*previewRenderer.getPixelRatio())){previewRenderer.setSize(w,h,false);previewCamera.aspect=w/h;previewCamera.updateProjectionMatrix();}
 if(hasMotion())previewModel.rotation.y+=dt*.32;previewRenderer.render(previewScene,previewCamera);
}
function updateBuilders(t){
 const jobs=deploying.filter(d=>d.obj.userData.type!=='command');
 for(let i=0;i<jobs.length;i++){
 if(!builderDrones[i]){const g=new THREE.Group();const body=part(new THREE.BoxGeometry(.42,.22,.4),metal(0xd0b780),0,0,0);g.add(body);g.add(part(new THREE.SphereGeometry(.07,8,6),glow(0x85d4e5,.8),0,0,.24,false));scene.add(g);builderDrones.push(g);}
 const drone=builderDrones[i];drone.visible=true;const job=jobs[i];const a=t*2+i;drone.position.set(job.target.x+Math.cos(a)*1.4,2.1,job.target.z+Math.sin(a)*1.4);drone.rotation.y=-a;
 }
 for(let i=jobs.length;i<builderDrones.length;i++)builderDrones[i].visible=false;
}
function installUnderbase(){
 const steel=metal(0x627b91,.45,.6),dark=metal(0x25394b),lit=glow(0x88c9dc,.65);
 const core=part(new THREE.CylinderGeometry(2.5,1.8,3,24),steel,0,-16.8,0);platform.add(core);
 for(const [r,y]of [[3.3,-16],[2.5,-18.1]]){const ring=part(new THREE.TorusGeometry(r,.18,8,48),dark,0,y,0);ring.rotation.x=Math.PI/2;platform.add(ring);}
 for(let i=0;i<6;i++){const a=i*Math.PI/3;const arm=part(new THREE.BoxGeometry(.42,1,7.5),steel,Math.sin(a)*4.8,-15.1,Math.cos(a)*4.8);arm.rotation.y=a;platform.add(arm);const thruster=part(new THREE.CylinderGeometry(.55,.7,1.4,12),dark,Math.sin(a)*8,-15,Math.cos(a)*8);platform.add(thruster);const nozzle=part(new THREE.CylinderGeometry(.43,.55,.11,12),lit,Math.sin(a)*8,-15.75,Math.cos(a)*8,false);platform.add(nozzle);}
}
// Muzzle flash and spring-return recoil; targeting node remains attached.
function fireAnimation(b,tu,pos){
 if(!hasMotion())return;
 const assembly=tu.barrel.parent;
 if(assembly&&assembly!==b&&assembly!==tu.head&&tu.barrel!==tu.head){if(!b.userData.recoil)b.userData.recoil={node:assembly,z:assembly.position.z,k:0};b.userData.recoil.k=.12;}
 if(effects.length>=180)return;
 const geo=new THREE.SphereGeometry(.16,8,6),mat=new THREE.MeshBasicMaterial({color:tu.kind==='pulse'?0xa5efff:0xffce8a,transparent:true,depthWrite:false});
 const m=new THREE.Mesh(geo,mat);m.position.copy(pos);scene.add(m);
 effects.push({t:0,life:.08,update(dt){this.t+=dt;m.scale.setScalar(1+this.t*9);mat.opacity=Math.max(0,1-this.t/this.life);return this.t<this.life;},dispose(){disposeObject(m);}});
}
function updateRecoil(b,dt){const r=b.userData.recoil;if(!r)return;r.k=hasMotion()?r.k*Math.exp(-dt*22):0;r.node.position.z=r.z-r.k;}

function syncBaseStatus(){const e=document.getElementById('base-status');if(e)e.textContent=`CAMP ${fleetUsed()}/${fleetCap()} · BUILDERS ${Math.max(0,builderCap()-buildersBusy())}/${builderCap()} · CRUISE`;}
