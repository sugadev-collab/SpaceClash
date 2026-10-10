import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {UNIT_DEFS} from '../config/unit-rules.js';
import {createOriginalUnit} from './original-units.js';
import {centeredAsset,assetInstance,preloadFleetAssets,assetStatus} from './asset-library.js';
export {UNIT_DEFS,preloadFleetAssets,assetStatus};
export const FLEET_DESIGNS={interceptor:{model:'striker',length:2.15,label:'ASTER / Mk I',source:'Customized Quaternius Striker',description:'Cyan escort with an extended sensor spine, twin rail pods, heat vent and paired engine plumes.'},bomber:{model:'bob',length:1.42,span:2.65,label:'Kestrel / siege',source:'Quaternius Bob + original payload pods',description:'Wide-wing strike craft with two underslung payload pods and warm navigation lights.'},cruiser:{model:'imperial',length:3.3,label:'Atlas / command',source:'Quaternius Imperial + original command fittings',description:'Long armored flagship with a raised command antenna and paired forward batteries.'},sentinel:{label:'Sentinel / defense',source:'Original project model',description:'The original compact armored defense drone retains its distinct silhouette.'}};
function chamferBox(w,h,d){const r=Math.min(w,h,d)*.16;const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:1,steps:1});geo.translate(0,0,-d/2+r);return geo;}
export function createUnit(type='interceptor'){
 const spec=FLEET_DESIGNS[type],def=UNIT_DEFS[type];if(!def)throw Error('Unknown troop type');
 if(type==='sentinel')return createOriginalUnit(type);
 const hull=centeredAsset(spec.model,spec.span||spec.length);if(!hull){const fallback=createOriginalUnit(type);fallback.userData.assetFallback=true;return fallback;}
 const g=new THREE.Group();g.name=def.name;g.add(hull);g.userData.design=spec.label;g.userData.source=spec.source;g.userData.quaternius=true;
 const steel=new THREE.MeshStandardMaterial({color:0x8399aa,metalness:.6,roughness:.42});const dark=new THREE.MeshStandardMaterial({color:0x172a37,metalness:.4,roughness:.5});const hot=new THREE.MeshBasicMaterial({color:def.color});
 const box=(w,h,d,x,y,z,mat=steel)=>{const m=new THREE.Mesh(chamferBox(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
 if(type==='interceptor'){
  box(.12,.045,.32,0,.205,-.23,dark);box(.03,.11,.04,0,.28,-.33);box(.045,.025,.06,0,.35,-.33,hot);
  const vent=assetInstance('vent');if(vent){vent.scale.setScalar(.23);vent.rotation.x=-Math.PI/2;vent.position.set(0,.235,-.23);g.add(vent);}
  for(const s of [-1,1]){box(.085,.075,.34,s*.39,.09,.23,dark);box(.035,.035,.43,s*.39,.09,.44);box(.045,.025,.035,s*.39,.115,.65,hot);box(.035,.012,.11,s*.32,.19,-.18,hot);}
 }else if(type==='bomber'){
  for(const s of [-1,1]){box(.07,.14,.15,s*.5,-.045,.03);box(.16,.15,.5,s*.5,-.17,.08,dark);box(.13,.08,.14,s*.5,-.17,.33);box(.045,.02,.06,s*.5,-.10,.25,hot);}
 }else{
  box(.31,.17,.42,0,.34,-.1,dark);box(.04,.4,.04,0,.56,-.19);box(.09,.045,.09,0,.78,-.19,hot);
  for(const s of [-1,1]){box(.10,.09,.72,s*.23,.36,.59);box(.16,.07,.22,s*.4,.23,-.45,dark);}
 }
 // Merge original fitting boxes by material to avoid per-detail draw calls.
 const bins=new Map();for(const child of [...g.children]){if(!child.isMesh)continue;child.updateMatrix();const geo=child.geometry.clone().applyMatrix4(child.matrix);if(!bins.has(child.material))bins.set(child.material,[]);bins.get(child.material).push(geo);child.geometry.dispose();g.remove(child);}
 for(const [mat,geos]of bins){const merged=mergeGeometries(geos,false);geos.forEach(x=>x.dispose());const m=new THREE.Mesh(merged,mat);m.castShadow=true;g.add(m);}
 const exhaust=new THREE.Group();exhaust.position.z=-spec.length*.46;
 for(const s of [-1,1]){const flame=new THREE.Mesh(new THREE.ConeGeometry(type==='cruiser'?.105:.065,.42,10),new THREE.MeshBasicMaterial({color:def.color,transparent:true,opacity:.65,depthWrite:false}));flame.rotation.x=-Math.PI/2;flame.position.set(s*(type==='bomber'?.28:type==='cruiser'?.46:.27),-.035,-.16);exhaust.add(flame);}
 g.add(exhaust);g.userData.exhaust=exhaust;return g;
}
