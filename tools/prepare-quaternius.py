"""Build local GLBs from CC0 Quaternius sources. Python + Pillow + NumPy.
Usage: python tools/prepare-quaternius.py /path/to/ships /path/to/modular
Original ship mesh/UV/index bytes retained; texture capped at 1024 and JPEG Q92.
Godot 3 ArrayMesh converter supports this pack's 20-byte vertex layout only.
"""
import json,struct,base64,io,re,sys,pathlib
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'assets/quaternius'
def write_glb(d,b,p):
 b+=bytes((-len(b))%4);d['buffers']=[{'byteLength':len(b)}];j=json.dumps(d,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b)
def ship(name,src):
 d=json.load(open(src/name/'glTF'/f'{name}.gltf'));raw=base64.b64decode(d['buffers'][0]['uri'].split(',')[1]);image_views={x['bufferView']for x in d['images']};out=bytearray()
 for i,v in enumerate(d['bufferViews']):
  chunk=raw[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  if i in image_views:
   im=Image.open(io.BytesIO(chunk)).convert('RGB');im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
   # Aster interceptor: replace only colored orange paint, preserving grey armor.
   if name=='Striker':
    a=np.array(im).astype(float);mask=(a[:,:,0]>a[:,:,1]*1.16)&(a[:,:,1]>a[:,:,2]*1.3)&(a[:,:,0]>45);lum=a[:,:,0]/255
    a[mask]=np.stack([lum[mask]*105,lum[mask]*195,lum[mask]*226],axis=1);im=Image.fromarray(a.astype('uint8'))
   buf=io.BytesIO();im.save(buf,'JPEG',quality=92,subsampling=0,optimize=True);chunk=buf.getvalue()
  out.extend(bytes((-len(out))%4));v['byteOffset']=len(out);v['byteLength']=len(chunk);out.extend(chunk)
 for im in d['images']:im['mimeType']='image/jpeg'
 for m in d['materials']:m['doubleSided']=False;m['pbrMetallicRoughness'].update(metallicFactor=.32,roughnessFactor=.65)
 d['asset']['generator']='Stellar Clash CC0 adaptation';write_glb(d,out,OUT/'ships'/f'{name.lower()}.glb')
 print(name,len(out),'bytes')
def godot(name,src):
 s=(src/f'{name}.tscn').read_text();colors={'main_material':[.67,.70,.73,1],'dark_grey_material':[.21,.24,.28,1],'dark_accent_material':[.31,.21,.1,1],'accent_material':[1,.753,.369,1],'black_material':[.025,.028,.035,1]}
 mats={int(i):p.split('/')[-1].split('.')[0]for p,i in re.findall(r'\[ext_resource path="([^"]+)" type="Material" id=(\d+)\]',s)}
 d={'asset':{'version':'2.0','generator':'Stellar Clash Godot ArrayMesh conversion'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':name}],'meshes':[{'primitives':[]}],'materials':[],'bufferViews':[],'accessors':[]};out=bytearray()
 def accessor(a,t,ct,target):
  out.extend(bytes((-len(out))%4));off=len(out);bb=a.tobytes();out.extend(bb);vi=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(bb),'target':target});x={'bufferView':vi,'componentType':ct,'count':len(a),'type':t}
  if t=='VEC3':x.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
  d['accessors'].append(x);return len(d['accessors'])-1
 for block in re.findall(r'surfaces/\d+ = \{(.*?)\n\}',s,re.S):
  n=int(re.search(r'"vertex_count": (\d+)',block)[1]);data=bytes(int(x)for x in re.search(r'"array_data": PoolByteArray\( (.*?) \)',block)[1].split(','));assert len(data)==n*20
  pos=np.array([struct.unpack_from('<3f',data,i*20)for i in range(n)],dtype='<f4');ids=np.frombuffer(bytes(int(x)for x in re.search(r'"array_index_data": PoolByteArray\( (.*?) \)',block)[1].split(',')),dtype='<u2').reshape(-1,3)[:,[0,2,1]].reshape(-1)
  # Flatten and reconstruct face normals; Godot uses clockwise winding.
  pp=pos[ids];tris=pp.reshape(-1,3,3);nn=np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0]);nn/=np.maximum(np.linalg.norm(nn,axis=1)[:,None],1e-9);norm=np.repeat(nn,3,axis=0).astype('<f4');pp=pp.astype('<f4')
  mat=int(re.search(r'"material": ExtResource\( (\d+) \)',block)[1]);mi=len(d['materials']);d['materials'].append({'name':mats[mat],'pbrMetallicRoughness':{'baseColorFactor':colors[mats[mat]],'metallicFactor':.3,'roughnessFactor':.6}})
  d['meshes'][0]['primitives'].append({'attributes':{'POSITION':accessor(pp,'VEC3',5126,34962),'NORMAL':accessor(norm,'VEC3',5126,34962)},'material':mi})
 write_glb(d,out,OUT/'modular'/f'{name}.glb');print(name,len(out),'bytes')
if __name__=='__main__':
 ships,parts=map(pathlib.Path,sys.argv[1:]);[ship(n,ships)for n in ['Striker','Bob','Imperial']];[godot(n,parts)for n in ['vent','crate']]
