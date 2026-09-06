import{c as a}from"./index-B8uEz5z1.js";import{u as s}from"./useInternetIdentity-B5f6-nPK.js";/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]],d=a("clipboard-list",i),c={"qawja-zqpe7-54fec-umnik-ylxtj-2nhxv-st2ln-4dap7-zkhtw-oqeuf-iqe":"trener","hmulj-qav6g-lktiw-7e74g-u6p2k-blsdd-twvjx-5zm7f-h4zkz-wu7ch-qae":"trener"};function h(t){return t?c[t]??"supporter":"supporter"}function l(){const{identity:t}=s(),e=t==null?void 0:t.getPrincipal(),o=!!(e&&!e.isAnonymous()),r=o?e==null?void 0:e.toText():void 0,n=h(r);return{principal:r,role:n,isCoach:n==="trener",isAuthenticated:o}}export{d as C,l as u};
