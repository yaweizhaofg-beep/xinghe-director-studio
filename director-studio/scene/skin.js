// Post-skin edge constraints for the transition between bones. Keep rigidly
// weighted surfaces pinned. UV duplicates share corrections, but nearby surfaces
// on different parts never gain edges. Rest geometry and GLBs remain unchanged.
import * as T from '../../vendor/three/three.module.js';

// The supplied meshes have a recessed, hard-edged shoulder socket. Fair only
// that ring in bind space and spread its influences across connected triangles.
function softenShoulderSockets(mesh,geometry){
  const {position,skinWeight,skinIndex}=geometry.attributes;
  const inverse=mesh.matrixWorld.clone().invert();
  const pivot=side=>mesh.skeleton.bones.find(b=>b.name===side+'_Upperarm').getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
  const left=pivot('L'),right=pivot('R'),width=left.distanceTo(right);
  const verts=[],coords=[],group=[],lookup=new Map(),near=[],weights=[],neighbors=[];
  for(let i=0;i<position.count;i++){
    const p=new T.Vector3().fromBufferAttribute(position,i),key=p.toArray().join('/');
    if(!lookup.has(key)){
      lookup.set(key,coords.length);coords.push(p);neighbors.push(new Set());verts.push([]);
      near.push(1-T.MathUtils.smoothstep(Math.min(p.distanceTo(left),p.distanceTo(right))/width,.25,.57));
      const w=new Map();
      for(let k=0;k<4;k++){const n=skinWeight.getComponent(i,k),j=skinIndex.getComponent(i,k);if(n)w.set(j,(w.get(j)||0)+n);}
      weights.push(w);
    }
    const id=lookup.get(key);group.push(id);verts[id].push(i);
  }
  const idx=geometry.index;
  for(let i=0;i<(idx?.count||position.count);i+=3)for(let k=0;k<3;k++){
    const a=group[idx?idx.getX(i+k):i+k],b=group[idx?idx.getX(i+(k+1)%3):i+(k+1)%3];
    if(a!==b){neighbors[a].add(b);neighbors[b].add(a);}
  }
  const active=coords.map((_,i)=>i).filter(i=>near[i]>0&&neighbors[i].size);
  for(let pass=0;pass<16;pass++){
    const points=[],next=[];
    for(const i of active){
      const f=near[i]*.52,mean=new T.Vector3(),mix=new Map();
      for(const [b,w] of weights[i])mix.set(b,w*(1-f));
      for(const j of neighbors[i]){
        mean.add(coords[j]);
        for(const [b,w] of weights[j])mix.set(b,(mix.get(b)||0)+w*f/neighbors[i].size);
      }
      points.push(coords[i].clone().lerp(mean.divideScalar(neighbors[i].size),f));
      next.push(new Map([...mix].sort((a,b)=>b[1]-a[1]).slice(0,4)));
    }
    active.forEach((i,k)=>{coords[i]=points[k];weights[i]=next[k];});
  }
  for(const i of active){
    const p=coords[i],entries=[...weights[i]],sum=entries.reduce((n,e)=>n+e[1],0);
    for(const v of verts[i]){
      position.setXYZ(v,p.x,p.y,p.z);
      for(let k=0;k<4;k++){skinIndex.setComponent(v,k,entries[k]?.[0]||0);skinWeight.setComponent(v,k,(entries[k]?.[1]||0)/sum);}
    }
  }
  // Preserve authored shading elsewhere; smooth UV-seam duplicates in the socket.
  const authored=geometry.attributes.normal.clone();geometry.computeVertexNormals();
  const computed=geometry.attributes.normal,n=new T.Vector3(),tmp=new T.Vector3();
  for(let i=0;i<verts.length;i++){
    n.set(0,0,0);for(const v of verts[i])n.add(tmp.fromBufferAttribute(computed,v));n.normalize();
    for(const v of verts[i]){tmp.fromBufferAttribute(authored,v).lerp(n,near[i]).normalize();computed.setXYZ(v,tmp.x,tmp.y,tmp.z);}
  }
}
export function preserveJointVolume(mesh){
  if(!mesh.isSkinnedMesh)return;
  const geometry=mesh.geometry=mesh.geometry.clone();
  softenShoulderSockets(mesh,geometry);
  const {position,skinWeight,skinIndex}=geometry.attributes;
  const index=geometry.index, reps=[],unique=new Map(),vertexIds=[],free=[],edges=[];
  for(let i=0;i<position.count;i++){
    const key=[position.getX(i),position.getY(i),position.getZ(i)].join('/');
    if(!unique.has(key)){
      unique.set(key,reps.length);reps.push(i);
      const strongest=Math.max(...[0,1,2,3].map(k=>skinWeight.getComponent(i,k)));
      free.push(Math.min(1,(1-strongest)*4));
    }
    vertexIds.push(unique.get(key));
  }
  const used=new Set(),edgeKeys=new Set(),v=new T.Vector3(),w=new T.Vector3();
  for(let i=0;i<(index?.count||position.count);i+=3)for(let k=0;k<3;k++){
    const a=vertexIds[index?index.getX(i+k):i+k],b=vertexIds[index?index.getX(i+(k+1)%3):i+(k+1)%3];
    if(a===b||free[a]+free[b]<.025)continue;
    const key=Math.min(a,b)*reps.length+Math.max(a,b);if(edgeKeys.has(key))continue;
    edgeKeys.add(key);
    const rest=v.fromBufferAttribute(position,reps[a]).distanceTo(w.fromBufferAttribute(position,reps[b]));
    if(rest<1e-7)continue;
    used.add(a);used.add(b);edges.push(a,b,rest);
  }
  const links=Float64Array.from(edges),active=[...used];
  const output=new T.BufferAttribute(new Float32Array(position.count*3),3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('jointCorrection',output);
  function patch(material){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute vec3 jointCorrection;\n'+shader.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\ntransformed += jointCorrection;');
    };
    material.customProgramCacheKey=()=>'joint-edge-correction-v1';
  }
  patch(mesh.material);
  mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});patch(mesh.customDepthMaterial);
  mesh.customDistanceMaterial=new T.MeshDistanceMaterial();patch(mesh.customDistanceMaterial);
  const native=mesh.getVertexPosition.bind(mesh);
  mesh.getVertexPosition=(i,out)=>{native(i,out);return out.add(w.fromBufferAttribute(output,i));};
  const current=new Float32Array(reps.length*3),base=current.slice();
  const mats=mesh.skeleton.bones.map(()=>new T.Matrix4()),next=new T.Matrix4();
  let initialized=false;
  function refresh(){
    let changed=false;
    for(let i=0;i<mats.length;i++){
      next.multiplyMatrices(mesh.bindMatrixInverse,mesh.skeleton.bones[i].matrixWorld)
        .multiply(mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix);
      if(!initialized||next.elements.some((x,j)=>Math.abs(x-mats[i].elements[j])>1e-6)){mats[i].copy(next);changed=true;}
    }
    if(!changed)return;
    initialized=true;
    for(const id of active){
      const i=reps[id];v.fromBufferAttribute(position,i);const o=id*3;
      current[o]=current[o+1]=current[o+2]=0;
      for(let k=0;k<4;k++){
        const weight=skinWeight.getComponent(i,k);if(!weight)continue;
        w.copy(v).applyMatrix4(mats[skinIndex.getComponent(i,k)]);
        current[o]+=weight*w.x;current[o+1]+=weight*w.y;current[o+2]+=weight*w.z;
      }
    }
    base.set(current);
    for(let pass=0;pass<5;pass++)for(let k=0;k<links.length;k+=3){
      const a=links[k],b=links[k+1],rest=links[k+2],i=3*a,j=3*b;
      const x=current[j]-current[i],y=current[j+1]-current[i+1],z=current[j+2]-current[i+2],len=Math.sqrt(x*x+y*y+z*z);
      if(len<1e-8||len>=.88*rest&&len<=1.16*rest)continue;
      const step=.7*(len-T.MathUtils.clamp(len,.88*rest,1.16*rest))/(len*(free[a]+free[b]));
      const l=free[a]*step,r=free[b]*step;
      current[i]+=l*x;current[i+1]+=l*y;current[i+2]+=l*z;
      current[j]-=r*x;current[j+1]-=r*y;current[j+2]-=r*z;
    }
    for(let i=0;i<vertexIds.length;i++){const j=vertexIds[i]*3;output.setXYZ(i,current[j]-base[j],current[j+1]-base[j+1],current[j+2]-base[j+2]);}
    output.needsUpdate=true;
  }
  // Renderers update scene matrices before this hook (including blended clips).
  mesh.onBeforeRender=refresh;mesh.onBeforeShadow=refresh;
  return refresh;
}
