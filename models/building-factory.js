import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original modular sci-fi architecture. No external assets or downloads.
// Materials belong to each model. Canvas textures are shared, never disposed by
// the game's object cleanup. Static details are batched by material/shadow state.
const TAU=Math.PI*2;
export const MODEL_TYPES=['command','extractor','reactor','solar','drill','storage','wall','turret','pulse','missile','cannon','tesla','sniper','shield','barracks','starport','habitat'];
export const MODEL_NAMES={command:'Command Center',extractor:'Crystal Extractor',reactor:'Fusion Reactor',solar:'Solar Array',drill:'Deep Drill',storage:'Storage Vault',wall:'Defense Wall',turret:'Laser Turret',pulse:'Pulse Tower',missile:'Missile Battery',cannon:'Plasma Cannon',tesla:'Tesla Coil',sniper:'Railgun',shield:'Shield Projector',barracks:'Barracks',starport:'Starport',habitat:'Crew Habitat'};
const textures=new Map();
function texture(kind){
  if(textures.has(kind))return textures.get(kind);
  const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d');
  if(kind==='alloy'||kind==='roughness'){
    c.fillStyle=kind==='roughness'?'#aeb2b5':'#e0e6eb';c.fillRect(0,0,512,512);
    for(let y=0;y<512;y++){c.fillStyle=`rgba(45,67,83,${.025+(y*17%23)/460})`;c.fillRect(0,y,512,1);}
    for(let i=0;i<75;i++){c.fillStyle='rgba(45,55,65,.045)';c.fillRect((i*97)%512,(i*71)%512,16+(i%30),1);}
  }else if(kind==='solar'){
    c.fillStyle='#102136';c.fillRect(0,0,512,512);
    for(let y=0;y<8;y++)for(let x=0;x<5;x++){
      const px=x*98+11,py=y*62+10;const g=c.createLinearGradient(px,py,px+86,py+52);g.addColorStop(0,'#264d73');g.addColorStop(.5,'#183e62');g.addColorStop(1,'#306083');c.fillStyle=g;c.fillRect(px,py,86,52);
      c.strokeStyle='#698a9f';c.lineWidth=.8;for(let j=1;j<8;j++){c.beginPath();c.moveTo(px+j*10,py);c.lineTo(px+j*10,py+52);c.stroke();}
      c.strokeStyle='#c0b689';c.beginPath();c.moveTo(px,py+25);c.lineTo(px+86,py+25);c.stroke();
    }
  }else if(kind==='hazard'){
    cv.height=64;
    c.fillStyle='#dfad5e';c.fillRect(0,0,512,512);c.fillStyle='#233140';
    for(let x=-512;x<1024;x+=100){c.beginPath();c.moveTo(x,0);c.lineTo(x+50,0);c.lineTo(x-462,512);c.lineTo(x-512,512);c.fill();}
  }else if(kind==='shield'){
    c.clearRect(0,0,512,512);c.strokeStyle='rgba(115,219,249,.55)';c.lineWidth=2;
    const h=32,w=36;for(let y=-h;y<544;y+=h*1.5)for(let x=-w;x<550;x+=w*1.74){
      c.beginPath();for(let k=0;k<6;k++){const a=k*TAU/6,xx=x+(Math.round(y/(h*1.5))%2)*w*.87+Math.cos(a)*w,yy=y+Math.sin(a)*h;k?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.stroke();
    }
  }
  const t=new THREE.CanvasTexture(cv);t.colorSpace=kind==='roughness'?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=4;textures.set(kind,t);return t;
}
function labelTexture(text){
  const key='label:'+text;if(textures.has(key))return textures.get(key);
  const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');
  x.fillStyle='#162736';x.fillRect(0,0,512,128);x.strokeStyle='#839eaf';x.lineWidth=4;x.strokeRect(8,8,496,112);x.font='600 54px Arial';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#dbe8f0';x.fillText(text,256,67,450);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.set(key,t);return t;
}
function palette(type){
  const accents={reactor:0xe9a85c,drill:0xd7b470,tesla:0xb09ee8,barracks:0x8fd1b0,starport:0x8fd1b0,missile:0xd9a274,cannon:0xdfa965};
  const make=(name,color,metalness,roughness)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,map:texture('alloy'),roughnessMap:texture('roughness')});m.name=name;return m;};
  const emit=(name,color,intensity)=>{const m=new THREE.MeshStandardMaterial({color:0x12212b,emissive:color,emissiveIntensity:intensity,metalness:.2,roughness:.35});m.name=name;return m;};
  return {shell:make('Ceramic titanium armor',0xd1dce2,.28,.44),steel:make('Brushed titanium',0x788fa1,.7,.4),dark:make('Graphite composite',0x293e50,.3,.61),black:make('Carbon machinery',0x121d29,.25,.7),copper:make('Copper heat exchanger',0xb98750,.65,.38),
    accent:emit('Status light',accents[type]||0x83d7ec,1.15),cyan:emit('Coolant conduit',0x76d3eb,.7),warm:emit('Power indicator',0xe2a45c,.85),
    glass:new THREE.MeshPhysicalMaterial({name:'Blue optical glass',color:0x244760,metalness:.24,roughness:.16,clearcoat:.9,clearcoatRoughness:.1,emissive:0x244a62,emissiveIntensity:.2}),
    hazard:new THREE.MeshStandardMaterial({name:'Safety stripe',map:texture('hazard'),roughness:.72,metalness:.1}),
    panel:new THREE.MeshPhysicalMaterial({name:'Photovoltaic cells',map:texture('solar'),color:0xffffff,roughness:.3,metalness:.45,clearcoat:.55})};
}
function mesh(g,m,x=0,y=0,z=0,shadow=true){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=shadow;return o;}
function box(parent,m,w,h,d,x=0,y=0,z=0,bevel=.06){
  let geo;
  if(bevel>0){const b=Math.min(bevel,w*.2,h*.2,d*.2),s=new THREE.Shape();s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();geo=new THREE.ExtrudeGeometry(s,{depth:Math.max(.005,d-2*b),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,steps:1,curveSegments:1});geo.translate(0,0,-d/2+b);}
  else geo=new THREE.BoxGeometry(w,h,d);
  // Planar UVs per face keep panel and alloy textures correctly scaled on bevels.
  const pos=geo.attributes.position,nor=geo.attributes.normal,uv=geo.attributes.uv;
  for(let i=0;i<pos.count;i++){const nx=Math.abs(nor.getX(i)),ny=Math.abs(nor.getY(i)),nz=Math.abs(nor.getZ(i));let u,v;if(ny>=nx&&ny>=nz){u=pos.getX(i)/w+.5;v=pos.getZ(i)/d+.5;}else if(nx>=nz){u=pos.getZ(i)/d+.5;v=pos.getY(i)/h+.5;}else{u=pos.getX(i)/w+.5;v=pos.getY(i)/h+.5;}uv.setXY(i,u,v);}
  const o=mesh(geo,m,x,y,z);parent.add(o);return o;
}
function cyl(parent,m,r,h,y=0,rt=r,n=32,x=0,z=0){const o=mesh(new THREE.CylinderGeometry(rt,r,h,n),m,x,y,z);if(n===8)o.rotation.y=Math.PI/8;parent.add(o);return o;}
function ring(parent,m,r,t,y=0,axis='y',arc=TAU){const o=mesh(new THREE.TorusGeometry(r,t,8,48,arc),m,0,y,0,false);if(axis==='y')o.rotation.x=Math.PI/2;else if(axis==='x')o.rotation.y=Math.PI/2;parent.add(o);return o;}
function ball(parent,m,r,x,y,z){const o=mesh(new THREE.SphereGeometry(r,24,16),m,x,y,z,false);parent.add(o);return o;}
function rod(parent,m,a,b,r=.05){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),12),m);o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(o);return o;}
function tube(parent,m,points,r=.035,segments=48){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const o=mesh(new THREE.TubeGeometry(curve,segments,r,6,false),m);parent.add(o);return o;}
function dynamic(parent,name){const o=new THREE.Group();o.name=name;o.userData.dynamic=true;parent.add(o);return o;}
function radialBoxes(parent,m,n,r,y,w,h,d,phase=0){for(let i=0;i<n;i++){const a=i*TAU/n+phase,o=box(parent,m,w,h,d,Math.sin(a)*r,y,Math.cos(a)*r);o.rotation.y=a;}}
function vents(parent,p,x,y,z,w=.6,h=.32,rot=0){const base=box(parent,p.black,w,h,.05,x,y,z,.015);base.rotation.y=rot;for(let i=0;i<5;i++){const fin=box(parent,p.steel,w*.84,.024,.055,x,y-h*.32+i*h*.16,z+.027,.006);fin.rotation.y=rot;}}
function decal(parent,text,w,x,y,z,rot=0,top=false){const m=new THREE.MeshBasicMaterial({name:'Identification '+text,map:labelTexture(text),polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});const o=mesh(new THREE.PlaneGeometry(w,w/4),m,x,y,z,false);o.rotation.y=rot;if(top)o.rotation.x=-Math.PI/2;parent.add(o);return o;}
function fasteners(parent,p,n,r,y){for(let i=0;i<n;i++){const a=i*TAU/n;cyl(parent,p.steel,.045,.045,y,.045,6,Math.sin(a)*r,Math.cos(a)*r);}}
function foundation(g,p,type){
  const r=type==='command'?1.9:type==='starport'?1.78:type==='wall'?1.1:1.18;
  if(type==='wall'){box(g,p.dark,2.2,.16,1.85,0,.08,0);return;}
  cyl(g,p.dark,r,.16,.08,r,8);cyl(g,p.steel,r*.97,.06,.19,r*.97,8);fasteners(g,p,8,r*.83,.235);
  radialBoxes(g,p.accent,4,r*.93,.24,.28,.045,.065);
}
function bearing(g,p,r=.8,y=.5){cyl(g,p.dark,r,.5,y,r*.88,16);cyl(g,p.steel,r,.11,y+.26,r,32);ring(g,p.accent,r*.86,.022,y+.33);radialBoxes(g,p.shell,6,r*.94,y,.3,.24,.22,Math.PI/6);}
function windows(g,p,n,r,y,w=.58,h=.28){for(let i=0;i<n;i++){const a=i*TAU/n;const o=box(g,p.black,w+.1,h+.1,.09,Math.sin(a)*r,y,Math.cos(a)*r,.025);o.rotation.y=a;const v=box(g,p.glass,w,h,.095,Math.sin(a)*(r+.016),y,Math.cos(a)*(r+.016),.02);v.rotation.y=a;const light=box(g,p.cyan,w*.75,.025,.1,Math.sin(a)*(r+.025),y-h*.35,Math.cos(a)*(r+.025),.006);light.rotation.y=a;}}
function miniShip(g,p,y=1,scale=1){const ship=new THREE.Group();ship.position.y=y;ship.scale.setScalar(scale);g.add(ship);box(ship,p.shell,.45,.24,1.1,0,.12,0,.07);const canopy=ball(ship,p.glass,.23,0,.25,.13);canopy.scale.set(.85,.55,1.3);for(const sign of [-1,1]){const wing=box(ship,p.steel,.75,.07,.55,sign*.44,.07,-.12,.025);wing.rotation.y=sign*.28;const eng=cyl(ship,p.black,.11,.45,.1,.11,16,sign*.27,-.48);eng.rotation.x=Math.PI/2;ball(ship,p.accent,.075,sign*.27,.1,-.72);}return ship;}
function batchStatic(root){
  root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert();const batches=new Map(),dispose=new Set(),remove=[];
  root.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material))return;
    for(let q=o;q&&q!==root;q=q.parent)if(q.userData.dynamic)return;
    const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;
    if(!batches.has(key))batches.set(key,{mat:o.material,geos:[],cast:o.castShadow,receive:o.receiveShadow});
    const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));batches.get(key).geos.push(geo);remove.push(o);dispose.add(o.geometry);
  });
  remove.forEach(o=>o.removeFromParent());dispose.forEach(g=>g.dispose());
  for(const b of batches.values()){
    const merged=mergeGeometries(b.geos,false);b.geos.forEach(g=>g.dispose());if(!merged)throw Error('Unable to batch model geometry');
    const m=new THREE.Mesh(merged,b.mat);m.name=b.mat.name;m.castShadow=b.cast;m.receiveShadow=b.receive;root.add(m);
  }
}
export function createBuildingModel(type){
  if(!MODEL_TYPES.includes(type))throw Error('Unknown building model: '+type);
  const g=new THREE.Group();g.name=MODEL_NAMES[type];g.userData.type=type;g.userData.update=null;const p=palette(type);foundation(g,p,type);
  if(type==='command'){
    cyl(g,p.shell,1.63,.68,.6,1.45,8);cyl(g,p.dark,1.42,.44,1.12,1.42,8);windows(g,p,8,1.33,1.17,.79,.26);
    cyl(g,p.shell,1.47,.18,1.47,1.33,8);cyl(g,p.dark,1.03,.59,1.78,.84,8);windows(g,p,8,.92,1.82,.49,.27);cyl(g,p.shell,1.02,.14,2.1,.79,8);
    radialBoxes(g,p.shell,4,1.5,.59,.39,.45,.33,Math.PI/4);radialBoxes(g,p.steel,8,1.32,1.5,.24,.13,.15);
    box(g,p.black,.63,.44,.07,0,.55,1.51);box(g,p.accent,.47,.025,.08,0,.76,1.55,.005);decal(g,'HQ 01',.65,0,1.49,1.406);
    for(const s of [-1,1]){box(g,p.steel,.3,.16,.7,s*1.5,.85,0);vents(g,p,s*1.46,.7,.49,.4,.24);}
    const radar=dynamic(g,'Rotating command radar');radar.position.set(.49,2.14,-.3);cyl(radar,p.steel,.055,.5,.25,.055,12);const dish=mesh(new THREE.SphereGeometry(.37,24,12,0,TAU,0,Math.PI*.44),p.shell,0,.58,0);dish.rotation.x=.65;radar.add(dish);rod(radar,p.copper,[0,.58,0],[0,.79,.19],.022);
    rod(g,p.steel,[-.45,2.16,-.2],[-.45,3.22,-.2],.035);ball(g,p.warm,.055,-.45,3.22,-.2);
    for(let i=0;i<4;i++){const a=i*TAU/4;rod(g,p.steel,[Math.sin(a)*.85,2.11,Math.cos(a)*.85],[Math.sin(a)*.45,2.66,Math.cos(a)*.45],.035);}ring(g,p.cyan,.43,.022,2.66);
    g.userData.update=t=>{radar.rotation.y=t*.23;};
  }else if(type==='extractor'){
    bearing(g,p,.93,.5);cyl(g,p.black,.66,.24,.96,.66,24);ring(g,p.steel,.73,.07,.82);ring(g,p.steel,.73,.07,1.48);
    const rotor=dynamic(g,'Crystal suspension rotor');rotor.position.y=1.14;const shard=mesh(new THREE.OctahedronGeometry(.47,0),p.accent,0,.29,0,false);shard.scale.set(.66,1,.66);shard.userData.dynamic=true;rotor.add(shard);
    for(let i=0;i<4;i++){const a=i*TAU/4,x=Math.sin(a)*.88,z=Math.cos(a)*.88;box(g,p.shell,.24,1.18,.24,x,1.39,z);rod(g,p.copper,[x,.91,z],[x*.65,1.53,z*.65],.055);}
    ring(g,p.dark,.94,.095,2);cyl(g,p.shell,.5,.15,2.05,.5,16);ring(rotor,p.cyan,.5,.025,.33);ring(rotor,p.steel,.5,.038,-.24);
    vents(g,p,0,.55,.89,.64,.22);decal(g,'ORE 02',.59,0,.88,.74);
    g.userData.update=t=>{rotor.rotation.y=t*.5;shard.position.y=.29+Math.sin(t*1.2)*.04;};
  }else if(type==='reactor'){
    bearing(g,p,1,.49);cyl(g,p.dark,.55,1.35,1.2,.55,24);cyl(g,p.shell,.62,.23,1.98,.47,24);cyl(g,p.steel,.51,.12,2.13,.51,24);
    const core=dynamic(g,'Toroidal fusion core');core.position.y=1.28;ring(core,p.accent,.81,.075,0);
    for(let i=0;i<8;i++){const a=i*TAU/8;const coil=box(g,p.copper,.25,.65,.31,Math.sin(a)*.83,1.28,Math.cos(a)*.83,.035);coil.rotation.y=a;for(let k=0;k<3;k++){const b=box(g,p.steel,.27,.027,.33,Math.sin(a)*.83,1.1+k*.17,Math.cos(a)*.83,.008);b.rotation.y=a;}}
    for(const s of [-1,1]){box(g,p.shell,.34,.85,.45,s*.84,.75,0);tube(g,p.copper,[[s*.9,.85,0],[s*1.07,1.3,0],[s*.7,1.75,0]],.045);}
    fasteners(g,p,8,.45,2.21);decal(g,'FUSION',.6,0,.75,.9);g.userData.update=t=>{core.rotation.y=t*.15;core.scale.setScalar(1+Math.sin(t*1.1)*.025);};
  }else if(type==='solar'){
    box(g,p.dark,1.35,.33,1.15,0,.38,0);cyl(g,p.steel,.22,.6,.8,.22,24);cyl(g,p.shell,.4,.13,1.13,.4,24);
    const panels=dynamic(g,'Tracking photovoltaic wings');panels.position.y=1.21;
    for(const s of [-1,1]){
      const wing=new THREE.Group();wing.position.x=s*.78;wing.rotation.z=s*.17;panels.add(wing);
      box(wing,p.steel,1.2,.12,1.75,0,0,0,.02);
      for(const z of [-.44,.44]){box(wing,p.black,1.12,.04,.81,0,.079,z,.008);const cells=mesh(new THREE.PlaneGeometry(1.09,.78),p.panel,0,.104,z,false);cells.rotation.x=-Math.PI/2;wing.add(cells);box(wing,p.black,.96,.04,.055,0,.123,z-.4,.006);}
      rod(g,p.steel,[0,.86,0],[s*.94,1.2,0],.06);
    }
    vents(g,p,0,.42,.59,.7,.22);decal(g,'SOL 03',.53,0,.66,.44);g.userData.update=t=>{panels.rotation.y=Math.sin(t*.1)*.15;};
  }else if(type==='drill'){
    box(g,p.dark,1.7,.4,1.6,0,.42,0);radialBoxes(g,p.shell,4,.92,.52,.3,.5,.36);
    for(const s of [-1,1]){box(g,p.shell,.28,1.8,.32,s*.71,1.46,0);rod(g,p.steel,[s*.71,.59,.3],[s*.71,2.24,.3],.052);}
    box(g,p.dark,1.65,.33,.65,0,2.26,0);box(g,p.hazard,1.29,.16,.04,0,2.29,.35,.01);
    const bit=dynamic(g,'Helical drill and drive');bit.position.y=.7;cyl(bit,p.steel,.17,1.27,.55,.17,20);
    const pts=[];for(let i=0;i<=100;i++){const a=i/100*TAU*4;pts.push([Math.cos(a)*.23,i/100*1.25-.05,Math.sin(a)*.23]);}tube(bit,p.copper,pts,.044,128);cyl(bit,p.steel,.23,.21,-.14,0,24);
    cyl(g,p.shell,.32,.28,2.55,.32,24);vents(g,p,0,.44,.83,.77,.23);decal(g,'DRILL',.55,0,2.05,.35);g.userData.update=t=>{bit.rotation.y=t*1.2;};
  }else if(type==='storage'){
    cyl(g,p.dark,1.09,1.05,.83,1.09,8);cyl(g,p.shell,1.14,.17,1.42,1.04,8);cyl(g,p.shell,1.13,.15,.33,1.13,8);radialBoxes(g,p.shell,8,1.01,.88,.18,.83,.13);
    box(g,p.black,.77,.8,.1,0,.85,1.045);for(let i=0;i<5;i++)box(g,p.steel,.66,.1,.055,0,.52+i*.15,1.113,.014);
    for(const s of [-1,1])box(g,p.copper,.08,.84,.12,s*.47,.86,1.055,.015);
    cyl(g,p.steel,.62,.1,1.56,.62,16);cyl(g,p.dark,.48,.055,1.64,.48,16);ring(g,p.accent,.32,.025,1.67);fasteners(g,p,8,.85,1.53);
    decal(g,'VAULT 04',.61,0,1.36,1.059);radialBoxes(g,p.accent,4,1.06,.83,.18,.055,.07);
  }else if(type==='wall'){
    box(g,p.dark,2.05,1.2,1.58,0,.78,0,.12);box(g,p.shell,2.14,.26,1.66,0,1.39,0,.08);
    for(const s of [-1,1]){box(g,p.shell,.34,1.02,1.73,s*.85,.84,0,.06);box(g,p.steel,1.18,.76,.075,0,.84,s*.825,.065);box(g,p.cyan,1.22,.048,.08,0,1.23,s*.84,.008);box(g,p.hazard,1.1,.13,.06,0,.42,s*.83,.006);}
    for(let i=0;i<4;i++)box(g,p.black,.15,.04,1.21,-.42+i*.28,1.54,0,.006);decal(g,'BULKHEAD',.78,0,.86,.876);
  }else if(['turret','missile','cannon','sniper'].includes(type)){
    bearing(g,p,.95,.47);cyl(g,p.black,.59,.24,.92,.59,24);const head=dynamic(g,'Azimuth turret');head.position.y=1.08;
    box(head,p.dark,1.13,.56,.94,0,.23,0,.1);box(head,p.shell,1.05,.17,.93,0,.57,-.02,.06);
    for(const s of [-1,1]){const hinge=cyl(head,p.steel,.21,.11,.25,.21,20,s*.61,0);hinge.rotation.z=Math.PI/2;box(head,p.shell,.17,.4,.74,s*.62,.22,0,.035);}
    const barrel=dynamic(head,'Elevation assembly');barrel.position.y=.29;
    let muzzle;
    if(type==='turret'){
      for(const s of [-1,1]){box(barrel,p.steel,.17,.18,1.28,s*.25,0,.62,.026);box(barrel,p.shell,.24,.27,.5,s*.25,0,.34,.04);cyl(barrel,p.black,.105,.12,0,.105,20,s*.25,1.31).rotation.x=Math.PI/2;ball(barrel,p.accent,.071,s*.25,0,1.39);}
      muzzle=box(barrel,p.black,.02,.02,.02,0,0,1.41,0);
    }else if(type==='missile'){
      barrel.rotation.x=-.48;
      box(barrel,p.shell,1.14,.75,.93,0,.05,.33,.08);box(barrel,p.dark,1.02,.65,.06,0,.05,.82,.026);
      for(let row=0;row<2;row++)for(let col=0;col<3;col++){const x=(col-1)*.32,y=(row-.5)*.3+.05;const tube=cyl(barrel,p.steel,.115,.75,y,.115,20,x,.55);tube.rotation.x=Math.PI/2;const missile=cyl(barrel,p.shell,.083,.26,y,0,20,x,.99);missile.rotation.x=Math.PI/2;ball(barrel,p.warm,.047,x,y,1.08);}
      muzzle=box(barrel,p.black,.025,.025,.025,0,.05,1.1,0);
    }else if(type==='cannon'){
      const pipe=cyl(barrel,p.steel,.26,1.5,0,.3,32,0,.79);pipe.rotation.x=Math.PI/2;
      for(const z of [.2,.53,.91,1.43]){const collar=cyl(barrel,p.dark,.34,.11,0,.34,32,0,z);collar.rotation.x=Math.PI/2;}
      for(const s of [-1,1]){box(barrel,p.shell,.22,.47,.92,s*.43,0,.56,.055);tube(barrel,p.copper,[[s*.34,.19,0],[s*.48,.31,.61],[s*.28,.19,1.15]],.035);}
      muzzle=ball(barrel,p.accent,.2,0,0,1.57);muzzle.scale.z=.23;
    }else{
      for(const s of [-1,1]){box(barrel,p.steel,.18,.24,2.06,s*.24,0,1.0,.036);box(barrel,p.shell,.27,.32,.45,s*.24,0,.17,.04);for(let k=0;k<6;k++){box(barrel,p.copper,.22,.31,.07,s*.24,0,.51+k*.24,.01);if(k===0)box(barrel,p.accent,.027,.045,1.41,s*.136,.07,1.25,.004);}}
      box(barrel,p.dark,.69,.35,.44,0,0,-.21,.06);muzzle=box(barrel,p.accent,.13,.08,.05,0,0,2.08,.005);
    }
    vents(g,p,0,.48,.88,.52,.18);decal(g,type==='sniper'?'RG 07':type==='missile'?'MB 05':type==='cannon'?'PC 06':'LT 01',.48,0,.7,.86);
    muzzle.userData.dynamic=true;g.userData.turret={head,barrel:muzzle,cd:0,range:type==='sniper'?34:type==='missile'?26:type==='cannon'?16:18,dmg:type==='sniper'?140:type==='missile'?95:type==='cannon'?70:38,kind:type==='sniper'?'sniper':type==='missile'?'missile':'turret'};
    const neutral=barrel.rotation.x;g.userData.update=t=>{barrel.rotation.x=neutral+Math.sin(t*.7)*.025;};
  }else if(type==='pulse'){
    bearing(g,p,.85,.46);cyl(g,p.shell,.3,1.2,1.3,.22,16);ring(g,p.copper,.26,.05,1.68);const head=dynamic(g,'Pulse antenna azimuth');head.position.y=2;
    const points=[new THREE.Vector2(0,0),new THREE.Vector2(.2,.025),new THREE.Vector2(.4,.09),new THREE.Vector2(.65,.2),new THREE.Vector2(.83,.33)];const dish=mesh(new THREE.LatheGeometry(points,40),p.shell);dish.material=p.shell.clone();dish.material.name='Antenna reflector';dish.material.side=THREE.DoubleSide;dish.rotation.x=Math.PI/2;head.add(dish);
    const rim=ring(head,p.steel,.83,.04,0,'z');rim.position.z=.33;const feed=ball(head,p.accent,.12,0,0,.55);feed.userData.dynamic=true;for(const s of [-1,1])rod(head,p.steel,[s*.61,0,.24],[0,0,.55],.03);
    g.userData.turret={head,barrel:feed,cd:0,range:22,dmg:16,kind:'pulse'};decal(g,'PULSE',.5,0,.67,.76);
  }else if(type==='tesla'){
    bearing(g,p,.85,.46);cyl(g,p.shell,.19,1.45,1.4,.19,20);for(let i=0;i<8;i++){ring(g,p.copper,.35+i*.016,.055,.86+i*.15);cyl(g,p.dark,.22,.045,.93+i*.15,.22,20);}
    const orb=ball(g,p.steel,.31,0,2.33,0);orb.userData.dynamic=true;ring(g,p.accent,.29,.03,2.38);for(let i=0;i<3;i++){const a=i*TAU/3;rod(g,p.steel,[Math.sin(a)*.78,.61,Math.cos(a)*.78],[Math.sin(a)*.69,2.12,Math.cos(a)*.69],.045);ball(g,p.accent,.07,Math.sin(a)*.69,2.12,Math.cos(a)*.69);}
    const arcs=dynamic(g,'Tesla corona');const em=new THREE.MeshBasicMaterial({name:'Electrical corona',color:0xb6a4f0,transparent:true,opacity:.55});
    for(let i=0;i<3;i++){const a=i*TAU/3;const pts=[];for(let k=0;k<8;k++){const r=.27+k*.057;pts.push([Math.sin(a)*r+(k%2?.018:-.018),2.34-k*.028,Math.cos(a)*r]);}tube(arcs,em,pts,.009);}
    g.userData.turret={head:orb,barrel:orb,cd:0,range:20,dmg:22,kind:'pulse'};g.userData.update=t=>{em.opacity=.25+.3*(.5+.5*Math.sin(t*3));};decal(g,'TESLA',.5,0,.67,.76);
  }else if(type==='shield'){
    bearing(g,p,.83,.44);cyl(g,p.shell,.21,.76,1.08,.21,20);const swivel=dynamic(g,'Shield gimbal');swivel.position.y=1.4;
    ring(swivel,p.steel,.68,.055,0,'z');const inner=ring(swivel,p.accent,.49,.024,0,'x');inner.userData.dynamic=true;inner.rotation.z=.6;ball(swivel,p.cyan,.18,0,0,0);
    for(let i=0;i<3;i++){const a=i*TAU/3;rod(g,p.shell,[Math.sin(a)*.8,.26,Math.cos(a)*.8],[Math.sin(a)*.38,1.02,Math.cos(a)*.38],.085);}
    const mat=new THREE.MeshBasicMaterial({name:'Hexagonal shield field',map:texture('shield'),color:0x94d7ea,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false});
    const dome=mesh(new THREE.SphereGeometry(1.2,40,24,0,TAU,0,Math.PI/2),mat,0,.58,0,false);g.add(dome);dome.userData.dynamic=true;
    g.userData.shield={ring:swivel,dome,cd:0,range:11,dmg:22};g.userData.update=t=>{swivel.rotation.y=t*.24;inner.rotation.y=t*.31;mat.opacity=.09+.025*(.5+.5*Math.sin(t*1.1));};
  }else if(type==='barracks'){
    box(g,p.dark,1.89,.97,1.8,0,.76,0,.12);box(g,p.shell,2,.22,1.92,0,1.36,0,.09);
    for(const s of [-1,1]){box(g,p.shell,.24,.82,1.82,s*.88,.78,0,.045);vents(g,p,s*.65,1.44,-.41,.37,.15);}
    box(g,p.black,1.21,.73,.12,0,.7,.92,.04);for(let i=0;i<5;i++)box(g,p.steel,1.03,.055,.025,0,.47+i*.13,1.002,.004);
    box(g,p.hazard,1.26,.115,.025,0,1.12,1.005,.005);box(g,p.accent,.84,.031,.032,0,1.27,.963,.005);
    cyl(g,p.black,.3,.06,1.5,.3,24,-.5,-.37);ring(g,p.steel,.25,.025,1.54);miniShip(g,p,1.55,.72);decal(g,'BARRACKS',.93,0,1.4,.979);rod(g,p.steel,[.63,1.5,-.6],[.63,2.12,-.6],.026);ball(g,p.accent,.04,.63,2.12,-.6);
  }else if(type==='starport'){
    cyl(g,p.shell,1.62,.26,.4,1.62,8);cyl(g,p.dark,1.48,.08,.58,1.48,8);ring(g,p.steel,1.14,.037,.64);radialBoxes(g,p.accent,8,1.42,.66,.2,.05,.09);decal(g,'LAND 01',.9,0,.628,.63,0,true);
    miniShip(g,p,.72,1.16);box(g,p.dark,.46,.94,.43,-1.02,1.15,-.57,.07);box(g,p.shell,.49,.15,.48,-1.02,1.71,-.57,.035);box(g,p.glass,.37,.25,.075,-1.02,1.45,-.325,.018);
    for(const s of [-1,1]){box(g,p.shell,.15,1.19,.2,s*1.31,1.01,.05,.03);box(g,p.steel,.35,.13,.19,s*1.17,1.66,.05,.022);ball(g,p.accent,.055,s*1.31,1.74,.05);}
    const beacon=dynamic(g,'Dock guide ring');ring(beacon,p.cyan,.95,.022,.66,'y',Math.PI*.3);g.userData.update=t=>{beacon.rotation.y=t*.18;};
  }else if(type==='habitat'){
    cyl(g,p.shell,1.08,.65,.61,1.08,8);windows(g,p,8,1.008,.73,.53,.29);cyl(g,p.dark,1.08,.14,1.03,1.08,8);cyl(g,p.shell,.97,.56,1.38,.88,8);windows(g,p,8,.89,1.4,.48,.28);cyl(g,p.steel,.93,.13,1.73,.82,8);
    const roof=mesh(new THREE.SphereGeometry(.78,32,16,0,TAU,0,Math.PI/2),p.glass,0,1.79,0);roof.scale.y=.51;g.add(roof);ring(g,p.shell,.79,.04,1.79);
    for(let i=0;i<4;i++){const a=i*TAU/4;rod(g,p.steel,[Math.sin(a)*.76,1.82,Math.cos(a)*.76],[0,2.2,0],.024);}
    box(g,p.dark,.45,.43,.095,0,.5,1.044,.025);box(g,p.shell,.6,.075,.36,0,.83,1.05,.026);decal(g,'HAB 08',.52,0,1.1,1.075);ball(g,p.warm,.04,0,2.23,0);
  }
  g.userData.modelVersion=2;batchStatic(g);const assemblies=[];g.traverse(o=>{if(o.isGroup&&o.userData.dynamic)assemblies.push(o);});for(const assembly of assemblies)batchStatic(assembly);return g;
}
