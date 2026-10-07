import * as THREE from 'three';
// Presentation-only travel: the simulation/grid stays at the origin. This avoids
// mixing visual cruising with gameplay coordinates or future backend snapshots.
export function createCruiseEffects({fieldRadius}){
 const group=new THREE.Group();group.name='Forward cruise ambience';
 const count=180,p=new Float32Array(count*3),speeds=new Float32Array(count),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){p[i*3]=(i%2?-1:1)*(fieldRadius+15+Math.random()*180);p[i*3+1]=-40+Math.random()*110;p[i*3+2]=-330+Math.random()*650;speeds[i]=14+Math.random()*13;colors.set([.6,.75,.86],i*3);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const dust=new THREE.Points(geo,new THREE.PointsMaterial({size:.26,vertexColors:true,transparent:true,opacity:.38,depthWrite:false}));dust.frustumCulled=false;group.add(dust);
 const streakCount=32,lines=new Float32Array(streakCount*6);const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(lines,3));
 const streaks=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:0x9cbdd1,transparent:true,opacity:.2,depthWrite:false}));streaks.frustumCulled=false;group.add(streaks);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(235,246,255,1)');g.addColorStop(.15,'rgba(165,205,232,.6)');g.addColorStop(1,'rgba(110,170,210,0)');c.fillStyle=g;c.fillRect(0,0,64,64);
 const beacon=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,opacity:.65,depthWrite:false,fog:false}));beacon.position.set(0,10,-840);beacon.scale.setScalar(16);beacon.name='Outbound waypoint';group.add(beacon);
 const plumes=new THREE.Group(),plumeGeo=new THREE.ConeGeometry(.35,2.7,10),plumeMat=new THREE.MeshBasicMaterial({color:0x83c1de,transparent:true,opacity:.18,depthWrite:false});
 for(let i=0;i<6;i++){const a=i*Math.PI/3,m=new THREE.Mesh(plumeGeo,plumeMat);m.rotation.z=Math.PI;m.position.set(Math.sin(a)*8,-17.13,Math.cos(a)*8);plumes.add(m);}group.add(plumes);
 function update(dt,time,enabled){
  // Static waypoint remains useful without requiring decorative motion.
  dust.visible=streaks.visible=plumes.visible=enabled;
  if(!enabled)return;
  for(let i=0;i<count;i++){p[i*3+2]+=speeds[i]*dt;if(p[i*3+2]>320)p[i*3+2]-=650;}
  for(let i=0;i<streakCount;i++){const j=i*3,k=i*6;lines[k]=lines[k+3]=p[j];lines[k+1]=lines[k+4]=p[j+1];lines[k+2]=p[j+2];lines[k+5]=p[j+2]-1.4-speeds[i]*.05;}
  geo.attributes.position.needsUpdate=true;lineGeo.attributes.position.needsUpdate=true;plumes.children.forEach((m,i)=>m.scale.y=.96+.035*Math.sin(time*2+i));
 }
 return {group,update,positions:p};
}
