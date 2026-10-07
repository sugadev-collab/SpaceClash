// Pure snapshot validation; no browser, rendering or storage dependency.
export function validateSaveSnapshot(data,{buildingDefs,unitDefs,grid,planeRadius,inBounds}){
  if(!data||!data.res||!['energy','crystal'].every(k=>Number.isFinite(data.res[k])&&data.res[k]>=0)||!Array.isArray(data.buildings)||data.buildings.length>grid*grid)throw Error('Invalid save');
  const cells=new Set();let hq=0;
  for(const b of data.buildings){
   if(!b||!(b.type==='command'||Object.hasOwn(buildingDefs,b.type))||!inBounds(b.i,b.j)||!Number.isInteger(b.level)||b.level<1||b.level>5||cells.has(`${b.i},${b.j}`))throw Error('Invalid building');
   cells.add(`${b.i},${b.j}`);if(b.type==='command')hq++;
  }
  if(hq!==1)throw Error('Save must contain one HQ');
  if(data.wave!==undefined&&(!Number.isInteger(data.wave)||data.wave<0||data.wave>10000))throw Error('Invalid wave');
  if(data.version!==undefined&&![1,2,3].includes(data.version))throw Error('Unsupported save version');
  if(data.fighters!==undefined){
   if(!Array.isArray(data.fighters)||data.fighters.length>160)throw Error('Invalid fleet');
   for(const f of data.fighters){
    if(!f||typeof f!=='object')throw Error('Invalid troop');const type=f.type||'interceptor',d=Object.hasOwn(unitDefs,type)?unitDefs[type]:null;
    if(!d||!f.home||!Number.isFinite(f.home.x)||!Number.isFinite(f.home.z)||Math.hypot(f.home.x,f.home.z)>planeRadius+5||!Number.isFinite(f.hp)||f.hp<=0||f.hp>d.hp)throw Error('Invalid troop');
   }
  }
  return data;
 }

