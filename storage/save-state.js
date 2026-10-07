import {validateSaveSnapshot} from './snapshot-schema.js';
import {createBrowserStorage} from './browser-storage.js';
export const SAVE_VERSION=3;
const SAVE_KEY='stellar-clash',PREFS_KEY='stellar-preferences',LEGACY_SKY_KEY='stellar-sky';
export function createSaveService({buildingDefs,unitDefs,grid,planeRadius,inBounds,adapter=createBrowserStorage()}){
 const validate=data=>validateSaveSnapshot(data,{buildingDefs,unitDefs,grid,planeRadius,inBounds});
 function capture({resources,wave,buildings,fighters}){
  return {version:SAVE_VERSION,res:{...resources},wave,
   buildings:buildings.map(b=>({type:b.userData.type,...b.userData.cell,level:b.userData.level,hp:b.userData.hp})),
   fighters:fighters.map(f=>({type:f.type||'interceptor',home:{x:f.home.x,z:f.home.z},hp:f.hp}))};
 }
 return {
  capture,validate,
  save(state){try{const value=capture(state);validate(value);return adapter.write(SAVE_KEY,JSON.stringify(value));}catch(error){return {ok:false,error};}},
  load(){const r=adapter.read(SAVE_KEY);if(!r.ok||!r.found)return r;try{return {ok:true,found:true,value:validate(JSON.parse(r.raw))};}catch(error){return {ok:false,error};}},
  getPreferences(){let p={sky:'deep',volume:.6,muted:false};const r=adapter.read(PREFS_KEY);if(r.ok&&r.found){try{const x=JSON.parse(r.raw);if(x?.sky==='core'||x?.sky==='deep')p.sky=x.sky;if(Number.isFinite(x?.volume))p.volume=Math.max(0,Math.min(1,x.volume));if(typeof x?.muted==='boolean')p.muted=x.muted;}catch{}}else{const old=adapter.read(LEGACY_SKY_KEY);if(old.ok&&old.raw==='core')p.sky='core';}return p;},
  setPreferences(p){return adapter.write(PREFS_KEY,JSON.stringify({sky:p.sky==='core'?'core':'deep',volume:Math.max(0,Math.min(1,p.volume)),muted:!!p.muted}));}
 };
}
