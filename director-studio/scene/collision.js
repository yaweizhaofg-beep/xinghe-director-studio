import * as T from '../../vendor/three/three.module.js';
const V=()=>new T.Vector3();
export function segmentDistance(a,b,c,d){
 const u=b.clone().sub(a),v=d.clone().sub(c),w=a.clone().sub(c),A=u.dot(u),B=u.dot(v),C=v.dot(v),D=u.dot(w),E=v.dot(w);let s=0,t=0;
 if(A<1e-10&&C<1e-10)return a.distanceTo(c);
 if(A<1e-10)t=T.MathUtils.clamp(E/C,0,1);
 else if(C<1e-10)s=T.MathUtils.clamp(-D/A,0,1);
 else{const den=A*C-B*B;s=den>1e-10?T.MathUtils.clamp((B*E-C*D)/den,0,1):0;t=(B*s+E)/C;if(t<0){t=0;s=T.MathUtils.clamp(-D/A,0,1);}else if(t>1){t=1;s=T.MathUtils.clamp((B-D)/A,0,1);}}
 return a.clone().addScaledVector(u,s).distanceTo(c.clone().addScaledVector(v,t));
}
function segmentBoxDistance(a,b,box){
 const delta=b.clone().sub(a),cuts=[0,1];for(const k of ['x','y','z'])if(Math.abs(delta[k])>1e-10)for(const bound of [box.min[k],box.max[k]]){const t=(bound-a[k])/delta[k];if(t>0&&t<1)cuts.push(t);}cuts.sort((x,y)=>x-y);let best=Infinity;
 const at=t=>{const p=a.clone().addScaledVector(delta,t);return p.distanceToSquared(box.clampPoint(p,V()));};
 for(let i=0;i<cuts.length-1;i++){const lo=cuts[i],hi=cuts[i+1],mid=(lo+hi)/2;let numerator=0,denominator=0;for(const k of ['x','y','z']){const p=a[k]+delta[k]*mid;if(p<box.min[k]||p>box.max[k]){const bound=p<box.min[k]?box.min[k]:box.max[k];numerator+=delta[k]*(a[k]-bound);denominator+=delta[k]*delta[k];}}const t=denominator?T.MathUtils.clamp(-numerator/denominator,lo,hi):lo;best=Math.min(best,at(lo),at(hi),at(t));}return Math.sqrt(best);
}
export function actorCapsules(item){
 const v=item.visual;if(!v?.loaded||item.hidden)return [];
 v.root.updateMatrixWorld(true);const p=name=>v.model.getObjectByName(name).getWorldPosition(V());
 const factor=v.height/1.75*Math.max(...(item.scale||[1,1,1]));const bulk=({muscular:1.16,broad:1.18,slim:.88})[item.bodyType]||1;
 const defs=[['torso','Waist','Spine02',.145],['pelvis','L_Thigh','R_Thigh',.105],['head','Head','Head',.115*(item.bodyType==='chibi'?1.8:item.bodyType==='child'?1.3:1)]];
 for(const side of ['L','R'])defs.push([side+'upperarm',side+'_Upperarm',side+'_Forearm',.058],[side+'forearm',side+'_Forearm',side+'_Hand',.048],[side+'hand',side+'_Hand',side+'_Hand',.06],[side+'thigh',side+'_Thigh',side+'_Calf',.078],[side+'calf',side+'_Calf',side+'_Foot',.058],[side+'foot',side+'_Foot',side+'_ToeBase',.04]);
 return defs.map(([name,start,end,r])=>{const a=p(start),b=p(end);if(name.endsWith('hand')&&v.palms){const side=name[0],hand=v.model.getObjectByName(side+'_Hand');b.copy(v.palms[side]).applyMatrix4(hand.matrixWorld);r=.038*(item.partScale?.[side==='L'?'leftWrist':'rightWrist']||1);}
 if(name==='torso')a.lerp(b,.25);if(name.endsWith('calf'))b.lerp(a,.12);return {name,start,end,a,b,r:r*factor*bulk*(name==='torso'&&item.bodyType==='teen'?.78:1),actor:item.id,label:item.name};});
}
function selfPair(a,b){
 if(a.start===b.start||a.start===b.end||a.end===b.start||a.end===b.end)return false;
 const pair=[a.name,b.name].sort().join(':');if(['head:torso','pelvis:torso'].includes(pair))return false;
 return true;
}
function trimmed(a,b){
 const result={...a,a:a.a.clone(),b:a.b.clone()};
 if((b.name==='torso'&&a.name.endsWith('upperarm'))||(['pelvis','torso'].includes(b.name)&&a.name.endsWith('thigh')))result.a.lerp(result.b,.55);
 return result;
}
function propBoxes(items){const boxes=[];for(const item of items.filter(i=>i.type==='prop'&&!i.hidden)){item.visual.root.updateMatrixWorld(true);item.visual.root.traverse(n=>{if(!n.isMesh)return;if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();const s=n.getWorldScale(V());boxes.push({name:item.name,id:item.id,box:n.geometry.boundingBox,inverse:n.matrixWorld.clone().invert(),scale:Math.min(Math.abs(s.x),Math.abs(s.y),Math.abs(s.z))});});}return boxes;}
function checkFrame(groups,boxes,ground=true){
 const tolerance=.008;
 for(const group of groups){
  for(const a of group){
   if(ground&&Math.min(a.a.y,a.b.y)-a.r<-.035)return {kind:'ground',message:a.label+'接触地面',part:a.name};
   for(const box of boxes){const distance=segmentBoxDistance(a.a.clone().applyMatrix4(box.inverse),a.b.clone().applyMatrix4(box.inverse),box.box)*box.scale;if(distance<a.r-tolerance)return {kind:'prop',message:a.label+'与'+box.name+'发生碰撞',part:a.name};}
  }
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){const a=group[i],b=group[j];if(!selfPair(a,b))continue;const x=trimmed(a,b),y=trimmed(b,a);if(segmentDistance(x.a,x.b,y.a,y.b)<x.r+y.r-tolerance)return {kind:'self',message:a.label+'的肢体触碰身体',part:a.name+':'+b.name};}
 }
 for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)for(const a of groups[i])for(const b of groups[j])if(segmentDistance(a.a,a.b,b.a,b.b)<a.r+b.r-tolerance)return {kind:'actor',message:a.label+'与'+b.label+'发生碰撞',part:a.name+':'+b.name};
 return null;
}
export function sceneCollision(items,previous=null){
 const groups=items.filter(i=>i.type==='actor'&&!i.hidden).map(actorCapsules).filter(g=>g.length),boxes=propBoxes(items);
 const final=checkFrame(groups,boxes);if(final)return {hit:final,groups};
 if(previous){let travel=0;const old=new Map(previous.flat().map(c=>[c.actor+':'+c.name,c]));for(const c of groups.flat()){const p=old.get(c.actor+':'+c.name);if(p)travel=Math.max(travel,c.a.distanceTo(p.a),c.b.distanceTo(p.b));}
  if(travel>10)return {hit:{kind:'sweep',message:'单次移动距离过大，请分段移动'},groups};
  const steps=Math.ceil(travel/.025);
  for(let step=1;step<steps;step++){const t=step/steps,sample=groups.map(g=>g.map(c=>{const p=old.get(c.actor+':'+c.name);return p?{...c,a:p.a.clone().lerp(c.a,t),b:p.b.clone().lerp(c.b,t),r:T.MathUtils.lerp(p.r,c.r,t)}:c;}));const hit=checkFrame(sample,boxes);if(hit)return {hit,groups};}
 }
 return {hit:null,groups};
}
