global.window = {};
global.document = { readyState: 'complete', getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild() {} }, addEventListener() {} };
global.setTimeout = (f) => { try { f(); } catch (e) {} ; return 0; };
global.setInterval = () => 0;
require('/home/z/my-project/scripts/v232_mata.js');
const r = global.window.V232_MATA.ujiDiri();
console.log(JSON.stringify(r));
if (r.pass !== '6/6') { console.error('UJI DIRI GAGAL'); process.exit(1); }
