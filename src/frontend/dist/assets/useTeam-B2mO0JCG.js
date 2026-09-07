import{c as l,j as t,L as v,Y as j,e as k}from"./index-BHF4Fqn8.js";import{g as w,f as T}from"./usePlayer-CMD9mgeE.js";import{M as d,c as x}from"./backend-DPTy9PKv.js";import"./useInternetIdentity-CVA_jbHr.js";import{u as f}from"./useActor-Bj4kQtGU.js";import{u as y}from"./useQuery-CWr4z4Fy.js";import{j as u,h as N}from"./clawdbotPlayerProfile-CxSdH02c.js";import{g as M}from"./nextMatches-B4NHhwJT.js";/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],J=l("arrow-left",q);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],$=l("arrow-right",_);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],O=l("chevron-down",z);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]],S=l("clock",F);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],A=l("external-link",L);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],E=l("map-pin",C);function Q({match:e,teamId:s,homeTeamName:a,awayTeamName:n,className:o,showCountdown:r=!0,opponentLink:i}){const c=s!==void 0&&e.homeTeamId===s,p=s!==void 0&&e.awayTeamId===s,b=e.status===d.Upcoming,m=c?n:p?a:null,h=c?e.awayTeamId:p?e.homeTeamId:null,g=c?"HJEMME":p?"BORTE":null;return t.jsxs("div",{className:k("rounded-xl bg-card border border-border p-4 space-y-2",e.status===d.Live&&"border-chart-3/50 bg-chart-3/5",o),"data-ocid":"match-card",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("p",{className:"text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground",children:"Neste kamp"}),e.status===d.Live&&t.jsxs("span",{className:"flex items-center gap-1 text-[10px] font-bold text-chart-3 uppercase tracking-wide",children:[t.jsx("span",{className:"size-1.5 rounded-full bg-chart-3 animate-pulse"}),"Live"]})]}),t.jsxs("div",{className:"flex items-center justify-between gap-2",children:[m&&h!==null&&i?t.jsxs(v,{to:"/team/$id",params:{id:h.toString()},search:i,className:"group/opponent flex flex-1 min-w-0 items-center gap-1.5 font-display font-bold text-foreground text-base hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm","aria-label":`Gå til ${m}`,"data-ocid":"match-opponent-link",children:[t.jsxs("span",{className:"truncate",children:["vs ",m]}),t.jsx($,{className:"size-4 shrink-0 transition-transform group-hover/opponent:translate-x-0.5"})]}):t.jsx("p",{className:"font-display font-bold text-foreground text-base truncate flex-1 min-w-0",children:m?`vs ${m}`:`${a??"?"} — ${n??"?"}`}),b&&r&&t.jsx("span",{className:"text-primary font-display font-bold text-sm flex-shrink-0",children:w(e.startTime)})]}),t.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[t.jsxs("span",{className:"flex items-center gap-1 text-xs text-muted-foreground",children:[t.jsx(S,{className:"size-3"}),T(e.startTime)]}),g&&t.jsxs("span",{className:"flex items-center gap-1 text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wide",children:[t.jsx(j,{className:"size-3"}),g]}),e.venue&&t.jsxs("span",{className:"flex items-center gap-1 text-xs text-muted-foreground",children:[t.jsx(E,{className:"size-3"}),e.venue]})]}),t.jsx("div",{className:"pt-1",children:t.jsxs("button",{type:"button",disabled:!0,title:"Kampvisning kommer snart",className:"flex items-center gap-1 text-xs text-muted-foreground cursor-not-allowed opacity-50","data-ocid":"match-view-btn",children:[t.jsx(A,{className:"size-3"}),"Se kampvisning"]})})]})}function V(e,s,a){const{actor:n,isFetching:o}=f(x);return y({queryKey:["team",e.toString(),s??"all",a??"all"],queryFn:async()=>{const r=u(e,s,a);return r||(n?n.getTeam(e):null)},enabled:!o||!!u(e,s,a),staleTime:6e4})}function Y(e,s,a){const{actor:n,isFetching:o}=f(x),r=u(e,s,a);return y({queryKey:["nextMatch",e.toString(),s??"all",a??"all"],queryFn:async()=>{if(r){const c=M(r.name,a);if(c)return c}if(!n)return null;const i=await n.getNextMatchForTeam(e);return i?{match:i,homeTeamName:void 0,awayTeamName:void 0}:null},enabled:!o||!!r,staleTime:6e4})}function W(e,s,a){const{actor:n,isFetching:o}=f(x);return y({queryKey:["playersByTeam",e.toString(),s??"all",a??"all"],queryFn:async()=>{const r=N(s,a).filter(i=>i.teamId===e);return r.length>0?r:n?n.getPlayersByTeam(e):[]},enabled:!o||N(s,a).length>0,staleTime:6e4})}export{J as A,O as C,Q as M,Y as a,$ as b,W as c,V as u};
