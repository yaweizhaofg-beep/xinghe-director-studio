import {clipsFor,routeClips,phase,routePhase,liveClip} from './sequence.js';
import { icon, icon as assetIcon, iconButton, initializeIcons } from './icons.js?v=20261118-xinghe2';
import { sceneCollision } from './collision.js?v=20261117-collision5';
import { T, OrbitControls, TransformControls, createProp, buildSet, buildActor, renderPose, samplePath, ages, jointRange, constrainBone, jointLabels, bodyTypes, poseNames } from './scene.js?v=rig-limits1';

const $ = id => document.getElementById(id);
const stage = $('stage'), preview = $('preview');
const { scene, grid } = buildSet();
const sceneCamera = new T.PerspectiveCamera(48,1,.05,60);
sceneCamera.position.set(4,3.3,8.5);
const filmCamera = new T.PerspectiveCamera(40,16/9,.05,60);
const defaultAim = new T.Vector3(0,1.05,0);
const buildRenderer = () => {
  const renderer = new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.shadowMap.enabled=true;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  return renderer;
};
const viewport = buildRenderer(), film = buildRenderer();
stage.prepend(viewport.domElement); preview.append(film.domElement);
const orbit = new OrbitControls(sceneCamera,viewport.domElement);
orbit.target.set(0,.95,0); orbit.enableDamping=true; orbit.minDistance=2; orbit.maxDistance=28; orbit.update();
const transform = new TransformControls(sceneCamera,viewport.domElement);
transform.setSize(.75); scene.add(transform.getHelper());
const handle = new T.Object3D(); scene.add(handle);
const pathGuide = new T.Group(); scene.add(pathGuide);
const floorPlane = new T.Plane(new T.Vector3(0,1,0),0), raycaster = new T.Raycaster();
const exportCanvas = document.createElement('canvas'), output = exportCanvas.getContext('2d');
const colors=['#4f8ef7','#f75353','#41c554','#e2bb66'];
const propNames={chair:'椅子',table:'桌子',window:'窗户',lamp:'落地灯',bed:'床',dishes:'餐具',car:'汽车'};
const key='xinghe.director-studio.libtv.v2';
let safeScene=null,safeShapes=null,safeTime=0,checkingCollision=false,collisionBlocked=false;
let inspectorTab='properties', history=[], historyIndex=-1, restoring=false, gizmoMode='translate', jointDrag=null;
const entity = (id,name,type,pos,extras={}) => ({id,name,type,pos,begin:0,seconds:3,path:[],...extras});
const base = {
  aspect:'16:9', names:false, camera:'wide',
  items:[
    entity('a','角色A','actor',[0,0,0],{age:'adult',bodyType:'male',pose:'stand',joints:{},yaw:0,color:'#4f8ef7'}),
    entity('b','角色B','actor',[-1.8,0,0],{age:'adult',bodyType:'female',pose:'stand',joints:{},yaw:0,color:'#f75353'}),
    entity('c','角色C','actor',[1.6,0,0],{age:'child',bodyType:'child',pose:'stand',joints:{},yaw:-.6,color:'#41c554'}),
    entity('wide','机位1','camera',[0,2.2,7],{focal:35,aim:'',keys:[]}),
  ],
};
let data;
try {
  const saved=JSON.parse(localStorage.getItem(key)||'null');
  if (saved?.items?.some(item=>item.type==='camera')) data=saved;
} catch {}
data ||= structuredClone(base);
let selectedClip=null;
let currentId='a', cameraMode=false, routeDraft=null, time=0, playing=false, recorder=null, previousFrame=0;
const get = id => data.items.find(item=>item.id===id);
const active = () => get(currentId);
function shot(){
  const cameras=data.items.filter(i=>i.type==='camera'&&!i.hidden&&liveClip(i,time)?.kind==='camera');
  return cameras.sort((a,b)=>liveClip(b,time).start-liveClip(a,time).start || Number(b.id===data.camera)-Number(a.id===data.camera))[0]||get(data.camera);
}
const setStatus = message => { $('status').textContent=message; };
function save() {
  if(!checkingCollision&&allModelsReady()){updateScene();if(!enforceCollisions())return;}
  const {items,...settings}=data;
  try {
    const value=JSON.stringify({...settings,items:items.map(({visual,tag,...item})=>item)});
    localStorage.setItem(key,value);
    if(!restoring&&history[historyIndex]!==value){history=history.slice(0,historyIndex+1);history.push(value);if(history.length>60)history.shift();historyIndex=history.length-1;}
    $('undo').disabled=historyIndex<=0;$('redo').disabled=historyIndex>=history.length-1;
  } catch { setStatus('保存失败，建议先下载参考素材。'); }
}
function allModelsReady(){return data.items.filter(i=>i.type==='actor').every(i=>i.visual?.loaded);}
function updateModelStatus(){
 const actors=data.items.filter(i=>i.type==='actor'),failed=actors.filter(i=>i.visual?.error),ready=actors.filter(i=>i.visual?.loaded).length;
 const banner=$('model-state');banner.dataset.state=failed.length?'error':ready===actors.length?'ready':'loading';
 banner.textContent=failed.length?'人物加载失败：'+failed.map(i=>i.name+' ('+i.visual.error+')').join('；'):ready===actors.length?'真实骨骼模型 '+ready+'/'+actors.length+' 已加载':'正在加载真实人物 '+ready+'/'+actors.length+'…';
 if(failed.length)setStatus('人物资源未加载成功。已停止输出，不会替换成木头人。');
 else if(ready===actors.length)setStatus('人物已就绪，直接拖动手、肘、膝、脚上的圆点；拖头部可转头。');
}
function mount(item) {
  if (item.type==='actor') {
    item.color ||= colors[data.items.filter(i=>i.type==='actor').indexOf(item)%colors.length];
    item.visual=buildActor(item.color,item.bodyType||'male');
    item.visual.ready.then(updateModelStatus);
    queueMicrotask(updateModelStatus);
  } else if (item.type==='prop') {
    item.visual={root:createProp(item.kind)};
    item.visual.root.rotation.y=item.yaw || 0;
  } else {
    const root=new T.Group();
    const body=new T.Mesh(new T.BoxGeometry(.3,.2,.26),new T.MeshBasicMaterial({color:'#8baefe'}));
    const lens=new T.Mesh(new T.BoxGeometry(.15,.14,.19),new T.MeshBasicMaterial({color:'#293b56'}));
    lens.position.z=-.2; root.add(body,lens);
    item.visual={root};
  }
  if(item.type!=='prop'){
    item.tag=document.createElement('span'); item.tag.className='tag'; item.tag.style.setProperty('--dot','#90a9c1');
    $('labels').append(item.tag);
  }
  item.visual.root.position.fromArray(item.pos);
  item.visual.root.userData.entity=item.id;
  scene.add(item.visual.root);
}
data.items.forEach(mount);
const duration = () => Math.max(data.totalSeconds||6,...data.items.flatMap(item=>[item.keys?.at(-1)?.time||0,...clipsFor(item).map(c=>c.start+c.length)]));
function cameraValue(item, t) {
  const keys=item.keys;
  if (!keys.length || item.id===currentId && transform.dragging) return {pos:item.pos,focal:item.focal};
  const right=keys.findIndex(key=>key.time>=t);
  if (right<=0) return right===0 ? keys[0] : keys.at(-1);
  const a=keys[right-1], b=keys[right], weight=T.MathUtils.smoothstep(t,a.time,b.time);
  return {pos:a.pos.map((value,i)=>T.MathUtils.lerp(value,b.pos[i],weight)),focal:T.MathUtils.lerp(a.focal,b.focal,weight)};
}
function updateScene() {
  for (const item of data.items.filter(item=>item.type==='prop')) {
    item.visual.root.position.fromArray(item.pos);
    item.visual.root.rotation.set(...(item.rotation||[0,0,0]).map(T.MathUtils.degToRad));
    item.visual.root.scale.fromArray(item.scale||[1,1,1]);
    const door=item.visual.root.userData.door;
    if (door) door.rotation.y=item.open ? Math.PI*.58 : 0;
  }
  for (const item of data.items.filter(item=>item.type==='actor')) {
    const progress=routePhase(item,time);
    const walking=item.path.length>1 && item.pose==='stand' && !item.attached;
    const value=walking ? samplePath(item.path, progress) : {point:item.pos,yaw:item.yaw||0,distance:0};
    const {root}=item.visual;
    root.position.fromArray(value.point); root.rotation.y=value.yaw;
    const prop=get(item.attached);
    if (prop) {
      const group=prop.visual.root;
      const local=get(item.attached).kind==='car' ? new T.Vector3(-.4,.2,-.15) : new T.Vector3(0,prop.kind==='bed'?.59:0,prop.kind==='bed'?.7:0);
      root.position.copy(group.localToWorld(local)); root.rotation.y=group.rotation.y;
      if (item.pose==='sit') root.position.y+=.46-.49*ages[item.age][1];
    }
    const action=liveClip(item,time);
    if(action?.kind==='pose'){
      const strength=Math.sin(Math.PI*phase(action,time))**2;
      renderPose({...item,...action.pose},progress,value.distance);
      const rig=item.visual;
      if(rig.loaded){
        const posedPosition=root.position.clone(),posedRotation=root.quaternion.clone();
        for(const bone of Object.values(rig.joints))if(bone)bone.quaternion.copy(rig.rest[bone.name].clone().slerp(bone.quaternion,strength));
        root.position.lerpVectors(new T.Vector3().fromArray(value.point),posedPosition,strength);
        root.quaternion.slerpQuaternions(new T.Quaternion().setFromEuler(new T.Euler(0,value.yaw,0)),posedRotation,strength);
      }
    }else renderPose(item,progress,value.distance);
  }
  for (const item of data.items.filter(item=>item.type==='camera')) {
    const current=cameraValue(item,time);
    const {root}=item.visual;
    const moving=item.path.length>1 && !item.keys.length;
    root.position.fromArray(moving ? samplePath(item.path,routePhase(item,time)).point : current.pos);
    const person=get(item.aim);
    const target=person?.visual.joints?.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-.15,0)) || (item.target ? new T.Vector3().fromArray(item.target) : defaultAim);
    const motion=liveClip(item,time);
    if(motion?.kind==='camera'){
      const u=T.MathUtils.smoothstep(phase(motion,time),0,1);
      const offset=root.position.clone().sub(target);
      if(motion.mode==='orbit')offset.applyAxisAngle(new T.Vector3(0,1,0),u*Math.PI/3);
      if(motion.mode==='push'||motion.mode==='pull')offset.multiplyScalar(1+(motion.mode==='push'?-.35:.5)*u);
      if(motion.mode==='slide')offset.addScaledVector(new T.Vector3(offset.z,0,-offset.x).normalize(),1.5*u);
      root.position.copy(target).add(offset);
    }
    if (item===shot()) {
      filmCamera.position.copy(root.position);
      filmCamera.setFocalLength(current.focal);
      filmCamera.lookAt(target);
      if(item.manualRotation&&!person&&!motion)filmCamera.rotation.set(...item.rotation.map(T.MathUtils.degToRad));
      root.quaternion.copy(filmCamera.quaternion);
    } else {
      root.lookAt(target); root.rotateY(Math.PI);
      if(item.manualRotation&&!person)root.rotation.set(...item.rotation.map(T.MathUtils.degToRad));
    }
  }
}
function plainScene(){return {...data,items:data.items.map(({visual,tag,...item})=>structuredClone(item))};}
function recoverSafeScene(){
 const existing=new Map(data.items.map(i=>[i.id,i]));
 for(const item of data.items)if(!safeScene.items.some(i=>i.id===item.id)){scene.remove(item.visual.root);item.tag?.remove();}
 data={...safeScene,items:safeScene.items.map(saved=>{const old=existing.get(saved.id);if(old){const {visual,tag}=old;return {...structuredClone(saved),visual,tag};}const item=structuredClone(saved);mount(item);return item;})};
 if(!get(currentId))currentId=data.items[0].id;
 time=safeTime;playing=false;iconButton($('play'),'play','播放');updateScene();
 handle.position.copy(active().visual.root.position);handle.rotation.set(...(active().rotation||[0,(active().yaw||0)*180/Math.PI,0]).map(T.MathUtils.degToRad));handle.scale.fromArray(active().scale||[1,1,1]);
 if(!transform.dragging&&!jointDrag)lists();
 localStorage.setItem(key,serialize());
}
function enforceCollisions(){
 if(checkingCollision||!allModelsReady())return true;
 checkingCollision=true;
 try{
  const result=sceneCollision(data.items,safeShapes);
  if(result.hit){
   collisionBlocked=true;
   if(safeScene){recoverSafeScene();collisionBlocked=false;}
   $('collision-state').textContent='已阻挡：'+result.hit.message;$('collision-state').dataset.state='blocked';
   setStatus('已阻挡穿模，保留上一个安全位置。'+result.hit.message);
   if(recorder?.state==='recording')recorder.stop();
   return false;
  }
  collisionBlocked=false;safeScene=plainScene();safeShapes=result.groups;safeTime=time;
  if($('collision-state').dataset.state!=='blocked')$('collision-state').textContent='碰撞阻挡已开启';
  return true;
 }finally{checkingCollision=false;}
}
function select(id) {
  if (!get(id)) return;
  currentId=id;
  const item=active();
  if (item.type==='camera') { data.camera=item.id; $('camera-list').value=item.id; }
  for (const button of $('objects').children) button.ariaPressed=String(button.dataset.id===id);
  $('selected-title').textContent={actor:'角色',camera:'机位',prop:'道具'}[item.type];
  $('name').value=item.name; $('note').value=item.note||''; $('note').parentElement.hidden=item.type==='prop';
  const shownPosition=item.type==='camera'?cameraValue(item,time).pos:item.type==='actor'&&item.path.length>1&&item.pose==='stand'?samplePath(item.path,routePhase(item,time)).point:item.pos;
  shownPosition.forEach((value,i)=>$( ['x','y','z'][i]).value=value.toFixed(2));
  $('actor-tools').hidden=item.type!=='actor';
  $('camera-tools').hidden=item.type!=='camera';
  $('motion-tools').hidden=item.type==='prop';
  $('prop-tools').hidden=item.type!=='prop';
  if (item.type==='actor') {
    $('actor-age').value=item.bodyType||'male'; $('pose').value=item.pose; $('joint-angle').value=item.joints[$('joint').value]||0;
  }
  if (item.type==='camera') {
    $('focal').value=cameraValue(item,time).focal; $('focal-label').textContent=Math.round(cameraValue(item,time).focal)+' mm';
    $('look-at').value=item.aim;
  }
  if (item.type==='prop') {
    $('door').hidden=item.kind!=='car'; $('door').textContent=item.open?'关闭车门':'打开车门';
    $('use-prop').hidden=!['chair','bed','car'].includes(item.kind);
    $('use-prop').textContent=item.kind==='bed'?'让最近的角色躺下':item.kind==='car'?'最近角色上下车':'让最近的角色坐下';
  }
  $('begin').value=item.begin; $('seconds').value=item.seconds; $('clear-route').disabled=!item.path.length;
  $('draw-route').disabled=item.type==='camera' && item.keys.length>0;
  $('draw-route').title=$('draw-route').disabled?'此机位已有时间轴关键帧，可用新机位画路线':'';
  handle.position.fromArray(shownPosition);
  handle.rotation.set(...(item.rotation||[0,(item.yaw||0)*180/Math.PI,0]).map(T.MathUtils.degToRad));
  handle.scale.fromArray(item.scale||[1,1,1]);
  for(const [i,axis] of ['x','y','z'].entries()){$('r'+axis).value=((item.rotation||[0,(item.yaw||0)*180/Math.PI,0])[i]).toFixed(1);$('s'+axis).value=(item.scale||[1,1,1])[i].toFixed(2);}
  $('uniform-scale').value=item.scale?.[0]||1;$('actor-color').value=item.color||'#4f8ef7';
  document.querySelector('[data-tab=pose]').disabled=item.type!=='actor';
  if(item.type!=='actor'&&inspectorTab==='pose')setInspector('properties');
  syncPose();
  for(const control of document.querySelectorAll('#properties-tab input,#pose-tab button,#pose-tab input,#motion-tab button,#motion-tab input'))control.disabled=!!item.locked;
  if (!cameraMode && !routeDraft && !item.attached && !item.locked && !playing && inspectorTab!=='pose') transform.attach(handle); else transform.detach();
  drawPath();
}
function orderedItems(){
  const rank=new Map((data.rowOrder||[]).map((id,index)=>[id,index]));
  return [...data.items].sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity));
}
function sortGrip(item,row,container){
  row.dataset.rowId=item.id;
  const grip=document.createElement('span');
  grip.className='sort-grip';grip.textContent='⠿';grip.title='按住上下拖动排序';
  grip.onclick=e=>e.stopPropagation();
  grip.onpointerdown=e=>{
    if(e.button!==0||recorder||routeDraft)return;
    e.stopPropagation();e.preventDefault();grip.setPointerCapture(e.pointerId);
    const rows=[...container.children].filter(r=>r.dataset.rowId&&!r.hidden);
    const startY=e.clientY;
    let target=null,after=false;
    function clear(){target?.classList.remove('insert-above','insert-below');}
    function locate(y){
      clear();
      target=rows.find(r=>y<=r.getBoundingClientRect().bottom)||rows.at(-1);
      const box=target.getBoundingClientRect();
      after=y>box.top+box.height/2;
      if(target!==row)target.classList.add(after?'insert-below':'insert-above');
    }
    grip.onpointermove=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      const scroller=container.closest('#timeline,.objects');
      if(scroller){const box=scroller.getBoundingClientRect();if(ev.clientY<box.top+24)scroller.scrollTop-=12;else if(ev.clientY>box.bottom-24)scroller.scrollTop+=12;}
      locate(ev.clientY);
    };
    function finish(){clear();grip.onpointermove=grip.onpointerup=grip.onlostpointercapture=null;}
    grip.onlostpointercapture=finish;
    grip.onpointerup=ev=>{
      locate(ev.clientY);finish();
      if(target===row||Math.abs(ev.clientY-startY)<4)return;
      const ids=rows.map(r=>r.dataset.rowId).filter(id=>id!==item.id);
      ids.splice(ids.indexOf(target.dataset.rowId)+Number(after),0,item.id);
      const visible=new Set(ids);let i=0;
      data.rowOrder=orderedItems().map(o=>visible.has(o.id)?ids[i++]:o.id);
      lists();save();
    };
  };
  return grip;
}
function lists() {
  const entries=orderedItems().map(item=>{
    const button=document.createElement('button'); button.dataset.id=item.id;
    const dot=document.createElement('i'); dot.style.setProperty('--dot',{actor:'#88c8ad',camera:'#94b3ff',prop:'#dfb691'}[item.type]);
    const label=document.createElement('span'); label.textContent=item.name;
    const type=document.createElement('small'); type.textContent=item.type==='actor'?(bodyTypes[item.bodyType]||'人物'):item.type==='camera'?'机位':'道具';
    const actions=document.createElement('div');actions.className='object-actions';
    for(const [field,on,off] of [['hidden','◌','◉'],['locked','▣','▫']]){const control=document.createElement('span');control.append(icon(field==='hidden'?(item.hidden?'eyeOff':'eye'):(item.locked?'lock':'unlock')));control.title=field==='hidden'?(item.hidden?'显示':'隐藏'):(item.locked?'解锁':'锁定');control.onclick=e=>{e.stopPropagation();item[field]=!item[field];lists();save();};actions.append(control);}
    button.append(sortGrip(item,button,$('objects')),dot,label,type,actions);
    button.onclick=()=>{ if(routeDraft) return; select(item.id); save(); };
    return button;
  });
  $('objects').replaceChildren(...entries);
  for(const b of entries)b.hidden=!get(b.dataset.id).name.includes($('search').value);
  $('camera-list').replaceChildren(...data.items.filter(i=>i.type==='camera').map(i=>new Option(i.name,i.id)));
  $('camera-list').value=data.camera;
  $('look-at').replaceChildren(new Option('固定方向',''),...data.items.filter(i=>i.type==='actor').map(i=>new Option(i.name,i.id)));
  select(currentId); tracks();
}
function switchView(mode) {
  cameraMode=mode;
  $('director').ariaPressed=String(!mode); $('view-camera').ariaPressed=String(mode);
  orbit.enabled=!mode && !routeDraft; transform.enabled=!mode && !routeDraft;
  if(mode) transform.detach();
  else select(currentId);
}
function seek(value) {
  time=T.MathUtils.clamp(value,0,duration()); playing=false;
  iconButton($('play'),'play','播放');
}
function play() {
  if(routeDraft)return;transform.detach();
  if(time>=duration()) time=0;
  playing=true; iconButton($('play'),'pause','暂停');
}

function editable(item,c){
  if(c.kind==='route')item.routeClips??=routeClips(item);
  return (c.kind==='route'?item.routeClips:item.clips).find(v=>v.id===c.id);
}
function overlaps(item,c,start,length){
  return clipsFor(item).some(o=>o.kind===c.kind&&o.id!==c.id&&start<o.start+o.length-.00001&&start+length>o.start+.00001);
}
function selection(){
  const item=get(selectedClip?.owner);
  return item && !item.locked && clipsFor(item).find(c=>c.id===selectedClip.id);
}
function tracks() {
  const range=duration();
  $('seek').max=range;$('total-sec').value=range;
  const selected=selection();
  for(const id of ['clip-sec','clip-color','split-clip','remove-clip'])$(id).disabled=!selected;
  $('clip-sec').value=selected?.length||''; $('clip-color').value=selected?.color||'#896345';
  $('tracks').replaceChildren(...orderedItems().filter(i=>i.type==='actor'||i.type==='camera').map(item=>{
    const track=document.createElement('div');track.className='track';
    const name=document.createElement('span');name.textContent=item.name;
    const lane=document.createElement('div'); lane.className='lane'; lane.title='点击定位播放时间';
    const stacked=routeClips(item).length && item.clips?.length;
    if(stacked)lane.style.height='44px';
    for(const c of clipsFor(item)){
      const clip=document.createElement('button');
      if(stacked){clip.style.height='20px';clip.style.top=c.kind==='route'?'0':'22px';track.style.height='48px';}
      clip.className='clip';clip.textContent=c.label;clip.title=c.label+' · 拖动调整开始时间';
      clip.style.left=c.start/range*100+'%';clip.style.width=c.length/range*100+'%';clip.style.backgroundColor=c.color;
      clip.classList.toggle('chosen',selectedClip?.id===c.id && selectedClip.owner===item.id);
      lane.append(clip);
      clip.onpointerdown=e=>{
        if(item.locked||recorder||e.button!==0)return;
        e.stopPropagation();clip.setPointerCapture(e.pointerId);seek(time);
        const origin=e.clientX,initial=c.start;
        let next=initial;
        clip.onpointermove=ev=>{
          next=Math.max(0,Math.round((initial+(ev.clientX-origin)/lane.clientWidth*range)*10)/10);
          clip.style.left=next/range*100+'%';
        };
        clip.onpointerup=ev=>{
          clip.onpointermove=clip.onpointerup=null;
          if(!overlaps(item,c,next,c.length)){editable(item,c).start=next;}
          else setStatus('同一轨道的片段不能重叠。');
          selectedClip={id:c.id,owner:item.id};
          if(Math.abs(ev.clientX-origin)<4)seek(Math.max(c.start,Math.min(c.start+c.length,(ev.clientX-lane.getBoundingClientRect().left)/lane.clientWidth*range)));
          select(item.id);tracks();save();
        };
        clip.onpointercancel=()=>tracks();
      };
      clip.onclick=e=>e.stopPropagation();
    }
    for(const k of item.keys||[]){const node=document.createElement('i');node.className='key';node.style.left=k.time/range*100+'%';lane.append(node);}
    const cursor=document.createElement('i');cursor.className='cursor';lane.append(cursor);
    lane.onclick=event=>{if(routeDraft)return;seek((event.clientX-lane.getBoundingClientRect().left)/lane.clientWidth*range);select(item.id);};
    name.prepend(sortGrip(item,track,$('tracks')));track.append(name,lane);return track;
  }));
}
function finishEdit(){tracks();save();}
function addTimedClip(kind){
  const item=active();if(item.locked)return;
  const start=Math.max(time,...(item.clips||[]).map(c=>c.start+c.length));
  const c={id:crypto.randomUUID(),kind,start,length:2,from:0,to:1};
  if(kind==='pose'){
    c.pose=Object.fromEntries(['pose','jointAxes','joints','boneOverrides'].map(k=>[k,structuredClone(item[k])]));
    c.label=poseNames[item.pose]+'动作';c.color='#466880';
    item.pose='stand';item.joints={};item.jointAxes={};item.boneOverrides={};
  }else{
    c.mode=$('cam-move').value;c.label=$('cam-move').selectedOptions[0].text;c.color='#655987';
  }
  (item.clips??=[]).push(c);selectedClip={owner:item.id,id:c.id};seek(start);$('timeline').hidden=false;finishEdit();
}
$('animate-pose').onclick=()=>addTimedClip('pose');
$('add-shot').onclick=()=>addTimedClip('camera');
$('total-sec').onchange=e=>{data.totalSeconds=Math.max(.2,e.target.valueAsNumber||6);finishEdit();seek(Math.min(time,duration()));};
$('clip-sec').onchange=e=>{
  const c=selection(),item=get(selectedClip?.owner),n=e.target.valueAsNumber;
  if(c&&Number.isFinite(n)&&n>=.2&&!overlaps(item,c,c.start,n))editable(item,c).length=n;
  else setStatus('片段至少 0.2 秒，不能覆盖同轨片段。');finishEdit();
};
$('clip-color').onchange=e=>{const c=selection();if(c)editable(get(selectedClip.owner),c).color=e.target.value;finishEdit();};
$('split-clip').onclick=()=>{
  const c=selection();if(!c)return;
  const n=time-c.start;if(n<.2||c.length-n<.2){setStatus('把播放头移到片段中间，两侧至少保留 0.2 秒。');return;}
  const item=get(selectedClip.owner),left=editable(item,c),middle=phase(c,time);
  const right={...left,id:crypto.randomUUID(),start:time,length:c.length-n,from:middle};
  left.length=n;left.to=middle;(c.kind==='route'?item.routeClips:item.clips).push(right);
  selectedClip.id=right.id;finishEdit();
};
$('remove-clip').onclick=()=>{
  const c=selection();if(!c)return;const item=get(selectedClip.owner);
  if(c.kind==='route'){item.routeClips=routeClips(item).filter(o=>o.id!==c.id);if(!item.routeClips.length)item.path=[];}
  else item.clips=item.clips.filter(o=>o.id!==c.id);
  selectedClip=null;finishEdit();
};
function drawPath() {
  for (const node of [...pathGuide.children]) { pathGuide.remove(node);node.geometry.dispose();node.material.dispose(); }
  const item=active(), draft=routeDraft?.points || item.path;
  const points=draft.map(p=>new T.Vector3(p[0],.026,p[2]));
  if(points.length>1) pathGuide.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#9ac0ff'})));
  for(const point of points.filter((_,i)=>i===0||i===points.length-1)){
    const marker=new T.Mesh(new T.RingGeometry(.07,.125,24),new T.MeshBasicMaterial({color:'#bcd4ff',side:T.DoubleSide,depthTest:false}));
    marker.rotation.x=-Math.PI/2;marker.position.copy(point);pathGuide.add(marker);
  }
}
function draftUi() {
  const count=routeDraft?.points.length ?? 0;
  stage.classList.toggle('drawing-route',!!routeDraft); $('route-tools').hidden=!routeDraft;
  $('route-hint').textContent=count?'松开可续画，点完成保存':'按住地面拖动，画出路线';
  $('undo-point').disabled=count===0; $('finish-route').disabled=count<2;
  drawPath();
}
function beginRoute() {
  const item=active();
  if (item.type==='prop'||item.keys?.length) return;
  seek(0);switchView(false);
  routeDraft={id:item.id, points:[], strokes:[]};
  orbit.enabled=transform.enabled=false;transform.detach();draftUi();
}
function endRoute(commit) {
  if (!routeDraft) return;
  const {id,points}=routeDraft;routeDraft=null;
  if(commit&&points.length>=2){
    const item=get(id);
    delete item.routeClips;item.path=points;item.pos=[...points[0]];
    if(item.type==='actor') {item.pose='stand';item.attached=null;}
    setStatus(`已给「${item.name}」设置 ${points.length} 个路线点。点播放预演。`);
    tracks();save();
  }
  transform.enabled=orbit.enabled=true;select(id);draftUi();
}
$('draw-route').onclick=beginRoute;
$('undo-point').onclick=()=>{routeDraft.points.length=routeDraft.strokes.pop()??0;draftUi();};
$('finish-route').onclick=()=>endRoute(true);
$('cancel-route').onclick=()=>endRoute(false);
$('clear-route').onclick=()=>{active().path=[];delete active().routeClips; select(currentId);tracks();save();};
const surface=viewport.domElement;
function markGround(event, minDistance){
  const box=surface.getBoundingClientRect();
  raycaster.setFromCamera(new T.Vector2(2*(event.clientX-box.left)/box.width-1,1-2*(event.clientY-box.top)/box.height),sceneCamera);
  const hit=raycaster.ray.intersectPlane(floorPlane,new T.Vector3());
  if(!hit||Math.abs(hit.x)>20||Math.abs(hit.z)>20)return;
  const last=routeDraft.points.at(-1);
  if(last&&Math.hypot(hit.x-last[0],hit.z-last[2])<minDistance)return;
  routeDraft.points.push([hit.x,get(routeDraft.id).pos[1],hit.z]);
  draftUi();
}
surface.addEventListener('pointerdown',event=>{
  if(!routeDraft||event.button!==0||routeDraft.pointer!=null)return;
  routeDraft.pointer=event.pointerId;
  routeDraft.strokes.push(routeDraft.points.length);
  surface.setPointerCapture(event.pointerId);
  markGround(event,.01);
});
surface.addEventListener('pointermove',event=>{
  if(routeDraft?.pointer===event.pointerId)markGround(event,.07);
});
surface.addEventListener('pointerup',event=>{
  if(routeDraft?.pointer!==event.pointerId)return;
  markGround(event,.01);
  if(routeDraft.strokes.at(-1)===routeDraft.points.length)routeDraft.strokes.pop();
  delete routeDraft.pointer;
});
surface.addEventListener('lostpointercapture',event=>{
  if(routeDraft?.pointer===event.pointerId)delete routeDraft.pointer;
});
stage.addEventListener('pointerup',event=>{
  if (routeDraft||cameraMode||recorder||jointDrag||event.button!==0||transform.axis||event.target.closest('button,#route-tools,#context-menu')||pointerTravel>5) return;
  const box=stage.getBoundingClientRect();
  raycaster.setFromCamera(new T.Vector2((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2),sceneCamera);
  const hit=raycaster.intersectObjects(data.items.filter(item=>!item.hidden&&!item.locked).map(item=>item.visual.root),true)[0];
  if(hit){
    let mesh=hit.object;while(mesh&&!mesh.userData.entity)mesh=mesh.parent;
    if(mesh)select(mesh.userData.entity);
  }
});
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&routeDraft)endRoute(false);
});
function move(item,next) {
  const origin=item.type==='actor'&&item.path.length>1&&item.pose==='stand'?samplePath(item.path,routePhase(item,time)).point:item.pos;
  const delta=next.map((n,i)=>n-origin[i]); item.pos=item.pos.map((n,i)=>n+delta[i]);
  item.path=item.path.map(p=>p.map((n,i)=>n+delta[i]));
  if(item.type==='camera'&&item.keys.length){
    const previous=item.keys.find(k=>Math.abs(k.time-time)<.02);
    if(previous)previous.pos=[...next];
    else item.keys.push({time,pos:[...next],focal:item.focal});
    item.keys.sort((a,b)=>a.time-b.time);
  }
}
transform.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value; if(e.value){playing=false;iconButton($('play'),'play','播放');}else{ select(currentId); tracks();save(); }});
transform.addEventListener('objectChange',()=>{if(transform.dragging){const item=active();if(gizmoMode==='translate')move(item,handle.position.toArray());else if(gizmoMode==='rotate'){item.rotation=[handle.rotation.x,handle.rotation.y,handle.rotation.z].map(T.MathUtils.radToDeg);item.yaw=handle.rotation.y;if(item.type==='camera')item.manualRotation=true;}else item.scale=handle.scale.toArray().map(x=>Math.max(.1,x));drawPath();}});
$('name').onchange=event=>{ active().name=event.target.value.trim()||'未命名';lists();save(); };
for(const [i,id] of ['x','y','z'].entries()) $(id).onchange=event=>{
  if(!Number.isFinite(event.target.valueAsNumber))return;
  if(active().locked)return;const selected=active();const p=[...(selected.type==='camera'?cameraValue(selected,time).pos:selected.type==='actor'&&selected.path.length>1&&selected.pose==='stand'?samplePath(selected.path,routePhase(selected,time)).point:selected.pos)];p[i]=event.target.valueAsNumber;move(active(),p);select(currentId);tracks();save();
};
for(const [key,label] of Object.entries(jointLabels)) $('joint').add(new Option(label,key));
$('joint').onchange=()=>$('joint-angle').value=active().joints[$('joint').value]||0;
$('joint-angle').oninput=event=>{active().joints[$('joint').value]=event.target.valueAsNumber;save();};
$('actor-age').onchange=event=>{changeBody(active(),event.target.value);save();};
$('pose').onchange=event=>applyPose(event.target.value);
$('begin').onchange=event=>{active().begin=T.MathUtils.clamp(event.target.valueAsNumber||0,0,60);select(currentId);tracks();save();};
$('seconds').onchange=event=>{active().seconds=T.MathUtils.clamp(event.target.valueAsNumber||.2,.2,30);select(currentId);tracks();save();};
$('door').onclick=()=>{active().open=!active().open;select(currentId);save();};
$('use-prop').onclick=()=>{
  const prop=active();
  const actors=data.items.filter(i=>i.type==='actor');
  const occupant=actors.find(i=>i.attached===prop.id);
  const actor=occupant || [...actors].sort((a,b)=>a.visual.root.position.distanceTo(prop.visual.root.position)-b.visual.root.position.distanceTo(prop.visual.root.position))[0];
  if(!actor)return;
  if(occupant&&prop.kind==='car'){
    actor.attached=null;actor.pose='stand';actor.pos=[prop.pos[0]-1.65,prop.pos[1],prop.pos[2]];actor.path=[];
  }else{
    actor.attached=prop.id;actor.pose=prop.kind==='bed'?'lie':'sit';
    if(prop.kind==='car')prop.open=true;
  }
  select(actor.id);save();
};
$('add').onclick=()=>{
  const value=$('asset').value,id=crypto.randomUUID(),seq=data.items.length;
  const pos=[(seq%5-2)*.86,0,2.3];
  const item=ages[value] ? entity(id,ages[value][0]+' '+(data.items.filter(i=>i.type==='actor').length+1),'actor',pos,{age:value,pose:'stand',joints:{},yaw:0})
    : entity(id,propNames[value],'prop',pos,{kind:value});
  data.items.push(item);mount(item);currentId=id;lists();save();
};
$('camera-list').onchange=event=>{select(event.target.value);save();};
$('add-camera').onclick=()=>{
  const id=crypto.randomUUID(), position=sceneCamera.position.toArray();
  const item=entity(id,'机位 '+(data.items.filter(i=>i.type==='camera').length+1),'camera',position,{focal:sceneCamera.getFocalLength(),target:orbit.target.toArray(),aim:'',keys:[]});
  data.items.push(item);mount(item);currentId=id;lists();save();
};
$('look-at').onchange=event=>{active().aim=event.target.value;save();};
$('focal').oninput=event=>{
  const item=active(); item.focal=event.target.valueAsNumber;
  const k=item.keys.find(k=>Math.abs(k.time-time)<.02);
  if(k)k.focal=item.focal;
  $('focal-label').textContent=item.focal+' mm';save();
};
$('camera-key').onclick=()=>{
  const item=active(), sampled=cameraValue(item,time), value={time:Math.round(time*100)/100,pos:[...sampled.pos],focal:sampled.focal};
  item.keys=item.keys.filter(k=>Math.abs(k.time-value.time)>=.02);
  item.keys.push(value);item.keys.sort((a,b)=>a.time-b.time);
  item.path=[];select(currentId);tracks();save();setStatus(`已记录 ${value.time.toFixed(2)} 秒的机位。`);
};
$('director').onclick=()=>switchView(false);
$('view-camera').onclick=()=>{if(!routeDraft)switchView(true);};
$('top-view').onclick=()=>{switchView(false);sceneCamera.position.copy(orbit.target).add(new T.Vector3(0,9,.001));orbit.update();};
$('focus').onclick=()=>{switchView(false);orbit.target.copy(active().visual.root.position).add(new T.Vector3(0,.6,0));sceneCamera.position.copy(orbit.target).add(new T.Vector3(3,3,5));orbit.update();};
$('play').onclick=()=>{if(playing)seek(time);else play();};
$('rewind').onclick=()=>seek(0);
$('seek').oninput=e=>seek(e.target.valueAsNumber);

const sizes={'16:9':[1280,720],'9:16':[720,1280],'1:1':[960,960]};
function resizeFilm() {
  const [width,height]=sizes[data.aspect];
  filmCamera.aspect=width/height;filmCamera.updateProjectionMatrix();
  film.setSize(width,height,false);exportCanvas.width=width;exportCanvas.height=height;
  preview.style.aspectRatio=data.aspect.replace(':','/');
  preview.style.width=Math.min(100,310*(width/height)/Math.max(1,preview.parentElement.clientWidth-24)*100)+'%';
}
$('aspect').value=data.aspect;
$('aspect').onchange=e=>{data.aspect=e.target.value;resizeFilm();save();};

$('note').onchange=e=>{active().note=e.target.value.trim();save();};
function resizeStage() {
  const {clientWidth:w,clientHeight:h}=stage;
  if(!w||!h)return;
  viewport.setSize(w,h,false);sceneCamera.aspect=w/h;sceneCamera.updateProjectionMatrix();
}
new ResizeObserver(resizeStage).observe(stage);
function labelAnchor(actor) {
  return actor.visual.joints.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.29,0));
}
function renderExport() {
  output.drawImage(film.domElement,0,0);

}
function frame(now) {
  const delta=previousFrame===0 ? 0 : Math.min(.12,(now-previousFrame)/1000);
  previousFrame=now;
  const stopped=playing&&time+delta>=duration();
  if(playing)time=Math.min(duration(),time+delta);
  if(!cameraMode&&!routeDraft)orbit.update();
  updateScene();
  enforceCollisions();
  for(const item of data.items)item.visual.root.visible=!item.hidden;
  updateJointHandles();
  filmCamera.updateMatrixWorld();
  grid.visible=pathGuide.visible=transform.getHelper().visible=false;
  for(const item of data.items.filter(i=>i.type==='camera'))item.visual.root.visible=false;
  film.render(scene,filmCamera);
  if(cameraMode){
    const w=stage.clientWidth,h=stage.clientHeight;
    const rw=Math.min(w,h*filmCamera.aspect),rh=rw/filmCamera.aspect;
    viewport.setScissorTest(false);viewport.clear();
    viewport.setViewport((w-rw)/2,(h-rh)/2,rw,rh);
    viewport.setScissor((w-rw)/2,(h-rh)/2,rw,rh);viewport.setScissorTest(true);
    viewport.render(scene,filmCamera);viewport.setScissorTest(false);
  }else{
    viewport.setViewport(0,0,stage.clientWidth,stage.clientHeight);
    grid.visible=pathGuide.visible=true;
    transform.getHelper().visible=!!transform.object&&!playing&&!active().locked&&inspectorTab!=='pose';
    for(const item of data.items.filter(i=>i.type==='camera'))item.visual.root.visible=!item.hidden;
    viewport.render(scene,sceneCamera);
  }
  for(const item of data.items.filter(i=>i.tag)){
    const anchor=item.type==='actor'?labelAnchor(item):item.visual.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.24,0));
    const p=anchor.project(sceneCamera);
    item.tag.hidden=cameraMode||item.hidden||Math.abs(p.z)>1||(item.type==='actor'&&!item.visual.loaded);
    item.tag.style.left=(p.x+1)*50+'%';item.tag.style.top=(1-p.y)*50+'%';item.tag.textContent=[item.name,item.note].filter(Boolean).join(' · ');
  }
  if(recorder)renderExport();
  if(stopped){seek(time);if(recorder?.state==='recording')recorder.stop();}
  $('seek').value=time;
  $('clock').value=time.toFixed(1)+' / '+duration().toFixed(1)+' 秒';
  const progress=time/duration()*100+'%';
  for(const cursor of document.querySelectorAll('.cursor'))cursor.style.left=progress;
  requestAnimationFrame(frame);
}
const dbPromise=new Promise(resolve=>{
  const request=indexedDB.open('xinghe-director-studio-media',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('media',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);
});
function mediaCard(entry,db) {
  const card=document.createElement('article'), video=entry.blob.type.startsWith('video');
  const item=document.createElement(video?'video':'img'), url=URL.createObjectURL(entry.blob);
  item.src=url;
  if(video){item.controls=true;item.preload='metadata';}
  else item.alt=entry.title;
  const link=document.createElement('a');
  link.href=url;link.download=entry.title;link.textContent=video?'下载视频':'下载截图';
  const title=document.createElement('div');title.textContent=entry.shot;
  const remove=document.createElement('button');remove.textContent='移除';
  remove.onclick=()=>{
    if(db)db.transaction('media','readwrite').objectStore('media').delete(entry.id);
    URL.revokeObjectURL(url);card.remove();
  };
  card.append(item,title,link,remove);$('media').prepend(card);
}
dbPromise.then(db=>{
  if(!db)return;
  const request=db.transaction('media').objectStore('media').getAll();
  request.onsuccess=()=>request.result.sort((a,b)=>a.when-b.when).forEach(entry=>mediaCard(entry,db));
});
async function addMedia(blob,ext,shotName) {
  const entry={id:crypto.randomUUID(),when:Date.now(),blob,shot:shotName,title:shotName+'.'+ext};
  const db=await dbPromise;
  mediaCard(entry,db);showPanel('media');
  if(db){
    const request=db.transaction('media','readwrite').objectStore('media').put(entry);
    request.onerror=()=>setStatus('浏览器未能保存素材，请现在下载。');
  }
}
$('capture').onclick=()=>{
  if(!allModelsReady()||collisionBlocked){setStatus('人物未就绪或存在碰撞，暂不能导出。');return;}
  const name=shot().name;
  renderExport();
  exportCanvas.toBlob(blob=>{if(blob){addMedia(blob,'png',name);setStatus('截图已存到参考素材。');}},'image/png');
};
function lockForRecording(value){
  // Keep the record button available so the user can stop early.
  for(const element of document.querySelectorAll('main button, main input, main select, header button, #capture')){
    if(element.id==='record')continue;
    if(value){element.dataset.wasDisabled=String(element.disabled);element.disabled=true;}
    else{element.disabled=element.dataset.wasDisabled==='true';delete element.dataset.wasDisabled;}
  }
  transform.enabled=!value&&!cameraMode;
  orbit.enabled=!value&&!cameraMode;
}
$('record').onclick=()=>{
  if(recorder?.state==='recording'){recorder.stop();return;}
  if(recorder) return;
  if(!allModelsReady()||collisionBlocked){setStatus('人物未就绪或存在碰撞，暂不能录制。');return;}
  if(!window.MediaRecorder||!exportCanvas.captureStream){setStatus('当前浏览器不支持录制，可以先截图。');return;}
  if(routeDraft)endRoute(false);
  const mimeType=['video/mp4;codecs=avc1.42001f','video/webm;codecs=vp8'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mimeType){setStatus('当前浏览器不支持所需录制格式。');return;}
  const stream=exportCanvas.captureStream(30);
  let mediaRecorder;
  try {mediaRecorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:5000000});}
  catch {stream.getTracks().forEach(t=>t.stop());setStatus('录像未能启动。');return;}
  const chunks=[],name=shot().name;
  mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  mediaRecorder.onerror=()=>setStatus('录制失败，请重试。');
  mediaRecorder.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());recorder=null;seek(time);
    lockForRecording(false);iconButton($('record'),'record','录制参考视频');
    if(!chunks.length){setStatus('没有录到画面，请重试。');return;}
    const blob=new Blob(chunks,{type:mimeType});
    addMedia(blob,mimeType.startsWith('video/mp4')?'mp4':'webm',name);
    setStatus('视频已存到参考素材。');
  };
  seek(0);recorder=mediaRecorder;
  try{mediaRecorder.start();}
  catch{stream.getTracks().forEach(t=>t.stop());recorder=null;setStatus('录像未能启动。');return;}
  iconButton($('record'),'stop','停止录制');lockForRecording(true);setStatus('正在录制当前机位…');play();
};

const thumbnailCache=new Map();
let thumbRenderer;
function actorThumbnail(type){
 if(thumbnailCache.has(type))return thumbnailCache.get(type);
 const promise=(async()=>{
  const visual=buildActor('#8997a9',type);await visual.ready;if(!visual.loaded)throw Error('thumbnail unavailable');
  thumbRenderer ||= new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});thumbRenderer.setSize(130,140,false);thumbRenderer.toneMapping=T.ACESFilmicToneMapping;
  const thumbnailScene=new T.Scene();thumbnailScene.add(new T.HemisphereLight('#ffffff','#5a6070',2.8));const light=new T.DirectionalLight('#ffffff',2);light.position.set(2,4,3);thumbnailScene.add(light,visual.root);
  const box=new T.Box3().setFromObject(visual.root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());const camera=new T.PerspectiveCamera(35,130/140,.05,20);camera.position.copy(center).add(new T.Vector3(size.y*.25,size.y*.04,size.y*1.9));camera.lookAt(center);
  thumbRenderer.render(thumbnailScene,camera);const url=thumbRenderer.domElement.toDataURL('image/png');visual.root.traverse(n=>{if(n.isMesh)n.material.dispose();});return url;
 })();thumbnailCache.set(type,promise);return promise;
}

function showPanel(panel){
  $('scene-panel').hidden=panel!=='scene';$('asset-panel').hidden=!['actors','props'].includes(panel);$('camera-panel').hidden=panel!=='cameras';$('media-panel').hidden=panel!=='media';
  $('library-title').textContent=({scene:'场景',actors:'添加角色',props:'道具',cameras:'添加机位',media:'参考素材'})[panel];
  document.querySelectorAll('[data-panel]').forEach(b=>b.ariaPressed=String(b.dataset.panel===panel));
  if(['actors','props'].includes(panel)){
    const entries=panel==='actors'?Object.entries(bodyTypes):Object.entries(propNames);
    $('asset-grid').replaceChildren(...entries.map(([kind,label])=>{const button=document.createElement('button');button.className='asset-card';const icon=document.createElement('div');icon.className='silhouette';icon.append(assetIcon(panel==='actors'?'actor':kind));const title=document.createElement('span');title.textContent=label;button.append(icon,title);button.onclick=()=>addAsset(kind,panel==='actors');if(panel==='actors')actorThumbnail(kind).then(url=>{const img=new Image();img.src=url;img.alt=label;img.className='model-thumb';icon.replaceWith(img);}).catch(()=>{});return button;}));
  }
}
function setInspector(tab){
 inspectorTab=tab;document.body.classList.toggle('pose-edit',tab==='pose');document.querySelector('.inspector').classList.toggle('pose-open',tab==='pose');for(const t of ['properties','pose','motion'])$(t+'-tab').hidden=t!==tab;
 document.querySelectorAll('[data-tab]').forEach(b=>b.ariaPressed=String(b.dataset.tab===tab));
 if(tab==='pose'){seek(time);transform.detach();syncPose();}else if(active()&&!cameraMode&&!active().locked)transform.attach(handle);
 if(tab==='motion')$('timeline').hidden=false;
 resizeStage();
}
function syncPose(){
 const item=active();if(item?.type!=='actor')return;
 document.querySelectorAll('[data-pose]').forEach(b=>b.ariaPressed=String(item.pose===b.dataset.pose));
 for(const input of document.querySelectorAll('[data-joint]')){const value=item.jointAxes?.[input.dataset.joint]?.[Number(input.dataset.axis)]||0;input.value=value;input.nextElementSibling.value=Math.round(value)+'°';}
}
function applyPose(pose){
 const item=active();if(item.type!=='actor'||item.locked)return;
 item.pose=pose;item.joints={};item.jointAxes={};item.boneOverrides={};item.attached=null;seek(0);select(item.id);save();
}
function addAsset(kind,isActor){
 const id=crypto.randomUUID(),point=orbit.target.clone();point.y=0;
 point.x=Math.max(point.x,...data.items.filter(i=>i.type!=='camera').map(i=>i.pos[0]+(isActor?1.3:2.5)));
 const item=entity(id,(isActor?'角色':'')+(isActor?String.fromCharCode(65+data.items.filter(i=>i.type==='actor').length):propNames[kind]),isActor?'actor':'prop',[point.x,0,point.z],isActor?{bodyType:kind,age:kind==='child'?'child':'adult',pose:'stand',joints:{},yaw:0}:{kind});
 data.items.push(item);mount(item);currentId=id;lists();setInspector('properties');$('focus').click();save();
}
function changeBody(item,type){
 item.bodyType=type;scene.remove(item.visual.root);item.tag?.remove();mount(item);select(item.id);lists();
}
function serialize(){return JSON.stringify({...data,items:data.items.map(({visual,tag,...item})=>item)});}
function restore(raw){
 const next=JSON.parse(raw);
 if(!Array.isArray(next.items)||!next.items.length||next.items.length>100||!next.items.some(i=>i.type==='camera'))throw Error('工程必须包含机位，且对象不超过100个');
 const finiteArray=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(Number.isFinite);
 const ids=new Set();
 for(const item of next.items){
  if(typeof item.id!=='string'||ids.has(item.id)||typeof item.name!=='string'||!['actor','prop','camera'].includes(item.type)||!finiteArray(item.pos,3)||!Array.isArray(item.path)||!item.path.every(p=>finiteArray(p,3))||!Number.isFinite(item.begin)||!Number.isFinite(item.seconds)||item.seconds<=0)throw Error('工程对象格式不正确');
  ids.add(item.id);
  for(const clip of [...(item.clips||[]),...(item.routeClips||[])]){
    if(!['route','pose','camera'].includes(clip.kind)||typeof clip.id!=='string'||![clip.start,clip.length,clip.from,clip.to].every(Number.isFinite)||clip.start<0||clip.length<=0||clip.from<0||clip.to>1||clip.to<clip.from)throw Error('片段数据不正确');
    if(clip.kind==='pose'&&!(clip.pose?.pose in poseNames))throw Error('动作姿势无效');
  }
  if(item.rotation&&!finiteArray(item.rotation,3)||item.scale&&(!finiteArray(item.scale,3)||item.scale.some(n=>n<=0)))throw Error('变换数据不正确');
  if(item.type==='actor'&&(!(item.bodyType in bodyTypes)||!(item.pose in poseNames)))throw Error('人物格式不正确');
  if(item.type==='prop'&&!(item.kind in propNames))throw Error('未知道具');
  if(item.type==='camera'&&(!Number.isFinite(item.focal)||item.focal<=0||!Array.isArray(item.keys)||!item.keys.every(k=>Number.isFinite(k.time)&&Number.isFinite(k.focal)&&finiteArray(k.pos,3))))throw Error('机位格式不正确');
 }
 if(!sizes[next.aspect]||!next.items.some(i=>i.id===next.camera&&i.type==='camera'))throw Error('画幅或主机位无效');
 seek(0);if(routeDraft)endRoute(false);transform.detach();
 for(const item of data.items){scene.remove(item.visual.root);item.tag?.remove();}
 data=next;currentId=data.items[0].id;data.items.forEach(mount);$('aspect').value=data.aspect;resizeFilm();lists();
}
function historyStep(delta){
 const next=historyIndex+delta;if(next<0||next>=history.length||recorder)return;
 restoring=true;try{restore(history[next]);historyIndex=next;save();}finally{restoring=false;}
}
let pointerStart=null,pointerTravel=0;
stage.addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY];pointerTravel=0;},true);
stage.addEventListener('pointermove',e=>{if(pointerStart)pointerTravel=Math.max(pointerTravel,Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1]));},true);
const endpointLabels={leftHand:'左手',rightHand:'右手',leftFoot:'左脚',rightFoot:'右脚',leftElbow:'左肘',rightElbow:'右肘',leftKnee:'左膝',rightKnee:'右膝',head:'头部'};
const endpointChains={leftHand:['leftElbow','leftArm'],rightHand:['rightElbow','rightArm'],leftFoot:['leftKnee','leftLeg'],rightFoot:['rightKnee','rightLeg'],leftElbow:['leftArm'],rightElbow:['rightArm'],leftKnee:['leftLeg'],rightKnee:['rightLeg']};
const endpointButtons={};
function updateJointHandles(){
 const item=active(),enabled=inspectorTab!=='motion'&&!routeDraft&&item.type==='actor'&&item.visual.loaded&&!item.locked&&!item.hidden&&!playing&&!cameraMode&&!recorder;
 $('joint-handles').hidden=!enabled;if(!enabled)return;
 for(const [name,button] of Object.entries(endpointButtons)){
  const endpoint=item.visual.endpoints[name];const p=endpoint.getWorldPosition(new T.Vector3()).project(sceneCamera);
  button.hidden=Math.abs(p.z)>1;button.style.left=(p.x+1)*stage.clientWidth/2+'px';button.style.top=(1-p.y)*stage.clientHeight/2+'px';
 }
}
function solveJoint(item,endpointName,target){
 const visual=item.visual,endpoint=visual.endpoints[endpointName],chain=endpointChains[endpointName];
 for(let iteration=0;iteration<12;iteration++){
  for(const key of chain){
   const bone=visual.joints[key],origin=bone.getWorldPosition(new T.Vector3());
   const inv=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
   const from=endpoint.getWorldPosition(new T.Vector3()).sub(origin).normalize().applyQuaternion(inv);
   const to=target.clone().sub(origin).normalize().applyQuaternion(inv);
   const delta=new T.Quaternion().setFromUnitVectors(from,to);bone.quaternion.premultiply(delta);constrainBone(visual,key);bone.updateMatrixWorld(true);
  }
  if(endpoint.getWorldPosition(new T.Vector3()).distanceTo(target)<.005)break;
 }
 item.boneOverrides||={};for(const key of chain)item.boneOverrides[key]=visual.joints[key].quaternion.toArray();
}
function initializeEditor(){
 for(const [type,label] of Object.entries(bodyTypes))$('actor-age').add(new Option(label,type));
 for(const [pose,label] of Object.entries(poseNames)){
  $('pose').add(new Option(label,pose));const b=document.createElement('button');b.dataset.pose=pose;b.textContent=label;b.onclick=()=>applyPose(pose);$('pose-grid').append(b);
 }
 for(const [key,label] of Object.entries(jointLabels)){
  const group=document.createElement('div');group.className='joint-group';const title=document.createElement('h3');title.textContent=label;group.append(title);
  for(const [axis,text] of ['前后','扭转','侧向'].entries()){
   const [min,max]=jointRange(key)[axis];if(min===max)continue;
   const row=document.createElement('div');row.className='joint-slider';const name=document.createElement('span');name.textContent=text;
   const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.value=0;input.dataset.joint=key;input.dataset.axis=axis;input.ariaLabel=label+text;
   const out=document.createElement('output');out.value='0°';
   input.oninput=()=>{const item=active();if(item.locked)return;item.jointAxes||={};item.jointAxes[key]||=[0,0,0];item.jointAxes[key][axis]=Number(input.value);if(item.boneOverrides)delete item.boneOverrides[key];out.value=input.value+'°';};input.onchange=save;
   row.append(name,input,out);group.append(row);
  }$('joint-controls').append(group);
 }
 for(const [name,label] of Object.entries(endpointLabels)){
  const b=document.createElement('button');b.className='joint-handle';b.dataset.endpoint=name;b.ariaLabel='拖动'+label;b.title='拖动'+label;endpointButtons[name]=b;$('joint-handles').append(b);
  if(name==='head'){
   b.classList.add('head-stick');
   b.append(icon('move'),document.createTextNode('转头'));
   b.title='左右拖动转头，上下拖动俯仰';
   b.setAttribute('aria-label',b.title);
  }
  b.onpointerdown=e=>{
   e.stopPropagation();e.preventDefault();const item=active();if(item.locked||!item.visual.loaded)return;
   seek(time);transform.detach();orbit.enabled=false;
   const origin=item.visual.endpoints[name].getWorldPosition(new T.Vector3());
   jointDrag={item,name,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,headAngles:[...(item.jointAxes?.head||[0,0,0])],plane:new T.Plane().setFromNormalAndCoplanarPoint(sceneCamera.getWorldDirection(new T.Vector3()),origin)};b.setPointerCapture(e.pointerId);b.classList.add('dragging');setStatus('正在调整'+label+' · 松开保存，⌘Z 撤销');
  };
  const dragMove=e=>{
   if(!jointDrag||jointDrag.name!==name||e.pointerId!==jointDrag.pointerId)return;e.stopPropagation();
   if(name==='head'){jointDrag.item=get(jointDrag.item.id)||jointDrag.item;const a=jointDrag.headAngles;jointDrag.item.jointAxes||={};jointDrag.item.jointAxes.head=[T.MathUtils.clamp(a[0]+(e.clientY-jointDrag.startY)*.6,-50,55),T.MathUtils.clamp(a[1]+(e.clientX-jointDrag.startX)*.6,-70,70),a[2]];if(jointDrag.item.boneOverrides)delete jointDrag.item.boneOverrides.head;return;}
   const r=stage.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),sceneCamera);
   const hit=raycaster.ray.intersectPlane(jointDrag.plane,new T.Vector3());if(hit){jointDrag.item=get(jointDrag.item.id)||jointDrag.item;solveJoint(jointDrag.item,jointDrag.name,hit);}
  };
  window.addEventListener('pointermove',dragMove);
  const finish=e=>{if(!jointDrag||jointDrag.name!==name||e.pointerId!==jointDrag.pointerId)return;e.stopPropagation();jointDrag=null;orbit.enabled=!cameraMode&&!routeDraft;b.classList.remove('dragging');syncPose();save();setStatus(label+'已调整，可继续拖动其他关节。');};window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
 }
 document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>showPanel(b.dataset.panel));
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setInspector(b.dataset.tab));
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{gizmoMode=b.dataset.mode;transform.setMode(gizmoMode);setInspector('properties');document.querySelectorAll('[data-mode]').forEach(x=>x.ariaPressed=String(x===b));select(currentId);});
 $('edit-joints').onclick=()=>{if(active().type!=='actor'){setStatus('请先选中人物。');return;}switchView(false);setInspector('pose');$('focus').click();};
 $('search').oninput=lists;
 $('reset-pose').onclick=()=>applyPose('stand');
 $('timeline-toggle').onclick=()=>{$('timeline').hidden=!$('timeline').hidden;resizeStage();};$('timeline-close').onclick=()=>{$('timeline').hidden=true;resizeStage();};
 $('reset-view').onclick=()=>{switchView(false);sceneCamera.position.set(4,3.3,8.5);orbit.target.set(0,.95,0);orbit.update();};
 $('undo').onclick=()=>historyStep(-1);$('redo').onclick=()=>historyStep(1);
 for(const [i,axis] of ['x','y','z'].entries()){
  $('r'+axis).onchange=e=>{const item=active();if(item.locked||!Number.isFinite(e.target.valueAsNumber))return;item.rotation||=[0,(item.yaw||0)*180/Math.PI,0];item.rotation[i]=e.target.valueAsNumber;item.yaw=item.rotation[1]*Math.PI/180;if(item.type==='camera')item.manualRotation=true;select(currentId);save();};
  $('s'+axis).onchange=e=>{const item=active();if(item.locked||!Number.isFinite(e.target.valueAsNumber))return;item.scale||=[1,1,1];item.scale[i]=Math.max(.1,e.target.valueAsNumber);select(currentId);save();};
 }
 $('uniform-scale').oninput=e=>{if(active().locked)return;active().scale=Array(3).fill(e.target.valueAsNumber);};$('uniform-scale').onchange=()=>{select(currentId);save();};
 $('actor-color').oninput=e=>{const item=active();if(item.locked)return;item.color=e.target.value;item.visual.root.traverse(n=>{if(n.isMesh&&n.material?.userData.costume)n.material.color.set(item.color);});};$('actor-color').onchange=save;
 $('duplicate').onclick=()=>{const old=active();const {visual,tag,...plain}=old;const item=structuredClone(plain);item.id=crypto.randomUUID();item.name+=' 副本';item.pos[0]+=1.3;item.path=item.path.map(p=>[p[0]+1.3,p[1],p[2]]);item.locked=false;data.items.push(item);mount(item);currentId=item.id;lists();save();};
 $('delete').onclick=()=>{
  const item=active();if(item.locked)return;if(item.type==='camera'&&data.items.filter(i=>i.type==='camera').length===1){setStatus('至少保留一个机位。');return;}
  scene.remove(item.visual.root);item.tag?.remove();data.items=data.items.filter(i=>i!==item);for(const i of data.items){if(i.attached===item.id)i.attached=null;if(i.aim===item.id)i.aim='';}
  if(data.camera===item.id)data.camera=data.items.find(i=>i.type==='camera').id;currentId=data.items[0].id;lists();save();
 };
 $('export-project').onclick=()=>{const blob=new Blob([serialize()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='导演台工程.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setStatus('工程已导出为 JSON，可继续编辑；截图是 PNG，录像是 MP4 / WebM。');};
 $('import-project').onclick=()=>$('project-file').click();$('project-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('工程文件过大');restore(await file.text());save();setStatus('工程已打开。');}catch(error){setStatus('无法打开：'+error.message);}e.target.value='';};
 $('help').onclick=()=>window.open('../guide/','_blank','noopener');
 stage.addEventListener('contextmenu',e=>{
  e.preventDefault();if(pointerTravel>5||cameraMode||recorder)return;
  const r=stage.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),sceneCamera);
  const hit=raycaster.intersectObjects(data.items.filter(i=>!i.hidden&&!i.locked).map(i=>i.visual.root),true)[0];
  if(hit){let n=hit.object;while(n&&!n.userData.entity)n=n.parent;if(n)select(n.userData.entity);}
  if(active().type!=='actor'||active().locked)return;
  const menu=$('context-menu');menu.replaceChildren(...['stand','sit','squat','lie','raise','tpose'].map(p=>{const b=document.createElement('button');b.textContent=poseNames[p];b.onclick=()=>{applyPose(p);menu.hidden=true;};return b;}));menu.style.left=Math.min(e.clientX-r.left,r.width-180)+'px';menu.style.top=Math.min(e.clientY-r.top,r.height-235)+'px';menu.hidden=false;
 });
 window.addEventListener('pointerdown',e=>{if(!e.target.closest('#context-menu'))$('context-menu').hidden=true;});
 window.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea')||recorder)return;
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();historyStep(e.shiftKey?1:-1);return;}
  const mode={w:'translate',e:'rotate',r:'scale'}[e.key.toLowerCase()];if(mode)document.querySelector('[data-mode='+mode+']').click();
  if(e.key.toLowerCase()==='f')$('focus').click();if(e.code==='Space'){e.preventDefault();$('play').click();}
  if(e.key==='Escape'){$('context-menu').hidden=true;}
 });
 showPanel('scene');
}

initializeEditor();initializeIcons();resizeStage();resizeFilm();lists();draftUi();save();requestAnimationFrame(frame);
