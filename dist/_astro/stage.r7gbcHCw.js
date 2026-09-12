import{n as e,r as t,t as n}from"./Stage.astro_astro_type_script_index_0_lang.DQnaaAFX.js";import{A as r,C as i,D as a,E as o,F as s,M as c,N as l,O as u,P as d,S as f,T as p,_ as m,a as h,b as g,c as _,d as v,f as y,g as b,h as x,i as ee,j as S,k as C,l as w,m as T,n as te,o as ne,p as re,r as E,s as D,t as ie,u as O,v as k,w as A,x as j,y as M}from"./rigs.WiR0ODKm.js";var N=class extends re{constructor(e){super(e),this.type=k}parse(e){let t=function(e,t){switch(e){case 1:throw Error(`THREE.HDRLoader: Read Error: `+(t||``));case 2:throw Error(`THREE.HDRLoader: Write Error: `+(t||``));case 3:throw Error(`THREE.HDRLoader: Bad File Format: `+(t||``));default:case 4:throw Error(`THREE.HDRLoader: Memory Error: `+(t||``))}},n=function(e,t,n){t||=1024;let r=e.pos,i=-1,a=0,o=``,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));for(;0>(i=s.indexOf(`
`))&&a<t&&r<e.byteLength;)o+=s,a+=s.length,r+=128,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));return-1<i&&(!1!==n&&(e.pos+=a+i+1),o+s.slice(0,i))},r=function(e){let r=/^#\?(\S+)/,i=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,a=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,o=/^\s*FORMAT=(\S+)\s*$/,s=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,c={valid:0,string:``,comments:``,programtype:`RGBE`,format:``,gamma:1,exposure:1,width:0,height:0},l,u;for((e.pos>=e.byteLength||!(l=n(e)))&&t(1,`no header found`),(u=l.match(r))||t(3,`bad initial token`),c.valid|=1,c.programtype=u[1],c.string+=l+`
`;l=n(e),!1!==l;){if(c.string+=l+`
`,l.charAt(0)===`#`){c.comments+=l+`
`;continue}if((u=l.match(i))&&(c.gamma=parseFloat(u[1])),(u=l.match(a))&&(c.exposure=parseFloat(u[1])),(u=l.match(o))&&(c.valid|=2,c.format=u[1]),(u=l.match(s))&&(c.valid|=4,c.height=parseInt(u[1],10),c.width=parseInt(u[2],10)),c.valid&2&&c.valid&4)break}return c.valid&2||t(3,`missing format specifier`),c.valid&4||t(3,`missing image size specifier`),c},i=function(e,n,r){let i=n;if(i<8||i>32767||e[0]!==2||e[1]!==2||e[2]&128)return new Uint8Array(e);i!==(e[2]<<8|e[3])&&t(3,`wrong scanline width`);let a=new Uint8Array(4*n*r);a.length||t(4,`unable to allocate buffer space`);let o=0,s=0,c=4*i,l=new Uint8Array(4),u=new Uint8Array(c),d=r;for(;d>0&&s<e.byteLength;){s+4>e.byteLength&&t(1),l[0]=e[s++],l[1]=e[s++],l[2]=e[s++],l[3]=e[s++],(l[0]!=2||l[1]!=2||(l[2]<<8|l[3])!=i)&&t(3,`bad rgbe scanline format`);let n=0,r;for(;n<c&&s<e.byteLength;){r=e[s++];let i=r>128;if(i&&(r-=128),(r===0||n+r>c)&&t(3,`bad scanline data`),i){let t=e[s++];for(let e=0;e<r;e++)u[n++]=t}else u.set(e.subarray(s,s+r),n),n+=r,s+=r}let f=i;for(let e=0;e<f;e++){let t=0;a[o]=u[e+t],t+=i,a[o+1]=u[e+t],t+=i,a[o+2]=u[e+t],t+=i,a[o+3]=u[e+t],o+=4}d--}return a},a=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=e[t+0]*i,n[r+1]=e[t+1]*i,n[r+2]=e[t+2]*i,n[r+3]=1},o=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=T.toHalfFloat(Math.min(e[t+0]*i,65504)),n[r+1]=T.toHalfFloat(Math.min(e[t+1]*i,65504)),n[r+2]=T.toHalfFloat(Math.min(e[t+2]*i,65504)),n[r+3]=T.toHalfFloat(1)},s=new Uint8Array(e);s.pos=0;let c=r(s),l=c.width,u=c.height,d=i(s.subarray(s.pos),l,u),f,p,m;switch(this.type){case b:m=d.length/4;let e=new Float32Array(m*4);for(let t=0;t<m;t++)a(d,t*4,e,t*4);f=e,p=b;break;case k:m=d.length/4;let t=new Uint16Array(m*4);for(let e=0;e<m;e++)o(d,e*4,t,e*4);f=t,p=k;break;default:throw Error(`THREE.HDRLoader: Unsupported type: `+this.type)}return{width:l,height:u,data:f,header:c.string,gamma:c.gamma,exposure:c.exposure,type:p,colorSpace:j,minFilter:M,magFilter:M,generateMipmaps:!1,flipY:!0}}setDataType(e){return this.type=e,this}},P=723982,ae=400,oe=2800,F=[`map`,`normalMap`,`roughnessMap`,`metalnessMap`,`aoMap`,`emissiveMap`],I=/carpaint_max|paint_material|^black_paint$|^red_paint$/,se=()=>new Promise(e=>requestAnimationFrame(e));async function L({root:e,canvas:t,stops:r,progress:i,narrow:a,vehicle:u,assets:d}){let p=t.parentElement,h=matchMedia(`(prefers-reduced-motion: reduce)`),g=new ne({canvas:t,antialias:window.devicePixelRatio<2,powerPreference:`high-performance`});g.outputColorSpace=c,g.toneMapping=7,g.debug.checkShaderErrors=!1;let _=new l;_.background=pe(a.matches?1024:2048),_.fog=new m(P,16,40);let v=await d.environment;_.environment=v?ce(v):le(g),performance.mark(`stage:env`);let y=new o(30,1,.1,80);E.useWorkers?.(2);let b=ue((await new ee().setMeshoptDecoder(E).parseAsync(await d.model,``)).scene),x=fe();_.add(b,he(b),x);let S=me();_.add(S),performance.mark(`stage:model`);let C=ie.c63,w=r.map(e=>e.dataset.stop),T=w.map(e=>C[e]??C.hero),re=n(u).anchors??{},D=T.length-1,k=new s,A=[],j,M,N=0,F=()=>{A=T.map(e=>a.matches?{...e,...e.mobile}:e),j=new O(A.map(e=>new s(...e.position)),!1,`centripetal`),M=new O(A.map(e=>new s(...e.target)),!1,`centripetal`)};F();let I=()=>{let e=p.clientWidth,t=p.clientHeight;a.matches?y.setViewOffset(e,t,0,t*N,e,t):y.setViewOffset(e,t,-e*(N+Math.max(0,1-e/1440)*.08),0,e,t),y.updateProjectionMatrix()},L=e.querySelector(`[data-night]`),R=e=>{x.material.uniforms.uHeadlights.value=1-f.smoothstep(e,0,.45),L&&(L.style.opacity=f.smoothstep(e,.35,1).toFixed(3))},z=e=>{let t=Math.min(Math.floor(e),Math.max(D-1,0)),n=T[Math.min(t+1,D)],r=te(e-t,n.pace),i=n.lightsOut;R(i?Math.min(Math.max((e-t-i[0])/(i[1]-i[0]),0),1):0);let a=D>0?(t+r)/D:0;j.getPoint(a,y.position),M.getPoint(a,k),y.lookAt(k),N=f.lerp(A[t].shift,A[Math.min(t+1,D)].shift,r),I()},B=e.querySelector(`[data-callout]`),V=B?.querySelector(`path`),ge=B?[...B.querySelectorAll(`circle`)]:[],H=new s,_e=e=>{if(!B||!V)return;let t=Math.round(e),n=re[w[t]]??T[t]?.anchor,i=r[t]?.querySelector(`[data-callout-origin]`),o=1-Math.min(Math.abs(e-t)/.2,1);if(a.matches||!n||!i||o<=0){B.style.opacity=`0`;return}H.set(...n).project(y);let s=(H.x+1)/2*p.clientWidth,c=(1-H.y)/2*p.clientHeight,l=i.getBoundingClientRect();V.setAttribute(`d`,`M${l.right},${l.bottom} H${l.right+56} L${s},${c}`);for(let e of ge)e.setAttribute(`cx`,`${s}`),e.setAttribute(`cy`,`${c}`);B.style.opacity=o.toFixed(3)},U=[a.matches?1.5:1.75,1.25,1,.75].map(e=>Math.min(window.devicePixelRatio,e)),W=0,G=0,K=!0,q=a.matches,J=()=>{a.matches!==q&&(q=a.matches,F()),g.setPixelRatio(U[W]),g.setSize(p.clientWidth,p.clientHeight,!1),S.visible=!a.matches,S.material.uniforms.uPixelRatio.value=g.getPixelRatio();let e=p.clientWidth/p.clientHeight;y.aspect=e,y.fov=a.matches?Math.max(26,e>.6?f.radToDeg(2*Math.atan(Math.tan(f.degToRad(19))*.6/e)):38):e<1.6?f.radToDeg(2*Math.atan(Math.tan(f.degToRad(15))*1.6/e)):30,I(),i.measure(),K=!0};J(),new ResizeObserver(J).observe(p),h.addEventListener(`change`,()=>K=!0);let Y=e=>{let t=1-(1-e)**3;_.environmentRotation.y=(1-t)*-1.2,_.environmentIntensity=.72+.28*t,x.material.uniforms.uArrival.value=t},ve=0,X=h.matches;Y(+!!X);let Z=i.read();z(Z),await g.compileAsync(_,y),performance.mark(`stage:compiled`,{detail:{programs:g.info.programs?.length}});for(let e of de(_,_.environment))g.initTexture(e),await se();performance.mark(`stage:textures`,{detail:{textures:g.info.memory.textures}});let Q=0,$=0,ye=!0,be=()=>{z(Z),g.render(_,y),_e(Z)},xe=e=>{Q=requestAnimationFrame(xe);let n=$?Math.min((e-$)/1e3,.25):1/60;$=e;let r=i.read(),a=K;if(h.matches){let e=Math.round(r);e!==Z&&(Z=e,a=!0)}else Math.abs(r-Z)>1e-4&&(Z+=(r-Z)*(1-Math.exp(-n*4.5)),a=!0);if(!X){ve||=e;let t=Math.min(Math.max(e-ve-ae,0)/oe,1);Y(t),X=t>=1,a=!0}if(!a){G=0;return}K=!1,be(),ye&&(ye=!1,performance.mark(`stage:first-frame`,{detail:{programs:g.info.programs?.length,calls:g.info.render.calls}}),t.classList.add(`is-ready`)),n>1/24?G++:G=Math.max(0,G-1),G>8&&W<U.length-1&&(W++,G=0,J())},Se=()=>{Q||=($=0,requestAnimationFrame(xe))},Ce=()=>{cancelAnimationFrame(Q),Q=0};new IntersectionObserver(([e])=>e.isIntersecting?Se():Ce()).observe(e),t.addEventListener(`webglcontextlost`,t=>{t.preventDefault(),Ce(),e.classList.add(`is-static`)})}function ce(e){let t=new N().parse(e),n=new y(t.data,t.width,t.height,C,t.type);return n.mapping=306,n.colorSpace=j,n.minFilter=M,n.magFilter=M,n.generateMipmaps=!1,n.flipY=!1,n.needsUpdate=!0,n}function le(n){let r=new l,o=new a(1,1);for(let e of t){let t=new i(o,new A({color:new v(e.color).multiplyScalar(e.power),side:2}));t.scale.set(e.size[0],e.size[1],1),t.position.set(...e.position),t.rotation.set(...e.rotation),r.add(t)}let s=new h(n),c=s.fromScene(r,e).texture;return s.dispose(),c}function ue(e){return e.scale.setScalar(100),e.updateMatrixWorld(!0),e.traverse(e=>{let t=e;if(!t.isMesh)return;let n=t.material,r=n.name.toLowerCase();if(/badge|plate/.test(r)){t.visible=!1;return}n.transmission>0&&(n.transmission=0,n.transparent=!0,n.opacity=Math.min(n.opacity,.3),n.depthWrite=!1),I.test(r)&&n.isMeshPhysicalMaterial?(n.clearcoat=1,n.clearcoatRoughness=.04):n.isMeshPhysicalMaterial&&(t.material=new p().copy(n),n.dispose())}),e}function de(e,t){let n=new Set;return t&&n.add(t),e.traverse(e=>{let t=e;if(!t.isMesh||!t.visible)return;let r=t.material;for(let e of F){let t=r[e];t&&n.add(t)}}),n}var R=`
uniform vec3 uInk;
uniform float uArrival;
uniform float uHeadlights;
uniform sampler2D uNoise;
varying vec3 vWorld;

const float KERB = -1.3;                // bordure du trottoir, côté passager
// Phares du véhicule du mécanicien, garé derrière la caméra du premier arrêt, dirigés vers la voiture.
const vec2 VAN = vec2(9.6, 11.5);
const vec2 AIM = vec2(-0.641, -0.768);
const vec2 PERP = vec2(0.768, -0.641);
// Demi-largeur du véhicule vue des phares : son emprise (0,98 × 2,4 m) projetée en travers du faisceau.
const float SPREAD = 2.29;

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

void main() {
  vec2 p = vWorld.xz;
  // Matière : bitume (usure en grandes plages, reprises, granulat) à faible contraste, jamais une trame ;
  // trottoir plus fin et plus clair au-delà de la bordure.
  float pavement = smoothstep(KERB + 0.02, KERB - 0.02, p.x);
  float wear = grain(p, 0.0026) * 0.6 + grain(p, 0.013) * 0.4;
  float aggregate = grain(p, 0.26) * 0.6 + grain(p, 0.65) * 0.4;
  float albedo = 0.035 * mix(0.75, 1.25, wear) * mix(0.82, 1.18, aggregate);
  albedo = mix(albedo, 0.05 * mix(0.9, 1.1, grain(p, 0.1)) * mix(0.9, 1.1, aggregate), pavement);
  // Caniveau plus sombre au pied de la bordure ; arête de la bordure qui accroche la lumière.
  albedo *= 1.0 - 0.3 * smoothstep(KERB + 0.35, KERB + 0.05, p.x) * (1.0 - pavement);
  float edge = (1.0 - smoothstep(0.0, 0.03 + length(fwidth(p)), abs(p.x - KERB))) * 0.5;

  // Lumière : nuit (la chaussée non éclairée disparaît), lampadaires de la promenade tous les 24 m,
  // phares du mécanicien.
  vec3 light = vec3(0.06, 0.068, 0.09);
  for (int k = 0; k < 4; k++) {
    vec2 r = p - vec2(-2.7, 3.0 - float(k) * 24.0);
    light += vec3(1.0, 0.8, 0.58) * 0.9 * exp(-dot(r, r) / 20.0);
  }
  vec2 side = PERP * 0.72;
  vec2 lamp = VAN - AIM * 9.0 * (1.0 - uArrival);
  light += vec3(0.85, 0.9, 1.0) * 1.7 * (beam(p, lamp + side) + beam(p, lamp - side)) * smoothstep(0.0, 0.35, uArrival) * uHeadlights;

  vec3 color = albedo * light * (1.0 + 2.5 * edge);
  // Au-delà du trottoir, la mer, noire ; au loin, la chaussée se fond dans la nuit.
  color *= 1.0 - smoothstep(-4.5, -6.5, p.x) * 0.85;
  color = mix(color, uInk, smoothstep(14.0, 42.0, length(vWorld - cameraPosition)));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;function z(){let e=B(7),t=Float32Array.from({length:65536},()=>e()),n=new Uint8Array(65536);for(let e=0;e<256;e++)for(let r=0;r<256;r++){let i=0;for(let n=-1;n<=1;n++)for(let a=-1;a<=1;a++)i+=t[(e+n+256)%256*256+(r+a+256)%256];n[e*256+r]=Math.round(Math.min(Math.max((i/9-.5)*2.6+.5,0),1)*255)}let i=new y(n,256,256,r);return i.wrapS=S,i.wrapT=S,i.magFilter=M,i.minFilter=g,i.generateMipmaps=!0,i.needsUpdate=!0,i}function fe(){let e=new d({uniforms:{uInk:{value:new v(P)},uArrival:{value:1},uHeadlights:{value:1},uNoise:{value:z()}},vertexShader:`
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,fragmentShader:R}),t=new i(new a(160,160),e);return t.rotation.x=-Math.PI/2,t}function B(e){return()=>{e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function pe(e){let t=e/2,n=document.createElement(`canvas`);n.width=e,n.height=t;let r=n.getContext(`2d`),i=t/2,a=t/180,o=r.createLinearGradient(0,0,0,i);o.addColorStop(0,`#0b0c0e`),o.addColorStop(.86,`#0b0c0f`),o.addColorStop(.975,`#0e1117`),o.addColorStop(1,`#141a24`),r.fillStyle=o,r.fillRect(0,0,e,i);let s=r.createLinearGradient(0,i,0,i+8*a);s.addColorStop(0,`#10141b`),s.addColorStop(.2,`#0c0e12`),s.addColorStop(1,`#0b0c0e`),r.fillStyle=s,r.fillRect(0,i,e,t-i);let l=new w(n);return l.mapping=303,l.colorSpace=c,l}function me(){let e=B(26),t=[],n=[],r=[],i=new v(16757358),a=new v(13163775),o=new v,s=(e,i,a,s,c)=>{t.push(Math.cos(e)*70,1.4+Math.tan(i)*70,Math.sin(e)*70),o.copy(c).multiplyScalar(a),n.push(o.r,o.g,o.b),r.push(s)};for(let t=0;t<170;t++){let t=1-(1-e())**1.6,n=f.degToRad(-160+t*48),r=.2+1.1*(Math.sin(t*7.2+.6)*.5+.5)**1.5*(.4+t),o=e()<.7?i:a,c=.4+e()*.6,l=2+e()*2.2;s(n,f.degToRad(.12+e()*r),c,l,o),c>.8&&s(n,-f.degToRad(.08+e()*.25),c*.22,l*.8,o)}let c=new _;c.setAttribute(`position`,new x(t,3)),c.setAttribute(`tint`,new x(n,3)),c.setAttribute(`size`,new x(r,1));let l=new d({uniforms:{uPixelRatio:{value:1}},vertexShader:`
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
      }`,transparent:!0,depthWrite:!1,blending:2}),p=new u(c,l);return p.frustumCulled=!1,p}function he(e){let t=new D().setFromObject(e),n=t.getSize(new s),r=document.createElement(`canvas`);r.width=128,r.height=256;let o=r.getContext(`2d`);o.translate(64,128),o.scale(1,2);let c=o.createRadialGradient(0,0,0,0,0,62);c.addColorStop(0,`rgba(0,0,0,0.9)`),c.addColorStop(.55,`rgba(0,0,0,0.55)`),c.addColorStop(1,`rgba(0,0,0,0)`),o.fillStyle=c,o.fillRect(-64,-64,128,128);let l=new i(new a(n.x*1.35,n.z*1.12),new A({map:new w(r),color:0,transparent:!0,depthWrite:!1}));return l.rotation.x=-Math.PI/2,l.position.set((t.min.x+t.max.x)/2,.004,(t.min.z+t.max.z)/2),l}export{L as createStage};