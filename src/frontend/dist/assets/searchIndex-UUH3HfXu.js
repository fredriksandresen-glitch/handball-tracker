let a;function n(){return a??(a=fetch("/data/search-player-index.json").then(async e=>e.ok?await e.json():[]).catch(()=>[])),a}export{n as l};
