"""Generate original multiscale rock albedo/relief maps. Requires NumPy/Pillow."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
rng=np.random.default_rng(91270);S=512;field=np.zeros((S,S),np.float32)
for size,amp in [(8,.34),(16,.22),(32,.18),(64,.12),(128,.08),(256,.04),(512,.02)]:
 im=Image.fromarray(np.uint8(rng.random((size,size))*255)).resize((S,S),Image.Resampling.BICUBIC);field+=np.asarray(im,dtype=np.float32)/255*amp
field=(field-field.min())/(field.max()-field.min());yy,xx=np.mgrid[0:S,0:S];nearest=np.full((S,S),1e9);second=nearest.copy()
for x,y in rng.random((90,2))*S:
 dx=np.minimum(abs(xx-x),S-abs(xx-x));dy=np.minimum(abs(yy-y),S-abs(yy-y));dist=dx*dx+dy*dy
 smaller=dist<nearest;second=np.where(smaller,nearest,np.minimum(second,dist));nearest=np.minimum(nearest,dist)
cracks=np.exp(-np.sqrt(np.maximum(0,second-nearest))*.45);grain=rng.random((S,S));relief=np.clip(field*.85+grain*.04-cracks*.15,0,1)
root=Path(__file__).resolve().parents[1]/'assets/original';root.mkdir(parents=True,exist_ok=True)
for kind,base in [('basalt',(102,107,113)),('iron',(138,122,101)),('granite',(148,149,146))]:
 shade=.65+field*.65-cracks*.23;rgb=shade[...,None]*np.array(base)+((grain-.5)*12)[...,None]
 rgb=np.uint8(np.clip(rgb,0,255));rgb[:,-1]=rgb[:,0];rgb[-1]=rgb[0];Image.fromarray(rgb).save(root/('rock-'+kind+'.webp'),quality=94,method=6)
r=np.uint8(relief*255);r[:,-1]=r[:,0];r[-1]=r[0];Image.fromarray(r).save(root/'rock-relief.webp',lossless=True,method=4)
print('Created four original 512px rock surface maps')
