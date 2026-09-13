(() => {
const $=id=>document.getElementById(id), fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]), uid=()=>`obj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const DB_NAME='khatavar_db',STORE='projects',FONT_STORE='fonts';
let dbPromise=null;
function db(){if(dbPromise)return dbPromise;dbPromise=new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});if(!d.objectStoreNames.contains(FONT_STORE))d.createObjectStore(FONT_STORE,{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return dbPromise}
async function idbPut(store,val){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(store,'readwrite');tx.objectStore(store).put(val);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function idbGetAll(store){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(store,'readonly'),r=tx.objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbDelete(store,id){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}

const baseFont={id:'builtin-vazir',family:'Vazirmatn',name:'Vazirmatn',source:'google',format:'web'};
let fonts=[baseFont];
let doc={version:2,id:uid(),name:'اثر جدید',artboard:{width:1080,height:1080},background:{mode:'transparent',color:'#ffffff',color2:'#dfe8ff',angle:135},objects:[]};
let selected=null,selectedWord=null,zoom=.55,history=[],future=[],interaction=null,rulerOn=false;
function defaults(){return {id:uid(),type:'text',name:'متن',text:'خط‌آور',x:220,y:390,width:640,height:180,rotation:0,scaleX:1,scaleY:1,opacity:1,mode:'full',style:{fontFamily:'Vazirmatn',fontSize:96,fontWeight:700,fontStyle:'normal',color:'#111111',letterSpacing:0,lineHeight:1.2,textAlign:'center',direction:'rtl'},words:[]}}
function normalize(o){o.words=o.words||[];if(!o.words.length)rebuildWords(o,true);for(const w of o.words){w.style={...o.style,...(w.style||{})};w.overrides=w.overrides||{};for(const k of ['fontFamily','fontSize','fontWeight','fontStyle','color','letterSpacing','lineHeight','textAlign','direction'])if(w.style[k]!==o.style[k]&&!w.overrides[k])w.overrides[k]=true}return o}
function snapshot(){return JSON.stringify(doc)}
function commit(before){const after=snapshot();if(before!==after){history.push(before);if(history.length>80)history.shift();future=[];queueAutosave();}}
function setStatus(t){$('statusText').textContent=t}
function selectedObj(){return doc.objects.find(o=>o.id===selected)}
function autoFitTextObject(o){
 const probe=document.createElement('div');
 const st=o.style;
 probe.style.cssText=[
  'position:fixed','left:-100000px','top:-100000px','visibility:hidden','pointer-events:none','display:inline-block',
  'white-space:pre','box-sizing:border-box',`font-family:${CSS.escape(st.fontFamily)}`,`font-size:${st.fontSize}px`,`font-weight:${st.fontWeight}`,`font-style:${st.fontStyle}`,
  `letter-spacing:${st.letterSpacing}px`,`line-height:${st.lineHeight}`,`direction:${st.direction}`,`text-align:${st.textAlign}`,
  'padding:0','margin:0','border:0','width:max-content','height:auto'
 ].join(';');
 probe.textContent=o.text || ' ';
 document.body.appendChild(probe);
 const rect=probe.getBoundingClientRect();
 const lines=Math.max(1,(o.text.match(/\n/g)||[]).length+1);
 o.width=Math.max(40,Math.ceil(rect.width)+8);
 o.height=Math.max(Math.ceil(st.fontSize*st.lineHeight*lines)+8,40);
 probe.remove();
}
function rebuildWords(o,preserve=true){
 const parts=o.text.match(/[^\s]+|\s+/g)||[];let x=0;
 const old=preserve?o.words:[];o.words=[];
 for(const part of parts){if(/\s+/.test(part)){x+=part.length*12;continue}const prev=old.find(w=>w.text===part)||{};const w={id:prev.id||uid(),text:part,x:prev.x??x,y:prev.y??0,width:prev.width||Math.max(40,part.length*60),height:prev.height||o.height,rotation:prev.rotation||0,scaleX:prev.scaleX||1,scaleY:prev.scaleY||1,style:{...o.style,...(prev.style||{})},overrides:{...(prev.overrides||{})}};o.words.push(w);x+=w.width+12}
}
function layoutWords(o){
 if(!o.words?.length)return;
 const gap=12,tokens=o.text.match(/[^\s]+|\s+/g)||[];
 const words=[];
 for(const token of tokens){
  if(/\s+/.test(token))continue;
  const w=o.words.find(x=>x.text===token&&!x.__laid)||o.words.find(x=>x.text===token);
  if(!w)continue;
  const st=wordEffectiveStyle(o,w);
  if(!w.overrides?.width){
   const probe=document.createElement('span');
   probe.style.cssText=`position:fixed;left:-100000px;top:-100000px;visibility:hidden;white-space:pre;font-family:${CSS.escape(st.fontFamily)};font-size:${st.fontSize}px;font-weight:${st.fontWeight};font-style:${st.fontStyle};letter-spacing:${st.letterSpacing}px;direction:${st.direction};unicode-bidi:isolate`;
   probe.textContent=w.text;document.body.appendChild(probe);
   w.width=Math.max(40,Math.ceil(probe.getBoundingClientRect().width)+2);
   w.height=Math.max(40,Math.ceil(st.fontSize*st.lineHeight)+2);
   probe.remove();
  }
  words.push(w);w.__laid=true;
 }
 const total=Math.max(0,words.reduce((n,w)=>n+w.width,0)+gap*Math.max(0,words.length-1));
 const align=o.style.textAlign;
 const offset=align==='right'?Math.max(0,o.width-total):align==='center'?Math.max(0,(o.width-total)/2):0;
 let cursor=o.style.direction==='rtl'?o.width-offset:offset;
 const rtl=o.style.direction==='rtl';
 for(const w of words){
  if(!w.overrides?.x){
   if(rtl){cursor-=w.width;w.x=cursor;}
   else {w.x=cursor;cursor+=w.width;}
  }
  if(!w.overrides?.y)w.y=0;
  cursor+=rtl?-gap:gap;
 }
 for(const w of o.words)delete w.__laid;
}

function render(){
 const board=$('artboard');board.style.width=doc.artboard.width+'px';board.style.height=doc.artboard.height+'px';board.style.transform=`scale(${zoom})`;board.dataset.bg=doc.background.mode;board.style.setProperty('--art-color',doc.background.color);board.style.setProperty('--bg-color1',doc.background.color);board.style.setProperty('--bg-color2',doc.background.color2);board.style.setProperty('--bg-angle',doc.background.angle+'deg');
 $('dimensions').textContent=`${doc.artboard.width} × ${doc.artboard.height}`;$('layerCount').textContent=fa(doc.objects.length);$('emptyState').hidden=doc.objects.length>0;
 board.querySelectorAll('.text-object').forEach(e=>e.remove());
 [...doc.objects].reverse().forEach(o=>{normalize(o);const el=document.createElement('div');el.className='text-object'+(o.id===selected?' selected':'');el.dataset.id=o.id;el.style.cssText=`left:${o.x}px;top:${o.y}px;width:${o.width}px;height:${o.height}px;opacity:${o.opacity};font-family:${CSS.escape(o.style.fontFamily)};font-size:${o.style.fontSize}px;font-weight:${o.style.fontWeight};font-style:${o.style.fontStyle};color:${o.style.color};letter-spacing:${o.style.letterSpacing}px;line-height:${o.style.lineHeight};text-align:${o.style.textAlign};direction:${o.style.direction};unicode-bidi:isolate;transform:rotate(${o.rotation}deg) scale(${o.scaleX},${o.scaleY});`;
   if(o.words?.length){o.words.forEach(w=>{const ws=document.createElement('span');const st=wordEffectiveStyle(o,w);ws.className='word-span'+(w.id===selectedWord?' selected-word':'');ws.dataset.wordId=w.id;ws.dir=st.direction;ws.textContent=w.text;ws.style.cssText=`left:${w.x}px;top:${w.y}px;width:${w.width}px;height:${w.height}px;font-family:${CSS.escape(st.fontFamily)};font-size:${st.fontSize}px;font-weight:${st.fontWeight};font-style:${st.fontStyle};color:${st.color};letter-spacing:${st.letterSpacing}px;line-height:${st.lineHeight};text-align:${st.textAlign};direction:${st.direction};unicode-bidi:isolate;opacity:${w.opacity??1};transform:rotate(${w.rotation}deg) scale(${w.scaleX},${w.scaleY});`;if(o.mode==='word')ws.onpointerdown=e=>beginWordDrag(e,o,w,ws);else ws.style.pointerEvents='none';el.appendChild(ws)})}else{el.dir=o.style.direction;el.style.unicodeBidi='plaintext';el.appendChild(document.createTextNode(o.text));}
   el.addEventListener('pointerdown',e=>beginObjectDrag(e,o,el));board.appendChild(el);
 });
 renderLayers();renderRuler();
}
function addHandles(el){['nw','ne','sw','se'].forEach(p=>{const h=document.createElement('i');h.className='handle '+p;h.dataset.handle=p;h.onpointerdown=e=>beginResize(e,selectedObj(),p);el.appendChild(h)});const stem=document.createElement('i');stem.className='rotate-stem';el.appendChild(stem);const r=document.createElement('i');r.className='rotate-handle';r.dataset.handle='rotate';r.onpointerdown=e=>beginRotate(e,selectedObj());el.appendChild(r)}
function renderLayers(){const box=$('layers');box.innerHTML='';[...doc.objects].reverse().forEach(o=>{const row=document.createElement('div');row.className='layer'+(o.id===selected?' active':'');row.innerHTML=`<span>▦</span><span>${escapeHtml(o.name||o.text.slice(0,18)||'متن')}</span><span class="eye">◉</span>`;row.onclick=()=>{selected=o.id;selectedWord=null;render();syncPanel()};box.appendChild(row)})}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function wordEffectiveStyle(o,w){const st={...o.style};for(const k of Object.keys(w.overrides||{}))st[k]=w.style[k];return st}
function wordsHaveOverrides(o){return (o.words||[]).some(w=>Object.keys(w.overrides||{}).length||w.rotation||w.scaleX!==1||w.scaleY!==1||w.x||w.y)}
function syncPanel(){const o=selectedObj(),p=$('properties');$('noSelection').hidden=!!o;p.hidden=!o;if(!o)return;const w=o.mode==='word'&&selectedWord?o.words.find(x=>x.id===selectedWord):null;const t=w||o;const st=t.style;$('textInput').value=o.text;$('textInput').dir=o.style.direction;$('xInput').value=Math.round(t.x);$('yInput').value=Math.round(t.y);$('wInput').value=Math.round(t.width);$('hInput').value=Math.round(t.height);$('rotationInput').value=Math.round(t.rotation);$('opacityInput').value=Math.round((w?(w.opacity??1):o.opacity)*100);$('scaleXInput').value=t.scaleX.toFixed(2);$('scaleYInput').value=t.scaleY.toFixed(2);$('fontInput').value=st.fontFamily;$('fontSizeInput').value=st.fontSize;$('weightInput').value=st.fontWeight;$('letterSpacingInput').value=st.letterSpacing;$('lineHeightInput').value=st.lineHeight;$('colorInput').value=st.color;$('directionBtn').textContent=st.direction.toUpperCase();document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===o.mode));$('wordSection').hidden=o.mode!=='word';if(o.mode==='word')renderWordList(o);addHandles($(`.text-object[data-id="${CSS.escape(o.id)}"]`))}
function renderWordList(o){const box=$('wordList');box.innerHTML='';o.words.forEach((w,i)=>{const b=document.createElement('button');b.className='word-chip'+(w.id===selectedWord?' active':'');b.textContent=w.text;b.onclick=()=>{selectedWord=w.id;render();syncWordPanel(o,w)};box.appendChild(b)})}
function syncWordPanel(o,w){if(!w)return;setStatus(`کلمه «${w.text}» انتخاب شد`);}
function update(path,val){const o=selectedObj();if(!o)return;const target=o.mode==='word'&&selectedWord?o.words.find(w=>w.id===selectedWord):o;if(!target)return;const before=snapshot();let t=target;for(let i=0;i<path.length-1;i++)t=t[path[i]];t[path[path.length-1]]=val;if(target===o&&path[0]==='text'){autoFitTextObject(o);rebuildWords(o,true)}commit(before);render();syncPanel()}
function updateSelectedStyle(key,val){const o=selectedObj();if(!o)return;const before=snapshot();if(o.mode==='word'&&selectedWord){const w=o.words.find(x=>x.id===selectedWord);if(!w)return;if(key==='opacity')w.opacity=val;else {w.style[key]=val;w.overrides=w.overrides||{};w.overrides[key]=true}}else o.style[key]=val;commit(before);render();syncPanel()}
function addText(){const before=snapshot(),o=defaults();o.x=(doc.artboard.width-o.width)/2;o.y=(doc.artboard.height-o.height)/2;doc.objects.push(o);selected=o.id;selectedWord=null;commit(before);render();syncPanel();setStatus('متن اضافه شد')}
function boardPoint(e){const r=$('artboard').getBoundingClientRect();return{x:(e.clientX-r.left)/zoom,y:(e.clientY-r.top)/zoom}}
function clearSnapGuides(){document.querySelectorAll('.snap-guide').forEach(g=>g.remove())}
function snapValue(v,targets,threshold){for(const t of targets)if(Math.abs(v-t)<=threshold)return t;return v}
function applySnap(o,x,y){if(!rulerOn){clearSnapGuides();return{x,y}}const threshold=10;const targetsX=[{p:0,off:0},{p:doc.artboard.width/2,off:o.width/2},{p:doc.artboard.width,off:o.width}];const targetsY=[{p:0,off:0},{p:doc.artboard.height/2,off:o.height/2},{p:doc.artboard.height,off:o.height}];let nx=x,ny=y,hitX=null,hitY=null;for(const t of targetsX){const d=Math.abs((x+t.off)-t.p);if(d<=threshold&&(hitX===null||d<hitX.d))hitX={d,value:t.p-t.off}}for(const t of targetsY){const d=Math.abs((y+t.off)-t.p);if(d<=threshold&&(hitY===null||d<hitY.d))hitY={d,value:t.p-t.off}}if(hitX)nx=hitX.value;if(hitY)ny=hitY.value;clearSnapGuides();if(hitX){const g=document.createElement('i');g.className='snap-guide vertical';g.style.left=(hitX.value+o.width/2)+'px';$('artboard').appendChild(g)}if(hitY){const g=document.createElement('i');g.className='snap-guide horizontal';g.style.top=(hitY.value+o.height/2)+'px';$('artboard').appendChild(g)}return{x:nx,y:ny}}
function beginObjectDrag(e,o,el){if(e.target.closest('.handle'))return;if(o.mode==='word'&&e.target.closest('.word-span'))return;e.stopPropagation();selected=o.id;selectedWord=null;const before=snapshot(),p=boardPoint(e),ox=o.x,oy=o.y;interaction={type:'move',before,o,start:p,obj:o,ox,oy};e.currentTarget.setPointerCapture?.(e.pointerId);window.addEventListener('pointermove',onPointerMove);window.addEventListener('pointerup',endPointer,{once:true})}
function beginWordDrag(e,o,w,el){e.stopPropagation();selected=o.id;selectedWord=w.id;const before=snapshot(),p=boardPoint(e),ox=w.x,oy=w.y;interaction={type:'wordmove',before,o,w,start:p,ox,oy};window.addEventListener('pointermove',onPointerMove);window.addEventListener('pointerup',endPointer,{once:true});render();syncPanel()}
function localPoint(o,p){const a=-(o.rotation||0)*Math.PI/180,cx=o.x+o.width/2,cy=o.y+o.height/2,dx=p.x-cx,dy=p.y-cy;return{x:dx*Math.cos(a)-dy*Math.sin(a)+o.width/2,y:dx*Math.sin(a)+dy*Math.cos(a)+o.height/2}}
function beginResize(e,o,corner){if(!o)return;e.stopPropagation();const before=snapshot(),p=localPoint(o,boardPoint(e));interaction={type:'resize',before,o,corner,start:p,ox:o.x,oy:o.y,ow:Math.max(30,o.width),oh:Math.max(30,o.height),rot:o.rotation||0};window.addEventListener('pointermove',onPointerMove);window.addEventListener('pointerup',endPointer,{once:true})}
function beginRotate(e,o){if(!o)return;e.stopPropagation();const before=snapshot(),p=boardPoint(e),cx=o.x+o.width/2,cy=o.y+o.height/2;interaction={type:'rotate',before,o,cx,cy,startAngle:Math.atan2(p.y-cy,p.x-cx),startRot:o.rotation};window.addEventListener('pointermove',onPointerMove);window.addEventListener('pointerup',endPointer,{once:true})}
function onPointerMove(e){if(!interaction)return;const i=interaction,p=boardPoint(e);if(i.type==='move'){const q=applySnap(i.obj,i.ox+(p.x-i.start.x),i.oy+(p.y-i.start.y));i.obj.x=q.x;i.obj.y=q.y}else if(i.type==='wordmove'){i.w.x=i.ox+(p.x-i.start.x);i.w.y=i.oy+(p.y-i.start.y)}else if(i.type==='rotate'){const a=Math.atan2(p.y-i.cy,p.x-i.cx);i.o.rotation=i.startRot+(a-i.startAngle)*180/Math.PI}else if(i.type==='resize'){const lp=localPoint(i.o,p),dx=lp.x-i.start.x,dy=lp.y-i.start.y;let left=0,top=0,right=i.ow,bottom=i.oh;if(i.corner.includes('e'))right=Math.max(left+30,i.ow+dx);if(i.corner.includes('s'))bottom=Math.max(top+30,i.oh+dy);if(i.corner.includes('w'))left=Math.min(i.ow-30,i.start.x+dx);if(i.corner.includes('n'))top=Math.min(i.oh-30,i.start.y+dy);const nw=Math.max(30,right-left),nh=Math.max(30,bottom-top);const localCx=(left+right)/2,localCy=(top+bottom)/2;const boardCx=i.ox+i.ow/2,boardCy=i.oy+i.oh/2;const a=i.rot*Math.PI/180;const centerShiftX=localCx-i.ow/2,centerShiftY=localCy-i.oh/2;const worldShiftX=centerShiftX*Math.cos(a)-centerShiftY*Math.sin(a),worldShiftY=centerShiftX*Math.sin(a)+centerShiftY*Math.cos(a);i.o.width=nw;i.o.height=nh;i.o.x=boardCx+worldShiftX-nw/2;i.o.y=boardCy+worldShiftY-nh/2}render();syncPanel()}
function endPointer(){if(!interaction)return;commit(interaction.before);interaction=null;window.removeEventListener('pointermove',onPointerMove);clearSnapGuides();syncPanel()}
$('viewport').addEventListener('pointerdown',e=>{if(e.target===$('viewport')||e.target.classList.contains('ruler')){selected=null;selectedWord=null;render();syncPanel()}});
$('viewport').addEventListener('pointermove',e=>{const p=boardPoint(e);$('cursorPos').textContent=`X: ${Math.round(p.x)} · Y: ${Math.round(p.y)}`});
$('addTextBtn').onclick=addText;$('emptyAdd').onclick=addText;
$('duplicateBtn').onclick=()=>{const o=selectedObj();if(!o)return;const before=snapshot(),n=JSON.parse(JSON.stringify(o));n.id=uid();n.name=(o.name||'متن')+' کپی';n.x+=30;n.y+=30;n.words=[];rebuildWords(n,false);doc.objects.push(n);selected=n.id;selectedWord=null;commit(before);render();syncPanel()};
$('deleteBtn').onclick=()=>{if(!selected)return;const before=snapshot();doc.objects=doc.objects.filter(o=>o.id!==selected);selected=null;selectedWord=null;commit(before);render();syncPanel()};
const bindings=[['textInput',['text'],v=>v],['xInput',['x'],Number],['yInput',['y'],Number],['wInput',['width'],Number],['hInput',['height'],Number],['rotationInput',['rotation'],Number],['opacityInput',['opacity'],v=>Number(v)/100],['scaleXInput',['scaleX'],Number],['scaleYInput',['scaleY'],Number]];
bindings.forEach(([id,path,fn])=>$(id).addEventListener('change',e=>update(path,fn(e.target.value))));
$('textInput').addEventListener('input',e=>{const o=selectedObj();if(!o|| (o.mode==='word'&&selectedWord))return;const before=snapshot();o.text=e.target.value;autoFitTextObject(o);rebuildWords(o,true);commit(before);render();syncPanel()});
[['fontInput','fontFamily'],['fontSizeInput','fontSize'],['weightInput','fontWeight'],['letterSpacingInput','letterSpacing'],['lineHeightInput','lineHeight'],['colorInput','color']].forEach(([id,key])=>$(id).addEventListener('change',e=>{const val=['fontSize','fontWeight','letterSpacing','lineHeight'].includes(key)?Number(e.target.value):e.target.value;updateSelectedStyle(key,val);const o=selectedObj();if(o&&o.mode==='full'){autoFitTextObject(o);layoutWords(o);render();syncPanel()}}));
document.querySelectorAll('.align-btn').forEach(b=>b.onclick=()=>updateSelectedStyle('textAlign',b.dataset.align));
$('directionBtn').onclick=()=>{
 const o=selectedObj();if(!o)return;const w=o.mode==='word'&&selectedWord?o.words.find(x=>x.id===selectedWord):null;const next=(w?w.style.direction:o.style.direction)==='rtl'?'ltr':'rtl';const before=snapshot();
 if(w){w.style.direction=next;w.overrides=w.overrides||{};w.overrides.direction=true;}
 else{o.style.direction=next;for(const ww of o.words){ww.style=ww.style||{};ww.overrides=ww.overrides||{};ww.style.direction=next;delete ww.overrides.direction}autoFitTextObject(o);layoutWords(o)}
 commit(before);render();syncPanel();
};
document.querySelectorAll('.mode-btn').forEach(b=>b.onclick=()=>{const o=selectedObj();if(!o)return;const before=snapshot();o.mode=b.dataset.mode;rebuildWords(o,true);if(o.mode==='full')layoutWords(o);selectedWord=o.mode==='word'?(o.words[0]?.id||null):null;commit(before);render();syncPanel()});
$('undoBtn').onclick=()=>{if(!history.length)return;future.push(snapshot());doc=JSON.parse(history.pop());selected=doc.objects[0]?.id||null;selectedWord=null;render();syncPanel();queueAutosave()};
$('redoBtn').onclick=()=>{if(!future.length)return;history.push(snapshot());doc=JSON.parse(future.pop());selected=doc.objects[0]?.id||null;selectedWord=null;render();syncPanel();queueAutosave()};
$('newBtn').onclick=()=>{if(!confirm('پروژه فعلی کنار گذاشته شود؟'))return;history=[];future=[];doc={version:2,id:uid(),name:'اثر جدید',artboard:{width:1080,height:1080},background:{mode:'transparent',color:'#ffffff',color2:'#dfe8ff',angle:135},objects:[]};selected=null;$('projectName').value=doc.name;render();syncPanel()};
$('projectName').onchange=e=>{doc.name=e.target.value;queueAutosave()};

document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const before=snapshot(),p=b.dataset.preset;doc.artboard=p==='square'?{width:1080,height:1080}:p==='portrait'?{width:1080,height:1350}:{width:1350,height:1080};commit(before);fit()});
$('zoomIn').onclick=()=>setZoom(Math.min(2,zoom+.1));$('zoomOut').onclick=()=>setZoom(Math.max(.1,zoom-.1));$('fitBtn').onclick=fit;function setZoom(z){zoom=z;$('zoomLabel').textContent=Math.round(z*100)+'%';render()};function fit(){const v=$('viewport');zoom=Math.min((v.clientWidth-70)/doc.artboard.width,(v.clientHeight-70)/doc.artboard.height,1.2);$('zoomLabel').textContent=Math.round(zoom*100)+'%';render()}
$('fitContentBtn').onclick=()=>{if(!doc.objects.length)return;const before=snapshot(),xs=[],ys=[],xe=[],ye=[];doc.objects.forEach(o=>{xs.push(o.x);ys.push(o.y);xe.push(o.x+o.width);ye.push(o.y+o.height)});const minx=Math.min(...xs),miny=Math.min(...ys),maxx=Math.max(...xe),maxy=Math.max(...ye),pad=40;doc.objects.forEach(o=>{o.x-=minx-pad;o.y-=miny-pad});doc.artboard={width:Math.ceil(maxx-minx+pad*2),height:Math.ceil(maxy-miny+pad*2)};commit(before);fit()};
$('themeBtn').onclick=()=>{document.body.dataset.theme=document.body.dataset.theme==='dark'?'light':'dark';localStorage.setItem('khatavar-theme',document.body.dataset.theme);render()};
$('rulerBtn').onclick=()=>{rulerOn=!rulerOn;$('rulerTop').classList.toggle('visible',rulerOn);$('rulerLeft').classList.toggle('visible',rulerOn);renderRuler()};
function renderRuler(){if(!rulerOn)return;const top=$('rulerTop'),left=$('rulerLeft');top.innerHTML='';left.innerHTML='';const step=100*zoom;for(let x=0;x<doc.artboard.width*zoom;x+=step){const t=document.createElement('span');t.textContent=fa(Math.round(x/zoom));t.style.position='absolute';t.style.left=x+'px';t.style.top='6px';top.appendChild(t)}for(let y=0;y<doc.artboard.height*zoom;y+=step){const t=document.createElement('span');t.textContent=fa(Math.round(y/zoom));t.style.position='absolute';t.style.top=y+'px';t.style.right='5px';left.appendChild(t)}}

$('bgBtn').onclick=()=>{$('bgModal').hidden=false;syncBgModal()};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).hidden=true);document.querySelectorAll('[data-bg-mode]').forEach(b=>b.onclick=()=>{const before=snapshot();doc.background.mode=b.dataset.bgMode;commit(before);syncBgModal();render()});
function syncBgModal(){$('bgColor').value=doc.background.color;$('bgColor2').value=doc.background.color2;$('bgAngle').value=doc.background.angle;$('bgAngleOut').textContent=fa(doc.background.angle)+'°';document.querySelectorAll('[data-bg-mode]').forEach(b=>b.classList.toggle('active',b.dataset.bgMode===doc.background.mode))}
$('bgColor').oninput=e=>{doc.background.color=e.target.value;render();queueAutosave()};$('bgColor2').oninput=e=>{doc.background.color2=e.target.value;render();queueAutosave()};$('bgAngle').oninput=e=>{doc.background.angle=Number(e.target.value);$('bgAngleOut').textContent=fa(e.target.value)+'°';render();queueAutosave()};

$('exportBtn').onclick=()=>$('exportModal').hidden=false;$('closeExport').onclick=()=>$('exportModal').hidden=true;document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportArt(b.dataset.export));
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function bufferToBase64(buf){let binary='';const bytes=new Uint8Array(buf),chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(binary)}
function fontMime(f){return ({ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2'})[f]||'application/octet-stream'}
function fontFormat(f){return ({ttf:'truetype',otf:'opentype',woff:'woff',woff2:'woff2'})[f]||'truetype'}
async function ensureExportFonts(){const families=new Set();for(const o of doc.objects){if(o.words?.length)for(const w of o.words)families.add(wordEffectiveStyle(o,w).fontFamily);else families.add(o.style.fontFamily)}for(const family of families){try{await document.fonts.load('400 48px \"'+family+'\"');await document.fonts.load('700 48px \"'+family+'\"')}catch{}}}
function svgString(){let defs='',bg='';if(doc.background.mode==='color')bg=`<rect width="100%" height="100%" fill="${doc.background.color}"/>`;else if(doc.background.mode==='gradient'){defs=`<linearGradient id="kbg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${doc.background.angle} .5 .5)"><stop offset="0%" stop-color="${doc.background.color}"/><stop offset="100%" stop-color="${doc.background.color2}"/></linearGradient>`;bg='<rect width="100%" height="100%" fill="url(#kbg)"/>'}
 const needed=new Set();for(const o of doc.objects){if(o.words?.length)for(const w of o.words)needed.add(wordEffectiveStyle(o,w).fontFamily);else needed.add(o.style.fontFamily)}
 for(const family of needed){const f=fonts.find(x=>x.family===family);if(f?.buffer){defs+=`<style>@font-face{font-family:'${escapeHtml(family)}';src:url(data:${fontMime(f.format)};base64,${bufferToBase64(f.buffer)}) format('${fontFormat(f.format)}');}</style>`}}
 const texts=doc.objects.map(o=>{if(o.words?.length){return `<g transform="translate(${o.x} ${o.y}) rotate(${o.rotation} ${o.width/2} ${o.height/2}) scale(${o.scaleX} ${o.scaleY})">`+o.words.map(w=>{const st=wordEffectiveStyle(o,w),cx=w.x+w.width/2,cy=w.y+w.height*.72;return `<text x="${cx}" y="${cy}" text-anchor="middle" direction="${st.direction}" unicode-bidi="plaintext" fill="${st.color}" opacity="${(w.opacity??1)*o.opacity}" font-family="${escapeHtml(st.fontFamily)}" font-size="${st.fontSize}" font-weight="${st.fontWeight}" font-style="${st.fontStyle}" letter-spacing="${st.letterSpacing}" transform="rotate(${w.rotation} ${cx} ${cy}) scale(${w.scaleX} ${w.scaleY})">${escapeHtml(w.text)}</text>`}).join('')+'</g>'}const cx=o.width/2,cy=o.height*.72;return `<text x="${cx}" y="${cy}" text-anchor="middle" direction="${o.style.direction}" unicode-bidi="plaintext" fill="${o.style.color}" opacity="${o.opacity}" font-family="${escapeHtml(o.style.fontFamily)}" font-size="${o.style.fontSize}" font-weight="${o.style.fontWeight}" font-style="${o.style.fontStyle}" letter-spacing="${o.style.letterSpacing}" transform="translate(${o.x} ${o.y}) rotate(${o.rotation} ${cx} ${cy}) scale(${o.scaleX} ${o.scaleY})">${escapeHtml(o.text)}</text>`}).join('');return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.artboard.width}" height="${doc.artboard.height}" viewBox="0 0 ${doc.artboard.width} ${doc.artboard.height}"><defs>${defs}</defs>${bg}${texts}</svg>`}

function drawCanvasBackground(ctx){if(doc.background.mode==='transparent')return;if(doc.background.mode==='color'){ctx.fillStyle=doc.background.color;ctx.fillRect(0,0,doc.artboard.width,doc.artboard.height);return}const a=(doc.background.angle-90)*Math.PI/180,x=doc.artboard.width/2,y=doc.artboard.height/2,len=Math.hypot(doc.artboard.width,doc.artboard.height);const g=ctx.createLinearGradient(x-Math.cos(a)*len/2,y-Math.sin(a)*len/2,x+Math.cos(a)*len/2,y+Math.sin(a)*len/2);g.addColorStop(0,doc.background.color);g.addColorStop(1,doc.background.color2);ctx.fillStyle=g;ctx.fillRect(0,0,doc.artboard.width,doc.artboard.height)}
function drawCanvasText(ctx,o){const draw=(x,y,txt,st,opacity=1,rot=0,sx=1,sy=1,w=400,h=80)=>{ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rot*Math.PI/180);ctx.scale(sx,sy);ctx.direction=st.direction;ctx.textAlign=st.textAlign==='left'?'left':st.textAlign==='right'?'right':'center';ctx.textBaseline='middle';ctx.globalAlpha=o.opacity*opacity;ctx.fillStyle=st.color;ctx.font=`${st.fontStyle} ${st.fontWeight} ${st.fontSize}px ${JSON.stringify(st.fontFamily).slice(1,-1)}`;const lines=String(txt).split('\n'),lh=st.fontSize*st.lineHeight;let yy=-(lines.length-1)*lh/2;for(const line of lines){ctx.fillText(line,0,yy);yy+=lh}ctx.restore()};
 if(o.words?.length){for(const w of o.words){const st=wordEffectiveStyle(o,w);draw(o.x+w.x,o.y+w.y,w.text,st,w.opacity??1,w.rotation,o.scaleX*w.scaleX,o.scaleY*w.scaleY,w.width,w.height)}}else draw(o.x,o.y,o.text,o.style,1,0,1,1,o.width,o.height)}
async function exportArt(type){$('exportModal').hidden=true;try{await document.fonts.ready;await ensureExportFonts();if(type==='svg'){dl(new Blob([svgString()],{type:'image/svg+xml'}),doc.name+'.svg');return}const c=document.createElement('canvas');c.width=doc.artboard.width;c.height=doc.artboard.height;const ctx=c.getContext('2d');drawCanvasBackground(ctx);for(const o of doc.objects)drawCanvasText(ctx,o);c.toBlob(b=>dl(b,doc.name+'.'+type),type==='jpg'?'image/jpeg':'image/png',.95)}catch(e){setStatus('خروجی گرفتن انجام نشد')}}

$('saveBtn').onclick=()=>saveProject(true);$('projectsBtn').onclick=async()=>{await renderProjects();$('projectsModal').hidden=false};
let autoTimer;function queueAutosave(){clearTimeout(autoTimer);autoTimer=setTimeout(()=>saveProject(false),500)}
async function saveProject(show){try{await idbPut(STORE,{...JSON.parse(JSON.stringify(doc)),updatedAt:Date.now()});localStorage.setItem('khatavar-last-project',doc.id);if(show)setStatus('پروژه در مرورگر ذخیره شد')}catch(e){if(show)setStatus('ذخیره انجام نشد')}}
async function renderProjects(){const box=$('projectList');box.innerHTML='';const all=(await idbGetAll(STORE)).sort((a,b)=>b.updatedAt-a.updatedAt);if(!all.length){box.innerHTML='<div class="empty-panel">هنوز پروژه‌ای ذخیره نشده است.</div>';return}all.forEach(p=>{const row=document.createElement('div');row.className='project-card';row.innerHTML=`<div class="meta"><strong>${escapeHtml(p.name||'اثر بدون نام')}</strong><small>${new Date(p.updatedAt).toLocaleString('fa-IR')} · ${p.artboard.width}×${p.artboard.height}</small></div><button>باز کردن</button><button class="delete">حذف</button>`;row.children[1].onclick=()=>loadProject(p.id);row.children[2].onclick=async()=>{await idbDelete(STORE,p.id);renderProjects()};box.appendChild(row)})}
async function loadProject(id){const all=await idbGetAll(STORE),p=all.find(x=>x.id===id);if(!p)return;doc=p;selected=doc.objects[0]?.id||null;selectedWord=null;$('projectName').value=doc.name||'اثر جدید';history=[];future=[];$('projectsModal').hidden=true;render();syncPanel();setStatus('پروژه بارگذاری شد')}
$('fontAddBtn').onclick=()=>$('fontFileInput').click();$('fontFileInput').onchange=async e=>{for(const file of e.target.files){const id=uid(),family='KhatFont_'+id.slice(-6),buf=await file.arrayBuffer();await idbPut(FONT_STORE,{id,family,name:file.name,buffer:buf,format:file.name.split('.').pop().toLowerCase()});await loadFontRecord({id,family,name:file.name,buffer:buf})}$('fontFileInput').value='';refreshFontSelect();setStatus('فونت‌ها اضافه شدند')};
async function loadFontRecord(f){try{const face=new FontFace(f.family,f.buffer);await face.load();document.fonts.add(face);fonts.push(f)}catch{}}async function loadFonts(){try{const recs=await idbGetAll(FONT_STORE);for(const f of recs)await loadFontRecord(f)}catch{}}function refreshFontSelect(){const sel=$('fontInput');const cur=sel.value;sel.innerHTML=fonts.map(f=>`<option value="${escapeHtml(f.family)}">${escapeHtml(f.name||f.family)}</option>`).join('');if(fonts.some(f=>f.family===cur))sel.value=cur}
$('panelHandle').onclick=()=>$('propertiesPanel').classList.toggle('open');
window.addEventListener('keydown',e=>{const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!typing){e.preventDefault();$('undoBtn').click()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'&&!typing){e.preventDefault();$('redoBtn').click()}if(e.key==='Delete'&&!typing)$('deleteBtn').click()});
(async()=>{document.body.dataset.theme=localStorage.getItem('khatavar-theme')||'dark';await loadFonts();refreshFontSelect();try{const all=await idbGetAll(STORE),last=localStorage.getItem('khatavar-last-project');const p=all.find(x=>x.id===last);if(p){doc=p;$('projectName').value=doc.name||'اثر جدید'}}catch{}render();syncPanel();setTimeout(fit,30)})();
})();
