import { makeCast } from './cast.js';
import * as T from '../director-demo/vendor/three.module.js';
export { T };
export { OrbitControls } from '../director-demo/vendor/OrbitControls.js';
export { TransformControls } from '../director-demo/vendor/TransformControls.js';
export { createProp } from '../director-demo/props.js';

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
const boneNames={body:'Waist',head:'Head',leftArm:'L_Upperarm',rightArm:'R_Upperarm',leftElbow:'L_Forearm',rightElbow:'R_Forearm',leftLeg:'L_Thigh',rightLeg:'R_Thigh',leftKnee:'L_Calf',rightKnee:'R_Calf'};

export function buildActor(color,bodyType='male') {
  const root=new T.Group(),head=new T.Bone();head.position.y=1.6;root.add(head);
  const visual={root,joints:{head},loaded:false};
  visual.color=color; visual.bodyType=bodyType;
  for(const child of visual.root.children)child.visible=false;
  visual.ready=Promise.resolve().then(()=>{
    const model=makeCast(bodyType,color);
    model.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
    const height=({teen:1.5,child:1.15,chibi:.95})[bodyType]||1.75;
    visual.height=height;model.scale.setScalar(height/size.y);
    model.position.set(-(bounds.max.x+bounds.min.x)/2*model.scale.x,-bounds.min.y*model.scale.y,-(bounds.max.z+bounds.min.z)/2*model.scale.z);
    visual.root.clear();visual.root.add(model);visual.model=model;
    visual.joints={};visual.rest={};
    model.traverse(node=>{if(node.isBone)visual.rest[node.name]=node.quaternion.clone();});
    for(const [key,name] of Object.entries(boneNames))visual.joints[key]=model.getObjectByName(name);
    visual.pelvis=model.getObjectByName('Hip');visual.hipY=visual.pelvis.position.clone();
    visual.endpoints={leftHand:model.getObjectByName('L_Hand'),rightHand:model.getObjectByName('R_Hand'),leftFoot:model.getObjectByName('L_Foot'),rightFoot:model.getObjectByName('R_Foot'),leftElbow:model.getObjectByName('L_Forearm'),rightElbow:model.getObjectByName('R_Forearm'),leftKnee:model.getObjectByName('L_Calf'),rightKnee:model.getObjectByName('R_Calf'),head:model.getObjectByName('Head')};
    visual.loaded=true;return visual;
  }).catch(error=>{visual.error=error.message;return visual;});
  return visual;
}
function anglesFor(pose) {
 const a={};const put=(k,x=0,y=0,z=0)=>a[k]=[x,y,z];
 if(pose==='tpose'){put('leftArm',0,0,80);put('rightArm',0,0,-80);}
 if(['sit','squat','kneel','knees'].includes(pose)){
  for(const side of ['left','right']){put(side+'Leg',pose==='squat'?-110:-85);put(side+'Knee',pose==='squat'?135:90);}
  if(pose==='kneel'){put('rightLeg',15);put('rightKnee',125);}
  if(pose==='knees'){put('leftLeg',0);put('rightLeg',0);put('leftKnee',135);put('rightKnee',135);}
 }
 if(pose==='raise'){put('rightArm',-145,0,20);put('rightElbow',-45);}
 if(pose==='reach'||pose==='push'){put('rightArm',-85);put('leftArm',-85);}
 if(pose==='bow'){put('body',45);put('head',20);}
 if(pose==='lean'){put('body',0,0,14);put('leftKnee',30);}
 if(pose==='think'||pose==='phone'){put('rightArm',-35,0,-18);put('rightElbow',-110);put('head',20);}
 if(pose==='cross'){put('leftArm',-35,0,28);put('rightArm',-35,0,-28);put('leftElbow',-115,45);put('rightElbow',-115,-45);}
 if(pose==='hips'){put('leftArm',0,0,35);put('rightArm',0,0,-35);put('leftElbow',-70);put('rightElbow',-70);}
 if(pose==='fight'){put('leftArm',-70);put('rightArm',-55);put('leftElbow',-85);put('rightElbow',-105);put('leftLeg',-20);put('rightKnee',30);}
 if(pose==='kick'){put('leftLeg',-75);put('leftKnee',15);put('rightArm',-45);}
 if(pose==='throw'){put('rightArm',-125,0,-35);put('rightElbow',-80);put('body',0,-25);}
 if(pose==='walk'||pose==='run'){put('leftLeg',-35);put('rightLeg',25);put('rightKnee',45);put('rightArm',-35);put('leftArm',25);}
 return a;
}
export function renderPose(actor,t,distance) {
 const v=actor.visual;
 if(!v.loaded)return;
 const scale=actor.scale||[1,1,1];v.root.scale.fromArray(scale);
 const rotation=actor.rotation||[0,0,0];v.root.rotation.x=radians(rotation[0]);v.root.rotation.z=radians(rotation[2]);
 v.model.traverse(n=>{if(n.isBone&&v.rest[n.name])n.quaternion.copy(v.rest[n.name]);});
 const a=anglesFor(actor.pose);
 const gait=distance&&t>0&&t<1?Math.sin(t*distance*7)*Math.min(1,10*t,10*(1-t)):0;
 for(const [side,sign] of [['left',1],['right',-1]]){
  if(gait){a[side+'Leg']=[30*gait*sign,0,0];a[side+'Knee']=[Math.max(0,-gait*sign)*38,0,0];a[side+'Arm']=[-20*gait*sign,0,0];}
 }
 v.root.updateMatrixWorld(true);
 for(const [key,bone] of Object.entries(v.joints)){
  if(!bone)continue;
  const preset=a[key]||[0,0,0],user=actor.jointAxes?.[key]||[actor.joints?.[key]||0,0,0];
  const q=new T.Quaternion().setFromEuler(new T.Euler(...preset.map((x,i)=>radians(x+user[i]))));
  const parentQ=bone.parent.getWorldQuaternion(new T.Quaternion());
  const rootQ=v.root.getWorldQuaternion(new T.Quaternion());
  const basis=parentQ.clone().invert().multiply(rootQ);
  bone.quaternion.premultiply(basis.clone().multiply(q).multiply(basis.invert()));
  if(actor.boneOverrides?.[key])bone.quaternion.fromArray(actor.boneOverrides[key]);
  bone.updateMatrixWorld(true);
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

