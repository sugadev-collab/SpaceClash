import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {UNIT_DEFS} from '../config/unit-rules.js';
export {UNIT_DEFS};
export function createOriginalUnit(type='interceptor'){
 const def=UNIT_DEFS[type];if(!def)throw Error('Unknown troop type');const g=new THREE.Group();g.name=def.name;
 const shell=new THREE.MeshStandardMaterial({color:0x8198aa,metalness:.55,roughness:.42});const dark=new THREE.MeshStandardMaterial({color:0x1b2b39,metalness:.5,roughness:.5});const accent=new THREE.MeshStandardMaterial({color:def.color,emissive:def.color,emissiveIntensity:.25,metalness:.2,roughness:.32});const hot=new THREE.MeshBasicMaterial({color:def.color});
 const bins=new Map();function add(geo,mat,x,y,z,rx=0){if(geo.index){const old=geo;geo=geo.toNonIndexed();old.dispose();}geo.rotateX(rx);geo.translate(x,y,z);if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(geo);}
 function wing(k,s){const shape=new THREE.Shape([new THREE.Vector2(.22*s,.4),new THREE.Vector2(1.12*s,-.6),new THREE.Vector2(1.05*s,-1.05),new THREE.Vector2(.18*s,-.44)]);const geo=new THREE.ExtrudeGeometry(shape,{depth:.1*k,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025*k,bevelThickness:.025*k});geo.rotateX(Math.PI/2);geo.scale(k,1,k);add(geo,shell,0,0,0);}
 if(type==='sentinel'){
 add(new THREE.BoxGeometry(.9,.4,.7),shell,0,0,0);add(new THREE.SphereGeometry(.26,12,8),dark,0,.28,.08);
 for(const s of [-1,1]){add(new THREE.BoxGeometry(.28,.63,.28),dark,s*.67,-.15,0);add(new THREE.BoxGeometry(.45,.15,.75),shell,s*.66,-.48,.08);add(new THREE.CylinderGeometry(.09,.09,.9,10),shell,s*.6,.06,.62,Math.PI/2);add(new THREE.SphereGeometry(.065,8,6),hot,s*.6,.06,1.1);}
 add(new THREE.BoxGeometry(.45,.08,.06),accent,0,.22,.36);
 }else{
 const k=type==='cruiser'?1.5:type==='bomber'?1.15:.8;
 add(new THREE.ConeGeometry(.33*k,1.8*k,8),shell,0,0,.16*k,Math.PI/2);
 for(const s of [-1,1])wing(k,s);add(new THREE.BoxGeometry(.7*k,.14*k,.75*k),dark,0,-.09,-.3*k);
 add(new THREE.SphereGeometry(.19*k,12,8),accent,0,.13,.37*k);
 for(const s of [-1,1]){add(new THREE.BoxGeometry(.27*k,.25*k,1.25*k),shell,s*.75*k,0,-.16*k);add(new THREE.CylinderGeometry(.105*k,.16*k,.24*k,12),hot,s*.75*k,0,-.85*k,Math.PI/2);add(new THREE.BoxGeometry(.06*k,.06*k,.85*k),accent,s*.85*k,.14,-.1*k);}
 if(type==='bomber')for(const s of [-1,1])add(new THREE.CylinderGeometry(.13,.13,.9,10),dark,s*.38,-.23,.05,Math.PI/2);
 for(const s of [-1,1]){for(let j=0;j<4;j++)add(new THREE.BoxGeometry(.18*k,.022,.04*k),dark,s*.75*k,.14*k,(-.4+j*.13)*k);add(new THREE.BoxGeometry(.065*k,.22*k,.33*k),shell,s*.72*k,.22*k,-.45*k);}
 if(type==='cruiser'){add(new THREE.BoxGeometry(.52,.36,.9),dark,0,.25,-.25);for(const s of [-1,1])add(new THREE.CylinderGeometry(.065,.065,.9,8),shell,s*.21,.47,.5,Math.PI/2);}
 }
 for(const [mat,geos]of bins){const geo=mergeGeometries(geos,false);geos.forEach(x=>x.dispose());const m=new THREE.Mesh(geo,mat);m.castShadow=true;g.add(m);}
 const exhaust=new THREE.Mesh(new THREE.ConeGeometry(.13,.42,10),new THREE.MeshBasicMaterial({color:def.color,transparent:true,opacity:.5,depthWrite:false}));exhaust.rotation.x=-Math.PI/2;exhaust.position.set(0,0,-.95);g.add(exhaust);g.userData.exhaust=exhaust;return g;
}
