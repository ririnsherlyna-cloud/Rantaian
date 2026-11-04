global.window = {};
global.document = { readyState: 'complete', getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild() {} }, addEventListener() {} };
global.setInterval = () => 0;
require('/home/z/my-project/scripts/v237_fbo.js');
const r = global.window.V231_SAKTI.FBO.ujiDiri();
console.log(JSON.stringify(r));
if (parseInt(r.pass) < 21) { console.error('UJI DIRI GAGAL: ' + r.pass); process.exit(1); }
