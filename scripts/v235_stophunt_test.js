global.window = {};
global.document = { readyState: 'complete', getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild() {} }, addEventListener() {} };
global.setTimeout = (f) => { try { f(); } catch (e) {} ; return 0; };
global.setInterval = () => 0;
require('/home/z/my-project/scripts/v235_stophunt.js');
const r = global.window.V235_STOPHUNT.ujiDiri();
console.log(JSON.stringify(r));
if (r.pass !== '5/5') { console.error('UJI DIRI GAGAL'); process.exit(1); }
