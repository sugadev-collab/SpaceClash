import numpy as np
from PIL import Image
from pathlib import Path
W,H=1536,768
u=np.linspace(-np.pi,np.pi,W,dtype=np.float32)[None,:];v=np.linspace(0,np.pi,H,dtype=np.float32)[:,None]
x=np.sin(v)*np.cos(u);y=np.cos(v)+np.zeros_like(x);z=np.sin(v)*np.sin(u)
d=np.stack([x,y,z],axis=-1)
def h(p):
 p=np.mod(p*.3183099+np.array([.1,.2,.3],dtype=np.float32),1)*17
 return np.mod(np.prod(p,axis=-1)*np.sum(p,axis=-1),1)
def noise(p):
 i=np.floor(p);f=p-i;f=f*f*(3-2*f);out=np.zeros((H,W),np.float32)
 for a in [0,1]:
  for b in [0,1]:
   for c in [0,1]:out+=h(i+[a,b,c])*(f[...,0] if a else 1-f[...,0])*(f[...,1] if b else 1-f[...,1])*(f[...,2] if c else 1-f[...,2])
 return out
# Smooth deterministic trig-hash can show precision artefacts; noise averages suppress them.
def fbm(p):
 out=np.zeros((H,W),np.float32);a=.5
 for k in range(5):out+=noise(p)*a;p=p*2.03+[2.7,7.1,3.2];a*=.5
 return out
def smooth(a,b,x):t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
root=Path(__file__).resolve().parents[1]/'assets'/'original';root.mkdir(parents=True,exist_ok=True)
for variant,name in enumerate(['deep','core']):
 q=d*3.8+[variant*13,2,5];n=fbm(q);detail=fbm(q*3+n[...,None]*2)
 band=np.exp(-((y*.72+x*.3+z*.2+.18)*2.2)**2);gas=smooth(.27,.78,n)*band;veins=smooth(.35,.7,detail)
 blue=np.array([.022,.065,.14]) if not variant else np.array([.075,.16,.23]);warm=np.array([.18,.09,.19]) if not variant else np.array([.24,.105,.035])
 col=np.array([.003,.006,.017])+((1-veins[...,None])*blue+veins[...,None]*warm)*gas[...,None]*1.8
 col*=1-smooth(.55,.82,detail[...,None])*.68;col+=np.array([.045,.08,.115])*(gas[...,None]**4)*veins[...,None]
 # Linear values stored in sRGB for the renderer's explicit sRGB texture decoding.
 srgb=np.where(col<=.0031308,col*12.92,1.055*np.maximum(col,0)**(1/2.4)-.055)
 arr=np.uint8(np.clip(srgb,0,1)*255);arr[:,-1]=arr[:,0]
 Image.fromarray(arr).save(root/(name+'.webp'),quality=90,method=6)
 print(name,(root/(name+'.webp')).stat().st_size)
