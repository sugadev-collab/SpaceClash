// All browser-storage access is isolated here; an adapter can be replaced with
// an IndexedDB/HTTP implementation later, without changing game mechanics.
export function createBrowserStorage(provider=()=>globalThis.localStorage){
 return {
  read(key){try{const raw=provider().getItem(key);return {ok:true,found:raw!==null,raw};}catch(error){return {ok:false,error};}},
  write(key,raw){try{provider().setItem(key,raw);return {ok:true};}catch(error){return {ok:false,error};}}
 };
}
