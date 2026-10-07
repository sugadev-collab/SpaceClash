const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const {createSaveService}=await import('../storage/save-state.js'),{createBrowserStorage}=await import('../storage/browser-storage.js');const map=new Map();const store={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)};
const svc=createSaveService({buildingDefs:{solar:{}},unitDefs:{interceptor:{hp:90},cruiser:{hp:420}},grid:21,planeRadius:28,inBounds:(i,j)=>Number.isInteger(i)&&Number.isInteger(j)&&i>=0&&j>=0&&i<21&&j<21,adapter:createBrowserStorage(()=>store)});
const sample={resources:{energy:123,crystal:45},wave:3,buildings:[{userData:{type:'command',cell:{i:10,j:10},level:2,hp:3000}}],fighters:[{type:'cruiser',home:{x:3,z:0},hp:419}]};
assert(svc.save(sample).ok);const saved=svc.load();assert.equal(saved.value.res.energy,123);assert.equal(saved.value.fighters[0].type,'cruiser');assert.equal(saved.value.buildings[0].level,2);
map.set('stellar-clash','bad json');assert.equal(svc.load().ok,false);map.delete('stellar-clash');assert.equal(svc.load().found,false);
map.set('stellar-sky','core');assert.equal(svc.getPreferences().sky,'core');svc.setPreferences({sky:'deep',muted:true,volume:.35});assert.deepEqual(svc.getPreferences(),{sky:'deep',muted:true,volume:.35});
const broken=createSaveService({buildingDefs:{},unitDefs:{},grid:21,planeRadius:28,inBounds:()=>true,adapter:createBrowserStorage(()=>{throw Error('blocked')})});assert.equal(broken.load().ok,false);assert.deepEqual(broken.getPreferences(),{sky:'deep',volume:.6,muted:false});
console.log('Storage service: snapshot roundtrip, malformed/missing saves, preference migration, audio settings, blocked storage passed.');})().catch(e=>{console.error(e);process.exit(1)});
