// Post-skin edge constraints for the transition between bones. Keep rigidly
// weighted surfaces pinned. UV duplicates share corrections, but nearby surfaces
// on different parts never gain edges. Rest geometry and GLBs remain unchanged.
import * as T from '../../vendor/three/three.module.js';

export function preserveJointVolume(mesh){
  if(!mesh.isSkinnedMesh)return;
  const geometry=mesh.geometry=mesh.geometry.clone();
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
