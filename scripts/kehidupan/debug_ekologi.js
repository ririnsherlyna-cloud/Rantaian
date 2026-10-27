/* Debug ekologi & fase — V284 */
'use strict';
const K = require('/home/z/my-project/scripts/kehidupan/engine_world.js');
const core = require('/home/z/my-project/scripts/kehidupan/engine_core.js');

K.boot('debug-' + Date.now());
K.setPasar([66, 41, 90, 12], 'debug', 'live');
for (let blok = 0; blok < 12; blok++) {
  K.denyut(500);
  const st = K.state();
  console.log('t=' + st.tick,
    'pop=' + st.pop,
    'e=' + st.e,
    'fase=' + st.fase,
    'evals=' + st.sintesis.evals,
    'skor=' + st.sintesis.skor.toFixed(2),
    'caps=' + st.caps.length,
    'lahir=' + st.lahir, 'mati=' + st.mati, 'bagi=' + st.bagi, 'rot=' + st.rot,
    'food=' + st.ftot);
}
// opsi abiogenesis? cek: berapa lama pop=0
