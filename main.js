import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
//  STELLAR CLASH — big base + categorized build + settings (offline)
// ============================================================

const GRID = 21, CELL = 2.4, HALF = (GRID - 1) / 2;
const PLANE_R = (GRID / 2) * CELL * 1.13;
const DEF_TYPES = ['turret','pulse','missile','cannon','tesla','sniper','shield'];

const BUILDINGS = {
  // resources
  extractor:{name:'Crystal Extractor',em:'⛏️',cat:'resource',cost:{energy:100,crystal:50},hp:260,out:'Crystal'},
  reactor:  {name:'Fusion Reactor',  em:'⚡',cat:'resource',cost:{energy:150,crystal:80}, hp:320,out:'Energy'},
  solar:    {name:'Solar Array',     em:'☀️',cat:'resource',cost:{energy:120,crystal:40}, hp:240,out:'Energy'},
  drill:    {name:'Deep Drill',      em:'🛠️',cat:'resource',cost:{energy:130,crystal:70}, hp:260,out:'Crystal'},
  storage:  {name:'Storage Vault',   em:'📦',cat:'resource',cost:{energy:120,crystal:120},hp:420,out:'+Capacity'},
  // defense
  wall:     {name:'Defense Wall',    em:'🧱',cat:'defense', cost:{energy:40, crystal:20}, hp:700,out:'Bulkhead'},
  turret:   {name:'Laser Turret',    em:'🔫',cat:'defense', cost:{energy:120,crystal:60}, hp:220,out:'Defense'},
  pulse:    {name:'Pulse Tower',     em:'📡',cat:'defense', cost:{energy:160,crystal:90}, hp:240,out:'Rapid'},
  missile:  {name:'Missile Battery', em:'🚀',cat:'defense', cost:{energy:220,crystal:140},hp:260,out:'Heavy'},
  cannon:   {name:'Plasma Cannon',   em:'💥',cat:'defense', cost:{energy:260,crystal:160},hp:300,out:'Heavy'},
  tesla:    {name:'Tesla Coil',      em:'⚡',cat:'defense', cost:{energy:200,crystal:120},hp:240,out:'Chain'},
  sniper:   {name:'Railgun',         em:'🎯',cat:'defense', cost:{energy:300,crystal:200},hp:260,out:'Long'},
  shield:   {name:'Shield Projector', em:'🛡️',cat:'defense', cost:{energy:200,crystal:120},hp:280,out:'Aegis'},
  // army
  barracks: {name:'Barracks',  em:'🪖',cat:'army',cost:{energy:200,crystal:150},hp:320,out:'Train',trains:true},
  starport: {name:'Starport',  em:'🛰️',cat:'army',cost:{energy:350,crystal:260},hp:360,out:'Fleet',trains:true},
  habitat:  {name:'Crew Habitat',em:'🏠',cat:'army',cost:{energy:80, crystal:40}, hp:200,out:'Crew'},
};
const COMMAND_DEF = { name:'Command Center', hp:2400, out:'HQ', cost:{energy:0,crystal:0} };
const CATS = [['all','All'],['resource','Resources'],['defense','Defense'],['army','Army']];

// ---- state ----
let renderer, scene, camera, controls, composer, sky, initCam;
let stationTex=null, planet=null, moon=null, starFlare=null, commandCenter=null;
const clock = new THREE.Clock();
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
const Sound=(()=>{ let ctx=null,master=null,vol=0.6,muted=false;
  const ac=()=>{ if(!ctx){ ctx=new (window.AudioContext||window.webkitAudioContext)(); master=ctx.createGain(); master.gain.value=muted?0:vol; master.connect(ctx.destination); } return ctx; };
  function tone(freq,dur,type='sine',gain=0.08,slideTo=null){ if(muted)return; const c=ac(); const o=c.createOscillator(),g=c.createGain(); o.type=type; o.frequency.value=freq; if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,c.currentTime+dur); g.gain.value=gain; g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur); o.connect(g).connect(master); o.start(); o.stop(c.currentTime+dur); }
  function noise(dur,gain=0.2){ if(muted)return; const c=ac(); const b=c.createBuffer(1,c.sampleRate*dur,c.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length); const s=c.createBufferSource(); s.buffer=b; const g=c.createGain(); g.gain.value=gain; g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur); s.connect(g).connect(master); s.start(); }
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
const manager=new THREE.LoadingManager();
const loader=new THREE.TextureLoader(manager);
const nebulaTex=loader.load('./images/nebula.jpg');
const planetTex=loader.load('./images/planet.jpg');
const stationRaw=loader.load('./images/station.jpg');
[nebulaTex,planetTex,stationRaw].forEach(t=>t.colorSpace=THREE.SRGBColorSpace);

manager.onLoad=()=>{ try{
  stationTex=stationRaw; stationTex.wrapS=stationTex.wrapT=THREE.RepeatWrapping; stationTex.repeat.set(6,6); stationTex.anisotropy=8;
  buildScene(); animate(); window.__gameStarted=true;
  const l=document.getElementById('loader'); l.style.opacity='0'; setTimeout(()=>l.remove(),700);
}catch(err){ showLoadError(err.message); } };
manager.onError=(url)=>showLoadError('asset: '+url);
function showLoadError(msg){ const p=document.querySelector('#loader p'); if(p)p.textContent='ERROR: '+msg; console.error(msg); }

// ============================================================
//  NEBULA SKY DOMES (GLB skyboxes; classic jpg dome as fallback)
// ============================================================
const SKIES=[
  {id:'deep',   label:'DEEP',    name:'DEEP NEBULA',  file:'./3dmodels/alien_space_nebula_2_skybox.glb'},
  {id:'core',   label:'CORE',    name:'ALIEN CORE',   file:'./3dmodels/alien_space_nebula_1_skybox.glb'},
  {id:'classic',label:'CLASSIC', name:'CLASSIC STARS',file:null},
];
let skyIndex=0;
try{ const saved=localStorage.getItem('stellar-sky'); const i=SKIES.findIndex(s=>s.id===saved); skyIndex=i>=0?i:0; }catch(e){}
const skyCache={};
let skyLoading=false;

function makeClassicSky(){ return new THREE.Mesh(new THREE.SphereGeometry(800,48,32),new THREE.MeshBasicMaterial({map:nebulaTex,side:THREE.BackSide,depthWrite:false,fog:false})); }

// Normalize a glTF skybox scene into an unlit back-side dome centered on the origin.
function prepareDome(gltf){
  const src=gltf.scene||gltf.scenes[0];
  src.updateMatrixWorld(true);
  const sphere=new THREE.Box3().setFromObject(src).getBoundingSphere(new THREE.Sphere());
  const k=760/Math.max(sphere.radius,1e-6);           // outer layer ends up at r≈760, beyond any camera distance
  src.traverse(o=>{
    if(o.isLight||o.isCamera){ o.visible=false; return; }  // strip embedded sketchfab lights/cameras
    if(o.isMesh&&o.material){
      const sm=o.material;
      const ext=sm.extensions&&sm.extensions['KHR_materials_emissive_strength'];
      const boost=ext?Math.min(ext.emissiveStrength||1,1.6):1;   // keep the authored nebula brightness
      const m=new THREE.MeshBasicMaterial({map:sm.map||sm.emissiveMap||null,color:new THREE.Color(boost,boost,boost),side:THREE.BackSide,depthWrite:false,fog:false});
      if(sm.transparent){ m.transparent=true; m.opacity=(typeof sm.opacity==='number'?sm.opacity:0.85); }
      o.material=m; o.frustumCulled=false; o.renderOrder=-10;
    }
  });
  src.scale.setScalar(k);
  const dome=new THREE.Group(); dome.name='skydome'; dome.add(src);
  return dome;
}

function swapSky(dome){
  if(sky)scene.remove(sky);
  sky=dome; sky.rotation.y=Math.random()*Math.PI*2;
  scene.add(sky);
}

function applySky(idx){
  skyIndex=((idx%SKIES.length)+SKIES.length)%SKIES.length;
  const def=SKIES[skyIndex];
  try{ localStorage.setItem('stellar-sky',def.id); }catch(e){}
  const btn=document.getElementById('skybtn'); if(btn&&!skyLoading)btn.textContent=def.label;
  if(!def.file){ swapSky(makeClassicSky()); return; }
  if(skyCache[def.id]){ swapSky(skyCache[def.id]); return; }
  if(skyLoading)return;                              // one dome download at a time
  skyLoading=true; if(btn)btn.textContent='…';
  toast('LOADING '+def.name+' DOME…');
  new GLTFLoader().load(def.file,
    (gltf)=>{
      const dome=prepareDome(gltf); skyCache[def.id]=dome; skyLoading=false;
      if(SKIES[skyIndex].id===def.id){ swapSky(dome); if(btn)btn.textContent=def.label; toast(def.name+' ✔'); Sound.click(); }
    },
    (xhr)=>{ if(xhr.total&&btn)btn.textContent=Math.min(99,Math.round(xhr.loaded/xhr.total*100))+'%'; },
    (err)=>{ console.warn('sky load failed',err); skyLoading=false; if(btn)btn.textContent=def.label;
      if(SKIES[skyIndex].id===def.id)swapSky(makeClassicSky()); });
}

// ============================================================
//  MATERIAL HELPERS
// ============================================================
const metal=(color,rough=0.4,met=0.92)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:met,map:stationTex||null});
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
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
  renderer.outputColorSpace=THREE.SRGBColorSpace; app.appendChild(renderer.domElement);

  scene=new THREE.Scene(); scene.background=new THREE.Color(0x02030a); scene.fog=new THREE.FogExp2(0x02030a,0.0016);

  sky=makeClassicSky(); scene.add(sky);                       // instant fallback dome, upgraded to GLB nebula below
  const pmrem=new THREE.PMREMGenerator(renderer);
  // CC0 HDRI (Poly Haven "dikhololo_night") → realistic image-based lighting + metal reflections
  new RGBELoader().load('./assets/hdri.hdr', (hdr)=>{ scene.environment=pmrem.fromEquirectangular(hdr).texture; hdr.dispose(); pmrem.dispose(); },
    undefined, ()=>{ scene.environment=pmrem.fromEquirectangular(nebulaTex).texture; });

  scene.add(makeStarfield(3400,600));
  planet=makePlanet(); scene.add(planet); moon=makeMoon(); scene.add(moon);
  for(let i=0;i<24;i++){const a=makeAsteroid();asteroids.push(a);scene.add(a);}

  scene.add(new THREE.HemisphereLight(0x335577,0x05070d,0.4));
  const star=new THREE.DirectionalLight(0xbfe6ff,2.6); star.position.set(60,90,40);
  star.castShadow=true; star.shadow.mapSize.set(2048,2048);
  const sc=star.shadow.camera; sc.left=-PLANE_R;sc.right=PLANE_R;sc.top=PLANE_R;sc.bottom=-PLANE_R;sc.near=1;sc.far=260; star.shadow.bias=-0.0004;
  scene.add(star);
  starFlare=radialSprite('rgba(180,225,255,1)'); starFlare.scale.setScalar(110); starFlare.material.fog=false;
  starFlare.position.copy(star.position).multiplyScalar(6); scene.add(starFlare);

  scene.add(makePlatform());
  highlight=makeHighlight(); highlight.visible=false; scene.add(highlight);
  selRing=new THREE.Mesh(new THREE.TorusGeometry(CELL*0.62,0.07,12,48),new THREE.MeshBasicMaterial({color:0x39e6ff}));
  selRing.rotation.x=Math.PI/2; selRing.visible=false; scene.add(selRing);

  initCam=new THREE.Vector3(0, PLANE_R*1.25, PLANE_R*2.0);
  camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,0.1,4000); camera.position.copy(initCam);
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,2,0); controls.enableDamping=true; controls.dampingFactor=0.07;
  controls.minDistance=18; controls.maxDistance=180; controls.maxPolarAngle=Math.PI*0.49; controls.minPolarAngle=Math.PI*0.08;

  composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.7,0.6,0.8));
  composer.addPass(new OutputPass());

  setupInput(); buildDock(); wireControls();
  preplaceCommand(); updateHUD();
  applySky(skyIndex);                                          // load saved / default GLB nebula dome
  setInterval(tickIncome,1000);
  addEventListener('resize',onResize);
}

// ---- world objects ----
function makeStarfield(count,radius){ const g=new THREE.BufferGeometry(); const pos=new Float32Array(count*3),col=new Float32Array(count*3),c=new THREE.Color();
  for(let i=0;i<count;i++){ const r=radius*(0.5+Math.random()*0.5),th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=Math.abs(r*Math.cos(ph))*0.7+10; pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    c.setHSL(0.55+Math.random()*0.12,0.4,0.7+Math.random()*0.3); col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b; }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return new THREE.Points(g,new THREE.PointsMaterial({size:1.3,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:0.9,depthWrite:false})); }

function makePlanet(){ const grp=new THREE.Group();
  const p=new THREE.Mesh(new THREE.SphereGeometry(220,96,96),new THREE.MeshStandardMaterial({map:planetTex,roughness:0.95,metalness:0.05,fog:false}));
  p.position.set(-360,-210,-580); grp.add(p);
  const atmo=new THREE.Mesh(new THREE.SphereGeometry(232,96,96),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,fog:false,
    uniforms:{c:{value:new THREE.Color(0x39a0ff)}},
    vertexShader:`varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vN;uniform vec3 c;void main(){float i=pow(1.0-abs(vN.z),3.0);gl_FragColor=vec4(c,i*0.6);}`}));
  atmo.position.copy(p.position); grp.add(atmo); return grp; }

function makeMoon(){ const m=new THREE.Mesh(new THREE.SphereGeometry(26,32,32),new THREE.MeshStandardMaterial({color:0x8a93a3,roughness:1,metalness:0.05,flatShading:true}));
  m.position.set(200,140,-300); m.userData={a:0,r:380,y:140,sp:0.05}; return m; }

// ---- crystal-bearing asteroid planetoids ----
const AST_ROCKS=[0x4a4237,0x3c434c,0x333a44,0x45413a,0x2e333d];
const AST_PALS=[
  {c:0xff8a3c,css:'rgba(255,138,60,1)'},   // amber ore
  {c:0x39e6ff,css:'rgba(57,230,255,1)'},   // cyan crystal
  {c:0x9b6bff,css:'rgba(155,107,255,1)'},  // void amethyst
  {c:0x7dffb0,css:'rgba(125,255,176,1)'},  // verdanium
];
function makeAsteroid(){
  const grp=new THREE.Group();
  const s=1.1+Math.random()*3.4, seed=Math.random()*1000;
  const geo=new THREE.IcosahedronGeometry(s,2), p=geo.attributes.position, v=new THREE.Vector3(), n=new THREE.Vector3();
  for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); n.copy(v).normalize();
    const d=0.78 + 0.30*(0.5+0.5*Math.sin(n.x*2.3+seed)*Math.sin(n.y*2.9+seed*1.3))
              + 0.14*(0.5+0.5*Math.sin(n.y*4.7+seed*2.1)*Math.sin(n.z*4.1+seed*0.7))
              - 0.20*Math.pow(Math.max(0,Math.sin(n.z*1.6+seed*0.3)),8);   // dig an impact crater
    v.copy(n).multiplyScalar(s*d); p.setXYZ(i,v.x,v.y,v.z); }
  geo.computeVertexNormals();
  const rock=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:AST_ROCKS[Math.floor(Math.random()*AST_ROCKS.length)],roughness:0.96,metalness:0.12,flatShading:true}));
  grp.add(rock);
  // glowing crystal veins poking out of the rock (one shared pulsing material per asteroid)
  const pal=AST_PALS[Math.floor(Math.random()*AST_PALS.length)];
  const crystalMat=new THREE.MeshStandardMaterial({color:0x0c1016,emissive:pal.c,emissiveIntensity:1.6,roughness:0.25,metalness:0.1});
  const shardGeo=new THREE.OctahedronGeometry(1,0), up=new THREE.Vector3(0,1,0), dir=new THREE.Vector3();
  const nShards=2+Math.floor(Math.random()*3);
  for(let i=0;i<nShards;i++){ dir.set(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
    const len=s*(0.45+Math.random()*0.5), w=len*(0.22+Math.random()*0.15);
    const shard=new THREE.Mesh(shardGeo,crystalMat);
    shard.position.copy(dir).multiplyScalar(s*0.78);
    shard.quaternion.setFromUnitVectors(up,dir);
    shard.rotateX((Math.random()-0.5)*0.6); shard.rotateZ((Math.random()-0.5)*0.6);
    shard.scale.set(w,len,w); grp.add(shard); }
  // soft aura + debris ring on the big ones
  const aura=radialSprite(pal.css); aura.material.opacity=0.16; aura.scale.setScalar(s*4.5); grp.add(aura);
  if(s>3.4){ const ring=new THREE.Mesh(new THREE.TorusGeometry(s*1.7,s*0.06,8,64),
    new THREE.MeshStandardMaterial({color:0x6a6f7a,roughness:0.9,metalness:0.3,flatShading:true}));
    ring.rotation.x=Math.PI/2+(Math.random()-0.5)*0.7; ring.rotation.y=(Math.random()-0.5)*0.6; grp.add(ring); }
  const a=Math.random()*Math.PI*2, r=PLANE_R+16+Math.random()*140, y=-10+Math.random()*26, incl=(Math.random()-0.5)*8;
  grp.position.set(Math.cos(a)*r,y,Math.sin(a)*r);
  grp.userData={spin:(Math.random()-0.5)*0.012,orb:{a,r,y,sp:(0.008+Math.random()*0.02)*(Math.random()<0.12?-1:1),incl,ph:Math.random()*6},crystalMat,base:1.6};
  return grp; }

function makePlatform(){ const grp=new THREE.Group();
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(PLANE_R,PLANE_R*0.95,1.4,140),metal(0x11161f,0.55,0.85)); disc.position.y=-0.7; disc.receiveShadow=true; grp.add(disc);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(PLANE_R*0.98,PLANE_R*0.98,0.06,140),new THREE.MeshStandardMaterial({map:stationTex,roughness:0.6,metalness:0.7})); top.position.y=0; top.receiveShadow=true; grp.add(top);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(PLANE_R,0.24,16,160),glow(0x39e6ff,2.8)); rim.rotation.x=Math.PI/2; rim.position.y=0.06; grp.add(rim);
  for(let i=0;i<12;i++){ const a=(i/12)*Math.PI*2; const strut=new THREE.Mesh(new THREE.CylinderGeometry(0.7,1.1,9,12),metal(0x0c0f15,0.6,0.9)); strut.position.set(Math.cos(a)*PLANE_R*0.7,-5.5,Math.sin(a)*PLANE_R*0.7); strut.rotation.z=Math.cos(a)*0.1; strut.rotation.x=-Math.sin(a)*0.1; grp.add(strut); }
  const grid=new THREE.Mesh(new THREE.PlaneGeometry(PLANE_R*2,PLANE_R*2),new THREE.MeshBasicMaterial({map:makeGridTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); grid.rotation.x=-Math.PI/2; grid.position.y=0.05; grp.add(grid); return grp; }

function makeGridTexture(){ const size=1024,cv=document.createElement('canvas'); cv.width=cv.height=size; const ctx=cv.getContext('2d'); const half=(GRID/2)*CELL,toPx=w=>((w+half)/(2*half))*size;
  ctx.clearRect(0,0,size,size); ctx.strokeStyle='rgba(57,230,255,0.5)'; ctx.lineWidth=2; ctx.shadowColor='rgba(57,230,255,0.9)'; ctx.shadowBlur=6;
  for(let k=0;k<=GRID;k++){ const w=-half+k*CELL,p=toPx(w); ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,size);ctx.stroke(); ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(size,p);ctx.stroke(); }
  ctx.beginPath();ctx.arc(size/2,size/2,toPx(half)-toPx(0),0,Math.PI*2); ctx.strokeStyle='rgba(57,230,255,0.9)';ctx.lineWidth=4;ctx.stroke();
  const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; return t; }

function makeHighlight(){ const m=new THREE.Mesh(new THREE.PlaneGeometry(CELL*0.92,CELL*0.92),new THREE.MeshBasicMaterial({color:0x39e6ff,transparent:true,opacity:0.3,blending:THREE.AdditiveBlending,depthWrite:false})); m.rotation.x=-Math.PI/2; m.position.y=0.08; return m; }

// ============================================================
//  BUILDING FACTORIES
// ============================================================
function part(geo,mat,x=0,y=0,z=0,shadow=true){ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); if(shadow){m.castShadow=true;m.receiveShadow=true;} return m; }
function greeble(parent,mat,n,rMax,yMin,yMax){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,r=Math.random()*rMax; parent.add(part(new THREE.BoxGeometry(0.12,0.12+Math.random()*0.3,0.12),mat,Math.cos(a)*r,yMin+Math.random()*(yMax-yMin),Math.sin(a)*r)); } }

function createFighter(){ const g=new THREE.Group(); const body=part(new THREE.ConeGeometry(0.4,1.2,8),new THREE.MeshStandardMaterial({color:0x123040,metalness:0.7,roughness:0.3,emissive:0x06202a}),0,0,0); body.rotation.x=Math.PI/2; g.add(body);
  g.add(part(new THREE.BoxGeometry(1.1,0.1,0.4),metal(0x223344),0,0,0)); g.add(part(new THREE.SphereGeometry(0.18,10,8),glow(0x39e6ff,2.5),0,0,0.4,false)); return g; }

function createBuilding(type){
  const g=new THREE.Group(); g.userData.type=type; g.userData.update=null; const trim=glow(0x39e6ff);

  if(type==='extractor'){ g.add(part(new THREE.CylinderGeometry(1.1,1.4,0.7,24),metal(0x1b2230),0,0.35,0)); g.add(part(new THREE.CylinderGeometry(0.7,1.1,1.4,24),metal(0x2a3340),0,1.4,0)); greeble(g,metal(0x39424f),6,1.0,0.7,2.0);
    const bit=new THREE.Group(); bit.add(part(new THREE.ConeGeometry(0.5,1.0,16),metal(0x9aa6b5,0.3,1),0,0.5,0)); bit.add(part(new THREE.CylinderGeometry(0.12,0.12,0.8,8),glow(0x39e6ff),0,1.0,0,false)); bit.position.y=2.1; g.add(bit); g.add(part(new THREE.TorusGeometry(0.95,0.07,8,24),trim,0,2.1,0,false)); g.userData.update=t=>{bit.rotation.y=t*3;}; }
  else if(type==='reactor'){ g.add(part(new THREE.CylinderGeometry(1.2,1.5,0.8,24),metal(0x1b2230),0,0.4,0)); const core=part(new THREE.SphereGeometry(0.9,32,24),glow(0xff8a3c,3.4),0,1.5,0,false); g.add(core); const cage=new THREE.Group(); const t1=part(new THREE.TorusGeometry(1.05,0.08,8,24),metal(0x4a5566,0.3,1),0,1.5,0,false); const t2=part(new THREE.TorusGeometry(1.05,0.08,8,24),metal(0x4a5566,0.3,1),0,1.5,0,false); t2.rotation.x=Math.PI/2; cage.add(t1,t2); g.add(cage); g.userData.update=t=>{core.material.emissiveIntensity=2.8+Math.sin(t*4)*1.4;cage.rotation.y=t*0.6;}; }
  else if(type==='solar'){ g.add(part(new THREE.BoxGeometry(1.4,0.4,1.4),metal(0x1b2230),0,0.2,0)); const pm=new THREE.MeshStandardMaterial({color:0x0a2a3a,metalness:0.4,roughness:0.2,emissive:0x0a4a66,emissiveIntensity:0.6,map:stationTex}); const p1=part(new THREE.BoxGeometry(2.4,0.08,1.2),pm,0,1.0,0,false); p1.rotation.x=-0.5; g.add(p1); const p2=part(new THREE.BoxGeometry(2.4,0.08,1.2),pm,0,1.0,0,false); p2.rotation.x=0.5; g.add(p2); greeble(g,metal(0x39424f),4,1.0,0.2,0.6); g.userData.update=t=>{pm.emissiveIntensity=0.5+Math.sin(t*2)*0.2;}; }
  else if(type==='drill'){ g.add(part(new THREE.CylinderGeometry(1.1,1.4,0.7,24),metal(0x1b2230),0,0.35,0)); g.add(part(new THREE.CylinderGeometry(0.7,1.1,1.2,24),metal(0x2a3340),0,1.3,0)); const bit=new THREE.Group(); bit.add(part(new THREE.ConeGeometry(0.45,1.0,16),metal(0xbff6ff,0.3,1),0,0.5,0)); bit.add(part(new THREE.CylinderGeometry(0.1,0.1,0.8,8),glow(0x39e6ff),0,1.0,0,false)); bit.position.y=2.0; g.add(bit); g.userData.update=t=>{bit.rotation.y=t*3.5;}; }
  else if(type==='storage'){ g.add(part(new THREE.CylinderGeometry(1.4,1.6,1.2,28),metal(0x222c3a),0,0.6,0)); g.add(part(new THREE.TorusGeometry(1.45,0.12,10,32),trim,0,0.6,0,false)); g.add(part(new THREE.TorusGeometry(1.45,0.12,10,32),trim,0,1.2,0,false)); const core=part(new THREE.SphereGeometry(0.45,20,16),glow(0x7dffb0,2.4),0,1.5,0,false); g.add(core); greeble(g,metal(0x39424f),8,1.3,0.3,1.1); g.userData.update=t=>{core.material.emissiveIntensity=1.8+Math.sin(t*3)*0.8;}; }
  else if(type==='wall'){ g.add(part(new THREE.BoxGeometry(2.0,1.6,2.0),metal(0x2a323f),0,0.8,0)); g.add(part(new THREE.BoxGeometry(2.1,0.2,2.1),metal(0x39424f),0,1.6,0)); g.add(part(new THREE.TorusGeometry(0.7,0.05,6,16).rotateX(Math.PI/2),trim,0,1.6,0,false)); greeble(g,metal(0x39424f),5,0.8,0.3,1.4); }
  else if(type==='turret'){ g.add(part(new THREE.CylinderGeometry(1.0,1.3,0.8,20),metal(0x1b2230),0,0.4,0)); const head=new THREE.Group(); head.add(part(new THREE.SphereGeometry(0.75,24,16,0,Math.PI*2,0,Math.PI/2),metal(0x2a3340),0,0,0)); const barrel=new THREE.Group(); barrel.add(part(new THREE.BoxGeometry(0.24,0.24,1.5),metal(0x5a6675,0.3,1),0,0.15,0.75)); barrel.add(part(new THREE.CylinderGeometry(0.1,0.1,0.3,12).rotateX(Math.PI/2),glow(0xff3b5c),0,0.15,1.5,false)); barrel.position.y=0.2; head.add(barrel); head.position.y=0.8; g.add(head); greeble(g,metal(0x39424f),4,1.0,0.4,0.9); g.userData.turret={head,barrel,cd:Math.random()*0.4,range:18,dmg:38,kind:'turret'}; g.userData.update=t=>{barrel.rotation.x=Math.sin(t*1.3)*0.12;}; }
  else if(type==='pulse'){ g.add(part(new THREE.CylinderGeometry(0.8,1.1,1.0,18),metal(0x1b2230),0,0.5,0)); const mast=part(new THREE.CylinderGeometry(0.18,0.18,1.2,10),metal(0x4a5566),0,1.5,0,false); g.add(mast); const head=new THREE.Group(); const dish=part(new THREE.TorusGeometry(0.7,0.08,10,28),glow(0x39e6ff,2.2),0,0,0,false); dish.rotation.x=Math.PI/2; head.add(dish); const emitter=part(new THREE.CylinderGeometry(0.12,0.12,0.6,8).rotateX(Math.PI/2),glow(0x39e6ff),0,0,0.5,false); head.add(emitter); head.position.y=2.1; g.add(head); greeble(g,metal(0x39424f),4,0.9,0.5,1.0); g.userData.turret={head,barrel:emitter,cd:Math.random()*0.2,range:22,dmg:16,kind:'pulse'}; }
  else if(type==='missile'){ g.add(part(new THREE.CylinderGeometry(1.1,1.4,0.9,22),metal(0x1b2230),0,0.45,0)); const head=new THREE.Group(); head.add(part(new THREE.SphereGeometry(0.8,24,16,0,Math.PI*2,0,Math.PI/2),metal(0x2a3340),0,0,0)); for(let i=0;i<3;i++){ const a=(i/3)*Math.PI*2; const tube=part(new THREE.CylinderGeometry(0.18,0.18,1.2,10),metal(0x5a6675,0.3,1),Math.cos(a)*0.4,0.5,Math.sin(a)*0.4); tube.rotation.z=Math.cos(a)*0.3; tube.rotation.x=-Math.sin(a)*0.3; head.add(tube); head.add(part(new THREE.SphereGeometry(0.16,10,8),glow(0xff8a3c,2),Math.cos(a)*0.4,1.1,Math.sin(a)*0.4,false)); } const muzzle=part(new THREE.CylinderGeometry(0.14,0.14,0.4,8).rotateX(Math.PI/2),glow(0xff8a3c),0,0,0.6,false); head.add(muzzle); head.position.y=0.9; g.add(head); greeble(g,metal(0x39424f),5,1.1,0.4,1.0); g.userData.turret={head,barrel:muzzle,cd:Math.random()*1.0,range:26,dmg:95,kind:'missile'}; }
  else if(type==='cannon'){ g.add(part(new THREE.CylinderGeometry(1.1,1.4,0.9,20),metal(0x1b2230),0,0.45,0)); const head=new THREE.Group(); head.add(part(new THREE.SphereGeometry(0.8,24,16,0,Math.PI*2,0,Math.PI/2),metal(0x2a3340),0,0,0)); const barrel=new THREE.Group(); barrel.add(part(new THREE.CylinderGeometry(0.28,0.32,1.8,12).rotateX(Math.PI/2),metal(0x5a6675,0.3,1),0,0.2,0.9)); barrel.add(part(new THREE.CylinderGeometry(0.14,0.14,0.4,10).rotateX(Math.PI/2),glow(0xff8a3c),0,0.2,1.9,false)); barrel.position.y=0.2; head.add(barrel); head.position.y=0.9; g.add(head); greeble(g,metal(0x39424f),4,1.0,0.45,0.9); g.userData.turret={head,barrel,cd:Math.random()*0.8,range:16,dmg:70,kind:'turret'}; g.userData.update=t=>{barrel.rotation.x=Math.sin(t*1.0)*0.1;}; }
  else if(type==='tesla'){ g.add(part(new THREE.CylinderGeometry(0.8,1.1,1.0,16),metal(0x1b2230),0,0.5,0)); const coil=part(new THREE.CylinderGeometry(0.3,0.5,1.6,12),metal(0x4a5566),0,1.5,0,false); g.add(coil); const orb=part(new THREE.SphereGeometry(0.35,16,12),glow(0x9b6bff,3),0,2.4,0,false); g.add(orb); greeble(g,metal(0x39424f),4,0.9,0.5,1.0); g.userData.turret={head:coil,barrel:orb,cd:Math.random()*0.2,range:20,dmg:22,kind:'pulse'}; g.userData.update=t=>{orb.material.emissiveIntensity=2.5+Math.sin(t*8)*1.5;}; }
  else if(type==='sniper'){ g.add(part(new THREE.CylinderGeometry(1.0,1.3,0.9,20),metal(0x1b2230),0,0.45,0)); const head=new THREE.Group(); head.add(part(new THREE.SphereGeometry(0.7,24,16,0,Math.PI*2,0,Math.PI/2),metal(0x2a3340),0,0,0)); const barrel=new THREE.Group(); barrel.add(part(new THREE.CylinderGeometry(0.12,0.16,2.6,10).rotateX(Math.PI/2),metal(0x8895a5,0.2,1),0,0.15,1.2)); barrel.add(part(new THREE.CylinderGeometry(0.08,0.08,0.5,8).rotateX(Math.PI/2),glow(0x39e6ff),0,0.15,2.5,false)); barrel.position.y=0.2; head.add(barrel); head.position.y=0.9; g.add(head); greeble(g,metal(0x39424f),4,0.9,0.45,0.9); g.userData.turret={head,barrel,cd:Math.random()*2,range:34,dmg:140,kind:'missile'}; g.userData.update=t=>{barrel.rotation.x=Math.sin(t*0.6)*0.05;}; }
  else if(type==='shield'){ g.add(part(new THREE.CylinderGeometry(0.8,1.0,0.6,20),metal(0x1b2230),0,0.3,0)); const ring=new THREE.Group(); ring.add(part(new THREE.TorusGeometry(1.0,0.1,12,32),glow(0x39e6ff,2.4),0,1.3,0,false)); ring.add(part(new THREE.TorusGeometry(0.62,0.05,8,24),glow(0x39e6ff,1.8),0,1.3,0,false)); g.add(ring); const dome=part(new THREE.SphereGeometry(1.6,24,16,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x39e6ff,transparent:true,opacity:0.12,emissive:0x39e6ff,emissiveIntensity:0.6,side:THREE.DoubleSide,depthWrite:false}),0,0.6,0,false); g.add(dome); g.userData.shield={ring,dome,cd:0,range:11,dmg:22}; g.userData.update=t=>{ring.rotation.y=t*1.4;ring.rotation.z=t*0.7;dome.material.opacity=0.08+Math.abs(Math.sin(t*1.5))*0.1;}; }
  else if(type==='barracks'){ g.add(part(new THREE.BoxGeometry(2.2,1.2,2.2),metal(0x202a38),0,0.6,0)); g.add(part(new THREE.BoxGeometry(2.3,0.2,2.3),metal(0x39424f),0,1.2,0)); const pad=part(new THREE.TorusGeometry(1.0,0.08,10,28),glow(0x7dffb0,2),0,1.32,0,false); g.add(pad); const ship=createFighter(); ship.scale.setScalar(0.8); ship.position.y=1.4; g.add(ship); greeble(g,metal(0x39424f),6,1.0,0.6,1.1); g.userData.update=t=>{pad.material.emissiveIntensity=1.6+Math.sin(t*4)*0.8;}; }
  else if(type==='starport'){ g.add(part(new THREE.CylinderGeometry(1.6,1.9,0.8,28),metal(0x202a38),0,0.4,0)); const pad=part(new THREE.TorusGeometry(1.3,0.1,10,32),glow(0x7dffb0,2),0,0.82,0,false); g.add(pad); const ship=createFighter(); ship.scale.setScalar(1.1); ship.position.y=1.2; g.add(ship); greeble(g,metal(0x39424f),8,1.4,0.4,1.0); g.userData.update=t=>{pad.material.emissiveIntensity=1.6+Math.sin(t*3)*0.8;}; }
  else if(type==='habitat'){ g.add(part(new THREE.CylinderGeometry(1.1,1.3,0.5,24),metal(0x1b2230),0,0.25,0)); const dome=part(new THREE.SphereGeometry(1.05,32,20,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x223044,metalness:0.6,roughness:0.3,map:stationTex,emissive:0x113344,emissiveIntensity:0.4}),0,0.5,0); g.add(dome); for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2; g.add(part(new THREE.BoxGeometry(0.16,0.45,0.16),glow(0x39e6ff,1.6),Math.cos(a)*0.75,1.0,Math.sin(a)*0.75,false));} g.add(part(new THREE.CylinderGeometry(0.04,0.04,1.0,6),metal(0x8895a5,0.3,1),0,1.8,0,false)); g.add(part(new THREE.SphereGeometry(0.11,12,8),glow(0xff3b5c,2),0,2.3,0,false)); }
  else if(type==='command'){ g.add(part(new THREE.CylinderGeometry(1.7,2.0,0.8,28),metal(0x232c3c),0,0.4,0)); const dome=part(new THREE.SphereGeometry(1.5,40,24,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x2c3850,metalness:0.7,roughness:0.25,map:stationTex}),0,0.8,0); g.add(dome); const ring=new THREE.Group(); ring.add(part(new THREE.TorusGeometry(1.8,0.11,12,40),glow(0x39e6ff,2.6),0,1.0,0,false)); ring.add(part(new THREE.TorusGeometry(1.35,0.06,8,32),glow(0x39e6ff,1.8),0,1.1,0,false)); g.add(ring); greeble(g,metal(0x39424f),10,1.5,0.8,1.6); for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2; g.add(part(new THREE.BoxGeometry(0.16,0.5,0.16),glow(0x39e6ff,1.6),Math.cos(a)*1.15,1.15,Math.sin(a)*1.15,false));} g.add(part(new THREE.CylinderGeometry(0.05,0.05,1.8,8),metal(0x8895a5,0.3,1),0,2.9,0,false)); g.add(part(new THREE.SphereGeometry(0.17,16,10),glow(0xff3b5c,2.4),0,3.9,0,false)); g.userData.update=t=>{ring.rotation.y=t*0.5;}; }
  return g;
}

// ============================================================
//  PLACEMENT
// ============================================================
const cellToWorld=(i,j)=>new THREE.Vector3((i-HALF)*CELL,0,(j-HALF)*CELL);
const worldToCell=(x,z)=>({i:Math.round(x/CELL+HALF),j:Math.round(z/CELL+HALF)});
const inBounds=(i,j)=>i>=0&&j>=0&&i<GRID&&j<GRID;
const key=(i,j)=>`${i},${j}`;

function registerBuilding(b,i,j,def,instant=false){ b.userData.level=1; b.userData.maxHp=def.hp; b.userData.hp=def.hp; b.userData.def=def;
  scene.add(b); buildings.push(b); interactives.push(b); occupied.add(key(i,j));
  if(instant){ b.scale.setScalar(1); b.position.copy(cellToWorld(i,j)); }
  else { b.scale.setScalar(0.01); b.position.y=6; deploying.push({obj:b,t:0,target:cellToWorld(i,j)}); }
  spawnShockwave(cellToWorld(i,j),0x39e6ff); }

function preplaceCommand(){ const b=createBuilding('command'); commandCenter=b; registerBuilding(b,HALF,HALF,COMMAND_DEF); }

function tryPlace(i,j){ if(mode!=='base'||raidActive){toast('CANNOT BUILD NOW');return false;} const def=BUILDINGS[buildType]; if(!inBounds(i,j)||occupied.has(key(i,j)))return false;
  if(resources.energy<def.cost.energy||resources.crystal<def.cost.crystal){toast('INSUFFICIENT RESOURCES');Sound.error();return false;}
  resources.energy-=def.cost.energy; resources.crystal-=def.cost.crystal; const b=createBuilding(buildType); registerBuilding(b,i,j,def); Sound.place(); updateHUD(); return true; }

// ============================================================
//  INPUT + GHOST
// ============================================================
function setupInput(){ const el=renderer.domElement; let down=null;
  el.addEventListener('pointermove',e=>{setPointer(e);if(buildType)updateGhost();});
  el.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()};});
  el.addEventListener('pointerup',e=>{ if(!down)return; const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y),quick=performance.now()-down.t<350; down=null; if(moved>6||!quick)return; setPointer(e); if(buildType){const h=raycastCell(); if(h&&tryPlace(h.i,h.j)){} else if(h)toast('PAD OCCUPIED');} else selectAtPointer(); });
  el.addEventListener('contextmenu',e=>{e.preventDefault();cancelBuild();});
  addEventListener('keydown',e=>{if(e.key==='Escape')cancelBuild();}); }

function setPointer(e){ const r=renderer.domElement.getBoundingClientRect(); pointer.x=((e.clientX-r.left)/r.width)*2-1; pointer.y=-((e.clientY-r.top)/r.height)*2+1; }
function raycastCell(){ raycaster.setFromCamera(pointer,camera); const p=new THREE.Vector3(); if(!raycaster.ray.intersectPlane(groundPlane,p))return null; const {i,j}=worldToCell(p.x,p.z); return inBounds(i,j)?{i,j}:null; }
function updateGhost(){ if(mode!=='base'||raidActive){highlight.visible=false;if(ghost)ghost.visible=false;return;} const c=raycastCell(); if(!c){highlight.visible=false;if(ghost)ghost.visible=false;return;} const w=cellToWorld(c.i,c.j),free=!occupied.has(key(c.i,c.j)); highlight.visible=true; highlight.position.set(w.x,0.08,w.z); highlight.material.color.set(free?0x39e6ff:0xff3b5c); if(!ghost){ghost=makeGhost(buildType);scene.add(ghost);} ghost.visible=true; ghost.position.copy(w); }
function makeGhost(type){ const g=createBuilding(type); g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=0.5;o.castShadow=false;}}); return g; }
function cancelBuild(){ buildType=null; document.querySelectorAll('.card').forEach(c=>c.classList.remove('active')); highlight.visible=false; if(ghost)ghost.visible=false; }
function selectAtPointer(){ raycaster.setFromCamera(pointer,camera); const hits=raycaster.intersectObjects(interactives,true); if(!hits.length){deselect();return;} let o=hits[0].object; while(o&&!o.userData.type)o=o.parent; if(!o)return; selected=o; selRing.visible=true; selRing.position.set(o.position.x,0.1,o.position.z); showInfo(o); }
function deselect(){ selected=null; selRing.visible=false; document.getElementById('info').style.display='none'; }

document.getElementById('demolish').onclick=()=>{ if(!selected)return; if(selected.userData.type==='command'){toast('CANNOT REMOVE HQ');Sound.error();return;}
  const i=Math.round(selected.position.x/CELL+HALF),j=Math.round(selected.position.z/CELL+HALF),def=selected.userData.def;
  resources.energy+=Math.floor(def.cost.energy*0.5); resources.crystal+=Math.floor(def.cost.crystal*0.5); occupied.delete(key(i,j)); scene.remove(selected);
  interactives.splice(interactives.indexOf(selected),1); buildings.splice(buildings.indexOf(selected),1); spawnExplosion(selected.position,0x39e6ff,1.2); Sound.explode(); deselect(); updateHUD(); };

document.getElementById('upgrade').onclick=()=>{ if(!selected)return; const u=selected.userData,lvl=u.level; if(lvl>=5){toast('MAX LEVEL');return;} const cost={energy:Math.ceil(u.def.cost.energy*0.8*lvl),crystal:Math.ceil(u.def.cost.crystal*0.8*lvl)}; if(resources.energy<cost.energy||resources.crystal<cost.crystal){toast('NEED MORE RESOURCES');Sound.error();return;} resources.energy-=cost.energy; resources.crystal-=cost.crystal; u.level++; u.maxHp=Math.round(u.maxHp*1.3); u.hp=u.maxHp; selected.scale.multiplyScalar(1.12); spawnShockwave(selected.position,0x7dffb0); Sound.upgrade(); showInfo(selected); updateHUD(); };

document.getElementById('train').onclick=trainFighter;

function showInfo(o){ const u=o.userData,info=document.getElementById('info'); info.style.display='block';
  document.getElementById('info-name').textContent=u.def.name; document.getElementById('info-lvl').textContent=u.level+(u.level>=5?' (MAX)':''); document.getElementById('info-hp').textContent=Math.ceil(u.hp)+' / '+u.maxHp;
  let out=u.def.out; if(u.type==='extractor'||u.type==='drill')out=`+${2*u.level} ◆/s`; else if(u.type==='reactor')out=`+${3*u.level} ⚡/s`; else if(u.type==='solar')out=`+${2*u.level} ⚡/s`; else if(u.type==='storage')out=`+${1500*u.level} cap`;
  document.getElementById('info-out').textContent=out; document.getElementById('info-hpbar').style.width=(100*u.hp/u.maxHp)+'%';
  const up=document.getElementById('upgrade'); if(u.level>=5){up.disabled=true;up.textContent='MAX LEVEL';} else {const c={energy:Math.ceil(u.def.cost.energy*0.8*u.level),crystal:Math.ceil(u.def.cost.crystal*0.8*u.level)}; up.disabled=false; up.textContent=`UPGRADE ${c.energy}⚡ ${c.crystal}◆`;}
  const tr=document.getElementById('train'); if(u.def.trains){tr.style.display='block';tr.textContent=`TRAIN INTERCEPTOR 60⚡ 30◆ (${fighters.length}/${fleetCap()})`;} else tr.style.display='none'; }

// ============================================================
//  HUD — categorized BUILD tray
// ============================================================
function buildDock(){ const tabs=document.getElementById('tabs'), cards=document.getElementById('cards');
  CATS.forEach(([id,label],i)=>{ const b=document.createElement('button'); b.className='tab'+(i===0?' active':''); b.textContent=label; b.onclick=()=>{ document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); b.classList.add('active'); renderCards(id); }; tabs.appendChild(b); });
  renderCards('all');
  document.getElementById('build-toggle').onclick=()=>{ const p=document.getElementById('build-panel'); const open=p.style.display==='flex'; p.style.display=open?'none':'flex'; document.getElementById('build-toggle').classList.toggle('active',!open); if(open)cancelBuild(); }; }
function renderCards(cat){ const cards=document.getElementById('cards'); cards.innerHTML='';
  for(const [type,def] of Object.entries(BUILDINGS)){ if(cat!=='all'&&def.cat!==cat)continue; const card=document.createElement('div'); card.className='card'; card.dataset.type=type; card.innerHTML=`<div class="em">${def.em}</div><div class="nm">${def.name}</div><div class="cost"><b>${def.cost.energy}⚡</b> ${def.cost.crystal}◆</div>`; card.onclick=()=>selectType(type,card); cards.appendChild(card); } }
function selectType(type,card){ Sound.click(); if(buildType===type){cancelBuild();return;} deselect(); buildType=type; document.querySelectorAll('.card').forEach(c=>c.classList.remove('active')); if(card)card.classList.add('active'); if(ghost){scene.remove(ghost);ghost=null;} ghost=makeGhost(type); scene.add(ghost); }

function wireControls(){ document.getElementById('raid').onclick=startRaid; document.getElementById('attack').onclick=startAttack; document.getElementById('return').onclick=()=>{ if(mode==='attack')endAttack(); };
  const set=document.getElementById('settings'); document.getElementById('settings-btn').onclick=()=>{ set.style.display=(set.style.display==='block')?'none':'block'; }; document.getElementById('close-set').onclick=()=>{ set.style.display='none'; };
  document.getElementById('snd').onclick=()=>{ Sound.toggleMute(); syncSnd(); };
  document.getElementById('vol').oninput=(e)=>Sound.setVolume(e.target.value/100);
  document.getElementById('skybtn').onclick=()=>{ if(skyLoading){toast('DOME STILL LOADING…');return;} Sound.click(); applySky(skyIndex+1); };
  document.getElementById('save').onclick=saveBase; document.getElementById('load').onclick=loadBase; document.getElementById('reset').onclick=resetBase; document.getElementById('recenter').onclick=recenterView;
  document.getElementById('help-x').onclick=()=>document.getElementById('help').style.display='none'; }
function syncSnd(){ document.getElementById('snd').textContent=Sound.isMuted()?'OFF':'ON'; }
function recenterView(){ if(!initCam)return; camera.position.copy(initCam); controls.target.set(0,2,0); controls.update(); }

function capOf(){ let add=0; for(const b of buildings)if(b.userData.type==='storage')add+=1500*b.userData.level; return 2000+add; }
function fleetCap(){ let n=0; for(const b of buildings)if(b.userData.def&&b.userData.def.trains)n++; return 12+6*n; }
function updateHUD(){ const cap=capOf(); resources.energy=Math.min(resources.energy,cap); resources.crystal=Math.min(resources.crystal,cap);
  document.getElementById('energy').textContent=Math.floor(resources.energy);
  document.getElementById('crystal').textContent=Math.floor(resources.crystal);
  document.getElementById('efill').style.height=(100*resources.energy/cap)+'%';
  document.getElementById('cfill').style.height=(100*resources.crystal/cap)+'%';
  document.getElementById('cell-energy').classList.toggle('full',resources.energy>=cap*0.98);
  document.getElementById('cell-crystal').classList.toggle('full',resources.crystal>=cap*0.98);
  document.getElementById('cell-energy').title=`Energy ${Math.floor(resources.energy)} / ${cap}`;
  document.getElementById('cell-crystal').title=`Crystal ${Math.floor(resources.crystal)} / ${cap}`;
  const ext=buildings.filter(b=>b.userData.type==='extractor'||b.userData.type==='drill').reduce((s,b)=>s+b.userData.level,0);
  const rct=buildings.filter(b=>b.userData.type==='reactor'||b.userData.type==='solar').reduce((s,b)=>s+b.userData.level,0);
  document.getElementById('crate').textContent=ext?`+${ext*2}/s`:''; document.getElementById('erate').textContent=rct?`+${rct*3}/s`:''; if(selected)showInfo(selected); }
function tickIncome(){ let e=0,c=0; for(const b of buildings){ const t=b.userData.type; if(t==='reactor')e+=3*b.userData.level; else if(t==='solar')e+=2*b.userData.level; else if(t==='extractor')c+=2*b.userData.level; else if(t==='drill')c+=2*b.userData.level; } if(e){resources.energy+=e;pulse('energy');} if(c){resources.crystal+=c;pulse('crystal');} updateHUD(); }
function pulse(id){ const el=document.getElementById(id).closest('.rescell'); if(!el)return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
let toastT; function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),1400); }

// ============================================================
//  BARACKS / STARPORT — train friendly interceptors
// ============================================================
function trainFighter(){ if(!selected||!(selected.userData.def&&selected.userData.def.trains))return; if(fighters.length>=fleetCap()){toast('FLEET FULL');return;} const cost={energy:60,crystal:30}; if(resources.energy<cost.energy||resources.crystal<cost.crystal){toast('NEED RESOURCES');Sound.error();return;} resources.energy-=cost.energy; resources.crystal-=cost.crystal; spawnFighter(selected.position.clone()); Sound.upgrade(); updateHUD(); }
function spawnFighter(home){ const m=createFighter(); const a=Math.random()*Math.PI*2; m.position.set(home.x+Math.cos(a)*3,2.4,home.z+Math.sin(a)*3); scene.add(m); fighters.push({mesh:m,hp:90,maxHp:90,cd:0,home,phase:Math.random()*6}); }

// ============================================================
//  SAVE / LOAD / RESET
// ============================================================
function clearBase(){ for(const b of buildings)scene.remove(b); buildings.length=0; interactives.length=0; occupied.clear(); for(const f of fighters)scene.remove(f.mesh); fighters.length=0; deselect(); }
function saveBase(){ const data={res:{energy:resources.energy,crystal:resources.crystal},wave, buildings:buildings.map(b=>({type:b.userData.type,i:Math.round(b.position.x/CELL+HALF),j:Math.round(b.position.z/CELL+HALF),level:b.userData.level}))}; try{ localStorage.setItem('stellar-clash',JSON.stringify(data)); toast('BASE SAVED ✔'); Sound.click(); }catch(e){ toast('SAVE FAILED'); } }
function loadBase(){ const s=localStorage.getItem('stellar-clash'); if(!s){toast('NO SAVE FOUND');Sound.error();return;} let data; try{data=JSON.parse(s);}catch(e){toast('SAVE CORRUPT');return;} clearBase(); resources.energy=data.res.energy; resources.crystal=data.res.crystal; wave=data.wave||0; for(const b of (data.buildings||[])){ const def=BUILDINGS[b.type]||COMMAND_DEF; const bb=createBuilding(b.type); registerBuilding(bb,b.i,b.j,def,true); bb.userData.level=b.level; bb.userData.maxHp=Math.round(def.hp*Math.pow(1.3,b.level-1)); bb.userData.hp=bb.userData.maxHp; bb.scale.setScalar(Math.pow(1.12,b.level-1)); if(b.type==='command')commandCenter=bb; } updateHUD(); toast('BASE LOADED ✔'); Sound.click(); }
function resetBase(){ clearBase(); preplaceCommand(); resources.energy=1400; resources.crystal=800; wave=0; updateHUD(); toast('BASE RESET'); Sound.click(); }

// ============================================================
//  RAID / DEFENSE
// ============================================================
function startRaid(){ if(raidActive||mode==='attack')return; const defN=buildings.filter(b=>DEF_TYPES.includes(b.userData.type)).length; const barN=buildings.filter(b=>b.userData.def&&b.userData.def.trains).length; if(defN+barN===0){toast('BUILD DEFENSE FIRST!');Sound.error();return;} raidActive=true; wave++; const n=6+wave*2; for(let i=0;i<n;i++)spawnDrone(); document.getElementById('raid').disabled=true; document.getElementById('attack').style.display='none'; Sound.success(); banner(`⚠ WAVE ${wave} — ${enemies.length} HOSTILES INBOUND`,'#ff8a3c'); }
function spawnDrone(){ const g=new THREE.Group(); const body=part(new THREE.ConeGeometry(0.55,1.6,8),new THREE.MeshStandardMaterial({color:0x551015,metalness:0.6,roughness:0.4,emissive:0x220000}),0,0,0); body.rotation.x=Math.PI/2; g.add(body); g.add(part(new THREE.BoxGeometry(1.6,0.12,0.6),metal(0x331015),0,0,0)); g.add(part(new THREE.SphereGeometry(0.26,12,8),glow(0xff2b3c,3),0,0,0.55,false)); g.add(part(new THREE.SphereGeometry(0.2,10,8),glow(0xff6a00,2),0,0,-0.85,false)); const a=Math.random()*Math.PI*2,r=PLANE_R+26+Math.random()*18; g.position.set(Math.cos(a)*r,3+Math.random()*6,Math.sin(a)*r); g.userData={hp:120+wave*18,maxHp:120+wave*18,speed:4+wave*0.4,target:pickTarget(),bob:Math.random()*6}; scene.add(g); enemies.push(g); }
function pickTarget(){ const valid=buildings.filter(b=>b.userData.type!=='command'&&b.userData.hp>0); return valid.length?valid[Math.floor(Math.random()*valid.length)]:null; }

function updateRaid(dt,t){ if(!raidActive)return;
  for(let k=enemies.length-1;k>=0;k--){ const e=enemies[k],u=e.userData; if(u.hp<=0){ spawnExplosion(e.position,0xff6a00,1.3); Sound.explode(); scene.remove(e); enemies.splice(k,1); kills++; continue; } if(!u.target||u.target.userData.hp<=0)u.target=pickTarget(); if(!u.target){ e.position.x*=0.99; e.position.z*=0.99; e.rotation.y+=dt; continue; } const tp=u.target.position,dx=tp.x-e.position.x,dz=tp.z-e.position.z,dist=Math.hypot(dx,dz); if(dist>2.4){ const ang=Math.atan2(dx,dz); e.rotation.y+=angDiff(e.rotation.y,ang)*Math.min(1,dt*4); e.position.x+=Math.sin(e.rotation.y)*u.speed*dt; e.position.z+=Math.cos(e.rotation.y)*u.speed*dt; } else { u.target.userData.hp-=30*dt; if(Math.random()<dt*8){spawnExplosion(tmpV.copy(u.target.position).setY(1),0xff8a3c,0.5);Sound.hit();} if(u.target.userData.hp<=0)destroyBuilding(u.target); } e.position.y=(3+Math.sin(t*2+u.bob))*0.4+2; }
  for(const b of buildings){ const tu=b.userData.turret; if(!tu)continue; tu.cd-=dt; let nearest=null,nd=tu.range; for(const e of enemies){const d=e.position.distanceTo(b.position); if(d<nd){nd=d;nearest=e;}} if(nearest){ const dx=nearest.position.x-b.position.x,dz=nearest.position.z-b.position.z,ang=Math.atan2(dx,dz); tu.head.rotation.y+=angDiff(tu.head.rotation.y,ang)*Math.min(1,dt*6); if(tu.cd<=0){ tu.cd=(tu.kind==='pulse'?0.18:tu.kind==='missile'?1.6:tu.kind==='sniper'?2.2:0.42); tu.barrel.getWorldPosition(tmpV); if(tu.kind==='missile'){ spawnProjectile(tmpV,nearest,0xff8a3c,tu.dmg,34); } else { spawnLaser(tmpV,nearest.position,tu.kind==='pulse'?0x39e6ff:0xff3b5c); } Sound.shoot(); if(tu.kind!=='missile')nearest.userData.hp-=tu.dmg; } } }
  for(const b of buildings){ const sh=b.userData.shield; if(!sh)continue; sh.cd-=dt; if(sh.cd<=0){ let hit=false; for(const e of enemies)if(e.position.distanceTo(b.position)<sh.range){e.userData.hp-=sh.dmg;hit=true;} if(hit){spawnShockwave(b.position,0x39e6ff);sh.cd=1.1;} } }
  for(let k=projectiles.length-1;k>=0;k--){ const p=projectiles[k]; p.t+=dt; const tg=p.target; if(!tg||tg.userData.hp<=0||p.t>3){ spawnExplosion(p.mesh.position,0xff8a3c,0.7); scene.remove(p.mesh); p.geo.dispose(); p.mat.dispose(); projectiles.splice(k,1); continue; } const dir=tmpV2.subVectors(tg.position,p.mesh.position); const d=dir.length(); if(d<1.2){ if(tg.userData.hp>0)tg.userData.hp-=p.dmg; spawnExplosion(p.mesh.position,0xff8a3c,0.8); scene.remove(p.mesh); p.geo.dispose(); p.mat.dispose(); projectiles.splice(k,1); continue; } p.mesh.position.addScaledVector(dir.normalize(),p.speed*dt); }
  banner(`⚠ WAVE ${wave} — HOSTILES: ${enemies.length}`,'#ff8a3c'); if(enemies.length===0)endRaid(); }

function updateFighters(dt,t){ const attacking=(mode==='attack'); const pool=attacking?enemyBuildings:enemies; const speed=attacking?18:7;
  for(const f of fighters){ let tgt=null,nd=attacking?48:24; for(const e of pool){ if(e.userData.hp<=0)continue; const d=e.position.distanceTo(f.mesh.position); if(d<nd){nd=d;tgt=e;} }
    if(tgt){ const dx=tgt.position.x-f.mesh.position.x,dz=tgt.position.z-f.mesh.position.z,dist=Math.hypot(dx,dz),ang=Math.atan2(dx,dz);
      f.mesh.rotation.y+=angDiff(f.mesh.rotation.y,ang)*Math.min(1,dt*6);
      if(dist>6){ f.mesh.position.x+=Math.sin(f.mesh.rotation.y)*speed*dt; f.mesh.position.z+=Math.cos(f.mesh.rotation.y)*speed*dt; }
      f.cd-=dt; if(f.cd<=0){ f.cd=0.3; spawnLaser(f.mesh.position.clone().setY(f.mesh.position.y+0.2),tgt.position,0x39e6ff); Sound.shoot(); tgt.userData.hp-=22; if(tgt.userData.hp<=0&&attacking)destroyEnemyBuilding(tgt); } }
    else { const a=t*0.8+f.phase,hx=f.home.x+Math.cos(a)*3,hz=f.home.z+Math.sin(a)*3; f.mesh.position.x+=(hx-f.mesh.position.x)*Math.min(1,dt*2); f.mesh.position.z+=(hz-f.mesh.position.z)*Math.min(1,dt*2); f.mesh.position.y=2.4+Math.sin(a*2)*0.5; f.mesh.rotation.y+=dt*0.6; } } }

function endRaid(){ raidActive=false; const reward={energy:150+wave*40,crystal:90+wave*25}; resources.energy+=reward.energy; resources.crystal+=reward.crystal; document.getElementById('raid').disabled=false; document.getElementById('attack').style.display=''; Sound.success(); banner(`✓ DEFENSE SUCCESSFUL  +${reward.energy}⚡ +${reward.crystal}◆`,'#7dffb0'); setTimeout(()=>{const b=document.getElementById('banner'); if(b)b.style.display='none';},2600); updateHUD(); }
function destroyBuilding(b){ if(b===commandCenter)return; occupied.delete(key(Math.round(b.position.x/CELL+HALF),Math.round(b.position.z/CELL+HALF))); spawnExplosion(b.position,0xff8a3c,1.6); Sound.explode(); scene.remove(b); interactives.splice(interactives.indexOf(b),1); buildings.splice(buildings.indexOf(b),1); if(selected===b)deselect(); updateHUD(); }
function angDiff(a,b){ let d=b-a; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return d; }

// ============================================================
//  OFFENSE — attack an AI enemy outpost
// ============================================================
function generateOutpost(){
  enemyGroup=new THREE.Group(); enemyGroup.position.copy(battleCenter); scene.add(enemyGroup);
  enemyPlatform=new THREE.Mesh(new THREE.CylinderGeometry(13,12,1.2,64),metal(0x1a1320,0.5,0.8));
  enemyPlatform.position.y=-0.6; enemyPlatform.receiveShadow=true; enemyGroup.add(enemyPlatform);
  enemyTop=new THREE.Mesh(new THREE.CylinderGeometry(12.8,12.8,0.06,64),new THREE.MeshStandardMaterial({color:0x2a1a2a,roughness:0.7,metalness:0.5}));
  enemyTop.position.y=0; enemyGroup.add(enemyTop);
  const hq=createBuilding('command'); placeEnemy(hq,0,0);
  const types=['turret','missile','shield','cannon','tesla','sniper']; const n=12;
  for(let i=0;i<n;i++){ const t=types[Math.floor(Math.random()*types.length)]; const b=createBuilding(t);
    const ang=(i/n)*Math.PI*2,rad=4.5+Math.random()*6.5; placeEnemy(b,Math.cos(ang)*rad,Math.sin(ang)*rad); }
  for(let i=0;i<4;i++){ const c=createBuilding('storage'); const ang=Math.random()*Math.PI*2,rad=3.5+Math.random()*7; placeEnemy(c,Math.cos(ang)*rad,Math.sin(ang)*rad); c.userData.cache=true; }
}
function placeEnemy(b,x,z){ b.userData.def=BUILDINGS[b.userData.type]||COMMAND_DEF; b.userData.level=1; b.userData.maxHp=b.userData.def.hp; b.userData.hp=b.userData.maxHp;
  b.position.set(battleCenter.x+x,0,battleCenter.z+z); b.scale.setScalar(1); scene.add(b); enemyBuildings.push(b); }
function startAttack(){
  if(mode==='attack'||raidActive)return;
  if(fighters.length===0){toast('TRAIN SHIPS FIRST!');Sound.error();return;}
  mode='attack'; loot={energy:0,crystal:0}; battleTimer=70;
  battleCenter.set(0,0,-PLANE_R*5);
  generateOutpost();
  controls.target.copy(battleCenter); camera.position.set(battleCenter.x+34,battleCenter.y+26,battleCenter.z+44); controls.update();
  document.getElementById('raid').style.display='none'; document.getElementById('attack').style.display='none';
  document.getElementById('return').style.display=''; toast('⚔ DEPLOYING FLEET'); Sound.success();
}
function updateAttack(dt,t){
  if(mode!=='attack')return; battleTimer-=dt;
  for(const b of enemyBuildings){ const tu=b.userData.turret; if(!tu)continue; tu.cd-=dt; let nearest=null,nd=tu.range;
    for(const f of fighters){ const d=f.mesh.position.distanceTo(b.position); if(d<nd){nd=d;nearest=f;} }
    if(nearest){ const dx=nearest.mesh.position.x-b.position.x,dz=nearest.mesh.position.z-b.position.z,ang=Math.atan2(dx,dz);
      tu.head.rotation.y+=angDiff(tu.head.rotation.y,ang)*Math.min(1,dt*6);
      if(tu.cd<=0){ tu.cd=(tu.kind==='missile'?1.6:tu.kind==='sniper'?2.2:tu.kind==='pulse'?0.18:0.42); tu.barrel.getWorldPosition(tmpV); spawnLaser(tmpV,nearest.mesh.position,0xff3b5c); Sound.shoot(); nearest.hp-=tu.dmg;
        if(nearest.hp<=0){ scene.remove(nearest.mesh); const fi=fighters.indexOf(nearest); if(fi>=0)fighters.splice(fi,1); } } } }
  const alive=enemyBuildings.filter(b=>b.userData.hp>0).length;
  if(alive===0||fighters.length===0||battleTimer<=0){ endAttack(); return; }
  banner(`⚔ RAIDING OUTPOST — ENEMY: ${alive} · FLEET: ${fighters.length}`,'#ff8a3c');
}
function destroyEnemyBuilding(b){ spawnExplosion(b.position,0xff6a00,1.4); Sound.explode();
  if(b.userData.cache){ const g=Math.round(150+wave*40),c=Math.round(90+wave*25); loot.energy+=g; loot.crystal+=c; }
  if(b.userData.type==='command'){ loot.energy+=300; loot.crystal+=200; }
  const i=enemyBuildings.indexOf(b); if(i>=0)enemyBuildings.splice(i,1); scene.remove(b); }
function endAttack(){
  mode='base'; const win=enemyBuildings.length===0;
  resources.energy+=loot.energy; resources.crystal+=loot.crystal;
  if(enemyGroup){ scene.remove(enemyGroup); enemyGroup.traverse(o=>{ if(o.geometry)o.geometry.dispose(); if(o.material)o.material.dispose(); }); enemyGroup=null; }
  enemyBuildings.length=0; enemyPlatform=null; enemyTop=null;
  const hc=commandCenter?commandCenter.position:new THREE.Vector3(); fighters.forEach((f,i)=>{ f.home=new THREE.Vector3(hc.x+Math.cos(i)*4,2.4,hc.z+Math.sin(i)*4); });
  if(initCam){ camera.position.copy(initCam); controls.target.set(0,2,0); controls.update(); }
  document.getElementById('raid').style.display=''; document.getElementById('attack').style.display=''; document.getElementById('return').style.display='none';
  banner(win?`✓ OUTPOST RAIDED  +${Math.floor(loot.energy)}⚡ +${Math.floor(loot.crystal)}◆`:`⚔ RETREAT — LOOTED +${Math.floor(loot.energy)}⚡ +${Math.floor(loot.crystal)}◆`, win?'#7dffb0':'#ff8a3c');
  setTimeout(()=>{const b=document.getElementById('banner');if(b)b.style.display='none';},3000);
  loot={energy:0,crystal:0}; Sound.success();
}

// ============================================================
//  EFFECTS
// ============================================================
function spawnShockwave(pos,color){ const geo=new THREE.RingGeometry(0.3,0.5,40); const mat=new THREE.MeshBasicMaterial({color,transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}); const m=new THREE.Mesh(geo,mat); m.rotation.x=-Math.PI/2; m.position.set(pos.x,0.12,pos.z); scene.add(m); effects.push({t:0,life:0.7,update(dt){this.t+=dt;const s=1+this.t*20;m.scale.set(s,s,s);mat.opacity=Math.max(0,1-this.t/this.life);return this.t<this.life;},dispose(){scene.remove(m);geo.dispose();mat.dispose();}}); }
function spawnExplosion(pos,color,scale=1){ const n=26,g=new THREE.BufferGeometry(),p=new Float32Array(n*3),v=[]; for(let i=0;i<n;i++){p[i*3]=pos.x;p[i*3+1]=pos.y+0.5;p[i*3+2]=pos.z; v.push(new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize().multiplyScalar((2+Math.random()*4)*scale));} g.setAttribute('position',new THREE.BufferAttribute(p,3)); const m=new THREE.PointsMaterial({color,size:0.45*scale,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}); const pts=new THREE.Points(g,m); scene.add(pts); effects.push({t:0,life:0.6,update(dt){this.t+=dt;const a=g.attributes.position.array; for(let i=0;i<n;i++){a[i*3]+=v[i].x*dt;a[i*3+1]+=v[i].y*dt;a[i*3+2]+=v[i].z*dt;v[i].multiplyScalar(0.93);} g.attributes.position.needsUpdate=true; m.opacity=Math.max(0,1-this.t/this.life); m.size*=0.98; return this.t<this.life;},dispose(){scene.remove(pts);g.dispose();m.dispose();}}); }
function spawnLaser(from,to,color){ const dir=tmpV2.subVectors(to,from),len=dir.length(); const geo=new THREE.CylinderGeometry(0.06,0.06,1,6); const mat=new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}); const m=new THREE.Mesh(geo,mat); m.position.copy(from).addScaledVector(dir,0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize()); m.scale.set(1,len,1); scene.add(m); effects.push({t:0,life:0.12,update(dt){this.t+=dt;mat.opacity=Math.max(0,1-this.t/this.life);return this.t<this.life;},dispose(){scene.remove(m);geo.dispose();mat.dispose();}}); }
function spawnProjectile(from,target,color,dmg,speed){ const geo=new THREE.SphereGeometry(0.22,12,10); const mat=new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}); const m=new THREE.Mesh(geo,mat); m.position.copy(from); scene.add(m); projectiles.push({mesh:m,target,dmg,speed,t:0,geo,mat}); }
function banner(text,color){ const b=document.getElementById('banner'); b.textContent=text; b.style.color=color; b.style.borderColor=color; b.style.textShadow=`0 0 10px ${color}`; b.style.display='block'; }

// ============================================================
//  LOOP
// ============================================================
function animate(){ requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime;
  sky.rotation.y+=dt*0.004; if(planet)planet.rotation.y+=dt*0.01;
  if(moon){moon.userData.a+=moon.userData.sp*dt;moon.position.set(Math.cos(moon.userData.a)*moon.userData.r,moon.userData.y,Math.sin(moon.userData.a)*moon.userData.r);}
  if(starFlare)starFlare.material.rotation+=dt*0.1;
  for(const a of asteroids){ const u=a.userData; u.orb.a+=u.orb.sp*dt; a.rotation.y+=u.spin; a.rotation.x+=u.spin*0.6;
    a.position.set(Math.cos(u.orb.a)*u.orb.r, u.orb.y+Math.sin(u.orb.a*1.5+u.orb.ph)*u.orb.incl, Math.sin(u.orb.a)*u.orb.r);
    if(u.crystalMat)u.crystalMat.emissiveIntensity=u.base+Math.sin(t*1.8+u.orb.ph)*0.65; }
  for(const b of buildings)if(b.userData.update)b.userData.update(t);
  for(let i=deploying.length-1;i>=0;i--){const d=deploying[i];d.t+=dt;const k=Math.min(1,d.t/0.55),e=1-Math.pow(1-k,3); d.obj.scale.setScalar(0.01+e*0.99); d.obj.position.y=(1-e)*6; if(k>=1){d.obj.scale.setScalar(1);d.obj.position.copy(d.target);deploying.splice(i,1);}}
  if(raidActive) updateRaid(dt,t); else if(mode==='attack') updateAttack(dt,t);
  updateFighters(dt,t);
  for(let i=effects.length-1;i>=0;i--){if(!effects[i].update(dt)){effects[i].dispose();effects.splice(i,1);}}
  controls.update(); composer.render(); }

function onResize(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight); }
