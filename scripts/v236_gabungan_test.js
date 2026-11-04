global.window = {};
global.document = { readyState: 'complete', getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild() {} }, addEventListener() {} };
global.setInterval = () => 0;
require('/home/z/my-project/scripts/v236_gabungan.js');
const r = global.window.V231_SAKTI.GABUNGAN.ujiDiri();
console.log(JSON.stringify(r));
if (r.pass !== '5/5') { console.error('UJI DIRI GAGAL'); process.exit(1); }
