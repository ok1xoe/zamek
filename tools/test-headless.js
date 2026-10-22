// Headless test hry v Node: stavy, náhodný vstup (NaN), bot, který projde celý hrad
// (sebere všech 8 předmětů a donese je do kotle) skutečnou fyzikou enginu, a snímky do PNG.
// Spuštění: node tools/test-headless.js [složka-pro-PNG]
'use strict';
var h = require('./harness.js'), ZH = h.ZH, C = ZH.C;
var fails = 0;
function check(ok, msg) { if (!ok) { fails++; console.log('SELHÁNÍ: ' + msg); } else { console.log('ok: ' + msg); } }
function sign(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
var outDir = process.argv[2];

function finite(G) {
    var p = G.p, ok = [p.x, p.y, p.z, p.vz, G.clock, G.score].every(isFinite);
    G.R.enemies.forEach(function (e) { ok = ok && isFinite(e.x) && isFinite(e.y) && isFinite(e.z); });
    G.R.blocks.forEach(function (b) { ok = ok && isFinite(b.x) && isFinite(b.y); });
    return ok;
}

// ---------- 1) stavy hry přes main.js ----------
(function () {
    var g = ZH.game;
    check(g._get().state === 'title', 'start na titulní obrazovce');
    for (var i = 0; i < 100; i++) { g._tick(); }
    g._draw();
    g._press();
    check(g._get().state === 'play', 'title -> play');
    g._pause(); check(g._get().state === 'paused', 'pauza P');
    g._pause(); check(g._get().state === 'play', 'pokračování po pauze');
    var G = g._get().G;
    // smrt: přenést hrdinu na ostny v místnosti 7 a nechat ho stát
    var seenDying = false, seenOver = false, deaths = 0;
    for (var life = 0; life < 20 && !seenOver; life++) {
        if (g._get().state === 'play') {
            if (G.R.id !== 7) { ZH.enterRoom(G, 7, null); }
            G.p.x = 2 * 64 + 32; G.p.y = 1 * 64 + 32; G.p.z = 0; G.p.inv = 0;   // pole '^' (2,1)
        }
        for (var t = 0; t < 400; t++) {
            g._tick();
            var st = g._get().state;
            if (st === 'dying' && !seenDying) { seenDying = true; deaths++; }
            if (st === 'over') { seenOver = true; break; }
            if (st === 'play' && t > 5) { break; }
        }
        if (!finite(G)) { check(false, 'NaN při smrti'); }
    }
    check(seenDying, 'play -> dying (ostny)');
    check(seenOver, 'dying -> over po ztrátě všech životů (' + G.lives + ' životů zbylo)');
    g._draw();
    if (outDir) { h.savePng(g._scr, outDir + '/over.png', 3); }
    g._press();
    check(g._get().state === 'title', 'over -> title');
    // vizuální kontrola smrtící překážky: hrdina stojí na kamenech
})();

// ---------- 2) náhodný vstup: žádné NaN, hrdina zůstává v mezích ----------
(function () {
    var seed = 12345;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    var G = ZH.newGame(), bad = 0, rooms = {};
    var inp = { dx: 0, dy: 0, jump: false, act: false };
    for (var t = 0; t < 120000; t++) {
        if (t % 12 === 0) { inp = { dx: Math.floor(rnd() * 3) - 1, dy: Math.floor(rnd() * 3) - 1, jump: rnd() < 0.3, act: rnd() < 0.05 }; }
        ZH.tick(G, inp, {});
        if (G.p.dead) { ZH.respawn(G); if (G.over) { G = ZH.newGame(); } }
        if (G.won || G.over) { G = ZH.newGame(); }
        rooms[G.R.id] = 1;
        if (!finite(G)) { bad++; break; }
        if (G.p.x < -40 || G.p.x > 488 || G.p.y < -40 || G.p.y > 488 || G.p.z < 0 || G.p.z > 400) { bad++; console.log('mimo meze', G.p.x, G.p.y, G.p.z); break; }
    }
    check(bad === 0, 'náhodný vstup 120000 kroků bez NaN a mimo meze (navštíveno ' + Object.keys(rooms).length + ' místností)');
})();

// ---------- 3) bot ----------
var Rn = null;
function topOf(tx, ty) { return ZH.topOf(Rn, tx, ty); }
function itemsAt(G) { return ZH.itemsHere(G); }

function bfs(G, goals, J) {
    var R = G.R, p = G.p; Rn = R;
    var px = Math.floor(p.x / 64), py = Math.floor(p.y / 64);
    var blocks0 = R.blocks.map(function (b) { return [b.tx, b.ty]; });
    var its = itemsAt(G).map(function (i) { return Math.floor(i.x / 64) + ',' + Math.floor(i.y / 64); });
    var special = {};
    for (var s in C.DOOR_TILE) { special[C.DOOR_TILE[s]] = 1; special[C.APPROACH[s]] = 1; }
    function key(x, y, bl) { return x + ',' + y + '|' + bl.map(function (b) { return b.join(','); }).sort().join(';'); }
    var start = { x: px, y: py, bl: blocks0, first: null, push: false, h: p.z };
    var seen = {}; seen[key(px, py, blocks0)] = 1;
    var q = [start];
    if (goals[px + ',' + py]) { return { here: true }; }
    while (q.length) {
        var st = q.shift();
        var s0 = st.h;
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var di = 0; di < 4; di++) {
            var d = dirs[di], nx = st.x + d[0], ny = st.y + d[1];
            if (nx < 0 || ny < 0 || nx >= 7 || ny >= 7) { continue; }
            var c = R.ch[ny][nx];
            if (c === '^' || c === 'X' || c === 'K') { continue; }
            var bi = -1;
            for (var i = 0; i < st.bl.length; i++) { if (st.bl[i][0] === nx && st.bl[i][1] === ny) { bi = i; } }
            var nexts = [];
            if (bi >= 0) {
                if (64 - s0 <= J * 64) { nexts.push({ bl: st.bl, h: 64, push: false }); }
                if (s0 < 8) {
                    var bx = nx + d[0], by = ny + d[1];
                    if (bx >= 0 && by >= 0 && bx < 7 && by < 7 && R.ch[by][bx] === '.' && !special[bx + ',' + by] && its.indexOf(bx + ',' + by) < 0 &&
                        !st.bl.some(function (b) { return b[0] === bx && b[1] === by; })) {
                        nexts.push({ bl: st.bl.map(function (b, k) { return k === bi ? [bx, by] : b; }), h: 0, push: true });
                    }
                }
            } else {
                var tp = topOf(nx, ny);
                if (tp - s0 <= J * 64) { nexts.push({ bl: st.bl, h: tp, push: false }); }
            }
            for (var k = 0; k < nexts.length; k++) {
                var n = nexts[k], kk = key(nx, ny, n.bl);
                if (seen[kk]) { continue; }
                seen[kk] = 1;
                var node = { x: nx, y: ny, bl: n.bl, h: n.h, first: st.first || { dx: d[0], dy: d[1], push: n.push, nx: nx, ny: ny }, };
                if (goals[nx + ',' + ny]) { return node.first; }
                q.push(node);
            }
        }
    }
    return null;
}

function roomPath(from, to) {
    var prev = {}; prev[from] = null; var q = [from];
    while (q.length) {
        var r = q.shift();
        if (r === to) { break; }
        Object.keys(ZH.DOORS[r]).forEach(function (s) { var n = ZH.DOORS[r][s]; if (!(n in prev)) { prev[n] = { r: r, s: s }; q.push(n); } });
    }
    if (!(to in prev)) { return null; }
    var cur = to, last = null;
    while (prev[cur]) { last = prev[cur]; if (prev[last.r] === null) { break; } cur = last.r; }
    return last.s;   // první strana od 'from'
}

var SIDE_DIR = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };

function botInput(G, st) {
    var p = G.p, R = G.R; Rn = R;
    if (R.blocks.some(function (b) { return b.slide; })) { return {}; }
    if (!p.onGround) { return st.last || {}; }
    var J = p.form === 'w' ? 2 : 1;
    var targetRoom, goals = {};
    var free = itemsAt(G);
    var inRoomItem = null;
    if (p.carry) { targetRoom = 11; }
    else {
        var best = null, bd = 1e9;
        G.items.forEach(function (it) {
            if (it.state !== 'free') { return; }
            var d = 0;
            if (it.room !== R.id) {
                // vzdálenost po místnostech
                var seen = {}, q = [[R.id, 0]]; seen[R.id] = 1; d = 999;
                while (q.length) { var e = q.shift(); if (e[0] === it.room) { d = e[1]; break; } Object.keys(ZH.DOORS[e[0]]).forEach(function (s) { var n = ZH.DOORS[e[0]][s]; if (!seen[n]) { seen[n] = 1; q.push([n, e[1] + 1]); } }); }
            }
            if (st.skip && st.skip[it.id] > G.clock) { d += 50; }
            if (d < bd) { bd = d; best = it; }
        });
        if (!best) { return {}; }
        targetRoom = best.room;
        inRoomItem = best;
    }
    var side = null;
    if (R.id !== targetRoom) {
        side = roomPath(R.id, targetRoom);
        goals[C.DOOR_TILE[side][0] + ',' + C.DOOR_TILE[side][1]] = 1;
    } else if (p.carry) {
        for (var gx = 2; gx <= 4; gx++) { for (var gy = 2; gy <= 4; gy++) { if (!(gx === 3 && gy === 3)) { goals[gx + ',' + gy] = 1; } } }
    } else {
        goals[Math.floor(inRoomItem.x / 64) + ',' + Math.floor(inRoomItem.y / 64)] = 1;
    }
    var px = Math.floor(p.x / 64), py = Math.floor(p.y / 64);
    if (side && (px < 0 || py < 0 || px > 6 || py > 6)) { return { dx: SIDE_DIR[side][0], dy: SIDE_DIR[side][1] }; }
    var mv = bfs(G, goals, J);
    if (mv && mv.here) {
        if (side) { var dd = SIDE_DIR[side]; return { dx: dd[0], dy: dd[1] }; }
        if (inRoomItem) {   // dojít přesně k předmětu
            var ex = inRoomItem.x - p.x, ey = inRoomItem.y - p.y;
            if (Math.abs(ex) > 3 || Math.abs(ey) > 3) { return { dx: Math.abs(ex) > 3 ? sign(ex) : 0, dy: Math.abs(ey) > 3 ? sign(ey) : 0 }; }
        }
        return {};
    }
    if (!mv) {
        // žádná cesta pro tuto podobu: čekat (třeba na noc / den)
        if (!p.carry && inRoomItem && R.id === inRoomItem.room) { st.skip = st.skip || {}; }
        return {};
    }
    var inp = {};
    var errx = px * 64 + 32 - p.x, erry = py * 64 + 32 - p.y;
    var onTop = Math.abs(p.z - topOf(px, py)) < 1;
    if (mv.dx && Math.abs(erry) > 5 && onTop) { inp.dy = sign(erry); inp.dx = 0; }
    else if (mv.dy && Math.abs(errx) > 5 && onTop) { inp.dx = sign(errx); inp.dy = 0; }
    else {
        inp.dx = mv.dx; inp.dy = mv.dy;
        var nt = R.blocks.some(function (b) { return b.tx === mv.nx && b.ty === mv.ny; }) ? 64 : topOf(mv.nx, mv.ny);
        if (!mv.push && nt > p.z + 1) {
            var dist = mv.dx > 0 ? mv.nx * 64 - (p.x + 14) : mv.dx < 0 ? p.x - 14 - (mv.nx + 1) * 64 : mv.dy > 0 ? mv.ny * 64 - (p.y + 14) : p.y - 14 - (mv.ny + 1) * 64;
            if (dist <= 4) { inp.jump = true; }
        }
    }
    return inp;
}

function runBot(opt, label, maxTicks) {
    var G = ZH.newGame(), st = {}, lastPos = null, stuck = 0, roomsSeen = {}, deaths = 0, formSeen = {};
    var inp = {};
    for (var t = 0; t < maxTicks; t++) {
        inp = botInput(G, st); st.last = inp;
        ZH.tick(G, inp, opt);
        roomsSeen[G.R.id] = 1; formSeen[G.p.form] = 1;
        if (!finite(G)) { check(false, label + ': NaN'); return G; }
        if (G.p.dead) { deaths++; ZH.respawn(G); if (G.over) { break; } }
        if (G.won || G.over) { break; }
        var pos = G.R.id + ':' + Math.floor(G.p.x / 8) + ',' + Math.floor(G.p.y / 8) + ',' + G.p.z;
        if (pos === lastPos && !(G.p.onGround && !inp.dx && !inp.dy && !inp.jump)) { stuck++; } else { stuck = 0; }
        lastPos = pos;
        if (stuck > 400) { console.log('  zaseknutý bot v místnosti ' + G.R.id + ' na ' + pos + ' vstup ' + JSON.stringify(inp)); break; }
    }
    console.log('  ' + label + ': kroků ' + t + ', den ' + G.day + ', doručeno ' + G.delivered + '/' + C.NEED + ', smrtí ' + deaths + ', místností ' + Object.keys(roomsSeen).length + ', podoby ' + Object.keys(formSeen).join('+'));
    return G;
}

var G1 = runBot({ noEnemies: true, noHazards: true }, 'bot bez nepřátel', 200000);
check(G1.won && G1.delivered === C.NEED, 'bot donesl všech ' + C.NEED + ' předmětů do kotle (hlavní cíl)');
check(Object.keys(ZH.ROOMS).length === 22, 'hrad má 22 místností');

// bot s aktivními nepřáteli: smí umírat, ale nesmí dojít k NaN a hra musí skončit čistě
var G2 = runBot({}, 'bot s nepřáteli', 200000);
check(G2.won || G2.over, 'hra s nepřáteli skončila čistě (' + (G2.won ? 'výhra' : 'konec: ' + G2.over) + ')');

// den a noc: vlkodlak
(function () {
    var G = ZH.newGame(), sawW = false, sawH = false, evs = {};
    for (var t = 0; t < ZH.C.DAYLEN * 3; t++) {
        var e = ZH.tick(G, {}, { noEnemies: true, noHazards: true });
        e.forEach(function (x) { evs[x] = 1; });
        if (G.p.form === 'w') { sawW = true; } else { sawH = true; }
    }
    check(sawW && sawH && evs.dusk && evs.dawn, 'střídání dne a noci (člověk <-> vlkodlak)');
    var G3 = ZH.newGame(); G3.clock = ZH.C.DAYLEN * ZH.C.MAXDAYS - 5;
    for (var k = 0; k < 20; k++) { ZH.tick(G3, {}, {}); }
    check(G3.over === 'time', 'po uplynutí dnů hra skončí');
})();

if (outDir) {
    var g = ZH.game; g._start();
    var G = g._get().G;
    [[1, 'room1'], [4, 'room4'], [12, 'room12'], [3, 'room3']].forEach(function (a) {
        ZH.enterRoom(G, a[0], 'S');
        for (var i = 0; i < 90; i++) { ZH.tick(G, {}, { noHazards: true }); }
        g._draw(); h.savePng(g._scr, outDir + '/' + a[1] + '.png', 3);
    });
    G.clock = C.DAYLEN * 0 + C.DAYTIME + 5; ZH.tick(G, {}, {}); ZH.enterRoom(G, 5, 'W');
    for (var j = 0; j < 90; j++) { ZH.tick(G, {}, { noHazards: true }); }
    g._draw(); h.savePng(g._scr, outDir + '/night5.png', 3);
}

console.log(fails ? ('SELHÁNÍ: ' + fails) : 'VŠE V POŘÁDKU');
process.exit(fails ? 1 : 0);
