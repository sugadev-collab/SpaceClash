import * as THREE from 'three';
import {assetInstance} from './asset-library.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createBuildingModel as original,MODEL_TYPES as originalTypes,MODEL_NAMES as originalNames} from '../models/building-factory.js';
export const MODEL_TYPES=[...originalTypes,'camp','builder'];
export const MODEL_NAMES={...originalNames,camp:'Fleet Camp',builder:'Builder Workshop'};
export function createBuildingModel(type){
 const b=original(type==='camp'?'barracks':type==='builder'?'habitat':type);b.userData.type=type;
 b.userData.baseDamage=b.userData.turret?.dmg;b.userData.baseRange=b.userData.turret?.range;
 if(type==='camp'||type==='builder'){
 const steel=new THREE.MeshStandardMaterial({color:type==='camp'?0x83a6b8:0xbdab82,metalness:.55,roughness:.45});
 const flag=new THREE.Mesh(new THREE.BoxGeometry(.65,.5,.04),steel);flag.position.set(0,1.85,.65);b.add(flag);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.8,8),steel);beam.position.set(.35,1.7,.65);b.add(beam);
 }
 // Small owned CC0 dock details, within the existing horizontal bounds.
 if(['starport','storage','builder'].includes(type)){
  const crate=assetInstance('crate');if(crate){crate.scale.setScalar(.38);if(type==='starport')crate.position.set(.8,.63,-.72);else crate.position.set(.96,.12,.96);b.add(crate);}
 }
 if(['barracks','builder','storage'].includes(type)){
  const vent=assetInstance('vent');if(vent){vent.scale.setScalar(.55);vent.rotation.x=-Math.PI/2;if(type==='storage')vent.position.set(.82,1.515,0);else if(type==='builder')vent.position.set(0,.875,1.05);else vent.position.set(-.65,1.485,.4);b.add(vent);}
 }
 applyLevel(b,1);return b;
}
function release(g){const gs=new Set(),ms=new Set();g.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(x=>x.dispose());ms.forEach(x=>x.dispose());g.removeFromParent();}
export function applyLevel(b,level){
 if(b.userData.tierParts)release(b.userData.tierParts);
 const tier=new THREE.Group();tier.name='Level '+level+' fittings';tier.userData.level=level;
 const bounds=new THREE.Box3().setFromObject(b),size=bounds.getSize(new THREE.Vector3());
 // Same footprint at every tier: upgrades add armor/equipment, not giant scaling.
 const r=Math.max(.65,Math.min(1.13,Math.max(size.x,size.z)*.36)),top=Math.min(3.6,size.y);
 const palette=[0x8396a6,0x87b9ca,0xc1aa7a,0xa7bccd,0xe1c58b];
 const shell=new THREE.MeshStandardMaterial({color:palette[level-1],metalness:.58,roughness:.43});const dark=new THREE.MeshStandardMaterial({color:0x263848,metalness:.5,roughness:.54});const light=new THREE.MeshStandardMaterial({color:palette[level-1],emissive:palette[level-1],emissiveIntensity:.6,roughness:.4});
 const bins=new Map();function box(w,h,d,x,y,z,mat=shell){const geo=new THREE.BoxGeometry(w,h,d);geo.translate(x,y,z);if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(geo);}
 for(let i=0;i<level;i++)box(.115,.07,.11,(i-(level-1)/2)*.18,.31,r,light);
 if(level>=2)for(const s of [-1,1])box(.12,.43,.63,s*r,.52,0);
 if(level>=3)for(const s of [-1,1])for(let i=0;i<5;i++)box(.18,.11,.035,s*r,.85+i*.11,-.25,dark);
 if(level>=4){box(.04,.58,.04,-r*.7,top*.75,-r*.6);box(.12,.09,.12,-r*.7,top*.75+.3,-r*.6,light);for(const s of [-1,1])box(.2,.2,.47,s*r,.95,.36);}
 if(level>=5){const halo=new THREE.Mesh(new THREE.TorusGeometry(r*.93,.028,6,32),light);halo.rotation.x=Math.PI/2;halo.position.y=.22;tier.add(halo);box(.4,.16,.3,0,top*.6,-r*.9);}
 for(const [mat,gs]of bins){const geo=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());const m=new THREE.Mesh(geo,mat);m.castShadow=true;tier.add(m);}
 // Dispose unused palette materials too.
 for(const mat of [shell,dark,light])if(!bins.has(mat)&&!(level>=5&&mat===light))mat.dispose();
 b.add(tier);b.userData.tierParts=tier;b.userData.visualLevel=level;b.scale.setScalar(1);
 if(b.userData.turret){b.userData.turret.dmg=Math.round(b.userData.baseDamage*Math.pow(1.2,level-1));b.userData.turret.range=b.userData.baseRange*(1+.04*(level-1));}
}
