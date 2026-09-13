import{a as e,i as t,o as n,s as r}from"./preload-helper.BIT7SMv1.js";import{n as i,r as a,t as o}from"./Stage.astro_astro_type_script_index_0_lang.Shpd8P2_.js";import{$ as s,A as c,B as l,C as u,D as d,E as f,F as p,G as m,H as h,I as g,J as _,K as v,L as y,M as b,N as x,O as S,P as C,Q as w,R as T,S as E,T as D,U as O,V as k,W as A,X as j,Y as ee,Z as M,_ as te,a as ne,b as re,c as N,d as P,f as F,g as I,h as ie,i as ae,j as oe,k as L,l as R,m as z,n as se,o as ce,p as B,q as V,r as le,s as H,t as ue,u as de,v as fe,w as pe,x as me,y as U,z as he}from"./follow.Co_DQymV.js";var W=class extends ie{constructor(e){super(e),this.type=E}parse(e){let t=function(e,t){switch(e){case 1:throw Error(`THREE.HDRLoader: Read Error: `+(t||``));case 2:throw Error(`THREE.HDRLoader: Write Error: `+(t||``));case 3:throw Error(`THREE.HDRLoader: Bad File Format: `+(t||``));default:case 4:throw Error(`THREE.HDRLoader: Memory Error: `+(t||``))}},n=function(e,t,n){t||=1024;let r=e.pos,i=-1,a=0,o=``,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));for(;0>(i=s.indexOf(`
`))&&a<t&&r<e.byteLength;)o+=s,a+=s.length,r+=128,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));return-1<i&&(!1!==n&&(e.pos+=a+i+1),o+s.slice(0,i))},r=function(e){let r=/^#\?(\S+)/,i=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,a=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,o=/^\s*FORMAT=(\S+)\s*$/,s=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,c={valid:0,string:``,comments:``,programtype:`RGBE`,format:``,gamma:1,exposure:1,width:0,height:0},l,u;for((e.pos>=e.byteLength||!(l=n(e)))&&t(1,`no header found`),(u=l.match(r))||t(3,`bad initial token`),c.valid|=1,c.programtype=u[1],c.string+=l+`
`;l=n(e),!1!==l;){if(c.string+=l+`
`,l.charAt(0)===`#`){c.comments+=l+`
`;continue}if((u=l.match(i))&&(c.gamma=parseFloat(u[1])),(u=l.match(a))&&(c.exposure=parseFloat(u[1])),(u=l.match(o))&&(c.valid|=2,c.format=u[1]),(u=l.match(s))&&(c.valid|=4,c.height=parseInt(u[1],10),c.width=parseInt(u[2],10)),c.valid&2&&c.valid&4)break}return c.valid&2||t(3,`missing format specifier`),c.valid&4||t(3,`missing image size specifier`),c},i=function(e,n,r){let i=n;if(i<8||i>32767||e[0]!==2||e[1]!==2||e[2]&128)return new Uint8Array(e);i!==(e[2]<<8|e[3])&&t(3,`wrong scanline width`);let a=new Uint8Array(4*n*r);a.length||t(4,`unable to allocate buffer space`);let o=0,s=0,c=4*i,l=new Uint8Array(4),u=new Uint8Array(c),d=r;for(;d>0&&s<e.byteLength;){s+4>e.byteLength&&t(1),l[0]=e[s++],l[1]=e[s++],l[2]=e[s++],l[3]=e[s++],(l[0]!=2||l[1]!=2||(l[2]<<8|l[3])!=i)&&t(3,`bad rgbe scanline format`);let n=0,r;for(;n<c&&s<e.byteLength;){r=e[s++];let i=r>128;if(i&&(r-=128),(r===0||n+r>c)&&t(3,`bad scanline data`),i){let t=e[s++];for(let e=0;e<r;e++)u[n++]=t}else u.set(e.subarray(s,s+r),n),n+=r,s+=r}let f=i;for(let e=0;e<f;e++){let t=0;a[o]=u[e+t],t+=i,a[o+1]=u[e+t],t+=i,a[o+2]=u[e+t],t+=i,a[o+3]=u[e+t],o+=4}d--}return a},a=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=e[t+0]*i,n[r+1]=e[t+1]*i,n[r+2]=e[t+2]*i,n[r+3]=1},o=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=I.toHalfFloat(Math.min(e[t+0]*i,65504)),n[r+1]=I.toHalfFloat(Math.min(e[t+1]*i,65504)),n[r+2]=I.toHalfFloat(Math.min(e[t+2]*i,65504)),n[r+3]=I.toHalfFloat(1)},s=new Uint8Array(e);s.pos=0;let c=r(s),l=c.width,u=c.height,f=i(s.subarray(s.pos),l,u),p,m,h;switch(this.type){case U:h=f.length/4;let e=new Float32Array(h*4);for(let t=0;t<h;t++)a(f,t*4,e,t*4);p=e,m=U;break;case E:h=f.length/4;let t=new Uint16Array(h*4);for(let e=0;e<h;e++)o(f,e*4,t,e*4);p=t,m=E;break;default:throw Error(`THREE.HDRLoader: Unsupported type: `+this.type)}return{width:l,height:u,data:p,header:c.string,gamma:c.gamma,exposure:c.exposure,type:m,colorSpace:d,minFilter:D,magFilter:D,generateMipmaps:!1,flipY:!0}}setDataType(e){return this.type=e,this}},G={aspect:4032/2268,horizon:.498,moon:[.428,.2202],moonRadius:.16},ge={wide:[.27,.72],tall:[.27,.8]},_e={distance:100,zoom:1,anchor:.43,at:.47,moonY:.17,level:.85,saturation:.85,moonLevel:1,depth:.55},ve={..._e,at:.45,moonY:.115},K=.04,ye=.14,be=.08,xe=.03,Se=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,q=`
uniform sampler2D uMap;
uniform float uLevel;
uniform float uSaturation;
uniform vec4 uFeather; // gauche, droite, haut, bas
uniform float uHorizon; // rangée de l'horizon dans la bande (depuis le bas)
uniform float uDepth;
uniform float uFocus;   // 0 : premier plan, net ; 1 : près du véhicule — la baie floue et plus sombre
varying vec2 vUv;
void main() {
  vec3 color = texture2D(uMap, vUv, uFocus * 2.5).rgb * uLevel * mix(1.0, 0.42, uFocus);
  color = mix(vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), color, uSaturation);
  // Sous l'horizon, la baie s'assombrit à mesure qu'elle se rapproche : le regard descend vers la bordure.
  color *= mix(uDepth, 1.0, smoothstep(uHorizon - 0.42, uHorizon, vUv.y));
  float alpha = smoothstep(0.0, uFeather.x, vUv.x) * smoothstep(0.0, uFeather.y, 1.0 - vUv.x)
    * smoothstep(0.0, uFeather.z, 1.0 - vUv.y) * smoothstep(0.0, uFeather.w, vUv.y);
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`,J=`
uniform sampler2D uMap;
uniform float uLevel;
uniform float uFocus;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(uMap, vUv, uFocus * 2.0).rgb * uLevel * mix(1.0, 0.5, uFocus), 1.0);
  #include <colorspace_fragment>
}`;function Ce(e,t){let n=new ee(e);return n.flipY=!1,n.colorSpace=O,n.minFilter=f,n.generateMipmaps=!0,n.anisotropy=t,n.needsUpdate=!0,n}function we(e,t,n,r){let i=Ce(e,r),[a,o]=t,s=o-a,u=new m({uniforms:{uMap:{value:i},uLevel:{value:_e.level},uSaturation:{value:_e.saturation},uFeather:{value:new w(K,ye,be,xe)},uHorizon:{value:(o-G.horizon)/s},uDepth:{value:_e.depth},uFocus:{value:0}},vertexShader:Se,fragmentShader:q,transparent:!0,depthWrite:!1}),d=new c(new g(1,1),u);d.renderOrder=-2;let f=n?Ce(n,r):null,h=f?new m({uniforms:{uMap:{value:f},uLevel:{value:_e.moonLevel},uFocus:{value:0}},vertexShader:Se,fragmentShader:J,transparent:!0,depthWrite:!1,blending:2}):null,_=h?new c(new g(1,1),h):null;_&&(_.renderOrder=-1);let v=new l,y=new p,b=new M,x=new M,S=new M,C=new M,T=new M,E=(e,t,n)=>(C.set(t,n,.5).unproject(e),v.set(e.position,C.sub(e.position).normalize()),v.intersectPlane(y,C)?{u:C.sub(S).dot(x),v:C.y+S.y-e.position.y}:null),D=(e,t)=>{let n=[];for(let r=-80;r<=80;r+=4)C.set(t,0,r).applyMatrix4(e.matrixWorldInverse),!(C.z>-1)&&(C.set(t,0,r).project(e),n.push([C.x,C.y]));if(n.length<2)return[-1,-1];let[r,i]=[n[0],n[n.length-1]],a=(i[1]-r[1])/(i[0]-r[0]||1e-6),o=e=>Math.min(Math.max(r[1]+a*(e-r[0]),-1),1);return[o(-1),o(1)]},O=(e,t,n)=>{let r=G.aspect,i=G.horizon;e.updateMatrixWorld(),e.getWorldDirection(b),b.y=0,b.normalize(),x.set(-b.z,0,b.x),S.copy(e.position).addScaledVector(b,n.distance),y.setFromNormalAndCoplanarPoint(T.copy(b).negate(),S);let[c,l]=D(e,t),f=[E(e,-1,1),E(e,1,1),E(e,1,l),E(e,-1,c)].filter(e=>e!==null),p=f.map(e=>e.u),m=f.map(e=>e.v),g=Math.min(...p),v=Math.max(...p),C=Math.max(...m),w=Math.min(...m),O=a+be*s,k=o-xe*s,A=n.zoom*Math.max((v-g)/.82,C>0?C/((i-O)*r):0,w<0?-w/((k-i)*r):0),j=E(e,n.at*2-1,0)?.u??0,ee=v-.36*A,M=g+.46*A,te=Math.min(Math.max(j-(n.anchor-.5)*A,ee),M);d.scale.set(A,A*r*s,1),d.position.copy(S).addScaledVector(x,te),d.position.y=e.position.y+(i-(a+o)/2)*A*r,d.lookAt(e.position.x,d.position.y,e.position.z),u.uniforms.uLevel.value=n.level,u.uniforms.uSaturation.value=n.saturation,u.uniforms.uDepth.value=n.depth;let ne=null;if(_&&h){let t=(i-G.moon[1])*A*r,a=E(e,0,1-2*n.moonY)?.v??t,o=2*G.moonRadius*A;_.scale.set(o,o,1),_.position.copy(S).addScaledVector(b,-1).addScaledVector(x,te+(G.moon[0]-.5)*A),_.position.y=e.position.y+Math.min(t,a),_.lookAt(e.position.x,_.position.y,e.position.z),h.uniforms.uLevel.value=n.moonLevel,ne=Math.min(t,a)}return{scale:Number(A.toFixed(2)),offset:Number(te.toFixed(2)),rows:[i-C/(A*r),i-w/(A*r)].map(e=>Number(e.toFixed(3))),columns:[.5+(g-te)/A,.5+(v-te)/A].map(e=>Number(e.toFixed(3))),kerb:[c,l].map(e=>Number(((1-e)/2).toFixed(3))),moon:ne===null?null:Number((i-ne/(A*r)).toFixed(3))}},k=e=>{u.uniforms.uFocus.value=e,h&&(h.uniforms.uFocus.value=e)};return{mesh:d,moon:_,textures:[i,...f?[f]:[]],fit:O,focus:k}}var Te=723982,Ee=-1.3,De=.16,Y=1.15,Oe=6,ke=4.4,Ae=-6.4,je=-5.7,Me=3.7,Ne=[-3,-25,-47,19],X=e=>e.toFixed(2),Pe=Ne.map(e=>`vec2(${X(-4.98)}, ${X(e)})`).join(`, `),Fe=Ne.map(e=>`vec3(${X(-4.98)}, ${X(3.5300000000000002)}, ${X(e)})`).join(`, `),Ie=[7.6,4.1,2.2],Z=`vec2(${X(Ie[0])}, ${X(Ie[2])})`,Le=.8,Re=85,ze=140,Be=5.6,Ve=7.5,He=3.5300000000000002,Ue=[-4.98,He,-.5],We=[-1.5,-3.5,5.5,4.5],Ge=[[0,0],[.07,.55],[.13,.06],[.22,.72],[.3,.18],[.42,1.18],[.75,.96],[1.3,1]],Ke=1.6;function qe(e){for(let t=1;t<Ge.length;t++){let[n,r]=Ge[t];if(e<=n){let[i,a]=Ge[t-1];return a+(r-a)*(e-i)/(n-i)}}return 1}var Je=[[0,.42,1],[.5,.2,.8],[.78,.16,.55],[1,.12,.35]],Ye=1.2,Q=3;function Xe(e){let t=0;for(let[n,r,i]of Je){let a=e-n;a>0&&a<r&&(t=Math.max(t,i*S.smoothstep(a,0,.03)*(1-S.smoothstep(a,r*.35,r))))}return t}var Ze=400,Qe=2800,$e=[`map`,`normalMap`,`roughnessMap`,`metalnessMap`,`aoMap`,`emissiveMap`],et=/carpaint_max|paint_material|^black_paint$|^red_paint$/,tt=()=>new Promise(e=>requestAnimationFrame(e));async function nt({root:i,canvas:a,stops:s,progress:c,narrow:l,vehicle:u,assets:d}){let f=a.parentElement,p=matchMedia(`(prefers-reduced-motion: reduce)`),m=new ne({canvas:a,antialias:window.devicePixelRatio<2,powerPreference:`high-performance`});m.outputColorSpace=O,m.toneMapping=7,m.debug.checkShaderErrors=!1;let h=new A;h.background=ht(l.matches?1024:2048),h.fog=new re(Te,16,40);let g=await d.environment;h.environment=g?rt(g):it(m),performance.mark(`stage:env`);let _=new C(30,1,.1,200);se.useWorkers?.(2);let b=at((await new le().setMeshoptDecoder(se).parseAsync(await d.model,``)).scene),x=lt();h.add(b,_t(b),x);let w={uLamp:{value:0},uOut:{value:1},uLampTint:{value:new P(1,.8,.58)},uMoon:{value:1}};Object.assign(x.material.uniforms,w);let T=pt(w),E=new te(11847423,Le),D=new v(16764822,0,26,.5,.75,2);D.position.set(...Ie),D.target.position.set(0,.45,0);let k=new y(16763274,0,0,2);k.position.set(-4.98,3.4000000000000004,Ne[0]),T.group.add(E,E.target,D,D.target,k);let j=xt(o(u).exhaust),ee=new me().add(T.group,j.group,j.light),N=x.material.uniforms;N.uFlameAt.value.copy(j.at);let F=new ce().setFromObject(b),I=!1,ie=()=>{I=!0;let[e,t,n,r]=We;N.uShade.value=vt(m,b,new M(...Ue),We),N.uShadeArea.value.set(e,t,1/(n-e),1/(r-t)),N.uCarBox.value.set((F.min.x+F.max.x)/2,(F.min.z+F.max.z)/2,(F.max.x-F.min.x)/2,(F.max.z-F.min.z)/2)};x.material.uniforms.uNoise.value.anisotropy=l.matches?Math.min(8,m.capabilities.getMaxAnisotropy()):1;let[ae,oe]=await Promise.all([d.bay,d.moon]),L=ae?we(ae,ge[d.bayBand],oe,Math.min(l.matches?16:8,m.capabilities.getMaxAnisotropy())):null;L&&(h.add(L.mesh),L.moon&&h.add(L.moon));let R=gt();h.add(R);let z=p.matches?Ke:0,B=0,V=!1,H=()=>{if(!l.matches)return;let e=z,t=B*B*(3-2*B),n=(p.matches?1:qe(e))*t,r=S.smoothstep(e,.1,.9)*t,i=p.matches?0:Math.exp(-(((e-.46)/.14)**2))*t,a=S.smoothstep(e,.3,1.1),o=w.uOut.value;w.uLamp.value=n,w.uLampTint.value.setRGB(1,.95-.15*a,.88-.3*a),D.color.copy(w.uLampTint.value),k.color.copy(w.uLampTint.value),D.intensity=Re*r*(1+.9*i)*o,k.intensity=ze*n*(1+.5*i)*o,T.setLevel(n*o),h.environmentIntensity=.2+.8*r,h.environmentRotation.y=-.9*(1-Math.min(e/1.4,1)*t)**3};performance.mark(`stage:model`);let fe=e.c63,pe=s.map(e=>e.dataset.stop),U=pe.map(e=>fe[e]??fe.hero),he=o(u).anchors??{},W=U.length-1,G=new M,K=[],ye,be,xe=0,Se=()=>{K=U.map(e=>l.matches?{...e,...e.mobile}:e),ye=new de(K.map(e=>new M(...e.position)),!1,`centripetal`),be=new de(K.map(e=>new M(...e.target)),!1,`centripetal`)};Se();let q=f.clientWidth,J=f.clientHeight,Ce=(e,t)=>{let n=q,r=J;l.matches?e.setViewOffset(n,r,0,r*t,n,r):e.setViewOffset(n,r,-n*(t+Math.max(0,1-n/1440)*.08),0,n,r),e.updateProjectionMatrix()},De=()=>Ce(_,xe),Y=new C,Oe=(e={})=>{if(!L)return null;let[t]=K;return Y.fov=_.fov,Y.aspect=_.aspect,Y.far=_.far,Y.position.set(...t.position),Y.lookAt(...t.target),Ce(Y,t.shift),L.fit(Y,l.matches?Ae:Ee,{...l.matches?ve:_e,...e})},ke=i.querySelector(`[data-night]`),je=e=>{x.material.uniforms.uHeadlights.value=1-S.smoothstep(e,0,.45),ke&&(ke.style.opacity=S.smoothstep(e,.35,1).toFixed(3));let t=1-S.smoothstep(e,0,.45);l.matches&&t!==w.uOut.value&&(w.uOut.value=t,H())},Me=e=>{e=Number.isFinite(e)?Math.min(Math.max(e,0),W):0;let i=Math.min(Math.floor(e),Math.max(W-1,0)),a=U[Math.min(i+1,W)],o=r(e-i,t.matches?n(a.pace):a.pace),s=a.lightsOut;je(s?Math.min(Math.max((e-i-s[0])/(s[1]-s[0]),0),1):0),L?.focus(S.smoothstep(e,.9,2.2));let c=W>0?(i+o)/W:0;ye.getPoint(c,_.position),be.getPoint(c,G),_.lookAt(G),xe=S.lerp(K[i].shift,K[Math.min(i+1,W)].shift,o),De()},X=i.querySelector(`[data-callout]`),Pe=X?.querySelector(`path`),Fe=X?[...X.querySelectorAll(`circle`)]:[],Z=new M,Be=e=>{if(!X||!Pe)return;if(l.matches){X.style.opacity!==`0`&&(X.style.opacity=`0`);return}let t=Math.round(e),n=he[pe[t]]??U[t]?.anchor,r=s[t]?.querySelector(`[data-callout-origin]`),i=1-Math.min(Math.abs(e-t)/.2,1);if(l.matches||!n||!r||i<=0){X.style.opacity=`0`;return}Z.set(...n).project(_);let a=(Z.x+1)/2*q,o=(1-Z.y)/2*J,c=r.getBoundingClientRect();Pe.setAttribute(`d`,`M${c.right},${c.bottom} H${c.right+56} L${a},${o}`);for(let e of Fe)e.setAttribute(`cx`,`${a}`),e.setAttribute(`cy`,`${o}`);X.style.opacity=i.toFixed(3)},Ve=i.querySelector(`[data-beacon]`),He=e=>{if(!Ve)return;let t=Math.round(e),n=he[pe[t]]??U[t]?.anchor,r=1-Math.min(Math.abs(e-t)/.2,1);if(!l.matches||!n||r<=0){Ve.style.opacity=`0`;return}Z.set(...n).project(_);let i=(Z.x+1)/2*q,a=(1-Z.y)/2*J;Ve.style.transform=`translate(${i.toFixed(1)}px, ${a.toFixed(1)}px)`,Ve.style.opacity=r.toFixed(3)},Ge=(l.matches?[2,1.5,1.25,1,.75]:[1.75,1.25,1,.75]).map(e=>Math.min(window.devicePixelRatio,e)),Je=0,Q=0,Xe=!0,$e=l.matches,et=()=>{q=f.clientWidth,J=f.clientHeight,l.matches!==$e&&($e=l.matches,Se(),l.matches||(h.environmentRotation.y=0,h.environmentIntensity=1)),m.setPixelRatio(Ge[Je]),m.setSize(q,J,!1),R.visible=!L&&!l.matches;let e=x.material.uniforms;e.uMobile.value=+!!l.matches,e.uCut.value=L?l.matches?-6.45:-1.46:-1e3,l.matches?h.add(ee):h.remove(ee),l.matches&&!I&&ie(),R.material.uniforms.uPixelRatio.value=m.getPixelRatio();let t=q/J;_.aspect=t,_.fov=l.matches?Math.max(26,t>.6?S.radToDeg(2*Math.atan(Math.tan(S.degToRad(19))*.6/t)):38):t<1.6?S.radToDeg(2*Math.atan(Math.tan(S.degToRad(15))*1.6/t)):30,De(),Oe(),L?.moon&&E.position.copy(L.moon.position).setLength(40),H(),c.measure(),Xe=!0};et(),new ResizeObserver(et).observe(f),p.addEventListener(`change`,()=>Xe=!0);let nt=e=>{let t=1-(1-e)**3;if(x.material.uniforms.uArrival.value=t,l.matches)return H();h.environmentRotation.y=(1-t)*-1.2,h.environmentIntensity=.72+.28*t},st=0,ct=p.matches;nt(+!!ct);let ut=!document.documentElement.classList.contains(`has-intro`);ut||addEventListener(`meca:enter`,()=>{ut=!0,Xe=!0},{once:!0});let $=c.read(),dt=ue(l);Me($),j.group.visible=!0,await m.compileAsync(h,_),j.group.visible=!1,performance.mark(`stage:compiled`,{detail:{programs:m.info.programs?.length}});for(let e of ot(h,h.environment,...L?.textures??[]))m.initTexture(e),await tt();performance.mark(`stage:textures`,{detail:{textures:m.info.memory.textures}});let ft=0,mt=0,yt=!0,bt=pe.indexOf(`rear`),St=-1,Ct=p.matches||bt<0,wt=e=>{let t=j.update(e);return N.uFlame.value=t*2.4,t},Tt=()=>{Me($),m.render(h,_),Be($),He($),c.show($)},Et=e=>{ft=requestAnimationFrame(Et);let t=mt?Math.min((e-mt)/1e3,.25):1/60;mt=e;let n=c.read(),r=Xe;if(p.matches){let e=Math.round(n);e!==$&&($=e,r=!0)}else dt.moving($,n)&&($=dt.step($,n,t),r=!0);if(!ct&&ut){st||=e;let t=Math.min(Math.max(e-st-Ze,0)/Qe,1);nt(t),ct=t>=1,r=!0}if(l.matches){let e=window.scrollY>2;e!==V&&(V=e,V&&B===0&&(z=p.matches?Ke:0,B=+!p.matches)),(V?z<Ke||B<1:B>0)&&(V?(z=Math.min(z+t,Ke),B=Math.min(B+t/.3,1)):(B=Math.max(B-t/.5,0),B===0&&(z=p.matches?Ke:0)),H(),r=!0)}if(l.matches&&!Ct&&(St<0&&Math.abs(n-bt)<.2&&Math.abs($-bt)<.12&&(St=e),St>=0)){let t=(e-St)/1e3;wt(Math.min(t,Ye)),Ct=t>=Ye,r=!0}if(!r){Q=0;return}Xe=!1,Tt(),yt&&(yt=!1,performance.mark(`stage:first-frame`,{detail:{programs:m.info.programs?.length,calls:m.info.render.calls}}),a.classList.add(`is-ready`),dispatchEvent(new CustomEvent(`meca:scene-ready`))),t>(l.matches?1/45:1/24)?Q++:Q=Math.max(0,Q-1),Q>(l.matches?12:8)&&Je<Ge.length-1&&(Je++,Q=0,et())},Dt=()=>{ft||=(mt=0,requestAnimationFrame(Et))},Ot=()=>{cancelAnimationFrame(ft),ft=0};new IntersectionObserver(([e])=>e.isIntersecting?Dt():Ot()).observe(i),a.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),Ot(),c.show(null),i.classList.add(`is-static`)})}function rt(e){let t=new W().parse(e),n=new z(t.data,t.width,t.height,he,t.type);return n.mapping=306,n.colorSpace=d,n.minFilter=D,n.magFilter=D,n.generateMipmaps=!1,n.flipY=!1,n.needsUpdate=!0,n}function it(e){let t=new A,n=new g(1,1);for(let e of a){let r=new c(n,new oe({color:new P(e.color).multiplyScalar(e.power),side:2}));r.scale.set(e.size[0],e.size[1],1),r.position.set(...e.position),r.rotation.set(...e.rotation),t.add(r)}let r=new ae(e),o=r.fromScene(t,i).texture;return r.dispose(),o}function at(e){return e.scale.setScalar(100),e.updateMatrixWorld(!0),e.traverse(e=>{let t=e;if(!t.isMesh)return;let n=t.material,r=n.name.toLowerCase();if(/badge|plate/.test(r)){t.visible=!1;return}n.transmission>0&&(n.transmission=0,n.transparent=!0,n.opacity=Math.min(n.opacity,.3),n.depthWrite=!1),et.test(r)&&n.isMeshPhysicalMaterial?(n.clearcoat=1,n.clearcoatRoughness=.04):n.isMeshPhysicalMaterial&&(t.material=new b().copy(n),n.dispose())}),e}function ot(e,...t){let n=new Set;for(let e of t)e&&n.add(e);return e.traverse(e=>{let t=e;if(!t.isMesh||!t.visible)return;let r=t.material;for(let e of $e){let t=r[e];t&&n.add(t)}}),n}var st=`
uniform vec3 uInk;
uniform float uArrival;
uniform float uHeadlights;
uniform float uCut;
uniform float uMobile; // 1 : téléphone — place marquée, esplanade, lampadaires ; 0 : ordinateur
uniform float uLamp;   // téléphone : niveau des lampadaires (allumés hors du haut de la page)
uniform float uOut;    // extinction finale (1 → 0)
uniform vec3 uLampTint;
uniform float uMoon;
uniform sampler2D uShade; // téléphone : ombre portée du véhicule par la lanterne voisine (R nette, G adoucie)
uniform vec4 uShadeArea;  // son emprise au sol : x0, z0, 1 / largeur, 1 / profondeur
uniform vec4 uCarBox;     // emprise du véhicule : centre (x, z), demi-côtés
uniform float uFlame;     // téléphone : lueur des flammes d'échappement
uniform vec2 uFlameAt;
uniform sampler2D uNoise;
varying vec3 vWorld;

const float KERB = ${X(Ee)};  // bordure du trottoir, côté passager
const float KERB_STONE = ${X(De)};
const float BAY_LINE = ${X(Y)};       // ligne de rive des places, côté chaussée
const float BAY_LENGTH = ${X(Oe)};   // une place : le véhicule au milieu de la sienne
const float CENTER_LINE = ${X(ke)}; // axe de la chaussée (tirets)
// Lanternes des lampadaires de l'esplanade (x, z).
const vec2 LAMPS[4] = vec2[4](${Pe});
const vec2 ROAD_LAMP = ${Z}; // lampadaire de l'autre trottoir (hors champ)
// Phares du véhicule du mécanicien, garé derrière la caméra du premier arrêt, dirigés vers la voiture.
const vec2 VAN = vec2(9.6, 11.5);
const vec2 AIM = vec2(-0.641, -0.768);
const vec2 PERP = vec2(0.768, -0.641);
// Demi-largeur du véhicule vue des phares : son emprise (0,98 × 2,4 m) projetée en travers du faisceau.
const float SPREAD = 2.29;
// Téléphone : flaque d'une lanterne — éclairement à son pied, hauteur de la source et portée (au carré).
const float LAMP_POWER = ${X(Be)};
const float LAMP_FOOT2 = ${X(He*He)};
const float LAMP_SPREAD2 = ${X(Ve*Ve)};

// Grain de matière à l'échelle donnée (texture pavable ; les mipmaps l'adoucissent au loin).
float grain(vec2 p, float scale) {
  return texture2D(uNoise, p * scale).r;
}

// Faisceau d'un phare sur la chaussée : il se pose à quelques mètres et garde sa force jusqu'à la
// voiture. L'ombre du véhicule est un cône derrière lui, dans l'angle qu'il occupe vu du phare, dont
// la pénombre s'élargit avec la distance (calcul direct, sans boucle). Les phares sont plus bas que le
// toit : derrière la voiture, la chaussée reste dans son ombre.
float beam(vec2 p, vec2 lamp) {
  vec2 v = p - lamp;
  float along = dot(v, AIM);
  float across = dot(v, PERP);
  float light = smoothstep(5.0, 11.0, along) * exp(-pow(across / (0.3 + along * 0.13), 2.0)) / (1.0 + pow(along / 16.0, 2.0));
  float reach = dot(-lamp, AIM);
  float angle = abs(across / max(along, 0.1) - dot(-lamp, PERP) / reach);
  float soft = 0.004 + 0.02 * max(along - reach, 0.0) / reach;
  float shadow = smoothstep(reach - 0.5, reach + 0.5, along) * (1.0 - smoothstep(SPREAD / reach - soft, SPREAD / reach + soft, angle));
  return light * (1.0 - shadow);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Ordinateur : bitume, bordure et trottoir ; lampadaires de la promenade tous les 24 m ; phares du mécanicien ;
// au-delà du trottoir, la mer, noire.
vec3 desk(vec2 p) {
  // Matière : bitume (usure en grandes plages, reprises, granulat) à faible contraste, jamais une trame.
  float wear = grain(p, 0.0026) * 0.6 + grain(p, 0.013) * 0.4;
  float aggregate = grain(p, 0.26) * 0.6 + grain(p, 0.65) * 0.4;
  float albedo = 0.035 * mix(0.75, 1.25, wear) * mix(0.82, 1.18, aggregate);
  // La bordure du trottoir : une pierre claire.
  float pavement = smoothstep(KERB + 0.02, KERB - 0.02, p.x);
  albedo = mix(albedo, 0.1 * mix(0.9, 1.1, grain(p, 0.4)) * mix(0.9, 1.1, aggregate), pavement);
  // Caniveau plus sombre au pied de la bordure ; arête de la bordure qui accroche la lumière.
  albedo *= 1.0 - 0.3 * smoothstep(KERB + 0.35, KERB + 0.05, p.x) * (1.0 - pavement);
  float edge = (1.0 - smoothstep(0.0, 0.03 + length(fwidth(p)), abs(p.x - KERB))) * 0.5;
  // Lumière : nuit (la chaussée non éclairée disparaît), lampadaires de la promenade, phares du mécanicien.
  vec3 light = vec3(0.06, 0.068, 0.09);
  for (int k = 0; k < 4; k++) {
    vec2 r = p - vec2(-2.7, 3.0 - float(k) * 24.0);
    light += vec3(1.0, 0.8, 0.58) * 0.9 * exp(-dot(r, r) / 20.0);
  }
  vec2 side = PERP * 0.72;
  vec2 lamp = VAN - AIM * 9.0 * (1.0 - uArrival);
  light += vec3(0.85, 0.9, 1.0) * 1.7 * (beam(p, lamp + side) + beam(p, lamp - side)) * smoothstep(0.0, 0.35, uArrival) * uHeadlights;
  vec3 color = albedo * light * (1.0 + 2.5 * edge);
  return color * (1.0 - smoothstep(-4.5, -6.5, p.x) * 0.85);
}

// Téléphone : la place marquée, la bordure, l'esplanade ; la nuit de pleine lune ; les lanternes, vraies sources
// (optique routière : la flaque porte jusqu'au véhicule, un surcroît à leur pied), la voisine y dessinant son ombre
// portée ; le lampadaire d'en face, discret ; la lueur des flammes d'échappement.
vec3 phone(vec2 p) {
  float aa = fwidth(p.x) + fwidth(p.y);
  float wear = grain(p, 0.0026) * 0.6 + grain(p, 0.013) * 0.4;
  float aggregate = grain(p, 0.26) * 0.6 + grain(p, 0.65) * 0.4;
  float albedo = 0.035 * mix(0.75, 1.25, wear) * mix(0.82, 1.18, aggregate);
  // Marquage : ligne de rive continue, séparations des places (le véhicule au milieu de la sienne), axe de la
  // chaussée en tirets — peinture routière neuve, d'un blanc franc.
  float onRoad = smoothstep(KERB - 0.01, KERB + 0.01, p.x);
  float rive = 1.0 - smoothstep(0.06, 0.06 + aa, abs(p.x - BAY_LINE));
  float between = abs(fract((p.y - BAY_LENGTH * 0.5) / BAY_LENGTH + 0.5) - 0.5) * BAY_LENGTH;
  float bays = (1.0 - smoothstep(0.06, 0.06 + aa, between)) * onRoad * (1.0 - smoothstep(BAY_LINE - 0.01, BAY_LINE + 0.01, p.x));
  float dash = (1.0 - smoothstep(0.06, 0.06 + aa, abs(p.x - CENTER_LINE))) * step(fract(p.y / 7.0), 0.45);
  float paint = max(max(rive, bays), dash) * mix(0.92, 1.0, grain(p, 0.9));
  albedo = mix(albedo, 0.82, paint);
  // La bordure du trottoir : une pierre claire.
  float pavement = smoothstep(KERB + 0.02, KERB - 0.02, p.x);
  albedo = mix(albedo, 0.1 * mix(0.9, 1.1, grain(p, 0.4)) * mix(0.9, 1.1, aggregate), pavement);
  // Au-delà, l'esplanade — dalles de 1,2 × 0,6 m en quinconce, aux joints longs tendus vers le garde-corps et la
  // baie (ils mènent le regard) ; chaque dalle un peu différente.
  float plaza = smoothstep(KERB - KERB_STONE + 0.01, KERB - KERB_STONE - 0.01, p.x);
  vec2 slab = vec2((KERB - KERB_STONE - p.x) / 1.2, p.y / 0.6);
  slab.x += step(0.5, fract(slab.y * 0.5)) * 0.5;
  vec2 f = fract(slab);
  float jointGap = min(min(f.x, 1.0 - f.x) * 1.2, min(f.y, 1.0 - f.y) * 0.6);
  float joint = (1.0 - smoothstep(0.006, 0.012 + aa, jointGap)) * (1.0 - smoothstep(9.0, 24.0, length(vWorld - cameraPosition)));
  float tone = 0.085 * mix(0.85, 1.15, hash(floor(slab))) * mix(0.92, 1.08, grain(p, 0.3));
  albedo = mix(albedo, tone * (1.0 - 0.55 * joint), plaza);
  // Caniveau plus sombre au pied de la bordure ; arête de la bordure qui accroche la lumière.
  albedo *= 1.0 - 0.3 * smoothstep(KERB + 0.35, KERB + 0.05, p.x) * (1.0 - pavement);
  float edge = (1.0 - smoothstep(0.0, 0.03 + length(fwidth(p)), abs(p.x - KERB))) * 0.5;

  // Ombre portée du véhicule par la lanterne voisine : nette au contact, adoucie en s'en éloignant (pénombre).
  vec2 shadow = texture2D(uShade, clamp((p - uShadeArea.xy) * uShadeArea.zw, 0.0, 1.0)).rg;
  float shade = mix(shadow.r, shadow.g, smoothstep(0.0, 2.0, length(max(abs(p - uCarBox.xy) - uCarBox.zw, 0.0))));
  vec3 light = vec3(0.06, 0.068, 0.09) + vec3(0.035, 0.045, 0.07) * uMoon;
  float lamp = uLamp * uOut;
  for (int k = 0; k < 4; k++) {
    vec2 s = p - LAMPS[k];
    float r2 = dot(s, s);
    float fall = LAMP_FOOT2 / (r2 + LAMP_FOOT2);
    float wide = r2 / LAMP_SPREAD2;
    float pool = 0.4 * fall * sqrt(fall) + 0.6 / (1.0 + wide * wide);
    // Dans l'ombre, un peu de lumière renvoyée par l'alentour éclairé : jamais un noir plein.
    light += uLampTint * LAMP_POWER * lamp * pool * (k == 0 ? 1.0 - 0.9 * shade : 1.0);
  }
  vec2 o = p - ROAD_LAMP;
  light += uLampTint * 0.6 * lamp * exp(-dot(o, o) / 18.0);
  vec2 q = (p - uFlameAt) * vec2(0.9, 1.6);
  light += vec3(1.0, 0.42, 0.12) * uFlame * exp(-dot(q, q) / 0.35);
  vec3 color = albedo * light * (1.0 + 2.5 * edge);
  // La peinture routière (billes de verre) renvoie la moindre lumière : les lignes restent blanches dans la nuit.
  color += paint * vec3(0.05, 0.052, 0.056);
  // Au pied des lanternes, les hautes lumières s'adoucissent au lieu d'être écrêtées.
  vec3 over = max(color - 0.7, 0.0);
  return min(color, 0.7) + 0.3 * (1.0 - exp(-over / 0.3));
}

void main() {
  vec2 p = vWorld.xz;
  // Au-delà du sol, la baie en contrebas : ordinateur, dès la bordure du trottoir ; téléphone, au garde-corps.
  if (p.x < uCut) discard;
  vec3 color;
  if (uMobile > 0.5) color = phone(p);
  else color = desk(p);
  // Au loin, le sol se fond dans la nuit.
  color = mix(color, uInk, smoothstep(14.0, 42.0, length(vWorld - cameraPosition)));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;function ct(){let e=mt(7),t=Float32Array.from({length:65536},()=>e()),n=new Uint8Array(65536);for(let e=0;e<256;e++)for(let r=0;r<256;r++){let i=0;for(let n=-1;n<=1;n++)for(let a=-1;a<=1;a++)i+=t[(e+n+256)%256*256+(r+a+256)%256];n[e*256+r]=Math.round(Math.min(Math.max((i/9-.5)*2.6+.5,0),1)*255)}let r=new z(n,256,256,k);return r.wrapS=h,r.wrapT=h,r.magFilter=D,r.minFilter=f,r.generateMipmaps=!0,r.needsUpdate=!0,r}function lt(){let e=new m({uniforms:{uInk:{value:new P(Te)},uArrival:{value:1},uHeadlights:{value:1},uCut:{value:-1e3},uMobile:{value:0},uShade:{value:Object.assign(new z(new Uint8Array(4),1,1),{needsUpdate:!0})},uShadeArea:{value:new w(0,0,1,1)},uCarBox:{value:new w(0,0,1,1)},uFlame:{value:0},uFlameAt:{value:new j},uNoise:{value:ct()}},vertexShader:`
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,fragmentShader:st}),t=new c(new g(160,160),e);return t.rotation.x=-Math.PI/2,t}var ut=`
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 local = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 world = modelMatrix * local;
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * world;
}`,$=`
uniform vec3 uInk;
uniform float uAlbedo;
uniform float uShine;
uniform float uLamp;
uniform float uOut;
uniform vec3 uLampTint;
varying vec3 vWorld;
varying vec3 vNormal;
const vec3 HEADS[4] = vec3[4](${Fe});
void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(cameraPosition - vWorld);
  // Nuit : le ciel par le dessus, la lueur de la baie par l'arrière (côté mer, vers -x).
  vec3 light = vec3(0.06, 0.068, 0.09) * (0.55 + 0.45 * max(n.y, 0.0)) + vec3(0.07, 0.08, 0.1) * max(-n.x, 0.0);
  vec3 shine = vec3(0.0);
  for (int k = 0; k < 4; k++) {
    vec3 d = HEADS[k] - vWorld;
    float fall = exp(-dot(d, d) / 34.0);
    vec3 l = normalize(d);
    light += uLampTint * 2.6 * fall * (0.3 + 0.7 * max(dot(n, l), 0.0)) * uLamp * uOut;
    shine += uLampTint * 1.6 * fall * pow(max(dot(reflect(-l, n), view), 0.0), 24.0) * uLamp * uOut;
  }
  vec3 color = uAlbedo * light + uShine * shine;
  color = mix(color, uInk, smoothstep(14.0, 42.0, length(vWorld - cameraPosition)));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`,dt=`
uniform float uLamp;
uniform float uOut;
uniform vec3 uLampTint;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  float h = clamp(vWorld.y / ${X(Me)}, 0.0, 1.0);
  float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
  float a = 0.085 * h * h * facing * facing * uLamp * uOut;
  gl_FragColor = vec4(uLampTint * a, 1.0);
  #include <colorspace_fragment>
}`;function ft(){let e=document.createElement(`canvas`);e.width=64,e.height=64;let t=e.getContext(`2d`),n=t.createRadialGradient(32,32,0,32,32,32);n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.2,`rgba(255,255,255,0.4)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.fillRect(0,0,64,64);let r=new R(e);return r.colorSpace=O,r}function pt(e){let t=new me,n=(t,n)=>new m({uniforms:{...e,uInk:{value:new P(Te)},uAlbedo:{value:t},uShine:{value:n}},vertexShader:ut,fragmentShader:$}),r=n(.13,.04),i=n(.05,.8),[a,o]=[-72,32],s=o-a,l=(a+o)/2,d=new c(new H(.34,.4,s),r);d.position.set(Ae,.2,l);let f=new c(new H(.07,.05,s),i);f.position.set(Ae,1.1,l);let p=new c(new H(.04,.035,s),i);p.position.set(Ae,.52,l),t.add(d,f,p);let h=new L,v=(e,t,n)=>{let r=Math.floor(s/n),o=new u(new H(e,t,e),i,r);for(let e=0;e<r;e++)o.setMatrixAt(e,h.makeTranslation(Ae,.4+t/2,a+n*(e+.5)));return o.instanceMatrix.needsUpdate=!0,o.frustumCulled=!1,o};t.add(v(.018,.68,.12),v(.06,.72,2.4));let y=new oe({color:new P(1,.86,.64).multiplyScalar(3.2)}),b=new _({map:ft(),color:16762250,blending:2,depthWrite:!1,transparent:!0,opacity:.85}),x=[];for(let e of Ne){let n=-4.98,r=new c(new B(.045,.075,Me,14),i);r.position.set(je,Me/2,e);let a=new c(new H(.77,.05,.05),i);a.position.set(-5.34,3.6700000000000004,e);let o=new c(new H(.42,.13,.26),i);o.position.set(n,3.6,e);let s=new c(new g(.36,.2),y);s.rotation.x=Math.PI/2,s.position.set(n,3.5300000000000002,e);let l=new V(b);l.scale.setScalar(2.8),l.position.set(n,3.45,e),x.push(l),t.add(r,a,o,s,l)}let S=3.45,C=new c(new F(2.3,S,40,1,!0),new m({uniforms:{...e},vertexShader:ut,fragmentShader:dt,transparent:!0,depthWrite:!1,blending:2,side:2}));C.position.set(-4.98,S/2,Ne[0]),t.add(C);let w=y.color.clone();return{group:t,setLevel:e=>{y.color.copy(w).multiplyScalar(Math.max(e,.02)),b.opacity=.85*e;for(let t of x)t.scale.setScalar(2.8*(.85+.15*Math.min(e,1.2)))}}}function mt(e){return()=>{e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function ht(e){let t=e/2,n=document.createElement(`canvas`);n.width=e,n.height=t;let r=n.getContext(`2d`),i=t/2,a=t/180,o=r.createLinearGradient(0,0,0,i);o.addColorStop(0,`#0b0c0e`),o.addColorStop(.86,`#0b0c0f`),o.addColorStop(.975,`#0e1117`),o.addColorStop(1,`#141a24`),r.fillStyle=o,r.fillRect(0,0,e,i);let s=r.createLinearGradient(0,i,0,i+8*a);s.addColorStop(0,`#10141b`),s.addColorStop(.2,`#0c0e12`),s.addColorStop(1,`#0b0c0e`),r.fillStyle=s,r.fillRect(0,i,e,t-i);let c=new R(n);return c.mapping=303,c.colorSpace=O,c}function gt(){let e=mt(26),t=[],n=[],r=[],i=new P(16757358),a=new P(13163775),o=new P,s=(e,i,a,s,c)=>{t.push(Math.cos(e)*70,1.4+Math.tan(i)*70,Math.sin(e)*70),o.copy(c).multiplyScalar(a),n.push(o.r,o.g,o.b),r.push(s)};for(let t=0;t<170;t++){let t=1-(1-e())**1.6,n=S.degToRad(-160+t*48),r=.2+1.1*(Math.sin(t*7.2+.6)*.5+.5)**1.5*(.4+t),o=e()<.7?i:a,c=.4+e()*.6,l=2+e()*2.2;s(n,S.degToRad(.12+e()*r),c,l,o),c>.8&&s(n,-S.degToRad(.08+e()*.25),c*.22,l*.8,o)}let c=new N;c.setAttribute(`position`,new fe(t,3)),c.setAttribute(`tint`,new fe(n,3)),c.setAttribute(`size`,new fe(r,1));let l=new m({uniforms:{uPixelRatio:{value:1}},vertexShader:`
      attribute vec3 tint;
      attribute float size;
      uniform float uPixelRatio;
      varying vec3 vTint;
      void main() {
        vTint = tint;
        gl_PointSize = size * uPixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,fragmentShader:`
      varying vec3 vTint;
      void main() {
        gl_FragColor = vec4(vTint, 1.0 - smoothstep(0.12, 0.5, length(gl_PointCoord - 0.5)));
        #include <colorspace_fragment>
      }`,transparent:!0,depthWrite:!1,blending:2}),u=new T(c,l);return u.frustumCulled=!1,u}function _t(e){let t=new ce().setFromObject(e),n=t.getSize(new M),r=document.createElement(`canvas`);r.width=128,r.height=256;let i=r.getContext(`2d`);i.translate(64,128),i.scale(1,2);let a=i.createRadialGradient(0,0,0,0,0,62);a.addColorStop(0,`rgba(0,0,0,0.9)`),a.addColorStop(.55,`rgba(0,0,0,0.55)`),a.addColorStop(1,`rgba(0,0,0,0)`),i.fillStyle=a,i.fillRect(-64,-64,128,128);let o=new c(new g(n.x*1.35,n.z*1.12),new oe({map:new R(r),color:0,transparent:!0,depthWrite:!1}));return o.rotation.x=-Math.PI/2,o.position.set((t.min.x+t.max.x)/2,.004,(t.min.z+t.max.z)/2),o}function vt(e,t,n,r){let[i,a,o,l]=r,u=Math.round(480*(l-a)/(o-i)),d=()=>new s(480,u,{depthBuffer:!1}),[f,p,h]=[d(),d(),d()],_=new x,v=new m({uniforms:{uLight:{value:n},uArea:{value:new w(i,a,1/(o-i),1/(l-a))}},vertexShader:`
      uniform vec3 uLight;
      uniform vec4 uArea;
      void main() {
        vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
        vec2 g = uLight.xz + (w.xz - uLight.xz) * uLight.y / max(uLight.y - w.y, 0.05);
        gl_Position = vec4((g - uArea.xy) * uArea.zw * 2.0 - 1.0, 0.0, 1.0);
      }`,fragmentShader:`
      void main() {
        gl_FragColor = vec4(1.0);
      }`,side:2,depthTest:!1,depthWrite:!1}),y=new A;t.updateMatrixWorld(!0),t.traverse(e=>{let t=e,n=t.material;if(!t.isMesh||!t.visible||n.transparent&&n.opacity<.9)return;let r=new c(t.geometry,v);r.matrixAutoUpdate=!1,r.matrix.copy(t.matrixWorld),r.frustumCulled=!1,y.add(r)});let b=new m({uniforms:{uMap:{value:null},uStep:{value:new j}},vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,fragmentShader:`
      uniform sampler2D uMap;
      uniform vec2 uStep;
      varying vec2 vUv;
      void main() {
        // Gaussienne à 13 prises : R serrée (pénombre de contact), G large (pénombre lointaine).
        vec2 sum = vec2(0.0);
        float total = 0.0;
        for (int i = -6; i <= 6; i++) {
          float w = exp(-float(i * i) / 18.0);
          sum += w * vec2(texture2D(uMap, vUv + uStep * float(i) * 0.5).r, texture2D(uMap, vUv + uStep * float(i) * 2.0).g);
          total += w;
        }
        gl_FragColor = vec4(sum / total, 0.0, 1.0);
      }`,depthTest:!1,depthWrite:!1}),S=new c(new g(2,2),b);S.frustumCulled=!1;let C=new A().add(S),T=e.getRenderTarget(),E=e.getClearColor(new P),D=e.getClearAlpha();return e.setClearColor(0,1),e.setRenderTarget(f),e.render(y,_),b.uniforms.uMap.value=f.texture,b.uniforms.uStep.value.set(1/480,0),e.setRenderTarget(p),e.render(C,_),b.uniforms.uMap.value=p.texture,b.uniforms.uStep.value.set(0,1/u),e.setRenderTarget(h),e.render(C,_),e.setRenderTarget(T),e.setClearColor(E,D),f.dispose(),p.dispose(),v.dispose(),b.dispose(),S.geometry.dispose(),h.texture}var yt=`
uniform float uTime;
uniform float uLength;
uniform vec2 uTip;
uniform float uSeed;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  float s = position.y;
  vec3 p = vec3(position.x * uTip.x, s * uLength, position.z * uTip.y);
  float sway = sin(s * 7.0 - uTime * 41.0 + uSeed) * 0.6 + sin(s * 13.0 - uTime * 67.0 + uSeed * 2.1) * 0.4;
  p.x += sway * s * s * 0.06;
  p.z += cos(s * 9.0 - uTime * 53.0 + uSeed) * s * s * 0.035;
  vUv = uv;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * vec3(normal.x / uTip.x, normal.y / max(uLength, 0.01), normal.z / uTip.y));
  gl_Position = projectionMatrix * viewMatrix * world;
}`,bt=`
uniform float uTime;
uniform float uPower;
uniform float uSeed;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  float s = vUv.y;
  // Turbulence qui file vers la pointe (sans couture autour de la gerbe).
  float a = vUv.x * 6.2832;
  vec2 q = vec2(cos(a), sin(a)) * 1.4 + vec2(uSeed, s * 4.0 - uTime * 16.0);
  float n = noise(q) * 0.6 + noise(q * 2.3 + 7.1) * 0.4;
  float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
  float body = pow(facing, 1.1) * (1.0 - smoothstep(0.3 + 0.45 * n, 1.0, s)) * smoothstep(0.0, 0.05, s);
  vec3 color = mix(vec3(0.55, 0.75, 1.6), vec3(2.4, 1.7, 0.75), smoothstep(0.02, 0.16, s));
  color = mix(color, vec3(2.0, 0.62, 0.14), smoothstep(0.2, 0.55, s));
  color = mix(color, vec3(1.1, 0.16, 0.04), smoothstep(0.55, 0.9, s));
  gl_FragColor = vec4(color * body * (0.45 + 0.85 * n) * uPower, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;function xt({tips:e,size:t}){let n=new me;n.visible=!1;let r=Array.from({length:15},(e,t)=>{let n=t/14;return new j((.6+1.7*S.smoothstep(n,0,.35))*(1-n)**.8,n)}),i=new pe(r,16),a=new _({map:ft(),color:16756848,blending:2,depthWrite:!1,transparent:!0,opacity:0}),o=e.map((e,r)=>{let o=new m({uniforms:{uTime:{value:0},uPower:{value:0},uLength:{value:.2},uTip:{value:new j(t[0]/2,t[1]/2)},uSeed:{value:r*1.7}},vertexShader:yt,fragmentShader:bt,transparent:!0,depthWrite:!1,blending:2,side:2}),s=new c(i,o);s.position.set(...e),s.rotation.x=-Math.PI/2-.05,s.frustumCulled=!1;let l=new V(a);return l.position.set(e[0],e[1],e[2]-.04),l.scale.setScalar(Math.max(...t)*4.5),n.add(s,l),o}),s=e.reduce((e,t)=>e.add(new M(...t)),new M).divideScalar(e.length),l=new y(16747066,0,0,2);l.position.set(s.x,s.y+.05,s.z-.3);let u=[1,.9,.95,.85];return{group:n,light:l,update:e=>{let t=0;return o.forEach((n,r)=>{let i=Xe(e-r*.014)*u[r%u.length];n.uniforms.uPower.value=i,n.uniforms.uTime.value=e,n.uniforms.uLength.value=.2+.5*i,t+=i/o.length}),a.opacity=Math.min(t*1.3,1),l.intensity=Q*t,n.visible=t>.002,t},at:new j(s.x,s.z-.35)}}export{nt as createStage};