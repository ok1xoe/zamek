// Jádro hry (bez DOM): izometrické místnosti, fyzika hrdiny, nepřátelé, den a noc.
// Jednotky: dlaždice = 64, blok = 64 na výšku, krok logiky = 1/50 s. Sdílí ho hra i testy v Node.
(function (root) {
    'use strict';

    var ZH = root.ZH = root.ZH || {};

    var T = 64, N = 7, W = N * T, HALF = 14, BLK = 64, PH = 80;
    var DAYLEN = 2200, DAYTIME = 1500, MAXDAYS = 30, START_CLOCK = 200;
    var SPEED = { h: 3, w: 5 }, DIAG = { h: 2, w: 4 }, JUMPV = { h: 14, w: 20 };
    var PUSH_DELAY = 10, SLIDE_TICKS = 16, FREEZE = 60, INV = 100;
    var DOOR_TILE = { N: [3, 0], S: [3, 6], W: [0, 3], E: [6, 3] };
    var APPROACH = { N: [3, 1], S: [3, 5], W: [1, 3], E: [5, 3] };
    var ENTRY = { N: [224, 40], S: [224, 408], W: [40, 224], E: [408, 224] };
    var NEED = 8;

    ZH.C = {
        T: T, N: N, W: W, HALF: HALF, PH: PH, DAYLEN: DAYLEN, DAYTIME: DAYTIME, MAXDAYS: MAXDAYS, NEED: NEED,
        DOOR_TILE: DOOR_TILE, APPROACH: APPROACH, ENTRY: ENTRY, JUMPV: JUMPV, SPEED: SPEED, INV: INV
    };

    function topChar(ch) {
        if (ch >= '1' && ch <= '3') { return (ch.charCodeAt(0) - 48) * BLK; }
        if (ch === 'C' || ch === 'X' || ch === 'K') { return BLK; }
        return 0;
    }
    ZH.topChar = topChar;

    // ---------- místnost ----------
    function makeRoom(id) {
        var def = ZH.ROOMS[id];
        var R = { id: id, def: def, doors: ZH.DOORS[id] || {}, ch: [], blocks: [], cr: {}, enemies: [], drops: [], t: 0 };
        for (var ty = 0; ty < N; ty++) {
            var row = def.rows[ty].split('');
            for (var tx = 0; tx < N; tx++) {
                var c = row[tx];
                if (c === 'p') { R.blocks.push({ tx: tx, ty: ty, x: tx * T, y: ty * T, slide: null }); row[tx] = '.'; }
                else if (c === 'D') { R.drops.push({ tx: tx, ty: ty, ph: (tx * 37 + ty * 53) % 180, fz: 256 }); }
                else if (c === 'C') { R.cr[tx + ',' + ty] = { c: 0, gone: 0 }; }
            }
            R.ch.push(row);
        }
        def.enemies.forEach(function (e, i) {
            R.enemies.push({ t: e.t, x: Math.round(e.x * T), y: Math.round(e.y * T), vx: e.vx || 0, vy: e.vy || 0, z: 36, ph: i * 23 });
        });
        return R;
    }

    function topOf(R, tx, ty) {
        if (tx < 0 || ty < 0 || tx >= N || ty >= N) { return 0; }
        var ch = R.ch[ty][tx];
        if (ch === 'C') { var s = R.cr[tx + ',' + ty]; return s && s.gone > 0 ? 0 : BLK; }
        return topChar(ch);
    }

    var WALL = { wall: true };

    // kolize kvádru hrdiny (střed x,y; paty z); vrací null, WALL nebo posuvný blok
    function hit(R, x, y, z) {
        var l = x - HALF, r = x + HALF, t = y - HALF, b = y + HALF, d = R.doors;
        if (l < 0 && !(d.W && y >= 192 && y < 256)) { return WALL; }
        if (r > W && !(d.E && y >= 192 && y < 256)) { return WALL; }
        if (t < 0 && !(d.N && x >= 192 && x < 256)) { return WALL; }
        if (b > W && !(d.S && x >= 192 && x < 256)) { return WALL; }
        var tx0 = Math.max(0, Math.floor(l / T)), tx1 = Math.min(N - 1, Math.floor((r - 1) / T));
        var ty0 = Math.max(0, Math.floor(t / T)), ty1 = Math.min(N - 1, Math.floor((b - 1) / T));
        for (var ty = ty0; ty <= ty1; ty++) {
            for (var tx = tx0; tx <= tx1; tx++) { if (topOf(R, tx, ty) > z) { return WALL; } }
        }
        for (var i = 0; i < R.blocks.length; i++) {
            var k = R.blocks[i];
            if (r > k.x && l < k.x + T && b > k.y && t < k.y + T && z < BLK) { return k; }
        }
        return null;
    }

    // výška podlahy pod kvádrem (jen to, co je v úrovni paty nebo níž)
    function support(R, x, y, z) {
        var best = 0;
        var tx0 = Math.max(0, Math.floor((x - HALF) / T)), tx1 = Math.min(N - 1, Math.floor((x + HALF - 1) / T));
        var ty0 = Math.max(0, Math.floor((y - HALF) / T)), ty1 = Math.min(N - 1, Math.floor((y + HALF - 1) / T));
        for (var ty = ty0; ty <= ty1; ty++) {
            for (var tx = tx0; tx <= tx1; tx++) {
                var t = topOf(R, tx, ty);
                if (t <= z && t > best) { best = t; }
            }
        }
        for (var i = 0; i < R.blocks.length; i++) {
            var k = R.blocks[i];
            if (x + HALF > k.x && x - HALF < k.x + T && y + HALF > k.y && y - HALF < k.y + T && BLK <= z && BLK > best) { best = BLK; }
        }
        return best;
    }

    ZH.hit = hit; ZH.support = support; ZH.topOf = topOf; ZH.makeRoom = makeRoom;

    // ---------- hra ----------
    function newGame() {
        var G = {
            clock: START_CLOCK, day: 1, night: false, lives: 5, score: 0, delivered: 0,
            items: [], p: null, R: null, entry: null, ev: [], won: false, over: null, msg: '', msgT: 0, tickN: 0
        };
        var id = 0;
        Object.keys(ZH.ROOMS).forEach(function (rid) {
            ZH.ROOMS[rid].items.forEach(function (it) {
                var def = ZH.ROOMS[rid];
                var top = topChar(def.rows[it.ty].charAt(it.tx));
                G.items.push({ id: id++, type: it.type, room: +rid, x: it.tx * T + 32, y: it.ty * T + 32, z: top, state: 'free', cool: 0 });
            });
        });
        G.p = { x: 0, y: 0, z: 0, vz: 0, onGround: true, form: 'h', dir: 0, moving: false, anim: 0, carry: null, inv: 0, dead: null, pushT: 0, actPrev: false, flash: 0 };
        enterRoom(G, ZH.START_ROOM, null);
        return G;
    }

    function enterRoom(G, id, side) {
        var p = G.p;
        G.R = makeRoom(id);
        G.entry = side;
        if (side) { p.x = ENTRY[side][0]; p.y = ENTRY[side][1]; }
        else {
            var st = ZH.ROOMS[id].start || { tx: 3, ty: 3 };
            p.x = st.tx * T + 32; p.y = st.ty * T + 32;
        }
        p.z = 0; p.vz = 0; p.onGround = true; p.pushT = 0; p.inv = INV;
        p.dir = side === 'N' ? 1 : side === 'S' ? 3 : side === 'W' ? 0 : side === 'E' ? 2 : 0;
        // zbytky předmětu v místnosti nesmí zůstat zastrčené v tlačitelném bloku
        G.ev.push(side ? 'door' : 'start');
    }

    function respawn(G) {
        var p = G.p;
        p.dead = null;
        G.lives--;
        if (G.lives < 0) { G.over = 'lives'; return; }
        enterRoom(G, G.R.id, G.entry);
    }

    function say(G, text) { G.msg = text; G.msgT = 150; }

    function isNightAt(clock) { return (clock % DAYLEN) >= DAYTIME; }

    function itemsHere(G) { return G.items.filter(function (it) { return it.state === 'free' && it.room === G.R.id; }); }

    // ---------- pohyb hrdiny ----------
    function moveAxis(R, p, ax, d) {
        var s = d < 0 ? -1 : 1, n = Math.abs(d);
        for (var i = 0; i < n; i++) {
            var nx = ax === 'x' ? p.x + s : p.x, ny = ax === 'y' ? p.y + s : p.y;
            var h = hit(R, nx, ny, p.z);
            if (h) { return h; }
            p.x = nx; p.y = ny;
        }
        return null;
    }

    function blockFree(G, R, tx, ty) {
        if (tx < 0 || ty < 0 || tx >= N || ty >= N) { return false; }
        var c = R.ch[ty][tx];
        if (c !== '.') { return false; }
        for (var s in DOOR_TILE) {
            if ((DOOR_TILE[s][0] === tx && DOOR_TILE[s][1] === ty) || (APPROACH[s][0] === tx && APPROACH[s][1] === ty)) { return false; }
        }
        for (var i = 0; i < R.blocks.length; i++) {
            var k = R.blocks[i];
            var kx = k.tx + (k.slide ? k.slide.dx : 0), ky = k.ty + (k.slide ? k.slide.dy : 0);
            if ((k.tx === tx && k.ty === ty) || (kx === tx && ky === ty)) { return false; }
        }
        var its = itemsHere(G);
        for (var j = 0; j < its.length; j++) {
            if (Math.floor(its[j].x / T) === tx && Math.floor(its[j].y / T) === ty) { return false; }
        }
        var p = G.p;
        if (p.x + HALF > tx * T && p.x - HALF < (tx + 1) * T && p.y + HALF > ty * T && p.y - HALF < (ty + 1) * T) { return false; }
        return true;
    }

    function updateBlocks(R) {
        R.blocks.forEach(function (k) {
            if (!k.slide) { return; }
            k.x += k.slide.dx * (T / SLIDE_TICKS);
            k.y += k.slide.dy * (T / SLIDE_TICKS);
            if (--k.slide.t <= 0) {
                k.tx += k.slide.dx; k.ty += k.slide.dy;
                k.x = k.tx * T; k.y = k.ty * T;
                k.slide = null;
            }
        });
    }

    function updatePlayer(G, R, inp, opt) {
        var p = G.p, f = p.form;
        var dx = inp.dx > 0 ? 1 : inp.dx < 0 ? -1 : 0, dy = inp.dy > 0 ? 1 : inp.dy < 0 ? -1 : 0;
        p.moving = !!(dx || dy);
        if (p.moving) {
            p.dir = (dx && dy) ? (dx > 0 ? (dy > 0 ? 0 : 3) : (dy > 0 ? 1 : 2)) : (dx ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3));
            p.anim++;
        }
        var sp = (dx && dy) ? DIAG[f] : SPEED[f];
        var cand = null, cax = null;
        if (dx) { var h1 = moveAxis(R, p, 'x', dx * sp); if (h1 && h1.slide !== undefined) { cand = h1; cax = 'x'; } }
        if (dy) { var h2 = moveAxis(R, p, 'y', dy * sp); if (h2 && h2.slide !== undefined) { cand = h2; cax = 'y'; } }

        // tlačení bloku
        if (cand && !cand.slide && p.onGround && p.z < 8 && ((dx && !dy) || (dy && !dx))) {
            var perp = cax === 'x' ? p.y - (cand.y + T / 2) : p.x - (cand.x + T / 2);
            if (Math.abs(perp) <= 22) {
                p.pushT++;
                if (p.pushT >= PUSH_DELAY) {
                    var sx = cax === 'x' ? dx : 0, sy = cax === 'y' ? dy : 0;
                    if (blockFree(G, R, cand.tx + sx, cand.ty + sy)) {
                        cand.slide = { dx: sx, dy: sy, t: SLIDE_TICKS };
                        G.ev.push('push');
                    }
                    p.pushT = 0;
                }
            } else { p.pushT = 0; }
        } else { p.pushT = 0; }

        // skok a svislý pohyb
        if (inp.jump && p.onGround) { p.vz = JUMPV[f]; p.onGround = false; G.ev.push('jump'); }
        var sup = support(R, p.x, p.y, p.z);
        if (p.onGround && p.z > sup) { p.onGround = false; p.vz = 0; }
        if (!p.onGround) {
            p.vz = Math.max(p.vz - 1, -12);
            var nz = p.z + p.vz;
            if (p.vz <= 0 && nz <= sup) { p.z = sup; p.vz = 0; p.onGround = true; G.ev.push('land'); }
            else { p.z = nz; }
        }
    }

    function overlapTile(p, tx, ty, inset) {
        return p.x + HALF > tx * T + inset && p.x - HALF < (tx + 1) * T - inset && p.y + HALF > ty * T + inset && p.y - HALF < (ty + 1) * T - inset;
    }

    function updateRoom(G, R, opt) {
        var p = G.p;
        R.t++;
        updateBlocks(R);
        // drolící se bloky
        for (var key in R.cr) {
            var s = R.cr[key], parts = key.split(','), tx = +parts[0], ty = +parts[1];
            if (s.gone > 0) {
                if (--s.gone === 0 && overlapTile(p, tx, ty, 0) && p.z < BLK) { s.gone = 1; }
            } else {
                if (p.onGround && p.z === BLK && overlapTile(p, tx, ty, 0)) {
                    if (++s.c >= 45) { s.gone = 260; s.c = 0; G.ev.push('crumble'); }
                } else if (s.c > 0) { s.c--; }
            }
        }
        // padající bloky
        R.drops.forEach(function (d) {
            var t = (R.t + d.ph) % 180;
            if (t < 140) { d.fz = 256; d.warn = t >= 100; }
            else if (t < 150) { d.fz = Math.round(256 - (t - 139) * 25.6); d.warn = true; }
            else if (t < 166) { d.fz = 0; d.warn = false; }
            else { d.fz = (t - 166) * 18; d.warn = false; }
        });
        // nepřátelé
        if (R.t > FREEZE) {
            R.enemies.forEach(function (e) {
                e.ph++;
                if (e.t === 'ball') { moveBall(R, e); }
                else {
                    var ddx = p.x - e.x, ddy = p.y - e.y;
                    var away = p.form === 'w' ? -1 : 1;
                    if (R.t % 2 === 0) {
                        if (Math.abs(ddx) > 2) { e.x += away * (ddx > 0 ? 1 : -1); }
                        if (Math.abs(ddy) > 2) { e.y += away * (ddy > 0 ? 1 : -1); }
                    }
                    e.x = Math.max(20, Math.min(W - 20, e.x)); e.y = Math.max(20, Math.min(W - 20, e.y));
                    e.z = 36 + Math.round(6 * Math.sin(e.ph / 12));
                }
            });
        }
    }

    function ballHit(R, x, y) {
        var r = 20;
        if (x - r < 0 || x + r > W || y - r < 0 || y + r > W) { return true; }
        var tx0 = Math.floor((x - r) / T), tx1 = Math.floor((x + r - 1) / T), ty0 = Math.floor((y - r) / T), ty1 = Math.floor((y + r - 1) / T);
        for (var ty = ty0; ty <= ty1; ty++) { for (var tx = tx0; tx <= tx1; tx++) { if (topOf(R, tx, ty) > 0) { return true; } } }
        for (var i = 0; i < R.blocks.length; i++) {
            var k = R.blocks[i];
            if (x + r > k.x && x - r < k.x + T && y + r > k.y && y - r < k.y + T) { return true; }
        }
        return false;
    }

    function moveBall(R, e) {
        if (e.vx) {
            var s = e.vx > 0 ? 1 : -1;
            for (var i = 0; i < Math.abs(e.vx); i++) { if (ballHit(R, e.x + s, e.y)) { e.vx = -e.vx; break; } e.x += s; }
        }
        if (e.vy) {
            var s2 = e.vy > 0 ? 1 : -1;
            for (var j = 0; j < Math.abs(e.vy); j++) { if (ballHit(R, e.x, e.y + s2)) { e.vy = -e.vy; break; } e.y += s2; }
        }
    }

    function checkHazards(G, R, opt) {
        var p = G.p;
        if (p.inv > 0 || opt.noHazards) { return; }
        var tx0 = Math.max(0, Math.floor((p.x - HALF - 2) / T)), tx1 = Math.min(N - 1, Math.floor((p.x + HALF + 1) / T));
        var ty0 = Math.max(0, Math.floor((p.y - HALF - 2) / T)), ty1 = Math.min(N - 1, Math.floor((p.y + HALF + 1) / T));
        for (var ty = ty0; ty <= ty1; ty++) {
            for (var tx = tx0; tx <= tx1; tx++) {
                var c = R.ch[ty][tx];
                if (c === '^' && p.z < 24 && overlapTile(p, tx, ty, 10)) { return kill(G, 'ostny'); }
                if (c === 'X' && p.z < BLK + 4 && overlapTile(p, tx, ty, -3)) { return kill(G, 'ostny'); }
            }
        }
        for (var i = 0; i < R.drops.length; i++) {
            var d = R.drops[i];
            if (d.fz < 200 && overlapTile(p, d.tx, d.ty, 8) && p.z < d.fz + BLK && p.z + PH > d.fz) { return kill(G, 'blok'); }
        }
        if (R.t <= FREEZE) { return; }
        for (var k = 0; k < R.enemies.length; k++) {
            var e = R.enemies[k];
            if (e.t === 'ball') {
                if (Math.abs(p.x - e.x) < 30 && Math.abs(p.y - e.y) < 30 && p.z < 42) { return kill(G, 'koule'); }
            } else if (p.form === 'h') {
                if (Math.abs(p.x - e.x) < 24 && Math.abs(p.y - e.y) < 24 && p.z < e.z + 44 && p.z + PH > e.z) { return kill(G, 'duch'); }
            }
        }
    }

    function kill(G, why) { if (!G.p.dead) { G.p.dead = why; G.ev.push('die'); } }

    function updateItems(G, R, inp) {
        var p = G.p;
        G.items.forEach(function (it) { if (it.cool > 0) { it.cool--; } });
        // sebrání
        if (!p.carry) {
            itemsHere(G).forEach(function (it) {
                if (p.carry || it.cool > 0) { return; }
                if (Math.abs(p.x - it.x) < 22 && Math.abs(p.y - it.y) < 22 && p.z + PH > it.z && p.z < it.z + 40) {
                    it.state = 'carried'; p.carry = it; G.score += 100; G.ev.push('pick');
                    say(G, 'MÁŠ: ' + ZH.ITEM_TYPES[it.type]);
                }
            });
        }
        // položení
        var act = !!inp.act;
        if (act && !p.actPrev && p.carry && p.onGround) {
            var tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
            var top = topOf(R, tx, ty);
            var onBlock = support(R, p.x, p.y, p.z) > top;
            var ok = !onBlock && blockFreeDrop(R, tx, ty) && Math.abs(p.z - top) < 2;
            if (ok) {
                var it = p.carry;
                it.state = 'free'; it.room = R.id; it.x = p.x; it.y = p.y; it.z = top; it.cool = 60;
                p.carry = null; G.ev.push('drop');
            }
        }
        p.actPrev = act;
        // kotel
        if (R.def.cauldron && p.carry && Math.abs(p.x - 224) < 96 && Math.abs(p.y - 224) < 96) {
            p.carry.state = 'done'; p.carry = null;
            G.delivered++; G.score += 500; G.ev.push('deliver');
            say(G, 'KOTEL: ' + G.delivered + '/' + NEED);
            if (G.delivered >= NEED) { G.won = true; G.score += Math.max(0, MAXDAYS - G.day) * 200; }
        }
    }

    function blockFreeDrop(R, tx, ty) {
        var c = R.ch[ty] && R.ch[ty][tx];
        if (c === undefined || c === '^' || c === 'X' || c === 'D' || c === 'K' || c === 'C') { return false; }
        for (var s in DOOR_TILE) {
            if ((DOOR_TILE[s][0] === tx && DOOR_TILE[s][1] === ty) || (APPROACH[s][0] === tx && APPROACH[s][1] === ty)) { return false; }
        }
        return true;
    }

    function checkExit(G) {
        var p = G.p, R = G.R, d = R.doors;
        var side = null;
        if (p.x < -2 && d.W) { side = 'W'; }
        else if (p.x > W + 2 && d.E) { side = 'E'; }
        else if (p.y < -2 && d.N) { side = 'N'; }
        else if (p.y > W + 2 && d.S) { side = 'S'; }
        if (side) { enterRoom(G, d[side], ZH.OPP[side]); }
    }

    // jeden krok hry; inp = { dx, dy, jump, act } v osách světa (dx>0 = +x, dy>0 = +y)
    function tick(G, inp, opt) {
        opt = opt || {};
        G.ev.length = 0;
        if (G.won || G.over || G.p.dead) { return G.ev; }
        G.tickN++;
        var p = G.p;
        // den a noc
        G.clock++;
        G.day = Math.floor(G.clock / DAYLEN) + 1;
        var night = isNightAt(G.clock);
        if (night !== G.night) {
            G.night = night; p.form = night ? 'w' : 'h'; p.flash = 40;
            G.ev.push(night ? 'dusk' : 'dawn');
            say(G, night ? 'NOC! JSI VLKODLAK' : 'SVITÁ! JSI ČLOVĚK');
        }
        if (G.day > MAXDAYS) { G.over = 'time'; return G.ev; }
        if (p.inv > 0) { p.inv--; }
        if (p.flash > 0) { p.flash--; }
        if (G.msgT > 0) { G.msgT--; }
        updatePlayer(G, G.R, inp, opt);
        updateRoom(G, G.R, opt);
        if (!opt.noEnemies) { checkHazards(G, G.R, opt); }
        else { var keep = G.R.enemies; G.R.enemies = []; checkHazards(G, G.R, opt); G.R.enemies = keep; }
        updateItems(G, G.R, inp);
        if (!p.dead) { checkExit(G); }
        return G.ev;
    }

    ZH.newGame = newGame;
    ZH.tick = tick;
    ZH.respawn = respawn;
    ZH.enterRoom = enterRoom;
    ZH.isNightAt = isNightAt;
    ZH.itemsHere = itemsHere;

    if (typeof module !== 'undefined' && module.exports) { module.exports = ZH; }
})(typeof window !== 'undefined' ? window : globalThis);
