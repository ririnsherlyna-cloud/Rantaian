global.window = {};
global.document = { readyState: 'complete', getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild() {} }, addEventListener() {} };
global.setTimeout = (f) => { try { f(); } catch (e) {} ; return 0; };
global.setInterval = () => 0;
require('/home/z/my-project/scripts/v234_beartrap.js');
const r = global.window.V234_BEARTRAP.ujiDiri();
console.log(JSON.stringify(r));
if (r.pass !== '4/4') { console.error('UJI DIRI GAGAL'); process.exit(1); }
