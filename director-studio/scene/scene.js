import { clone as cloneSkeleton } from '../../vendor/three/SkeletonUtils.js';
import { GLTFLoader } from '../../vendor/three/GLTFLoader.js';
import * as T from '../../vendor/three/three.module.js';
export { T };
export { OrbitControls } from '../../vendor/three/OrbitControls.js';
export { TransformControls } from '../../vendor/three/TransformControls.js';
export { createProp } from './props.js';

const matte = color => new T.MeshStandardMaterial({ color, roughness: .8 });
function shape(parent, geometry, material, x, y, z) {
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(x,y,z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const box = (p,m,x,y,z,w,h,d) => shape(p,new T.BoxGeometry(w,h,d),m,x,y,z);
export function buildSet() {
  const scene = new T.Scene();
  scene.background = new T.Color('#12151c');
  scene.fog = new T.Fog('#12151c', 14, 30);
  scene.add(new T.HemisphereLight('#f7f9ff','#6d635b',2.2));
  const light = new T.DirectionalLight('#fff0da', 2.5);
  light.position.set(-4,8,6);
  light.castShadow = true;
  light.shadow.mapSize.set(1024,1024);
  Object.assign(light.shadow.camera,{left:-7,right:7,top:7,bottom:-7});
  light.shadow.normalBias=.035;
  scene.add(light);
  const rim = new T.DirectionalLight('#c8ddff', 1.25);
  rim.position.set(3, 4, -4);
  scene.add(rim);
  const floor = shape(scene,new T.PlaneGeometry(40,40),matte('#171b22'),0,0,0);
  floor.rotation.x = -Math.PI/2;
  floor.castShadow = false;
  const grid = new T.GridHelper(14,28,'#29465a','#253445');
  grid.position.y=.008;
  scene.add(grid);
  return {scene,grid};
}

export const jointLabels = {
  leftWrist:'左手腕',rightWrist:'右手腕',leftAnkle:'左脚踝',rightAnkle:'右脚踝',
  body:'上身', head:'头部', leftArm:'左肩', rightArm:'右肩', leftElbow:'左肘', rightElbow:'右肘',
  leftLeg:'左髋', rightLeg:'右髋', leftKnee:'左膝', rightKnee:'右膝',
};
export const ages = { adult:['成人',1], teen:['少年',.83], child:['儿童',.65], elder:['长者',.91] };
export const radians = degrees=>degrees*Math.PI/180;
export function samplePath(points, progress) {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1],p[2]-points[i][2]));
  const distance=lengths.reduce((sum,n)=>sum+n,0);
  let remaining=distance*T.MathUtils.clamp(progress,0,1);
  for (let i=0;i<lengths.length;i++) {
    const length=lengths[i];
    if (remaining<=length || i===lengths.length-1) {
      const a=points[i],b=points[i+1];
      const f=length>.0001 ? remaining/length : 0;
      return {point:a.map((v,j)=>T.MathUtils.lerp(v,b[j],f)), yaw:Math.atan2(b[0]-a[0],b[2]-a[2]), distance};
    }
    remaining-=length;
  }
  return {point:points[0],yaw:0,distance};
}

export const bodyTypes={male:'标准男性',female:'标准女性',muscular:'健硕',slim:'纤细',teen:'少年',child:'儿童',broad:'宽厚',chibi:'二头身'};
export const poseNames={stand:'站立',tpose:'T型',walk:'行走',run:'跑步',sit:'坐姿',squat:'蹲下',kneel:'单膝跪',knees:'双膝跪',hips:'叉腰',lean:'倚靠',bow:'鞠躬',think:'思考',fight:'格斗',kick:'踢球',throw:'投掷',push:'推进',raise:'招手',reach:'伸手',cross:'抱臂',phone:'看手机',lie:'躺下'};
const boneNames={body:'Waist',head:'Head',leftArm:'L_Upperarm',rightArm:'R_Upperarm',leftElbow:'L_Forearm',rightElbow:'R_Forearm',leftLeg:'L_Thigh',rightLeg:'R_Thigh',leftKnee:'L_Calf',rightKnee:'R_Calf',leftWrist:'L_Hand',rightWrist:'R_Hand',leftAnkle:'L_Foot',rightAnkle:'R_Foot'};

const loader = new GLTFLoader(), modelCache = new Map();
// Keep a small set of real sole vertices (heel, toe and side edges) for ground contact.
function measureFeet(visual){
 const samples=new Map(), point=new T.Vector3();
 visual.model.traverse(mesh=>{
   if(!mesh.isSkinnedMesh)return;
   const count=mesh.geometry.attributes.position.count;
   for(let i=0;i<count;i++){
     mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
     if(point.y>visual.height*.13)continue;
     const cell=[point.x,point.z].map(v=>Math.round(v/(visual.height*.025))).join(',');
     if(!samples.has(cell)||samples.get(cell).y>point.y)samples.set(cell,{mesh,i,y:point.y});
   }
 });
 return [...samples.values()];
}
function gaitAngles(a,v,t,distance,running){
 const length=v.legLength, stride=length*(running?1.75:1.12);
 const travel=t*distance, envelope=T.MathUtils.smoothstep(Math.min(travel,distance-travel),0,stride*.32);
 const cycle=travel/stride, stance=running?.49:.60;
 for(const [side,offset,sign] of [['left',0,1],['right',.5,-1]]){
   const phase=(cycle+offset)%1, swing=phase>=stance;
   const u=swing?(phase-stance)/(1-stance):phase/stance;
   const step=stride*stance, forward=step*(swing?T.MathUtils.smoothstep(u,0,1)-.5:.5-u);
   const lift=swing?Math.sin(Math.PI*u)**2*length*(running?.19:.105):0;
   const down=length*.94-lift;
   const knee=2*Math.acos(T.MathUtils.clamp(Math.hypot(forward,down)/length,0,1));
   const hip=-Math.atan2(forward,down)-knee/2;
   a[side+'Leg']=[T.MathUtils.radToDeg(hip)*envelope,0,0];
   a[side+'Knee']=[T.MathUtils.radToDeg(knee)*envelope,0,0];
   a[side+'Ankle']=[-T.MathUtils.radToDeg(hip+knee)*envelope,0,0];
   a[side+'Arm']=[forward/step*(running?60:35)*envelope,0,9*sign];
   a[side+'Elbow']=[-(running?65:14)*envelope,0,0];
 }
 a.body=[(running?8:3)*envelope,3*Math.sin(cycle*2*Math.PI)*envelope,0];
}
export function buildActor(color,bodyType='male') {
  const root=new T.Group(),head=new T.Bone();head.position.y=1.6;root.add(head);
  const visual={root,joints:{head},loaded:false};
  visual.color=color; visual.bodyType=bodyType;
  for(const child of visual.root.children)child.visible=false;
  if (!modelCache.has(bodyType)) modelCache.set(bodyType,loader.loadAsync(new URL('../models/'+bodyType+'.glb',import.meta.url).href));
  visual.ready=modelCache.get(bodyType).then(gltf=>{
    const model=cloneSkeleton(gltf.scene);
    model.rotation.y=-Math.PI/2;
    model.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
    const height=({teen:1.5,child:1.15,chibi:.95})[bodyType]||1.75;
    visual.height=height;model.scale.setScalar(height/size.y);
    model.position.set(-(bounds.max.x+bounds.min.x)/2*model.scale.x,-bounds.min.y*model.scale.y,-(bounds.max.z+bounds.min.z)/2*model.scale.z);
    model.traverse(node=>{if(node.isMesh){node.material=new T.MeshStandardMaterial({color,roughness:.56,metalness:0});node.castShadow=node.receiveShadow=true;node.frustumCulled=false;}});
    visual.root.clear();visual.root.add(model);visual.model=model;
    visual.joints={};visual.rest={};
    model.traverse(node=>{if(node.isBone)visual.rest[node.name]=node.quaternion.clone();});
    for(const [key,name] of Object.entries(boneNames))visual.joints[key]=model.getObjectByName(name);
    root.updateMatrixWorld(true);
    visual.bases={};
    for(const [key,bone] of Object.entries(visual.joints)){
      visual.bases[key]=bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(root.getWorldQuaternion(new T.Quaternion()));
    }
    visual.parts=Object.fromEntries(Object.entries(visual.joints).map(([k,b])=>[k,b.scale.clone()]));
    visual.neck=['NeckTwist01','NeckTwist02'].map(n=>model.getObjectByName(n)).filter(Boolean);
    visual.neckBases=visual.neck.map(b=>b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(root.getWorldQuaternion(new T.Quaternion())));
    visual.pelvis=model.getObjectByName('Hip');visual.hipY=visual.pelvis.position.clone();
    visual.endpoints={leftHand:model.getObjectByName('L_Hand'),rightHand:model.getObjectByName('R_Hand'),leftFoot:model.getObjectByName('L_Foot'),rightFoot:model.getObjectByName('R_Foot'),leftElbow:model.getObjectByName('L_Forearm'),rightElbow:model.getObjectByName('R_Forearm'),leftKnee:model.getObjectByName('L_Calf'),rightKnee:model.getObjectByName('R_Calf'),head:model.getObjectByName('Head')};
    const world=n=>model.getObjectByName(n).getWorldPosition(new T.Vector3());
    visual.legLength=world('L_Thigh').distanceTo(world('L_Calf'))+world('L_Calf').distanceTo(world('L_Foot'));
    visual.soles=measureFeet(visual);
    visual.palms={};
    for(const side of ['L','R']){
      const hand=model.getObjectByName(side+'_Hand'),elbow=model.getObjectByName(side+'_Forearm');
      const origin=hand.getWorldPosition(new T.Vector3());
      const axis=origin.clone().sub(elbow.getWorldPosition(new T.Vector3())).normalize();
      let reach=0;const point=new T.Vector3();
      model.traverse(mesh=>{
        if(!mesh.isSkinnedMesh)return;
        const skin=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
        const index=mesh.skeleton.bones.indexOf(hand);
        for(let i=0;i<skin.count;i++)if(skin.getX(i)===index&&weights.getX(i)>.45){
          mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
          reach=Math.max(reach,point.sub(origin).dot(axis));
        }
      });
      visual.palms[side]=hand.worldToLocal(origin.addScaledVector(axis,Math.max(0,reach-.035*height/1.75)));
    }
    visual.chestBindInverse=model.getObjectByName('Spine02').getWorldQuaternion(new T.Quaternion()).invert();
    visual.armBeforeClavicle={left:new T.Quaternion(),right:new T.Quaternion()};
    visual.clavicles=['L','R'].map(side=>model.getObjectByName(side+'_Clavicle'));

    visual.loaded=true;return visual;
  }).catch(error=>{visual.error=error.message;modelCache.delete(bodyType);return visual;});
  return visual;
}
// Shoulder XYZ and elbow flexion for each arm; fit palm reach separately for each body.
const crossedArms={"male": [3, -63, -4, -105, -30, 61, 26, -98],
  "female": [10, -62, 22, -99, -65, 60, 24, -85],
  "muscular": [-38, -62, -26, -75, -60, 60, 26, -74],
  "slim": [-13, -62, -11, -93, -34, 60, 18, -91],
  "teen": [5, -62, 0, -109, -48, 61, 26, -90],
  "child": [-30, -62, -25, -89, -48, 60, 26, -91],
  "broad": [-35, -63, -25, -76, -46, 60, 27, -84],
  "chibi": [-37, -61, -25, -75, -57, 61, 26, -84]};
function anglesFor(pose) {
 const a={};const put=(k,x=0,y=0,z=0)=>a[k]=[x,y,z];
 if(pose==='tpose'){put('leftArm',0,0,80);put('rightArm',0,0,-80);}
 if(['sit','squat','kneel','knees'].includes(pose)){
  for(const side of ['left','right']){put(side+'Leg',pose==='squat'?-110:-85);put(side+'Knee',pose==='squat'?135:90);}
  if(pose==='squat'){put('leftLeg',-86,-12,24);put('rightLeg',-86,12,-24);put('body',15);}
  if(pose==='kneel'){put('rightLeg',15);put('rightKnee',125);}
  if(pose==='knees'){put('leftLeg',0);put('rightLeg',0);put('leftKnee',135);put('rightKnee',135);}
 }
 if(pose==='raise'){put('rightArm',-135,0,-18);put('rightElbow',-45);}
 if(pose==='reach'||pose==='push'){put('rightArm',-85);put('leftArm',-85);}
 if(pose==='bow'){put('body',45);put('head',20);}
 if(pose==='lean'){put('body',0,0,14);put('leftKnee',30);}
 if(pose==='think'||pose==='phone'){put('rightArm',pose==='think'?-86:-8,55,12);put('rightElbow',pose==='think'?-119:-120);put('head',12);}

 if(pose==='hips'){put('leftArm',18,0,-15);put('rightArm',18,0,15);put('leftElbow',-88);put('rightElbow',-88);}
 if(pose==='fight'){put('leftArm',-70);put('rightArm',-55);put('leftElbow',-85);put('rightElbow',-105);put('leftLeg',-20);put('rightKnee',30);}
 if(pose==='kick'){put('leftLeg',-75);put('leftKnee',15);put('rightArm',-45);}
 if(pose==='throw'){put('rightArm',-125,0,-35);put('rightElbow',-80);put('body',0,-25);}
 if(pose==='walk'||pose==='run'){put('leftLeg',-35);put('rightLeg',25);put('rightKnee',45);put('rightArm',-35);put('leftArm',25);}
 if(pose==='run'){put('body',12);put('leftLeg',-60);put('rightKnee',82);put('rightArm',-52);put('rightElbow',-75);put('leftElbow',-70);}
 return a;
}
// Animation guardrails, in the character's neutral anatomical frame.
export function jointRange(key){
 const left=key.startsWith('left');
 if(key.endsWith('Knee'))return [[0,135],[0,0],[0,0]];
 if(key.endsWith('Elbow'))return [[-140,0],[0,0],[0,0]];
 if(key.endsWith('Wrist'))return [[-55,55],[0,0],[-22,22]];
 if(key.endsWith('Ankle'))return [[-25,40],[-8,8],[-16,16]];
 if(key.endsWith('Arm'))return [[-155,45],[-60,60],left?[-25,145]:[-145,25]];
 if(key.endsWith('Leg'))return [[-115,25],[-32,32],left?[-20,45]:[-45,20]];
 if(key==='head')return [[-50,55],[-70,70],[-32,32]];
 return [[-25,45],[-35,35],[-25,25]];
}
function limitedAngles(key,degrees){
 const bounds=jointRange(key);
 const angles=degrees.map((v,i)=>T.MathUtils.clamp(Number.isFinite(v)?v:0,...bounds[i]));
 // A rectangular per-axis range admits impossible corner poses. Taper multi-axis extremes.
 if(!/Elbow|Knee/.test(key)){
   const usage=angles.map((x,i)=>x/(Math.abs(bounds[i][x<0?0:1])||1));
   const budget=/Arm|Leg/.test(key)?1.40:1;
   const shrink=Math.max(1,Math.hypot(...usage)/budget);
   return angles.map(x=>radians(x/shrink));
 }
 return angles.map(radians);
}
function applyAngles(v,key,angles){
 const basis=v.bases[key],bone=v.joints[key];
 const delta=new T.Quaternion().setFromEuler(new T.Euler(...limitedAngles(key,angles)));
 bone.quaternion.copy(basis).multiply(delta).multiply(basis.clone().invert()).multiply(v.rest[bone.name]);
}
export function constrainBone(v,key){
 const bone=v.joints[key],basis=v.bases[key];
 const delta=basis.clone().invert().multiply(bone.quaternion).multiply(v.rest[bone.name].clone().invert()).multiply(basis).normalize();
 const e=new T.Euler().setFromQuaternion(delta,'XYZ');
 applyAngles(v,key,[e.x,e.y,e.z].map(T.MathUtils.radToDeg));
}
function armClearance(v,side){
 const pos=bone=>bone.getWorldPosition(new T.Vector3());
 const arm=v.joints[side+'Arm'],elbow=v.joints[side+'Elbow'],wrist=v.joints[side+'Wrist'];
 const shoulder=pos(arm),e=pos(elbow).sub(shoulder),w=pos(wrist).sub(shoulder);
 const length=e.length()+e.distanceTo(w)||1;
 const inverse=v.model.getObjectByName('Spine02').getWorldQuaternion(new T.Quaternion()).multiply(v.chestBindInverse).invert();
 e.applyQuaternion(inverse).divideScalar(length);w.applyQuaternion(inverse).divideScalar(length);
 return Math.min(e.z+.20,w.z+.27,.018-Math.max(0,e.y)*Math.max(0,-e.z));
}
// Search only the rig's permitted anatomical axes, starting from its current pose.
export function reachJoint(item,name,target,chain){
 const v=item.visual,endpoint=v.endpoints[name],side=name.startsWith('left')?'left':'right';
 const isArm=/Hand|Elbow/.test(name);
 const at=b=>b.getWorldPosition(new T.Vector3());
 const arm=v.joints[side+'Arm'],elbow=v.joints[side+'Elbow'];
 const length=at(elbow).distanceTo(at(arm))+at(elbow).distanceTo(at(v.joints[side+'Wrist']));
 function cost(){
   if(isArm&&armClearance(v,side)<0)return Infinity;
   return at(endpoint).distanceToSquared(target)/(length*length);
 }
 const xyz=(key)=>{
   const bone=v.joints[key],basis=v.bases[key];
   const delta=basis.clone().invert().multiply(bone.quaternion).multiply(v.rest[bone.name].clone().invert()).multiply(basis);
   const e=new T.Euler().setFromQuaternion(delta.normalize(),'XYZ');
   return [e.x,e.y,e.z].map(T.MathUtils.radToDeg);
 };
 // Remove the display-only clavicle correction before reading/writing local overrides.
 if(isArm && v.armBeforeClavicle?.[side]){
   v.clavicles[side==='left'?0:1].quaternion.copy(v.rest[v.clavicles[side==='left'?0:1].name]);
   arm.quaternion.copy(v.armBeforeClavicle[side]);v.root.updateMatrixWorld(true);
 }
 let score=cost();
 for(const step of [8,5,3,1.5]){
   for(const key of chain){
     const bone=v.joints[key],base=xyz(key);let best=bone.quaternion.clone();
     for(let axis=0;axis<3;axis++){
       if(jointRange(key)[axis][1]===jointRange(key)[axis][0])continue;
       for(const sign of [-1,1]){
         const angles=[...base];angles[axis]+=sign*step;applyAngles(v,key,angles);bone.updateMatrixWorld(true);
         const next=cost();
         if(next+.000001<score){best=bone.quaternion.clone();score=next;}
       }
     }
     bone.quaternion.copy(best);bone.updateMatrixWorld(true);
   }
 }
 item.boneOverrides||={};
 for(const key of chain)item.boneOverrides[key]=v.joints[key].quaternion.toArray();
 if(isArm){v.armBeforeClavicle[side].copy(arm.quaternion);}
}
export function renderPose(actor,t,distance) {
 const v=actor.visual;
 if(!v.loaded)return;
 const scale=actor.scale||[1,1,1];v.root.scale.fromArray(scale);
 const rotation=actor.rotation||[0,0,0];v.root.rotation.x=radians(rotation[0]);v.root.rotation.z=radians(rotation[2]);
 v.model.traverse(n=>{if(n.isBone&&v.rest[n.name])n.quaternion.copy(v.rest[n.name]);});
 const a=anglesFor(actor.pose);
 // Adjust clearance for rigs with different shoulder widths and leg lengths.
 const type=v.bodyType;
 for(const [side,sign] of [['left',1],['right',-1]]){
   if(actor.pose==='hips'&&['female','teen'].includes(type)){a[side+'Arm']=[15,-30*sign,12*sign];a[side+'Elbow']=[-80,0,0];}
   if(actor.pose==='phone'&&side==='right')a.rightArm[2]-=({female:16,slim:4})[type]||0;
   if(actor.pose==='cross'){
     const angles=crossedArms[type]||crossedArms.male,offset=sign===1?0:4;
     a[side+'Arm']=angles.slice(offset,offset+3);
     a[side+'Elbow']=[angles[offset+3],0,0];
   }
   if(type==='chibi'&&['sit','squat','knees'].includes(actor.pose)){
     a[side+'Leg'][2]+=4*sign;a[side+'Knee'][0]-=4;
   }
 }
 const floorY=v.root.position.y;
 if(distance)gaitAngles(a,v,t,distance/Math.max(.1,scale[1]),actor.pose==='run');
 v.root.updateMatrixWorld(true);
 for(const [key,bone] of Object.entries(v.joints)){
  if(!bone)continue;
  const preset=a[key]||[0,0,0],user=actor.jointAxes?.[key]||[actor.joints?.[key]||0,0,0];
  bone.scale.copy(v.parts[key]).multiplyScalar(T.MathUtils.clamp(actor.partScale?.[key]||1,.75,1.35));
  const degrees=preset.map((x,i)=>x+user[i]);
  if(key==='head' && v.neck.length){
    const step=new T.Quaternion().setFromEuler(new T.Euler(...limitedAngles(key,degrees).map(x=>x/(1+v.neck.length))));
    v.neck.forEach((b,i)=>{const basis=v.neckBases[i];b.quaternion.copy(basis).multiply(step).multiply(basis.clone().invert()).multiply(v.rest[b.name]);});
    applyAngles(v,key,degrees.map(x=>x/(1+v.neck.length)));
  }else applyAngles(v,key,degrees);
  if(actor.boneOverrides?.[key]){
    bone.quaternion.fromArray(actor.boneOverrides[key]);
    constrainBone(v,key);
  }
  bone.updateMatrixWorld(true);
 }
 // Share high-arm elevation with the shoulder girdle while preserving upper-arm orientation.
 for(const [i,side] of ['left','right'].entries()){
   const clavicle=v.clavicles[i],arm=v.joints[side+'Arm'];
   // The same limit also applies to sliders, clips and poses stored by older versions.
   if(armClearance(v,side)<0){
     const wanted=arm.quaternion.clone(),rest=v.rest[arm.name];
     for(let i=1;i<=12;i++){
       arm.quaternion.slerpQuaternions(wanted,rest,i/12);arm.updateMatrixWorld(true);
       if(armClearance(v,side)>=0)break;
     }
   }
   v.armBeforeClavicle[side].copy(arm.quaternion);
   if(!clavicle)continue;
   const elbow=v.joints[side+'Elbow'].getWorldPosition(new T.Vector3());
   const direction=elbow.sub(arm.getWorldPosition(new T.Vector3())).normalize().applyQuaternion(v.root.getWorldQuaternion(new T.Quaternion()).invert());
   const rise=T.MathUtils.clamp((Math.acos(T.MathUtils.clamp(-direction.y,-1,1))-1.20)*.12,0,.095);
   if(!rise||type==='chibi')continue;
   const world=arm.getWorldQuaternion(new T.Quaternion());
   const axis=new T.Vector3(0,0,i?-1:1).applyQuaternion(v.root.getWorldQuaternion(new T.Quaternion())).applyQuaternion(clavicle.parent.getWorldQuaternion(new T.Quaternion()).invert());
   clavicle.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis,rise));clavicle.updateWorldMatrix(true,false);
   arm.quaternion.copy(clavicle.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
   arm.updateMatrixWorld(true);
 }
 if(rotation[0]||rotation[2]){
   const pivot=new T.Vector3(0,v.height*scale[1]*.5,0);
   v.root.position.add(pivot.clone().sub(pivot.applyQuaternion(v.root.quaternion)));
 }
 if((distance || rotation[0] || rotation[2]) && v.soles.length){
   v.root.updateMatrixWorld(true);
   const point=new T.Vector3();let low=Infinity;
   for(const {mesh,i} of v.soles)low=Math.min(low,mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).y);
   v.root.position.y+=distance?floorY-low:Math.max(0,floorY-low);
 }
 if(['sit','squat','kneel','knees'].includes(actor.pose))v.root.position.y-=({sit:.42,squat:.62,kneel:.55,knees:.55})[actor.pose]*(scale[1]||1)*v.height/1.75;
 if(actor.pose==='lie'){v.root.rotation.x=-Math.PI/2;v.root.position.y+=.2;}
 // Keep crouching and kneeling presets above their placement plane; explicit negative
 // positions remain collision errors. This corrects the preset, not a dragged foot.
 if(['sit','squat','kneel','knees'].includes(actor.pose)){
  v.root.updateMatrixWorld(true);const factor=v.height/1.75*Math.max(...scale),bulk=({muscular:1.16,broad:1.18,slim:.88})[actor.bodyType]||1;
  let low=Infinity;for(const side of ['L','R'])for(const [bone,r] of [[side+'_Thigh',.078],[side+'_Calf',.078],[side+'_Foot',.04],[side+'_ToeBase',.04]])low=Math.min(low,v.model.getObjectByName(bone).getWorldPosition(new T.Vector3()).y-r*factor*bulk);
  const plane=actor.pos?.[1]||0;if(low<plane)v.root.position.y+=plane-low;
 }
}

