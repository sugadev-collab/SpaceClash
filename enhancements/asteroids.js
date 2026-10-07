import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Original fractured boulders, not sphere-plus-Saturn-ring planetoids.
// Seeded shapes, actual crater bowls/rims, small mineral seams and distance LOD.
function randomSource(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
function hash(x,y,z,seed){let n=Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791)^seed;n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967296;}
function noise(x,y,z,seed){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);const mix=(a,b,t)=>a+(b-a)*t;return mix(mix(mix(hash(ix,iy,iz,seed),hash(ix+1,iy,iz,seed),fx),mix(hash(ix,iy+1,iz,seed),hash(ix+1,iy+1,iz,seed),fx),fy),mix(mix(hash(ix,iy,iz+1,seed),hash(ix+1,iy,iz+1,seed),fx),mix(hash(ix,iy+1,iz+1,seed),hash(ix+1,iy+1,iz+1,seed),fx),fy),fz);}
const maps=new Map();
function rockTextures(kind){if(maps.has(kind))return maps.get(kind);const loader=new THREE.TextureLoader();const map=loader.load('./assets/original/rock-'+kind+'.webp');map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;const bump=loader.load('./assets/original/rock-relief.webp');bump.wrapS=bump.wrapT=THREE.RepeatWrapping;const value={map,bump};maps.set(kind,value);return value;}
export function createAsteroid({fieldRadius,seed=1}){
 const rand=randomSource(seed),group=new THREE.Group(),s=1.25+rand()*3.4,kind=['basalt','iron','granite'][Math.floor(rand()*3)];
 const axes=new THREE.Vector3(.85+rand()*.65,.58+rand()*.44,.78+rand()*.5),craters=[];
 for(let i=0;i<3;i++)craters.push({dir:new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize(),r:.22+rand()*.3,depth:.1+rand()*.12});
 function surface(d){
  const n=noise(d.x*2.1,d.y*2.1,d.z*2.1,seed),fine=noise(d.x*6.1,d.y*6.1,d.z*6.1,seed+91);
  let radius=.86+.28*(n-.5)+.09*(fine-.5)+.07*Math.sin(d.x*5+d.z*3+seed);
  for(const c of craters){const t=Math.acos(THREE.MathUtils.clamp(d.dot(c.dir),-1,1))/c.r;if(t<1)radius-=c.depth*Math.pow(1-t*t,2);radius+=.045*Math.exp(-Math.pow((t-1)/.16,2));}
  return d.clone().multiply(axes).multiplyScalar(s*radius);
 }
 function geometry(w,h){const geo=new THREE.SphereGeometry(1,w,h),p=geo.attributes.position,col=new Float32Array(p.count*3),d=new THREE.Vector3();
  for(let i=0;i<p.count;i++){d.fromBufferAttribute(p,i).normalize();const point=surface(d);p.setXYZ(i,point.x,point.y,point.z);const v=.76+noise(d.x*12,d.y*12,d.z*12,seed+17)*.24;col.set([v,v,v],i*3);}
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();return geo;
 }
 const tex=rockTextures(kind),material=new THREE.MeshStandardMaterial({color:0xd8d1c5,map:tex.map,bumpMap:tex.bump,bumpScale:s*.025,roughness:.93,metalness:kind==='iron'?.12:.02,vertexColors:true});
 const lod=new THREE.LOD();const near=new THREE.Mesh(geometry(44,28),material),far=new THREE.Mesh(geometry(18,12),material);lod.addLevel(near,0);lod.addLevel(far,90);lod.name='Cratered '+kind+' boulder';group.add(lod);
 // Inset mineral specks: deliberately small, low-intensity, no giant neon shards.
 const mineral=new THREE.MeshStandardMaterial({color:kind==='iron'?0xb69e71:0x839da3,roughness:.45,metalness:.18,emissive:kind==='iron'?0x6b461a:0x284854,emissiveIntensity:.12});
 const fragments=[],direction=new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize();
 for(let i=0;i<5;i++){const d=direction.clone().add(new THREE.Vector3((rand()-.5)*.15,(rand()-.5)*.15,(rand()-.5)*.15)).normalize(),g=new THREE.OctahedronGeometry(s*(.026+rand()*.018));g.scale(1,.35,1.7);g.rotateZ(rand()*6);g.translate(...surface(d).multiplyScalar(1.01).toArray());fragments.push(g);}
 const seam=new THREE.Mesh(mergeGeometries(fragments,false),mineral);fragments.forEach(g=>g.dispose());group.add(seam);
 // Sparse irregular rubble clusters instead of uniform orbital hoops.
 if(rand()>.65){const geo=new THREE.IcosahedronGeometry(s*.1,1);geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));const debris=new THREE.InstancedMesh(geo,material,3),m=new THREE.Matrix4();
  for(let i=0;i<3;i++){const a=rand()*Math.PI*2,position=new THREE.Vector3(Math.cos(a)*s*1.7,(rand()-.5)*s,Math.sin(a)*s*1.7);m.compose(position,new THREE.Quaternion().setFromEuler(new THREE.Euler(rand()*3,rand()*3,rand()*3)),new THREE.Vector3(1,.65+rand(),.8+rand()));debris.setMatrixAt(i,m);}debris.instanceMatrix.needsUpdate=true;group.add(debris);}
 const a=rand()*Math.PI*2,r=fieldRadius+20+rand()*130,y=-11+rand()*30;
 group.position.set(Math.cos(a)*r,y,Math.sin(a)*r);group.rotation.set(rand()*3,rand()*3,rand()*3);
 group.userData={seed,kind,lane:{x:(rand()<.5?-1:1)*(fieldRadius+30+rand()*105),z:-220+rand()*440,speed:2.5+rand()*2},spin:(rand()-.5)*.009,orb:{a,r,y,sp:.005+rand()*.013,incl:(rand()-.5)*4,ph:rand()*6},crystalMat:mineral,base:.12,craterCount:craters.length};
 return group;
}
