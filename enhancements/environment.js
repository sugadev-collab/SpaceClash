import * as THREE from 'three';
// Original direction-space nebula: continuous at the equirectangular seam,
// no GLB fetches, embedded lights, texture colour-space or winding assumptions.
const noise=`
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=noise3(p)*a;p=p*2.03+vec3(2.7,7.1,3.2);a*=.5;}return v;}`;
const nebulaTextures=new Map();
export function makeNebula(variant=0){
 if(!nebulaTextures.has(variant)){const t=new THREE.TextureLoader().load('./assets/original/'+(variant?'core':'deep')+'.webp');t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;nebulaTextures.set(variant,t);}
 const dome=new THREE.Mesh(new THREE.SphereGeometry(1400,32,20),new THREE.MeshBasicMaterial({map:nebulaTextures.get(variant),side:THREE.BackSide,depthWrite:false,fog:false}));
 dome.name='Original baked procedural nebula';dome.frustumCulled=false;dome.renderOrder=-20;return dome;
}
export function originalEnvironment(renderer){
 const env=new THREE.Scene();env.background=new THREE.Color(0x182638);
 for(const [x,y,z,w,h,c] of [[0,8,0,14,10,0xbdd3e4],[-9,2,0,8,12,0x507186],[9,1,-6,8,8,0xe7d3b8]]){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m);}
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(env,.08);pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}
export function makePlanets(){const group=new THREE.Group();
 for(let i=0;i<2;i++){
 const planet=new THREE.Mesh(new THREE.SphereGeometry(i?16:37,48,32),new THREE.ShaderMaterial({uniforms:{lava:{value:i},light:{value:new THREE.Vector3(.6,.45,.7).normalize()}},vertexShader:`varying vec3 n;varying vec3 p;void main(){n=normal;p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 n;varying vec3 p;uniform float lava;uniform vec3 light;${noise}void main(){vec3 d=normalize(p);float land=fbm(d*5.+3.);float cr=fbm(d*22.);vec3 ocean=vec3(.012,.052,.095);vec3 earth=mix(vec3(.07,.11,.09),vec3(.27,.25,.19),cr);vec3 rock=mix(ocean,earth,smoothstep(.49,.55,land));float clouds=smoothstep(.56,.7,fbm(d*9.+7.));rock=mix(rock,vec3(.44,.53,.58),clouds*.7);vec3 ash=mix(vec3(.036,.025,.023),vec3(.16,.1,.055),cr);float vein=pow(max(0.,1.-abs(land-.53)*13.),8.);vein=clamp(vein,0.,1.);rock=mix(rock,ash,lava);float lit=max(0.,dot(normalize(n),light));vec3 col=rock*(.06+lit*1.5)+lava*vec3(.7,.16,.012)*vein*.55;gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));planet.position.set(i?180:-210,i?20:70,i?-280:-390);group.add(planet);
 if(!i){const ring=new THREE.Mesh(new THREE.RingGeometry(49,73,100),new THREE.MeshBasicMaterial({color:0x899baf,side:THREE.DoubleSide,transparent:true,opacity:.17,depthWrite:false}));ring.position.copy(planet.position);ring.rotation.set(1.05,.3,.3);group.add(ring);}}
 return group;
}
let rockTexture;
export function rockMap(){if(rockTexture)return rockTexture;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),im=x.createImageData(256,256);for(let y=0;y<256;y++)for(let a=0;a<256;a++){const k=(y*256+a)*4;const n=104+22*Math.sin(a*.11)*Math.sin(y*.14)+15*Math.sin(a*.31+y*.29)+10*Math.sin(a*1.7+y*2.9);im.data[k]=n;im.data[k+1]=n*.96;im.data[k+2]=n*.92;im.data[k+3]=255;}x.putImageData(im,0,0);rockTexture=new THREE.CanvasTexture(c);rockTexture.wrapS=rockTexture.wrapT=THREE.RepeatWrapping;rockTexture.colorSpace=THREE.SRGBColorSpace;return rockTexture;}
