import{i as e,o as t,s as n}from"./preload-helper.BIT7SMv1.js";import{t as r}from"./Method.astro_astro_type_script_index_0_lang.B8I6J_W0.js";import{A as i,G as a,I as o,O as s,P as ee,U as c,W as l,Z as u,a as te,d,n as f,r as ne,t as re,u as p}from"./follow.Co_DQymV.js";var m=723982,ie=8824575,h=[1.364,.88,-.983],g=[.5,.28,.78],ae=-2.45,_=2.45,oe={releve:{position:[4.4,2.3,-4.4],target:[.1,.6,-.75],shift:.24,mobile:{position:[5.8,2.9,-5.8],target:[.05,.6,-.4],shift:.22},focus:h,radii:g,focusMix:0,sweep:ae,sweepMix:1,reveal:0,isolate:0},capot:{position:[2.6,2.9,-2.68],target:[1.385,.8,-.938],shift:.22,mobile:{position:[3.15,3.4,-3.16],shift:.22},focus:h,radii:g,focusMix:1,sweep:_,sweepMix:1,pace:r.capot,reveal:1,isolate:0},huile:{position:[2.2,1.95,-1.95],target:[1.45,.88,-.92],shift:.2,mobile:{position:[2.7,2.3,-2.4],shift:.22},focus:[1.547,.88,-.913],radii:[.16,.14,.16],focusMix:1,sweep:_,sweepMix:0,anchor:[1.547,.869,-.913],pace:r.huile,reveal:1,isolate:1},refroidissement:{position:[2.65,2.1,-.95],target:[1.5,.9,-.5],shift:.2,mobile:{position:[3.1,2.4,-1.2],shift:.22},focus:[1.5,.91,-.47],radii:[.17,.15,.17],focusMix:1,sweep:_,sweepMix:0,anchor:[1.483,.944,-.46],pace:r.refroidissement,reveal:1,isolate:1},frein:{position:[1.975,2.35,-2.6],target:[1.06,.86,-1.06],shift:.22,mobile:{position:[2.3,2.7,-3],shift:.22},focus:[1.043,.845,-1.067],radii:[.19,.15,.19],focusMix:1,sweep:_,sweepMix:0,anchor:[1.043,.842,-1.067],pace:r.frein,reveal:1,isolate:1},moteur:{position:[2.75,1.95,-1.65],target:[1.35,.9,-.87],shift:.2,mobile:{position:[2.6,3,-1.9],target:[1.35,.9,-.9],shift:.22},focus:[1.33,.92,-.9],radii:[.36,.2,.42],focusMix:1,sweep:_,sweepMix:0,anchor:[1.361,.93,-.96],pace:r.moteur,reveal:1,isolate:.6},depart:{position:[1.36,40,-1.09],target:[.055,0,-.359],shift:.2,mobile:{position:[8.37,7.6,-4.99],target:[.055,.2,-.359],shift:.22},focus:h,radii:g,focusMix:0,sweep:_,sweepMix:0,pace:r.depart,reveal:1,isolate:0}},se=`
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,ce=`
uniform sampler2D map;
uniform vec3 uFocus;
uniform vec3 uRadii;
uniform float uFocusMix;
uniform float uSweep;
uniform float uSweepMix;
uniform float uReveal;
uniform float uIsolate;
uniform vec3 uInk;
uniform vec3 uLine;
uniform float uCutout; // téléphone : la voiture seule, détourée
uniform float uAccent; // téléphone : la pièce nommée au bleu de la marque
varying vec2 vUv;
varying vec3 vWorld;

// Repère du véhicule dans le scan : centre au sol (x, z), axe avant, axe latéral ; demi-emprise (m).
const vec2 CAR_CENTER = vec2(0.055, -0.359);
const vec2 CAR_FORWARD = vec2(0.9026, -0.4305);
const vec2 CAR_SIDE = vec2(0.4305, 0.9026);
const vec2 CAR_HALF = vec2(2.02, 0.92);

// Repère du scan → repère du véhicule : (longueur, hauteur, largeur).
vec3 toCar(vec3 p) {
  vec2 rel = p.xz - CAR_CENTER;
  return vec3(dot(rel, CAR_FORWARD), p.y, dot(rel, CAR_SIDE));
}

// Sol du relevé : un plan légèrement incliné, ajusté sur les sommets du scan (±7 mm) — hauteur au centre, pentes
// le long et en travers du véhicule. Contour de la carrosserie vue de dessus (demi-longueur, demi-largeur), mesuré
// sur le scan.
const vec3 GROUND = vec3(0.093, 0.019, 0.013);
const vec2 BODY_HALF = vec2(1.99, 0.88);
float groundAt(vec3 car) {
  return GROUND.x + GROUND.y * car.x + GROUND.z * car.z;
}

void main() {
  vec3 tex = texture2D(map, vUv).rgb;
  float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
  vec3 car = toCar(vWorld);
  vec2 q = abs(car.xz) - CAR_HALF + 0.4;
  float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.4;
  // Téléphone : la voiture détourée, la place de parking remplaçant le sol du relevé. Retirés : tout ce qui est à
  // moins de 3,5 cm au-dessus de ce sol (sous la voiture comme autour) ; hors du contour de la carrosserie, la
  // soudure sol-caisse (sous 50 cm, les rétroviseurs restent) ; au-delà de 16 cm du contour, tout.
  float above = vWorld.y - groundAt(car);
  vec2 edge = abs(car.xz) - BODY_HALF + 0.3;
  float beyond = length(max(edge, 0.0)) + min(max(edge.x, edge.y), 0.0) - 0.3;
  if (uCutout > 0.5 && (above < 0.035 || (beyond > 0.02 && above < 0.5) || beyond > 0.16)) discard;
  // Nuit : luminance seule, froide et basse ; un cran plus clair derrière la ligne de scan (relevé).
  float dx = car.x - uSweep;
  float scanned = uSweepMix * (1.0 - smoothstep(-0.3, 0.02, dx));
  // À l'ouverture (uReveal = 0), la voiture n'existe que là où la ligne de scan est passée.
  vec3 color = lum * mix(vec3(0.2, 0.215, 0.26) * uReveal, vec3(0.3, 0.32, 0.39), scanned);
  // Volume : normale de facette (dérivées écran), tournée vers l'observateur — la silhouette
  // accroche un liseré froid, les dessus un peu de lumière zénithale.
  vec3 facet = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 toEye = normalize(cameraPosition - vWorld);
  facet *= sign(dot(facet, toEye));
  color += (uLine * 0.05 * pow(1.0 - max(dot(facet, toEye), 0.0), 4.0) + vec3(0.009, 0.01, 0.014) * max(facet.y, 0.0)) * max(uReveal, scanned);
  // Lampe d'inspection : couleurs réelles dans un ellipsoïde aligné sur le véhicule, cœur légèrement
  // chaud, et une lumière diffuse autour — une flaque de lumière plutôt qu'une découpe.
  float d = length((car - toCar(uFocus)) / uRadii);
  float core = 1.0 - smoothstep(0.55, 1.0, d);
  float spill = 1.0 - smoothstep(0.9, 1.7, d);
  // Isolement : tout ce qui n'est pas sous la lampe s'éteint presque — la pièce domine la scène.
  color *= mix(1.0, 0.3, uIsolate * (1.0 - spill));
  color += color * 0.4 * uFocusMix * spill * (1.0 - core);
  color = mix(color, tex * mix(vec3(0.94, 0.96, 1.0), vec3(1.06, 1.02, 0.95), core), uFocusMix * core);
  // Téléphone : la pièce nommée prend le bleu de la marque — un lavis sur elle, un contour lumineux autour.
  color = mix(color, color * vec3(0.7, 0.86, 1.3) + uLine * 0.1, uAccent * uFocusMix * core * 0.4);
  color += uLine * uAccent * uFocusMix * 0.45 * smoothstep(0.72, 0.95, d) * (1.0 - smoothstep(0.95, 1.25, d));
  // Ligne de scan : trait fin (largeur constante à l'écran) et halo en couleurs réelles.
  float line = uSweepMix * (1.0 - smoothstep(0.005, 0.005 + 1.5 * fwidth(dx), abs(dx)));
  float glow = uSweepMix * exp(-dx * dx / 0.04);
  color = mix(color, tex, glow * 0.7);
  color += uLine * (line * 1.2 + glow * 0.1);
  // Sol : bien plus sombre que la voiture, puis fondu dans le fond de page au-delà de l'emprise.
  color *= mix(0.25, 1.0, smoothstep(0.02, 0.2, vWorld.y));
  color = mix(color, uInk, smoothstep(0.0, 0.4, outside));
  // À l'ouverture, ce que la ligne n'a pas encore relevé se confond avec le fond de page : pas de
  // silhouette, seulement la ligne et ce qu'elle a déjà lu.
  color = mix(uInk, color, clamp(max(max(uReveal, scanned), glow * 0.7 + line), 0.0, 1.0));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`,le=`
varying vec3 vWorld;
const vec2 CAR_CENTER = vec2(0.055, -0.359);
const vec2 CAR_FORWARD = vec2(0.9026, -0.4305);
const vec2 CAR_SIDE = vec2(0.4305, 0.9026);
const vec3 GROUND = vec3(0.093, 0.019, 0.013);
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 rel = world.xz - CAR_CENTER;
  world.y = GROUND.x + GROUND.y * dot(rel, CAR_FORWARD) + GROUND.z * dot(rel, CAR_SIDE) - 0.004;
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,ue=`
uniform vec3 uInk;
uniform vec3 uLine;
uniform float uSweep;
uniform float uSweepMix;
varying vec3 vWorld;

const vec2 CAR_CENTER = vec2(0.055, -0.359);
const vec2 CAR_FORWARD = vec2(0.9026, -0.4305);
const vec2 CAR_SIDE = vec2(0.4305, 0.9026);
const vec2 CAR_HALF = vec2(2.02, 0.92);

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
  vec2 rel = vWorld.xz - CAR_CENTER;
  vec2 car = vec2(dot(rel, CAR_FORWARD), dot(rel, CAR_SIDE)); // (longueur, largeur)
  float grain = noise(vWorld.xz * 2.3) * 0.6 + noise(vWorld.xz * 9.0) * 0.4;
  vec3 color = vec3(0.034, 0.037, 0.045) * mix(0.75, 1.25, grain);
  // Marquage : lignes latérales tous les 2,6 m (la voiture au milieu de sa place), fond de place devant le capot.
  float aa = fwidth(car.y) * 1.5 + 0.003;
  float side = (1.0 - smoothstep(0.05, 0.05 + aa, abs(fract(car.y / 2.6) - 0.5) * 2.6)) * (1.0 - smoothstep(2.85, 2.9, abs(car.x)));
  float end = (1.0 - smoothstep(0.05, 0.05 + fwidth(car.x) * 1.5 + 0.003, abs(car.x - 2.9))) * (1.0 - smoothstep(6.4, 6.5, abs(car.y)));
  float paint = max(side, end) * mix(0.92, 1.0, noise(vWorld.xz * 24.0));
  color = mix(color, vec3(0.8, 0.81, 0.82), paint);
  // Ombre de la voiture sur le sol : occlusion sous la carrosserie (contour mesuré), plus dense au contact.
  vec2 q = abs(car) - vec2(1.99, 0.88) + 0.3;
  float footprint = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.3;
  color *= mix(0.22, 1.0, smoothstep(-0.2, 0.28, footprint));
  // La ligne de relevé passe aussi sur le sol.
  float dx = car.x - uSweep;
  float line = uSweepMix * (1.0 - smoothstep(0.005, 0.005 + 1.5 * fwidth(dx), abs(dx)));
  float glow = uSweepMix * exp(-dx * dx / 0.04);
  color += uLine * (line * 0.7 + glow * 0.05);
  // La place dans un halo de nuit, fondue dans le fond de page au-delà.
  color = mix(color, uInk, smoothstep(2.4, 6.0, length(car * vec2(0.55, 0.85))));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`,v=e=>new u(...e);async function y({root:r,canvas:_,stops:y,progress:b,narrow:x}){let S=_.parentElement,de=matchMedia(`(prefers-reduced-motion: reduce)`),C=new te({canvas:_,antialias:window.devicePixelRatio<2,powerPreference:`high-performance`});C.outputColorSpace=c,C.debug.checkShaderErrors=!1;let w=new l;w.background=new d(m);let T=new ee(32,1,.05,60),E={uFocus:{value:v(h)},uRadii:{value:v(g)},uFocusMix:{value:0},uSweep:{value:ae},uSweepMix:{value:1},uReveal:{value:0},uIsolate:{value:0},uInk:{value:new d(m)},uLine:{value:new d(ie)},uCutout:{value:0},uAccent:{value:0}};f.useWorkers?.(2);let D=await new ne().setMeshoptDecoder(f).loadAsync(x.matches?`/3d/a1-scan-m.glb`:`/3d/a1-scan.glb`),fe=Math.min(x.matches?16:8,C.capabilities.getMaxAnisotropy());D.scene.traverse(e=>{let t=e;if(!t.isMesh)return;let n=t.material;n.map&&(n.map.anisotropy=fe),t.material=new a({uniforms:{...E,map:{value:n.map}},vertexShader:se,fragmentShader:ce}),n.dispose()}),w.add(D.scene);let O=new i(new o(26,26),new a({uniforms:{...E},vertexShader:le,fragmentShader:ue}));O.rotation.x=-Math.PI/2,O.position.set(.055,0,-.359);let k=y.map(e=>e.dataset.stop).map(e=>oe[e]??oe.releve),A=k.length-1,j=new u,M=[],N,P,F=0,I=()=>{M=k.map(e=>x.matches?{...e,...e.mobile}:e),N=new p(M.map(e=>v(e.position)),!1,`centripetal`),P=new p(M.map(e=>v(e.target)),!1,`centripetal`)};I();let L=()=>{let e=S.clientWidth,t=S.clientHeight;x.matches?T.setViewOffset(e,t,0,t*F,e,t):T.setViewOffset(e,t,-e*(F+Math.max(0,1-e/1440)*.08),0,e,t),T.updateProjectionMatrix()},R=s.lerp,z=(e,t,n,r)=>e.set(R(t[0],n[0],r),R(t[1],n[1],r),R(t[2],n[2],r)),B=r=>{r=Number.isFinite(r)?Math.min(Math.max(r,0),A):0;let i=Math.min(Math.floor(r),Math.max(A-1,0)),a=k[Math.min(i+1,A)].pace,o=e.matches?t(a):a,s=n(r-i,o),ee=n(r-i,{window:o?.window??[.18,.82],ease:`linear`}),c=A>0?(i+s)/A:0;N.getPoint(c,T.position),P.getPoint(c,j),T.lookAt(j);let l=k[i],u=k[Math.min(i+1,A)];z(E.uFocus.value,l.focus,u.focus,s),z(E.uRadii.value,l.radii,u.radii,s),E.uFocusMix.value=R(l.focusMix,u.focusMix,s),E.uSweep.value=R(l.sweep,u.sweep,ee),E.uSweepMix.value=R(l.sweepMix,u.sweepMix,s),E.uReveal.value=R(l.reveal,u.reveal,s**3),E.uIsolate.value=R(l.isolate,u.isolate,s),F=R(M[i].shift,M[Math.min(i+1,A)].shift,s),L()},V=r.querySelector(`[data-callout]`),H=V?.querySelector(`path`),pe=V?[...V.querySelectorAll(`circle`)]:[],U=new u,me=e=>{if(!V||!H)return;let t=Math.round(e),n=k[t]?.anchor,r=y[t]?.querySelector(`[data-callout-origin]`),i=1-Math.min(Math.abs(e-t)/.2,1);if(x.matches||!n||!r||i<=0){V.style.opacity=`0`;return}U.set(...n).project(T);let a=(U.x+1)/2*S.clientWidth,o=(1-U.y)/2*S.clientHeight,s=r.getBoundingClientRect();H.setAttribute(`d`,`M${s.right},${s.bottom} H${s.right+56} L${a},${o}`);for(let e of pe)e.setAttribute(`cx`,`${a}`),e.setAttribute(`cy`,`${o}`);V.style.opacity=i.toFixed(3)},W=r.querySelector(`[data-beacon]`),he=e=>{if(!W)return;let t=Math.round(e),n=k[t]?.anchor,r=1-Math.min(Math.abs(e-t)/.2,1);if(!x.matches||!n||r<=0){W.style.opacity=`0`;return}U.set(...n).project(T);let i=(U.x+1)/2*S.clientWidth,a=(1-U.y)/2*S.clientHeight;W.style.transform=`translate(${i.toFixed(1)}px, ${a.toFixed(1)}px)`,W.style.opacity=r.toFixed(3)},G=[2,1.5,1.25,1].map(e=>Math.min(window.devicePixelRatio,e)),K=0,q=0,ge=()=>x.matches?G[K]:Math.min(window.devicePixelRatio,1.75),J=!0,_e=x.matches,Y=()=>{x.matches!==_e&&(_e=x.matches,I()),E.uCutout.value=+!!x.matches,E.uAccent.value=+!!x.matches,x.matches?w.add(O):w.remove(O),C.setPixelRatio(ge()),C.setSize(S.clientWidth,S.clientHeight,!1);let e=S.clientWidth/S.clientHeight;T.aspect=e,T.fov=x.matches?Math.max(30,e>.6?s.radToDeg(2*Math.atan(Math.tan(s.degToRad(21))*.6/e)):42):e<1.6?s.radToDeg(2*Math.atan(Math.tan(s.degToRad(16))*1.6/e)):32,L(),b.measure(),J=!0};Y(),new ResizeObserver(Y).observe(S),de.addEventListener(`change`,()=>J=!0);let X=b.read(),ve=re(x);B(X),await C.compileAsync(w,T);let Z=0,Q=0,ye=()=>{B(X),C.render(w,T),me(X),he(X),b.show(X)},be=e=>{Z=requestAnimationFrame(be);let t=Q?Math.min((e-Q)/1e3,.25):1/60;Q=e;let n=b.read(),r=J;if(de.matches){let e=Math.round(n);e!==X&&(X=e,r=!0)}else ve.moving(X,n)&&(X=ve.step(X,n,t),r=!0);r&&(J=!1,ye(),_.classList.add(`is-ready`),x.matches&&(t>1/45?q++:q=Math.max(0,q-1),q>12&&K<G.length-1&&(K++,q=0,Y())))},xe=()=>{Z||=(Q=0,requestAnimationFrame(be))},$=()=>{cancelAnimationFrame(Z),Z=0};new IntersectionObserver(([e])=>e.isIntersecting?xe():$()).observe(r),_.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),$(),b.show(null),r.classList.remove(`has-3d`),r.classList.add(`is-static`)})}export{y as createInspection};