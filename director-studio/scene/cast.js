// Xinghe studio cast. The geometry and skeleton are constructed from dimensions;
// this module has no character files, textures, or external asset dependencies.
import * as T from '../../vendor/three/three.module.js';

const cuts = {
  // shoulder width, waist, head scale, hip width
  male:[1,1,1,1], female:[.91,.88,1,1.04], muscular:[1.18,1.08,.98,1.05],
  broad:[1.20,1.28,1.04,1.15], slim:[.90,.82,.98,.92],
  teen:[.89,.88,1.12,.94], child:[.86,.90,1.35,.92], chibi:[.96,1,2.05,1]
};
export function makeCast(type,color){
  const [shoulders,waist,headSize,hips]=cuts[type]||cuts.male;
  const model=new T.Group(), bones={};
  const paint=(color,roughness=.76)=>new T.MeshStandardMaterial({color,roughness});
  const jacket=paint(color), pants=paint('#394756'), skin=paint('#d9a37e'), hair=paint('#342d32');
  jacket.userData.costume=true;
  const trim=paint('#ece5d3'),sole=paint('#535666'),iris=paint('#353339');
  function joint(parent,name,x,y,z=0){
    const b=new T.Bone();b.name=name;b.position.set(x,y,z);parent.add(b);bones[name]=b;return b;
  }
  function mesh(parent,geo,mat,x,y,z){
    const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function oval(parent,mat,x,y,z,w,h,d){
    const m=mesh(parent,new T.SphereGeometry(1,20,14),mat,x,y,z);m.scale.set(w,h,d);return m;
  }
  function contour(parent,mat,rows,depth=1){
    const geo=new T.LatheGeometry(rows.map(([y,r])=>new T.Vector2(r,y)),32);
    const m=mesh(parent,geo,mat,0,0,0);m.scale.z=depth;return m;
  }
  const hip=joint(model,'Hip',0,.90),spine=joint(hip,'Waist',0,.09);
  const chest=joint(spine,'Spine02',0,.34);
  contour(hip,pants,[[-.10,0],[-.09,.13*hips],[-.03,.163*hips],[.075,.154*hips],[.09,0]],.75);
  contour(spine,jacket,[[-.04,0],[-.043,.16*waist],[0,.165*waist],[.12,.156*waist],[.25,.185*shoulders],[.34,.216*shoulders],[.39,.19*shoulders],[.423,.093],[.423,0]],.67);
  contour(spine,trim,[[.393,.102],[.428,.08],[.43,.061]],.87);
  oval(spine,skin,0,.439,0,.060,.091,.060);
  const head=joint(chest,'Head',0,.222);
  const face=new T.Group();face.scale.setScalar(headSize);head.add(face);
  contour(face,skin,[[-.112,0],[-.105,.045],[-.08,.078],[-.034,.103],[.023,.113],[.083,.104],[.118,.077],[.133,0]],.90);
  oval(face,hair,0,.072,-.014,.116,.093,.106);
  const fringe=oval(face,hair,-.038,.066,.073,.078,.028,.04);fringe.rotation.z=.24;
  oval(face,skin,0,-.013,.097,.019,.023,.020);
  for(const side of [-1,1]){
    oval(face,skin,side*.109,-.003,0,.018,.029,.016);
    oval(face,iris,side*.043,.018,.091,.010,.012,.006);
    const brow=oval(face,hair,side*.044,.043,.088,.024,.005,.007);brow.rotation.z=side*.09;
  }
  oval(face,paint('#995f56'),0,-.064,.079,.022,.003,.005);
  for(const [side,s] of [['L',1],['R',-1]]){
    const arm=joint(chest,side+'_Upperarm',s*.222*shoulders,.035);
    const fore=joint(arm,side+'_Forearm',s*.048,-.274);
    const hand=joint(fore,side+'_Hand',s*.024,-.247,.015);
    const sleeve=contour(arm,jacket,[[-.302,0],[-.284,.054],[-.17,.061],[-.06,.077],[.008,.079],[.042,.048],[.048,0]],.99);
    sleeve.rotation.z=s*.17;
    const cuff=contour(fore,jacket,[[-.229,.044],[-.21,.046],[-.1,.055],[-.032,.058],[.024,.044],[.032,0]]);
    cuff.rotation.z=s*.095;
    oval(hand,skin,0,-.023,0,.045,.073,.036);
    oval(hand,skin,-s*.031,-.002,.018,.019,.043,.021);
    const thigh=joint(hip,side+'_Thigh',s*.112*hips,-.015);
    const knee=joint(thigh,side+'_Calf',0,-.423);
    const foot=joint(knee,side+'_Foot',0,-.377);
    joint(foot,side+'_ToeBase',0,-.032,.114);
    contour(thigh,pants,[[-.45,0],[-.434,.064],[-.35,.075],[-.17,.09],[-.05,.098],[.04,.08],[.057,0]],.97);
    contour(knee,pants,[[-.363,.052],[-.30,.057],[-.16,.074],[-.078,.077],[.018,.064],[.036,0]],.96);
    oval(foot,trim,0,-.018,.040,.068,.059,.123);
    oval(foot,sole,0,-.052,.042,.069,.024,.126);
  }
  return model;
}
