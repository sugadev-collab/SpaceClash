"""Texture-first GLB optimization; preserves geometry, joints, clips and view IDs.
Usage: python optimize-glb.py input.glb output.glb [--sky]
Requires Pillow. CC BY credits must accompany redistributed outputs.
"""
import argparse,struct,json,io,hashlib
from pathlib import Path
from PIL import Image

def read_glb(p):
 b=Path(p).read_bytes();assert b[:4]==b'glTF' and struct.unpack_from('<I',b,4)[0]==2
 n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);assert struct.unpack_from('<I',b,20+n)[0]+28+n==len(b)
 return d,b[28+n:]
def optimize(src,dst,sky=False):
 d,raw=read_glb(src);assert len(d.get('buffers',[]))==1
 before=json.loads(json.dumps(d));color=set()
 for m in d.get('materials',[]):
  for t in [m.get('pbrMetallicRoughness',{}).get('baseColorTexture'),m.get('emissiveTexture')]:
   if t:color.add(d['textures'][t['index']]['source'])
 if sky:
  for m in d.get('materials',[]):
   m.get('pbrMetallicRoughness',{}).pop('metallicRoughnessTexture',None)
 image_views={im['bufferView']:i for i,im in enumerate(d.get('images',[]))};out=bytearray();images=[];webp=set()
 for vi,v in enumerate(d.get('bufferViews',[])):
  assert v.get('buffer',0)==0
  chunk=raw[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  if vi in image_views:
   ii=image_views[vi];im=d['images'][ii]
   with Image.open(io.BytesIO(chunk))as image:
    original_size=image.size
    alpha=image.mode in ('RGBA','LA') or 'transparency' in image.info
    image=image.convert('RGBA' if alpha else 'RGB')
    if not sky:image.thumbnail((2048,2048),Image.Resampling.LANCZOS)
    buf=io.BytesIO()
    if sky and ii not in color:
     # The unlit sky never uses the packed PBR image. Retain view/image IDs
     # with a tiny placeholder, but remove the irrelevant material binding.
     image=Image.new('RGB',(1,1),(0,0,0));image.save(buf,format='PNG');im['mimeType']='image/png'
    elif ii in color and not alpha:
     image.save(buf,format='JPEG',quality=95 if sky else 93,subsampling=0,optimize=True);im['mimeType']='image/jpeg'
    else:
     image.save(buf,format='WEBP',lossless=True,method=4);im['mimeType']='image/webp';webp.add(ii)
    chunk=buf.getvalue();images.append({'image':ii,'from':original_size,'to':image.size,'bytes':len(chunk),'encoding':im['mimeType']})
  out.extend(b'\0'*((-len(out))%4));v['byteOffset']=len(out);v['byteLength']=len(chunk);out.extend(chunk)
 for t in d.get('textures',[]):
  if t.get('source') in webp:t.setdefault('extensions',{})['EXT_texture_webp']={'source':t.pop('source')}
 if webp:
  for key in ['extensionsUsed','extensionsRequired']:
   d[key]=sorted(set(d.get(key,[])+['EXT_texture_webp']))
 d['buffers'][0]['byteLength']=len(out);out.extend(b'\0'*((-len(out))%4))
 d.setdefault('asset',{}).setdefault('extras',{})['optimization']='Texture recompression; non-sky maps resized to max 2048; unused sky PBR channel removed; geometry/rig/animations unchanged. CC BY 4.0: see accompanying credits.'
 j=json.dumps(d,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 b=struct.pack('<III',0x46546c67,2,28+len(j)+len(out))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(out),0x004e4942)+out
 Path(dst).parent.mkdir(parents=True,exist_ok=True);Path(dst).write_bytes(b)
 # Byte-exact guard on every non-image view, plus clip/skin/mesh definitions.
 check,newraw=read_glb(dst)
 for k in ['meshes','accessors','nodes','skins','animations','scenes']:
  assert before.get(k)==check.get(k),k+' changed'
 for vi,v in enumerate(before.get('bufferViews',[])):
  if vi in image_views:continue
  nv=check['bufferViews'][vi]
  assert raw[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]==newraw[nv['byteOffset']:nv['byteOffset']+nv['byteLength']]
 return {'file':Path(src).name,'original_bytes':Path(src).stat().st_size,'optimized_bytes':len(b),'geometry_and_animation_bytes_unchanged':True,'images':images}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');p.add_argument('--sky',action='store_true');a=p.parse_args();print(json.dumps(optimize(a.input,a.output,a.sky),indent=2))
