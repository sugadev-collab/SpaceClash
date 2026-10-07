import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const SKYBOXES=[
 {id:'deep',label:'DEEP',file:'./assets/skyboxes/alien_space_nebula_2_skybox.glb'},
 {id:'core',label:'CORE',file:'./assets/skyboxes/alien_space_nebula_1_skybox.glb'}
];
// CC BY 4.0 Jungle Jim. See credits.html and ASSET-CREDITS.md.
// Ignore the packed metallic/roughness image: only colour/emissive maps are skies.
function panoramaMaterial(source){const texture=source.map||source.emissiveMap;if(!texture)return null;texture.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:texture,color:0xffffff,side:THREE.BackSide,depthWrite:false,transparent:false,opacity:1,fog:false});}
export function prepareSkybox(gltf){
 const source=gltf.scene;source.updateMatrixWorld(true);
 const sphere=new THREE.Box3().setFromObject(source).getBoundingSphere(new THREE.Sphere());
 if(!Number.isFinite(sphere.radius)||sphere.radius<=0)throw Error('Invalid skybox bounds');
 const oldMaterials=new Set(),unusedTextures=new Set(),usedTextures=new Set();let meshes=0;
 source.traverse(o=>{if(o.isLight||o.isCamera)o.visible=false;if(!o.isMesh)return;
  const originals=Array.isArray(o.material)?o.material:[o.material];const mats=originals.map(m=>{oldMaterials.add(m);const replacement=panoramaMaterial(m);if(replacement)usedTextures.add(replacement.map);for(const key of ['map','emissiveMap','metalnessMap','roughnessMap','normalMap'])if(m[key])unusedTextures.add(m[key]);return replacement;});
  if(mats.some(m=>!m)){o.visible=false;return;}o.material=Array.isArray(o.material)?mats:mats[0];o.frustumCulled=false;o.renderOrder=-20;meshes++;
 });
 if(!meshes)throw Error('No panorama material in skybox');
 oldMaterials.forEach(m=>m.dispose());unusedTextures.forEach(t=>{if(!usedTextures.has(t))t.dispose();});
 // Recentre the full authored hierarchy, including its original layer transforms.
 source.position.sub(sphere.center);const dome=new THREE.Group();const scale=1400/sphere.radius;dome.add(source);dome.scale.setScalar(scale);dome.name='Jungle Jim licensed skybox';dome.userData.licensedSky=true;return dome;
}
const cache=new Map();
export async function loadSkybox(index){const def=SKYBOXES[index];if(!cache.has(def.id))cache.set(def.id,new GLTFLoader().loadAsync(def.file).then(prepareSkybox).catch(e=>{cache.delete(def.id);throw e;}));return cache.get(def.id);}
