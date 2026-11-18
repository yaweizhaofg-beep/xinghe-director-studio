// Lucide 0.344.0, matching xinghe-web-delivery. License: vendor/LUCIDE-LICENSE.txt
const glyphs={
  "scene": "<path d=\"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z\" />\n  <path d=\"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65\" />\n  <path d=\"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65\" />",
  "actor": "<circle cx=\"12\" cy=\"5\" r=\"1\" />\n  <path d=\"m9 20 3-6 3 6\" />\n  <path d=\"m6 8 6 2 6-2\" />\n  <path d=\"M12 10v4\" />",
  "camera": "<path d=\"m22 8-6 4 6 4V8Z\" />\n  <rect width=\"14\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\" ry=\"2\" />",
  "props": "<path d=\"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\" />\n  <path d=\"m3.3 7 8.7 5 8.7-5\" />\n  <path d=\"M12 22V12\" />",
  "media": "<path d=\"M18 22H4a2 2 0 0 1-2-2V6\" />\n  <path d=\"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18\" />\n  <circle cx=\"12\" cy=\"8\" r=\"2\" />\n  <rect width=\"16\" height=\"16\" x=\"6\" y=\"2\" rx=\"2\" />",
  "help": "<circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\" />\n  <path d=\"M12 17h.01\" />",
  "move": "<polyline points=\"5 9 2 12 5 15\" />\n  <polyline points=\"9 5 12 2 15 5\" />\n  <polyline points=\"15 19 12 22 9 19\" />\n  <polyline points=\"19 9 22 12 19 15\" />\n  <line x1=\"2\" x2=\"22\" y1=\"12\" y2=\"12\" />\n  <line x1=\"12\" x2=\"12\" y1=\"2\" y2=\"22\" />",
  "rotate": "<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\" />\n  <path d=\"M21 3v5h-5\" />",
  "scale": "<polyline points=\"15 3 21 3 21 9\" />\n  <polyline points=\"9 21 3 21 3 15\" />\n  <line x1=\"21\" x2=\"14\" y1=\"3\" y2=\"10\" />\n  <line x1=\"3\" x2=\"10\" y1=\"21\" y2=\"14\" />",
  "joints": "<circle cx=\"16\" cy=\"4\" r=\"1\" />\n  <path d=\"m18 19 1-7-6 1\" />\n  <path d=\"m5 8 3-3 5.5 3-2.36 3.5\" />\n  <path d=\"M4.24 14.5a5 5 0 0 0 6.88 6\" />\n  <path d=\"M13.76 17.5a5 5 0 0 0-6.88-6\" />",
  "capture": "<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\" />\n  <circle cx=\"12\" cy=\"13\" r=\"3\" />",
  "timeline": "<path d=\"M8 6h10\" />\n  <path d=\"M6 12h9\" />\n  <path d=\"M11 18h7\" />",
  "undo": "<path d=\"M9 14 4 9l5-5\" />\n  <path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11\" />",
  "redo": "<path d=\"m15 14 5-5-5-5\" />\n  <path d=\"M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13\" />",
  "save": "<path d=\"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z\" />\n  <polyline points=\"17 21 17 13 7 13 7 21\" />\n  <polyline points=\"7 3 7 8 15 8\" />",
  "folder": "<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\" />",
  "focus": "<circle cx=\"12\" cy=\"12\" r=\"3\" />\n  <path d=\"M3 7V5a2 2 0 0 1 2-2h2\" />\n  <path d=\"M17 3h2a2 2 0 0 1 2 2v2\" />\n  <path d=\"M21 17v2a2 2 0 0 1-2 2h-2\" />\n  <path d=\"M7 21H5a2 2 0 0 1-2-2v-2\" />",
  "top": "<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\" />\n  <rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\" />\n  <rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\" />\n  <rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\" />",
  "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" />\n  <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />",
  "trash": "<path d=\"M3 6h18\" />\n  <path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\" />\n  <path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\" />\n  <line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\" />\n  <line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\" />",
  "play": "<polygon points=\"5 3 19 12 5 21 5 3\" />",
  "pause": "<rect width=\"4\" height=\"16\" x=\"6\" y=\"4\" />\n  <rect width=\"4\" height=\"16\" x=\"14\" y=\"4\" />",
  "rewind": "<polygon points=\"19 20 9 12 19 4 19 20\" />\n  <line x1=\"5\" x2=\"5\" y1=\"19\" y2=\"5\" />",
  "record": "<circle cx=\"12\" cy=\"12\" r=\"10\" />",
  "stop": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" />",
  "chair": "<path d=\"M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3\" />\n  <path d=\"M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z\" />\n  <path d=\"M5 18v2\" />\n  <path d=\"M19 18v2\" />",
  "table": "<path d=\"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18\" />",
  "window": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" />\n  <path d=\"M10 4v4\" />\n  <path d=\"M2 8h20\" />\n  <path d=\"M6 4v4\" />",
  "lamp": "<path d=\"M9 2h6l3 7H6l3-7Z\" />\n  <path d=\"M12 9v13\" />\n  <path d=\"M9 22h6\" />",
  "bed": "<path d=\"M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8\" />\n  <path d=\"M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4\" />\n  <path d=\"M12 4v6\" />\n  <path d=\"M2 18h20\" />",
  "dishes": "<path d=\"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2\" />\n  <path d=\"M7 2v20\" />\n  <path d=\"M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7\" />",
  "car": "<path d=\"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2\" />\n  <circle cx=\"7\" cy=\"17\" r=\"2\" />\n  <path d=\"M9 17h6\" />\n  <circle cx=\"17\" cy=\"17\" r=\"2\" />",
  "eye": "<path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\" />\n  <circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "eyeOff": "<path d=\"M9.88 9.88a3 3 0 1 0 4.24 4.24\" />\n  <path d=\"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68\" />\n  <path d=\"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61\" />\n  <line x1=\"2\" x2=\"22\" y1=\"2\" y2=\"22\" />",
  "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" />\n  <path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />",
  "unlock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" />\n  <path d=\"M7 11V7a5 5 0 0 1 9.9-1\" />"
};
export function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.classList.add('ui-icon');svg.innerHTML=glyphs[name]||glyphs.props;return svg;}
export function iconButton(button,name,label,compact=false){button.replaceChildren(icon(name));if(label){const text=document.createElement(compact?'small':'span');text.textContent=label;button.append(text);}button.classList.add('icon-button');button.setAttribute('aria-label',label||button.title||name);}
export function initializeIcons(){
 for(const [panel,name] of Object.entries({scene:'scene',actors:'actor',cameras:'camera',props:'props',media:'media'}))iconButton(document.querySelector('[data-panel='+panel+']'),name);
 for(const [mode,name] of Object.entries({translate:'move',rotate:'rotate',scale:'scale'})){const b=document.querySelector('[data-mode='+mode+']');iconButton(b,name,b.querySelector('small').textContent,true);}
 for(const [id,name] of Object.entries({help:'help',undo:'undo',redo:'redo',rewind:'rewind'}))iconButton(document.getElementById(id),name);
 for(const [id,name] of Object.entries({'edit-joints':'joints',capture:'capture','timeline-toggle':'timeline'})){const b=document.getElementById(id);iconButton(b,name,b.querySelector('small').textContent,true);}
 for(const [id,name] of Object.entries({'export-project':'save','import-project':'folder','top-view':'top',focus:'focus','reset-view':'rotate',duplicate:'copy',delete:'trash'})){const b=document.getElementById(id);iconButton(b,name,b.textContent);}
 iconButton(document.getElementById('play'),'play','播放');iconButton(document.getElementById('record'),'record','录制参考视频');
}
