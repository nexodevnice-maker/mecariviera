import{E as e,F as t,M as n,N as r,P as i,S as a,d as o,i as s,n as c,o as ee,r as l,u}from"./rigs.WiR0ODKm.js";var d=723982,te=8824575,f=[1.364,.88,-.983],p=[.5,.28,.78],m=-2.45,h=2.45,g={releve:{position:[4.4,2.3,-4.4],target:[.1,.6,-.75],shift:.24,mobile:{position:[5.8,2.9,-5.8],target:[.05,.6,-.4],shift:.22},focus:f,radii:p,focusMix:0,sweep:m,sweepMix:1,reveal:0,isolate:0},capot:{position:[2.6,2.9,-2.68],target:[1.385,.8,-.938],shift:.22,mobile:{position:[3.15,3.4,-3.16],shift:.22},focus:f,radii:p,focusMix:1,sweep:h,sweepMix:1,pace:{window:[.05,.95]},reveal:1,isolate:0},huile:{position:[2.2,1.95,-1.95],target:[1.45,.88,-.92],shift:.2,mobile:{position:[2.7,2.3,-2.4],shift:.22},focus:[1.547,.88,-.913],radii:[.16,.14,.16],focusMix:1,sweep:h,sweepMix:0,anchor:[1.547,.869,-.913],pace:{window:[.3,.75]},reveal:1,isolate:1},refroidissement:{position:[2.65,2.1,-.95],target:[1.5,.9,-.5],shift:.2,mobile:{position:[3.1,2.4,-1.2],shift:.22},focus:[1.5,.91,-.47],radii:[.17,.15,.17],focusMix:1,sweep:h,sweepMix:0,anchor:[1.483,.944,-.46],pace:{window:[.3,.75]},reveal:1,isolate:1},frein:{position:[1.975,2.35,-2.6],target:[1.06,.86,-1.06],shift:.22,mobile:{position:[2.3,2.7,-3],shift:.22},focus:[1.043,.845,-1.067],radii:[.19,.15,.19],focusMix:1,sweep:h,sweepMix:0,anchor:[1.043,.842,-1.067],pace:{window:[.3,.75]},reveal:1,isolate:1},moteur:{position:[2.75,1.95,-1.65],target:[1.35,.9,-.87],shift:.2,mobile:{position:[2.6,3,-1.9],target:[1.35,.9,-.9],shift:.22},focus:[1.33,.92,-.9],radii:[.36,.2,.42],focusMix:1,sweep:h,sweepMix:0,anchor:[1.361,.93,-.96],pace:{window:[.2,.85]},reveal:1,isolate:.6},depart:{position:[1.36,40,-1.09],target:[.055,0,-.359],shift:.2,mobile:{position:[1.36,48,-1.09],shift:.22},focus:f,radii:p,focusMix:0,sweep:h,sweepMix:0,pace:{window:[.1,.85]},reveal:1,isolate:0}},_=`
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,ne=`
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

void main() {
  vec3 tex = texture2D(map, vUv).rgb;
  float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
  vec3 car = toCar(vWorld);
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
  // Ligne de scan : trait fin (largeur constante à l'écran) et halo en couleurs réelles.
  float line = uSweepMix * (1.0 - smoothstep(0.005, 0.005 + 1.5 * fwidth(dx), abs(dx)));
  float glow = uSweepMix * exp(-dx * dx / 0.04);
  color = mix(color, tex, glow * 0.7);
  color += uLine * (line * 1.2 + glow * 0.1);
  // Sol : bien plus sombre que la voiture, puis fondu dans le fond de page au-delà de l'emprise.
  vec2 q = abs(car.xz) - CAR_HALF + 0.4;
  float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.4;
  color *= mix(0.25, 1.0, smoothstep(0.02, 0.2, vWorld.y));
  color = mix(color, uInk, smoothstep(0.0, 0.4, outside));
  // À l'ouverture, ce que la ligne n'a pas encore relevé se confond avec le fond de page : pas de
  // silhouette, seulement la ligne et ce qu'elle a déjà lu.
  color = mix(uInk, color, clamp(max(max(uReveal, scanned), glow * 0.7 + line), 0.0, 1.0));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`,v=e=>new t(...e);async function y({root:h,canvas:y,stops:b,progress:x,narrow:S}){let C=y.parentElement,w=matchMedia(`(prefers-reduced-motion: reduce)`),T=new ee({canvas:y,antialias:window.devicePixelRatio<2,powerPreference:`high-performance`});T.outputColorSpace=n,T.debug.checkShaderErrors=!1;let E=new r;E.background=new o(d);let D=new e(32,1,.05,60),O={uFocus:{value:v(f)},uRadii:{value:v(p)},uFocusMix:{value:0},uSweep:{value:m},uSweepMix:{value:1},uReveal:{value:0},uIsolate:{value:0},uInk:{value:new o(d)},uLine:{value:new o(te)}};l.useWorkers?.(2);let k=await new s().setMeshoptDecoder(l).loadAsync(S.matches?`/3d/a1-scan-m.glb`:`/3d/a1-scan.glb`),A=Math.min(8,T.capabilities.getMaxAnisotropy());k.scene.traverse(e=>{let t=e;if(!t.isMesh)return;let n=t.material;n.map&&(n.map.anisotropy=A),t.material=new i({uniforms:{...O,map:{value:n.map}},vertexShader:_,fragmentShader:ne}),n.dispose()}),E.add(k.scene);let j=b.map(e=>e.dataset.stop).map(e=>g[e]??g.releve),M=j.length-1,N=new t,P=[],F,I,L=0,R=()=>{P=j.map(e=>S.matches?{...e,...e.mobile}:e),F=new u(P.map(e=>v(e.position)),!1,`centripetal`),I=new u(P.map(e=>v(e.target)),!1,`centripetal`)};R();let z=()=>{let e=C.clientWidth,t=C.clientHeight;S.matches?D.setViewOffset(e,t,0,t*L,e,t):D.setViewOffset(e,t,-e*(L+Math.max(0,1-e/1440)*.08),0,e,t),D.updateProjectionMatrix()},B=a.lerp,V=(e,t,n,r)=>e.set(B(t[0],n[0],r),B(t[1],n[1],r),B(t[2],n[2],r)),H=e=>{let t=Math.min(Math.floor(e),Math.max(M-1,0)),n=j[Math.min(t+1,M)].pace,r=c(e-t,n),i=c(e-t,{window:n?.window??[.18,.82],ease:`linear`}),a=M>0?(t+r)/M:0;F.getPoint(a,D.position),I.getPoint(a,N),D.lookAt(N);let o=j[t],s=j[Math.min(t+1,M)];V(O.uFocus.value,o.focus,s.focus,r),V(O.uRadii.value,o.radii,s.radii,r),O.uFocusMix.value=B(o.focusMix,s.focusMix,r),O.uSweep.value=B(o.sweep,s.sweep,i),O.uSweepMix.value=B(o.sweepMix,s.sweepMix,r),O.uReveal.value=B(o.reveal,s.reveal,r**3),O.uIsolate.value=B(o.isolate,s.isolate,r),L=B(P[t].shift,P[Math.min(t+1,M)].shift,r),z()},U=h.querySelector(`[data-callout]`),W=U?.querySelector(`path`),re=U?[...U.querySelectorAll(`circle`)]:[],G=new t,ie=e=>{if(!U||!W)return;let t=Math.round(e),n=j[t]?.anchor,r=b[t]?.querySelector(`[data-callout-origin]`),i=1-Math.min(Math.abs(e-t)/.2,1);if(S.matches||!n||!r||i<=0){U.style.opacity=`0`;return}G.set(...n).project(D);let a=(G.x+1)/2*C.clientWidth,o=(1-G.y)/2*C.clientHeight,s=r.getBoundingClientRect();W.setAttribute(`d`,`M${s.right},${s.bottom} H${s.right+56} L${a},${o}`);for(let e of re)e.setAttribute(`cx`,`${a}`),e.setAttribute(`cy`,`${o}`);U.style.opacity=i.toFixed(3)},K=!0,q=S.matches,J=()=>{S.matches!==q&&(q=S.matches,R()),T.setPixelRatio(Math.min(window.devicePixelRatio,S.matches?1.5:1.75)),T.setSize(C.clientWidth,C.clientHeight,!1);let e=C.clientWidth/C.clientHeight;D.aspect=e,D.fov=S.matches?Math.max(30,e>.6?a.radToDeg(2*Math.atan(Math.tan(a.degToRad(21))*.6/e)):42):e<1.6?a.radToDeg(2*Math.atan(Math.tan(a.degToRad(16))*1.6/e)):32,z(),x.measure(),K=!0};J(),new ResizeObserver(J).observe(C),w.addEventListener(`change`,()=>K=!0);let Y=x.read();H(Y),await T.compileAsync(E,D);let X=0,Z=0,ae=()=>{H(Y),T.render(E,D),ie(Y)},Q=e=>{X=requestAnimationFrame(Q);let t=Z?Math.min((e-Z)/1e3,.25):1/60;Z=e;let n=x.read(),r=K;if(w.matches){let e=Math.round(n);e!==Y&&(Y=e,r=!0)}else Math.abs(n-Y)>1e-4&&(Y+=(n-Y)*(1-Math.exp(-t*4.5)),r=!0);r&&(K=!1,ae(),y.classList.add(`is-ready`))},oe=()=>{X||=(Z=0,requestAnimationFrame(Q))},$=()=>{cancelAnimationFrame(X),X=0};new IntersectionObserver(([e])=>e.isIntersecting?oe():$()).observe(h),y.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),$(),h.classList.remove(`has-3d`),h.classList.add(`is-static`)})}export{y as createInspection};