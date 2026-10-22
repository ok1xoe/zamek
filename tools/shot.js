// Vykreslí vybrané místnosti do PNG: node tools/shot.js <složka> [seznam místností]
'use strict';
var h = require('./harness.js'), ZH = h.ZH;
var out = process.argv[2];
var g = ZH.game;
for (var i = 0; i < 40; i++) { g._tick(); }
g._draw(); h.savePng(g._scr, out + '/title.png', 3);
g._start();
var G = g._get().G;
function shot(room) {
    ZH.enterRoom(G, room, null);
    if (room === 11) { G.delivered = 3; }
    for (var i = 0; i < 100; i++) { ZH.tick(G, { dx: 0, dy: 0 }, { noHazards: true }); }
    g._draw(); h.savePng(g._scr, out + '/room' + room + '.png', 3);
}
(process.argv[3] || '16,1,9,12,11,7').split(',').forEach(function (r) { shot(+r); });
