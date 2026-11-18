// Source intervals preserve motion continuity when a clip is split or retimed.
export function routeClips(item) {
  if (item.path.length < 2) return [];
  return item.routeClips || [{id:'route',kind:'route',label:'路线',start:item.begin,length:item.seconds,from:0,to:1,color:'#896345'}];
}
export function clipsFor(item) { return [...routeClips(item), ...(item.clips || [])]; }
export function phase(clip,time) {
  const fraction=Math.min(1,Math.max(0,(time-clip.start)/clip.length));
  return clip.from+(clip.to-clip.from)*fraction;
}
export function routePhase(item,time) {
  const clips=routeClips(item).sort((a,b)=>a.start-b.start);
  const clip=clips.filter(c=>c.start<=time).at(-1)||clips[0];
  return clip ? phase(clip,time) : 0;
}
export function liveClip(item,time) {
  return item.clips?.find(c=>time>=c.start && time<c.start+c.length);
}
