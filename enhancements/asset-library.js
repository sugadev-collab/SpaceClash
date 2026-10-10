import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const urls={striker:'ships/striker.glb',bob:'ships/bob.glb',imperial:'ships/imperial.glb',vent:'modular/vent.glb',crate:'modular/crate.glb'};
const templates=new Map();let loading=null;
export const assetStatus={ready:false,loaded:[],failed:[]};
export function preloadFleetAssets(){
 if(loading)return loading;
 const loader=new GLTFLoader();
 loading=Promise.all(Object.entries(urls).map(async([key,path])=>{try{const gltf=await loader.loadAsync(new URL('../assets/quaternius/'+path,import.meta.url).href);templates.set(key,gltf.scene);assetStatus.loaded.push(key);}catch(e){assetStatus.failed.push(key);console.warn('Fleet asset unavailable; original fallback:',key,e.message);}})).then(()=>{assetStatus.ready=true;return assetStatus;});return loading;
}
// Instances own geometry/materials. Textures are shared and never disposed by units.
export function assetInstance(key){const src=templates.get(key);if(!src)return null;const root=src.clone(true);root.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;}});root.userData.source='Quaternius CC0';return root;}
export function centeredAsset(key,length){const root=assetInstance(key);if(!root)return null;root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const k=length/Math.max(size.x,size.z);root.scale.setScalar(k);root.position.copy(center).multiplyScalar(-k);const wrapper=new THREE.Group();wrapper.add(root);return wrapper;}
