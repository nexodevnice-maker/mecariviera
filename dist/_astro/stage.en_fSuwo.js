import{a as e,i as t}from"./preload-helper.C3XVvjtM.js";import{n,r,t as i}from"./Stage.astro_astro_type_script_index_0_lang.B1pLCp2a.js";import{A as a,C as o,D as s,E as c,F as l,M as u,N as d,O as f,P as p,S as m,T as h,_ as g,a as _,b as v,c as ee,d as y,f as b,g as x,h as te,i as ne,j as re,k as S,l as C,m as w,n as ie,o as T,p as E,r as D,s as O,t as ae,u as k,v as A,w as oe,x as j,y as M}from"./meshopt_decoder.module.DLJrfoRh.js";var N=class extends y{constructor(e){super(e),this.type=x}parse(e){let t=function(e,t){switch(e){case 1:throw Error(`THREE.HDRLoader: Read Error: `+(t||``));case 2:throw Error(`THREE.HDRLoader: Write Error: `+(t||``));case 3:throw Error(`THREE.HDRLoader: Bad File Format: `+(t||``));default:case 4:throw Error(`THREE.HDRLoader: Memory Error: `+(t||``))}},n=function(e,t,n){t||=1024;let r=e.pos,i=-1,a=0,o=``,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));for(;0>(i=s.indexOf(`
`))&&a<t&&r<e.byteLength;)o+=s,a+=s.length,r+=128,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));return-1<i&&(!1!==n&&(e.pos+=a+i+1),o+s.slice(0,i))},r=function(e){let r=/^#\?(\S+)/,i=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,a=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,o=/^\s*FORMAT=(\S+)\s*$/,s=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,c={valid:0,string:``,comments:``,programtype:`RGBE`,format:``,gamma:1,exposure:1,width:0,height:0},l,u;for((e.pos>=e.byteLength||!(l=n(e)))&&t(1,`no header found`),(u=l.match(r))||t(3,`bad initial token`),c.valid|=1,c.programtype=u[1],c.string+=l+`
`;l=n(e),!1!==l;){if(c.string+=l+`
`,l.charAt(0)===`#`){c.comments+=l+`
`;continue}if((u=l.match(i))&&(c.gamma=parseFloat(u[1])),(u=l.match(a))&&(c.exposure=parseFloat(u[1])),(u=l.match(o))&&(c.valid|=2,c.format=u[1]),(u=l.match(s))&&(c.valid|=4,c.height=parseInt(u[1],10),c.width=parseInt(u[2],10)),c.valid&2&&c.valid&4)break}return c.valid&2||t(3,`missing format specifier`),c.valid&4||t(3,`missing image size specifier`),c},i=function(e,n,r){let i=n;if(i<8||i>32767||e[0]!==2||e[1]!==2||e[2]&128)return new Uint8Array(e);i!==(e[2]<<8|e[3])&&t(3,`wrong scanline width`);let a=new Uint8Array(4*n*r);a.length||t(4,`unable to allocate buffer space`);let o=0,s=0,c=4*i,l=new Uint8Array(4),u=new Uint8Array(c),d=r;for(;d>0&&s<e.byteLength;){s+4>e.byteLength&&t(1),l[0]=e[s++],l[1]=e[s++],l[2]=e[s++],l[3]=e[s++],(l[0]!=2||l[1]!=2||(l[2]<<8|l[3])!=i)&&t(3,`bad rgbe scanline format`);let n=0,r;for(;n<c&&s<e.byteLength;){r=e[s++];let i=r>128;if(i&&(r-=128),(r===0||n+r>c)&&t(3,`bad scanline data`),i){let t=e[s++];for(let e=0;e<r;e++)u[n++]=t}else u.set(e.subarray(s,s+r),n),n+=r,s+=r}let f=i;for(let e=0;e<f;e++){let t=0;a[o]=u[e+t],t+=i,a[o+1]=u[e+t],t+=i,a[o+2]=u[e+t],t+=i,a[o+3]=u[e+t],o+=4}d--}return a},a=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=e[t+0]*i,n[r+1]=e[t+1]*i,n[r+2]=e[t+2]*i,n[r+3]=1},o=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=b.toHalfFloat(Math.min(e[t+0]*i,65504)),n[r+1]=b.toHalfFloat(Math.min(e[t+1]*i,65504)),n[r+2]=b.toHalfFloat(Math.min(e[t+2]*i,65504)),n[r+3]=b.toHalfFloat(1)},s=new Uint8Array(e);s.pos=0;let c=r(s),l=c.width,u=c.height,d=i(s.subarray(s.pos),l,u),f,p,m;switch(this.type){case w:m=d.length/4;let e=new Float32Array(m*4);for(let t=0;t<m;t++)a(d,t*4,e,t*4);f=e,p=w;break;case x:m=d.length/4;let t=new Uint16Array(m*4);for(let e=0;e<m;e++)o(d,e*4,t,e*4);f=t,p=x;break;default:throw Error(`THREE.HDRLoader: Unsupported type: `+this.type)}return{width:l,height:u,data:f,header:c.string,gamma:c.gamma,exposure:c.exposure,type:p,colorSpace:M,minFilter:g,magFilter:g,generateMipmaps:!1,flipY:!0}}setDataType(e){return this.type=e,this}},P={azimuth:-149,width:18,distance:55,horizon:.65,eye:1.5,level:.85,moon:[.427,.747,.3],coast:[.56,.257,.4,.17],glint:[.43,.171,.12,.2],floor:.07,saturation:.7},se={...P,azimuth:-131,width:14,eye:4.3,glint:[.43,.21,.1,.12]},F=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,I=`
uniform sampler2D uMap;
uniform float uLevel;
uniform float uFloor;  // teinte du ciel nocturne de la photo, retirée : seule la lumière s'ajoute à la scène
uniform float uSaturation;
uniform float uAspect; // hauteur / largeur de la photo
uniform vec3 uMoon;    // lune : centre (x, y), rayon — en largeurs de photo
uniform vec4 uCoast;   // côte éclairée : centre (x, y), rayons (x, y)
uniform vec4 uGlint;   // reflet de la lune : centre (x, y), rayons (x, y)
varying vec2 vUv;

float zone(vec2 center, vec2 radii, float inner) {
  return 1.0 - smoothstep(inner, 1.0, length((vUv - center) * vec2(1.0, uAspect) / radii));
}

void main() {
  // La photo n'apporte que sa lumière (mélange additif) : sans la teinte de son ciel, ses zones sombres
  // n'ajoutent rien — ni cadre, ni disque, ni tache ; la lune, la côte et les reflets s'ajoutent à la nuit.
  vec3 light = max(texture2D(uMap, vUv).rgb - uFloor, 0.0) * uLevel;
  light = mix(vec3(dot(light, vec3(0.2126, 0.7152, 0.0722))), light, uSaturation);
  // Seules la lune, la côte et le reflet sont pris à la photo (le premier plan, arbres et rive, est écarté).
  float weight = max(max(zone(uMoon.xy, uMoon.zz, 0.0), zone(uCoast.xy, uCoast.zw, 0.5)), zone(uGlint.xy, uGlint.zw, 0.0));
  weight *= smoothstep(0.0, 0.04, vUv.x) * smoothstep(0.0, 0.04, 1.0 - vUv.x) * smoothstep(0.0, 0.04, vUv.y) * smoothstep(0.0, 0.04, 1.0 - vUv.y);
  gl_FragColor = vec4(light, weight);
  #include <colorspace_fragment>
}`;function ce(e,t){let n=new d(e);n.flipY=!1,n.colorSpace=a,n.minFilter=A,n.generateMipmaps=!0,n.anisotropy=t,n.needsUpdate=!0;let r=new u({uniforms:{uMap:{value:n},uLevel:{value:P.level},uFloor:{value:P.floor},uSaturation:{value:P.saturation},uAspect:{value:e.height/e.width},uMoon:{value:new p(...P.moon)},uCoast:{value:new l(...P.coast)},uGlint:{value:new l(...P.glint)}},vertexShader:F,fragmentShader:I,transparent:!0,depthWrite:!1,blending:2}),i=e.height/e.width,o=new j(new h(1,i),r);o.renderOrder=-1;let s=P,c=(e={})=>{s={...s,...e};let{azimuth:t,width:n,distance:a,horizon:c,eye:l,level:u,moon:d,coast:f,glint:p,floor:m,saturation:h}=s;r.uniforms.uFloor.value=m,r.uniforms.uSaturation.value=h,r.uniforms.uMoon.value.set(...d),r.uniforms.uCoast.value.set(...f),r.uniforms.uGlint.value.set(...p);let g=2*a*Math.tan(v.degToRad(n/2)),_=v.degToRad(t);return o.scale.set(g,g,1),o.position.set(Math.cos(_)*a,l-g*i*(.5-c),Math.sin(_)*a),o.lookAt(0,o.position.y,0),r.uniforms.uLevel.value=u,s};return c(),{mesh:o,texture:n,material:r,place:c}}var L=723982,le=400,ue=2800,R=[`map`,`normalMap`,`roughnessMap`,`metalnessMap`,`aoMap`,`emissiveMap`],de=/carpaint_max|paint_material|^black_paint$|^red_paint$/,fe=()=>new Promise(e=>requestAnimationFrame(e));async function z({root:n,canvas:r,stops:o,progress:s,narrow:c,vehicle:l,assets:u}){let d=r.parentElement,f=matchMedia(`(prefers-reduced-motion: reduce)`),m=new ne({canvas:r,antialias:window.devicePixelRatio<2,powerPreference:`high-performance`});m.outputColorSpace=a,m.toneMapping=7,m.debug.checkShaderErrors=!1;let h=new re;h.background=ve(c.matches?1024:2048),h.fog=new te(L,16,40);let g=await u.environment;h.environment=g?pe(g):me(m),performance.mark(`stage:env`);let _=new oe(30,1,.1,110);ae.useWorkers?.(2);let y=he((await new ie().setMeshoptDecoder(ae).parseAsync(await u.model,``)).scene),b=_e();h.add(y,be(y),b);let x=await u.bay,S=x?ce(x,Math.min(8,m.capabilities.getMaxAnisotropy())):null;S&&(h.add(S.mesh),b.material.uniforms.uCut.value=-6.5);let C=ye();h.add(C),performance.mark(`stage:model`);let w=t.c63,T=o.map(e=>e.dataset.stop),E=T.map(e=>w[e]??w.hero),D=i(l).anchors??{},O=E.length-1,k=new p,A=[],j,M,N=0,F=()=>{A=E.map(e=>c.matches?{...e,...e.mobile}:e),j=new ee(A.map(e=>new p(...e.position)),!1,`centripetal`),M=new ee(A.map(e=>new p(...e.target)),!1,`centripetal`)};F();let I=()=>{let e=d.clientWidth,t=d.clientHeight;c.matches?_.setViewOffset(e,t,0,t*N,e,t):_.setViewOffset(e,t,-e*(N+Math.max(0,1-e/1440)*.08),0,e,t),_.updateProjectionMatrix()},R=n.querySelector(`[data-night]`),de=e=>{b.material.uniforms.uHeadlights.value=1-v.smoothstep(e,0,.45),R&&(R.style.opacity=v.smoothstep(e,.35,1).toFixed(3))},z=t=>{let n=Math.min(Math.floor(t),Math.max(O-1,0)),r=E[Math.min(n+1,O)],i=e(t-n,r.pace),a=r.lightsOut;de(a?Math.min(Math.max((t-n-a[0])/(a[1]-a[0]),0),1):0);let o=O>0?(n+i)/O:0;j.getPoint(o,_.position),M.getPoint(o,k),_.lookAt(k),N=v.lerp(A[n].shift,A[Math.min(n+1,O)].shift,i),I()},B=n.querySelector(`[data-callout]`),V=B?.querySelector(`path`),H=B?[...B.querySelectorAll(`circle`)]:[],U=new p,xe=e=>{if(!B||!V)return;let t=Math.round(e),n=D[T[t]]??E[t]?.anchor,r=o[t]?.querySelector(`[data-callout-origin]`),i=1-Math.min(Math.abs(e-t)/.2,1);if(c.matches||!n||!r||i<=0){B.style.opacity=`0`;return}U.set(...n).project(_);let a=(U.x+1)/2*d.clientWidth,s=(1-U.y)/2*d.clientHeight,l=r.getBoundingClientRect();V.setAttribute(`d`,`M${l.right},${l.bottom} H${l.right+56} L${a},${s}`);for(let e of H)e.setAttribute(`cx`,`${a}`),e.setAttribute(`cy`,`${s}`);B.style.opacity=i.toFixed(3)},W=n.querySelector(`[data-beacon]`),Se=e=>{if(!W)return;let t=Math.round(e),n=D[T[t]]??E[t]?.anchor,r=1-Math.min(Math.abs(e-t)/.2,1);if(!c.matches||!n||r<=0){W.style.opacity=`0`;return}U.set(...n).project(_);let i=(U.x+1)/2*d.clientWidth,a=(1-U.y)/2*d.clientHeight;W.style.transform=`translate(${i.toFixed(1)}px, ${a.toFixed(1)}px)`,W.style.opacity=r.toFixed(3)},Ce=[c.matches?1.5:1.75,1.25,1,.75].map(e=>Math.min(window.devicePixelRatio,e)),G=0,K=0,q=!0,we=c.matches,J=()=>{c.matches!==we&&(we=c.matches,F()),m.setPixelRatio(Ce[G]),m.setSize(d.clientWidth,d.clientHeight,!1),C.visible=!S&&!c.matches,S?.place(c.matches?se:P),C.material.uniforms.uPixelRatio.value=m.getPixelRatio();let e=d.clientWidth/d.clientHeight;_.aspect=e,_.fov=c.matches?Math.max(26,e>.6?v.radToDeg(2*Math.atan(Math.tan(v.degToRad(19))*.6/e)):38):e<1.6?v.radToDeg(2*Math.atan(Math.tan(v.degToRad(15))*1.6/e)):30,I(),s.measure(),q=!0};J(),new ResizeObserver(J).observe(d),f.addEventListener(`change`,()=>q=!0);let Te=e=>{let t=1-(1-e)**3;h.environmentRotation.y=(1-t)*-1.2,h.environmentIntensity=.72+.28*t,b.material.uniforms.uArrival.value=t},Ee=0,Y=f.matches;Te(+!!Y);let X=!document.documentElement.classList.contains(`has-intro`);X||addEventListener(`meca:enter`,()=>{X=!0,q=!0},{once:!0});let Z=s.read();z(Z),await m.compileAsync(h,_),performance.mark(`stage:compiled`,{detail:{programs:m.info.programs?.length}});for(let e of ge(h,h.environment,S?.texture))m.initTexture(e),await fe();performance.mark(`stage:textures`,{detail:{textures:m.info.memory.textures}});let Q=0,$=0,De=!0,Oe=()=>{z(Z),m.render(h,_),xe(Z),Se(Z)},ke=e=>{Q=requestAnimationFrame(ke);let t=$?Math.min((e-$)/1e3,.25):1/60;$=e;let n=s.read(),i=q;if(f.matches){let e=Math.round(n);e!==Z&&(Z=e,i=!0)}else Math.abs(n-Z)>1e-4&&(Z+=(n-Z)*(1-Math.exp(-t*4.5)),i=!0);if(!Y&&X){Ee||=e;let t=Math.min(Math.max(e-Ee-le,0)/ue,1);Te(t),Y=t>=1,i=!0}if(!i){K=0;return}q=!1,Oe(),De&&(De=!1,performance.mark(`stage:first-frame`,{detail:{programs:m.info.programs?.length,calls:m.info.render.calls}}),r.classList.add(`is-ready`),dispatchEvent(new CustomEvent(`meca:scene-ready`))),t>1/24?K++:K=Math.max(0,K-1),K>8&&G<Ce.length-1&&(G++,K=0,J())},Ae=()=>{Q||=($=0,requestAnimationFrame(ke))},je=()=>{cancelAnimationFrame(Q),Q=0};new IntersectionObserver(([e])=>e.isIntersecting?Ae():je()).observe(n),r.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),je(),n.classList.add(`is-static`)})}function pe(e){let t=new N().parse(e),n=new k(t.data,t.width,t.height,s,t.type);return n.mapping=306,n.colorSpace=M,n.minFilter=g,n.magFilter=g,n.generateMipmaps=!1,n.flipY=!1,n.needsUpdate=!0,n}function me(e){let t=new re,i=new h(1,1);for(let e of r){let n=new j(i,new m({color:new C(e.color).multiplyScalar(e.power),side:2}));n.scale.set(e.size[0],e.size[1],1),n.position.set(...e.position),n.rotation.set(...e.rotation),t.add(n)}let a=new D(e),o=a.fromScene(t,n).texture;return a.dispose(),o}function he(e){return e.scale.setScalar(100),e.updateMatrixWorld(!0),e.traverse(e=>{let t=e;if(!t.isMesh)return;let n=t.material,r=n.name.toLowerCase();if(/badge|plate/.test(r)){t.visible=!1;return}n.transmission>0&&(n.transmission=0,n.transparent=!0,n.opacity=Math.min(n.opacity,.3),n.depthWrite=!1),de.test(r)&&n.isMeshPhysicalMaterial?(n.clearcoat=1,n.clearcoatRoughness=.04):n.isMeshPhysicalMaterial&&(t.material=new o().copy(n),n.dispose())}),e}function ge(e,...t){let n=new Set;for(let e of t)e&&n.add(e);return e.traverse(e=>{let t=e;if(!t.isMesh||!t.visible)return;let r=t.material;for(let e of R){let t=r[e];t&&n.add(t)}}),n}var B=`
uniform vec3 uInk;
uniform float uArrival;
uniform float uHeadlights;
uniform float uCut;
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
  // Au-delà du bord de mer, plus de sol : le lointain (la baie) se voit en contrebas.
  if (p.x < uCut) discard;
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
}`;function V(){let e=H(7),t=Float32Array.from({length:65536},()=>e()),n=new Uint8Array(65536);for(let e=0;e<256;e++)for(let r=0;r<256;r++){let i=0;for(let n=-1;n<=1;n++)for(let a=-1;a<=1;a++)i+=t[(e+n+256)%256*256+(r+a+256)%256];n[e*256+r]=Math.round(Math.min(Math.max((i/9-.5)*2.6+.5,0),1)*255)}let r=new k(n,256,256,f);return r.wrapS=S,r.wrapT=S,r.magFilter=g,r.minFilter=A,r.generateMipmaps=!0,r.needsUpdate=!0,r}function _e(){let e=new u({uniforms:{uInk:{value:new C(L)},uArrival:{value:1},uHeadlights:{value:1},uCut:{value:-1e3},uNoise:{value:V()}},vertexShader:`
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,fragmentShader:B}),t=new j(new h(160,160),e);return t.rotation.x=-Math.PI/2,t}function H(e){return()=>{e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function ve(e){let t=e/2,n=document.createElement(`canvas`);n.width=e,n.height=t;let r=n.getContext(`2d`),i=t/2,o=t/180,s=r.createLinearGradient(0,0,0,i);s.addColorStop(0,`#0b0c0e`),s.addColorStop(.86,`#0b0c0f`),s.addColorStop(.975,`#0e1117`),s.addColorStop(1,`#141a24`),r.fillStyle=s,r.fillRect(0,0,e,i);let c=r.createLinearGradient(0,i,0,i+8*o);c.addColorStop(0,`#10141b`),c.addColorStop(.2,`#0c0e12`),c.addColorStop(1,`#0b0c0e`),r.fillStyle=c,r.fillRect(0,i,e,t-i);let l=new O(n);return l.mapping=303,l.colorSpace=a,l}function ye(){let e=H(26),t=[],n=[],r=[],i=new C(16757358),a=new C(13163775),o=new C,s=(e,i,a,s,c)=>{t.push(Math.cos(e)*70,1.4+Math.tan(i)*70,Math.sin(e)*70),o.copy(c).multiplyScalar(a),n.push(o.r,o.g,o.b),r.push(s)};for(let t=0;t<170;t++){let t=1-(1-e())**1.6,n=v.degToRad(-160+t*48),r=.2+1.1*(Math.sin(t*7.2+.6)*.5+.5)**1.5*(.4+t),o=e()<.7?i:a,c=.4+e()*.6,l=2+e()*2.2;s(n,v.degToRad(.12+e()*r),c,l,o),c>.8&&s(n,-v.degToRad(.08+e()*.25),c*.22,l*.8,o)}let l=new T;l.setAttribute(`position`,new E(t,3)),l.setAttribute(`tint`,new E(n,3)),l.setAttribute(`size`,new E(r,1));let d=new u({uniforms:{uPixelRatio:{value:1}},vertexShader:`
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
      }`,transparent:!0,depthWrite:!1,blending:2}),f=new c(l,d);return f.frustumCulled=!1,f}function be(e){let t=new _().setFromObject(e),n=t.getSize(new p),r=document.createElement(`canvas`);r.width=128,r.height=256;let i=r.getContext(`2d`);i.translate(64,128),i.scale(1,2);let a=i.createRadialGradient(0,0,0,0,0,62);a.addColorStop(0,`rgba(0,0,0,0.9)`),a.addColorStop(.55,`rgba(0,0,0,0.55)`),a.addColorStop(1,`rgba(0,0,0,0)`),i.fillStyle=a,i.fillRect(-64,-64,128,128);let o=new j(new h(n.x*1.35,n.z*1.12),new m({map:new O(r),color:0,transparent:!0,depthWrite:!1}));return o.rotation.x=-Math.PI/2,o.position.set((t.min.x+t.max.x)/2,.004,(t.min.z+t.max.z)/2),o}export{z as createStage};