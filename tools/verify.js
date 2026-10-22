// Ověření mapy hradu: průchodnost místností, dosažitelnost dveří a předmětů (včetně tlačení bloků),
// propojení celého hradu. Spuštění: node tools/verify.js
'use strict';
var path = require('path');
global.window = undefined;
var ZH = require(path.join(__dirname, '..', 'js', 'world.js'));
require(path.join(__dirname, '..', 'js', 'engine.js'));
ZH = globalThis.ZH;
var C = ZH.C, N = C.N;
var errors = [], notes = [];
function err(s) { errors.push(s); }

var FORBID = { '^': 1, 'X': 1, 'K': 1 };

function analyse(id, J) {
    var def = ZH.ROOMS[id], doors = ZH.DOORS[id];
    var ch = def.rows.map(function (r) { return r.split(''); });
    var blocks = [];
    for (var y = 0; y < N; y++) { for (var x = 0; x < N; x++) { if (ch[y][x] === 'p') { blocks.push([x, y]); ch[y][x] = '.'; } } }
    var itemTiles = {};
    def.items.forEach(function (it) { itemTiles[it.tx + ',' + it.ty] = 1; });
    var doorTiles = [], specials = {};
    for (var s in C.DOOR_TILE) {
        specials[C.DOOR_TILE[s] + ''] = 1; specials[C.APPROACH[s] + ''] = 1;
        if (doors[s]) { doorTiles.push({ side: s, tx: C.DOOR_TILE[s][0], ty: C.DOOR_TILE[s][1] }); }
    }
    function top(tx, ty, bl) {
        for (var i = 0; i < bl.length; i++) { if (bl[i][0] === tx && bl[i][1] === ty) { return 64; } }
        return ZH.topChar(ch[ty][tx]);
    }
    function key(px, py, bl) { return px + ',' + py + '|' + bl.map(function (b) { return b.join(','); }).sort().join(';'); }
    function explore(sx, sy) {
        var seen = {}, q = [[sx, sy, blocks]];
        seen[key(sx, sy, blocks)] = 1;
        var tiles = {};
        while (q.length) {
            var st = q.shift(), px = st[0], py = st[1], bl = st[2];
            tiles[px + ',' + py] = 1;
            var s0 = top(px, py, bl);
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
                var nx = px + d[0], ny = py + d[1];
                if (nx < 0 || ny < 0 || nx >= N || ny >= N) { return; }
                if (FORBID[ch[ny][nx]]) { return; }
                var bi = -1;
                for (var i = 0; i < bl.length; i++) { if (bl[i][0] === nx && bl[i][1] === ny) { bi = i; } }
                var nexts = [];
                if (bi >= 0) {
                    if (64 - s0 <= J * 64) { nexts.push([nx, ny, bl]); }
                    if (s0 === 0) {
                        var bx = nx + d[0], by = ny + d[1];
                        if (bx >= 0 && by >= 0 && bx < N && by < N && ch[by][bx] === '.' && !specials[bx + ',' + by] && !itemTiles[bx + ',' + by] &&
                            !bl.some(function (b) { return b[0] === bx && b[1] === by; })) {
                            var nb = bl.map(function (b, k) { return k === bi ? [bx, by] : b; });
                            nexts.push([nx, ny, nb]);
                        }
                    }
                } else if (ZH.topChar(ch[ny][nx]) - s0 <= J * 64) { nexts.push([nx, ny, bl]); }
                nexts.forEach(function (n) { var k = key(n[0], n[1], n[2]); if (!seen[k]) { seen[k] = 1; q.push(n); } });
            });
        }
        return tiles;
    }
    return { doorTiles: doorTiles, explore: explore, def: def, ch: ch };
}

Object.keys(ZH.ROOMS).forEach(function (id) {
    id = +id;
    var def = ZH.ROOMS[id];
    if (def.rows.length !== N || def.rows.some(function (r) { return r.length !== N; })) { err('R' + id + ': špatný rozměr'); return; }
    var a = analyse(id, 1), b = analyse(id, 2);
    // dveře a přístupy volné
    a.doorTiles.forEach(function (d) {
        var ap = C.APPROACH[d.side];
        if (a.ch[d.ty][d.tx] !== '.' || a.ch[ap[1]][ap[0]] !== '.') { err('R' + id + ': dveře ' + d.side + ' mají zablokovaný přístup'); }
    });
    if (def.rows.join('').indexOf('p') >= 0 && a.doorTiles.length === 0) { err('R' + id + ': bez dveří'); }
    var start = a.doorTiles[0] ? [a.doorTiles[0].tx, a.doorTiles[0].ty] : [3, 3];
    var th = a.explore(start[0], start[1]);
    a.doorTiles.forEach(function (d) { if (!th[d.tx + ',' + d.ty]) { err('R' + id + ': dveře ' + d.side + ' nedosažitelné pro člověka'); } });
    // z každých dveří se dostanu ke všem ostatním
    a.doorTiles.forEach(function (d0) {
        var t = a.explore(d0.tx, d0.ty);
        a.doorTiles.forEach(function (d) { if (!t[d.tx + ',' + d.ty]) { err('R' + id + ': z dveří ' + d0.side + ' se nedá do ' + d.side); } });
    });
    var tw = b.explore(start[0], start[1]);
    def.items.forEach(function (it) {
        var k = it.tx + ',' + it.ty;
        if ('^XKDC'.indexOf(a.ch[it.ty][it.tx]) >= 0) { err('R' + id + ': předmět na nebezpečném poli'); }
        if (!tw[k]) { err('R' + id + ': předmět ' + ZH.ITEM_TYPES[it.type] + ' nedosažitelný ani vlkodlakem'); }
        else { notes.push('R' + id + ' ' + ZH.ITEM_TYPES[it.type] + ': ' + (th[k] ? 'člověk' : 'jen VLKODLAK')); }
    });
    // nepřátelé nesmí začínat uvnitř zdi
    def.enemies.forEach(function (e) {
        var tx = Math.floor(e.x), ty = Math.floor(e.y);
        if (a.ch[ty][tx] !== '.' && a.ch[ty][tx] !== '^' && a.ch[ty][tx] !== 'D' && e.t === 'ball') { err('R' + id + ': koule začíná v překážce'); }
    });
});

// propojení hradu
var seen = { 16: 1 }, q = [16];
while (q.length) { var r = q.shift(); Object.keys(ZH.DOORS[r]).forEach(function (s) { var n = ZH.DOORS[r][s]; if (!seen[n]) { seen[n] = 1; q.push(n); } }); }
Object.keys(ZH.ROOMS).forEach(function (id) { if (!seen[id]) { err('R' + id + ' není propojená'); } });
var total = 0; Object.keys(ZH.ROOMS).forEach(function (id) { total += ZH.ROOMS[id].items.length; });
if (total < C.NEED) { err('předmětů je jen ' + total); }
console.log('místností: ' + Object.keys(ZH.ROOMS).length + ', předmětů: ' + total);
notes.forEach(function (n) { console.log('  ' + n); });
if (errors.length) { console.log('CHYBY:'); errors.forEach(function (e) { console.log('  ' + e); }); process.exit(1); }
console.log('OK: mapa je průchodná a předměty dosažitelné');
