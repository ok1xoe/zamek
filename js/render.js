// Vykreslení: izometrická místnost s řazením podle hloubky (painter's algorithm), HUD, titulní obrazovka.
(function (root) {
    'use strict';

    var ZH = root.ZH = root.ZH || {};
    var C = ZH.C;
    var OY = 38, WALL_H = 30, DOOR_H = 24, STEP = 12;

    function proj(x, y, z) { return [128 + ((x - y) >> 2), OY + ((x + y) >> 3) - ((z * 3) >> 4)]; }
    ZH.proj = proj;

    function pset(scr, x, y, v, ink) { scr.block(x, y, 1, 1, v, ink, true); }

    function pad(n, len) { var s = String(Math.max(0, Math.floor(n))); while (s.length < len) { s = '0' + s; } return s; }

    function line(scr, row, str, ink, x) {
        var px = x === undefined ? Math.floor((256 - ZH.textWidth(str, 1)) / 2) : x;
        ZH.drawText(scr, px, row * 8 - 1, str, ink, 1);
    }

    // ---------- kostka (32 px široká, horní plocha 16 px, boky STEP px) ----------
    // styl: 0 zeď, 1 bedna, 2 drolící se, 3 padající
    function cube(scr, sx, sy, ink, style, crack) {
        for (var xi = -16; xi < 16; xi++) {
            var a = xi < 0 ? -xi - 1 : xi;
            var yTop = a >> 1, yEdge = 16 - (a >> 1);
            for (var y = yTop; y <= yEdge + STEP - 1; y++) {
                var isTop = y < yEdge;
                var v;
                if (y === yTop || y === yEdge || y === yEdge + STEP - 1 || xi === -16 || xi === 15 || (xi === 0 && !isTop) || (xi === -1 && !isTop)) { v = 1; }
                else if (isTop) { v = style === 1 ? ((((xi + y) & 3) === 0 || ((xi - y) & 7) === 0) ? 1 : 0) : (((xi + y) & 1) === 0 ? 1 : 0); }
                else if (xi < 0) {
                    var ry = y - yEdge;
                    v = style === 1 ? ((((xi + ry * 2) & 7) < 2) ? 1 : 0)
                        : ((ry % 4 === 0 || ((xi + 16 + (((ry >> 2) & 1) * 4)) % 8 === 0)) ? 1 : 0);
                } else { v = (((xi + y) & 3) === 0) ? 0 : 1; }
                if (style === 3 && !isTop && xi >= 0) { v = (xi & 1) ? 1 : 0; }
                if (style === 2 && crack && ((xi * 7 + y * 13) % 11 < crack)) { v = 0; }
                pset(scr, sx + xi, sy + y, v, ink);
            }
        }
    }

    function spritePx(scr, x, y, rows, ink, flip) {
        scr.sprite(x, y, rows, ink, flip);
    }

    function shadow(scr, x, y, gz) {
        var p = proj(x, y, gz);
        for (var r = 0; r < 3; r++) {
            var w = r === 1 ? 5 : 3;
            for (var c = -w; c < w; c++) { if (((c + r) & 1) === 0) { pset(scr, p[0] + c, p[1] - 1 + r, 1, 1); } }
        }
    }

    // ---------- zdi ----------
    function walls(scr, R, th) {
        var d = R.doors;
        for (var c = 0; c < 112; c++) {
            var base = OY + (c >> 1);
            for (var side = 0; side < 2; side++) {
                var open = side === 0 ? d.N : d.W;
                var sx = side === 0 ? 128 + c : 127 - c;
                var inDoor = open && c >= 48 && c < 64;
                var top = base - WALL_H;
                for (var yy = top; yy <= base; yy++) {
                    if (inDoor && yy > base - DOOR_H) { continue; }
                    var rr = yy - top, v;
                    if (rr === 0 || yy === base || (open && (c === 47 || c === 64))) { v = 1; }
                    else if (rr % 6 === 0) { v = 1; }
                    else if (((c + (((rr / 6) | 0) & 1) * 4) % 8) === 0) { v = 1; }
                    else { v = ((c & 1) === 0 && (yy & 1) === 0 && rr % 3 === 1) ? 1 : 0; }
                    pset(scr, sx, yy, v, th.wall);
                }
                if (open && (c === 47 || c === 64)) {
                    for (var k = base - DOOR_H; k <= base; k++) { pset(scr, sx, k, 1, 14); }
                }
            }
        }
    }

    function floorGrid(scr, th) {
        for (var i = 0; i <= C.N; i++) {
            for (var t = 0; t <= C.W; t += 8) {
                var a = proj(i * C.T, t, 0), b = proj(t, i * C.T, 0);
                if (((t >> 3) & 1) === 0) { pset(scr, a[0], a[1], 1, th.floor); pset(scr, b[0], b[1], 1, th.floor); }
            }
        }
    }

    function frontDoors(scr, R) {
        var d = R.doors;
        function gate(x1, y1, x2, y2) {
            var a = proj(x1, y1, 0), b = proj(x2, y2, 0), at = proj(x1, y1, 128), bt = proj(x2, y2, 128);
            var i;
            for (i = a[1]; i >= at[1]; i--) { pset(scr, a[0], i, 1, 14); pset(scr, a[0] + 1, i, 1, 14); }
            for (i = b[1]; i >= bt[1]; i--) { pset(scr, b[0], i, 1, 14); pset(scr, b[0] + 1, i, 1, 14); }
            for (i = 0; i <= 32; i++) {
                var px = at[0] + Math.round((bt[0] - at[0]) * i / 32), py = at[1] + Math.round((bt[1] - at[1]) * i / 32);
                pset(scr, px, py, 1, 14);
            }
        }
        if (d.E) { gate(C.W, 192, C.W, 256); }
        if (d.S) { gate(192, C.W, 256, C.W); }
        // hrany podlahy vpředu
        for (var t = 0; t <= C.W; t += 4) {
            var inE = d.E && t >= 192 && t <= 256, inS = d.S && t >= 192 && t <= 256;
            if (!inE) { var a = proj(C.W, t, 0); pset(scr, a[0], a[1], 1, 1); }
            if (!inS) { var b = proj(t, C.W, 0); pset(scr, b[0], b[1], 1, 1); }
        }
    }

    // ---------- předměty a postavy ----------
    function heroSprite(p) {
        var f = ((p.anim >> 2) & 1);
        var back = p.dir >= 2;
        var flip = p.dir === 1 || p.dir === 2;
        var set = p.form === 'w' ? (back ? ZH.SPR.wolfB : ZH.SPR.wolfF) : (back ? ZH.SPR.heroB : ZH.SPR.heroF);
        return { rows: set[p.moving ? f : 0], flip: flip };
    }

    function drawRoom(scr, view) {
        var G = view.G, R = G.R, p = G.p, th = ZH.THEMES[R.def.theme], fr = view.frame;
        scr.clear(0, 7);
        walls(scr, R, th);
        floorGrid(scr, th);
        var tileInk = th.block;
        var ents = [];
        function add(key, fn) { ents.push({ k: Math.max(0, Math.min(12, key)), fn: fn }); }
        var px = Math.floor(p.x / C.T), py = Math.floor(p.y / C.T);
        // předměty
        ZH.itemsHere(G).forEach(function (it) {
            add(Math.floor(it.x / C.T) + Math.floor(it.y / C.T), function () {
                shadow(scr, it.x, it.y, it.z);
                var pp = proj(it.x, it.y, it.z);
                var bob = Math.round(Math.sin(fr / 7 + it.id) * 2);
                spritePx(scr, pp[0] - 4, pp[1] - 12 - bob, ZH.SPR.items[it.type], ((fr >> 3) & 1) ? 15 : 14);
            });
        });
        // posuvné bloky
        R.blocks.forEach(function (k) {
            add(Math.floor((k.x + 32) / C.T) + Math.floor((k.y + 32) / C.T), function () {
                var q = proj(k.x, k.y, 0);
                cube(scr, q[0], q[1] - STEP, th.block === 6 ? 14 : 6, 1);
            });
        });
        // nepřátelé
        R.enemies.forEach(function (e) {
            add(Math.floor(e.x / C.T) + Math.floor(e.y / C.T), function () {
                shadow(scr, e.x, e.y, ZH.support(R, e.x, e.y, 0));
                var pp = proj(e.x, e.y, e.t === 'ball' ? 0 : e.z);
                if (e.t === 'ball') { spritePx(scr, pp[0] - 7, pp[1] - 14, ZH.SPR.ball[(fr >> 2) & 1], 11, false); }
                else if (!((fr >> 1) & 1) || p.form === 'h') { spritePx(scr, pp[0] - 6, pp[1] - 14, ZH.SPR.ghost[(fr >> 3) & 1], p.form === 'w' ? 9 : 13, e.x < p.x); }
            });
        });
        // hrdina
        add(px + py, function () {
            if (view.state === 'dying' && ((fr >> 1) & 1)) { return; }
            if (p.inv > 0 && view.state === 'play' && ((fr >> 2) & 1)) { return; }
            shadow(scr, p.x, p.y, ZH.support(R, p.x, p.y, p.z));
            var pp = proj(p.x, p.y, p.z);
            var form = p.form;
            if (p.flash > 0 && ((fr >> 2) & 1)) { form = form === 'w' ? 'h' : 'w'; }
            var save = p.form; p.form = form;
            var s = heroSprite(p); p.form = save;
            var h = s.rows.length;
            spritePx(scr, pp[0] - (s.rows[0].length >> 1), pp[1] - h, s.rows, form === 'w' ? 14 : 15, s.flip);
            if (p.carry) { spritePx(scr, pp[0] - 4, pp[1] - h - 10 - Math.round(Math.sin(fr / 6)), ZH.SPR.items[p.carry.type], 15); }
        });
        ents.sort(function (a, b) { return a.k - b.k; });
        var ei = 0;
        for (var s = 0; s <= 2 * (C.N - 1); s++) {
            for (var tx = 0; tx < C.N; tx++) {
                var ty = s - tx;
                if (ty < 0 || ty >= C.N) { continue; }
                var ch = R.ch[ty][tx];
                var q = proj(tx * C.T, ty * C.T, 0);
                if (ch >= '1' && ch <= '3') {
                    for (var lv = 1; lv <= ch.charCodeAt(0) - 48; lv++) { cube(scr, q[0], q[1] - lv * STEP, tileInk, 0); }
                } else if (ch === 'C') {
                    var cs = R.cr[tx + ',' + ty];
                    if (cs.gone === 0) { cube(scr, q[0], q[1] - STEP, 14, 2, cs.c > 10 ? Math.min(6, cs.c >> 3) : 0); }
                } else if (ch === 'X') {
                    cube(scr, q[0], q[1] - STEP, 10, 0);
                    spritePx(scr, q[0] - 8, q[1] - STEP + 2, ZH.SPR.spikes, 10, false);
                } else if (ch === '^') {
                    spritePx(scr, q[0] - 8, q[1] + 5, ZH.SPR.spikes, 10, false);
                } else if (ch === 'K') {
                    add(s, function () {
                        spritePx(scr, q[0] - 12, q[1] + 3, ZH.SPR.cauldron, ((fr >> 2) & 1) ? 12 : 13, false);
                        var fl = (fr >> 1) & 3;
                        scr.block(q[0] - 4 + fl * 2, q[1] - 6 - (fl & 1), 2, 3, 1, 14, true);
                        scr.block(q[0] + 3 - fl, q[1] - 3 + (fl & 1), 2, 2, 1, 14, true);
                    });
                } else if (ch === 'D') {
                    var dr = R.drops.filter(function (d) { return d.tx === tx && d.ty === ty; })[0];
                    if (dr && dr.warn && ((fr >> 2) & 1)) {
                        for (var i = -12; i <= 12; i += 2) { pset(scr, q[0] + i, q[1] + 8 - (Math.abs(i) >> 1), 1, 10); pset(scr, q[0] + i, q[1] + 8 + (Math.abs(i) >> 1), 1, 10); }
                    }
                    if (dr && dr.fz < 256) {
                        var dz = proj(tx * C.T, ty * C.T, dr.fz);
                        (function (qq) { add(s, function () { cube(scr, qq[0], qq[1] - STEP, 10, 3); }); })(dz);
                    }
                }
            }
            // entity této úhlopříčky
            ents.sort(function (a, b) { return a.k - b.k; });
            while (ei < ents.length && ents[ei].k <= s) { ents[ei].fn(); ei++; }
        }
        // případné entity vložené za běhu (padající bloky) – dokreslit
        while (ei < ents.length) { ents[ei].fn(); ei++; }
        frontDoors(scr, R);
    }

    function drawHud(scr, view) {
        var G = view.G, R = G.R, p = G.p;
        scr.fillCells(0, 19, 32, 5, 7, 0, 0);
        scr.block(0, 152, 256, 40, 0, 0, false);
        line(scr, 19, R.def.name.toUpperCase(), 14);
        // den a noc
        var ph = G.clock % C.DAYLEN, night = ph >= C.DAYTIME;
        line(scr, 20, 'DEN ' + pad(Math.min(G.day, C.MAXDAYS), 2) + '/' + C.MAXDAYS, 7, 4);
        spritePx(scr, 62, 160, night ? ZH.SPR.moon : ZH.SPR.sun, night ? 13 : 14, false);
        var bx = 74, bw = 172, dw = Math.round(bw * C.DAYTIME / C.DAYLEN), x;
        scr.fillCells(9, 20, 23, 1, 7, 0, 0);
        for (x = 0; x < bw; x++) {
            var isDay = x < dw;
            for (var y = 0; y < 5; y++) {
                var v = isDay ? 1 : (((x + y) & 1) ? 1 : 0);
                if (y === 0 || y === 4) { v = 1; }
                scr.block(bx + x, 162 + y - 1, 1, 1, v, isDay ? 14 : 9, true);
            }
        }
        var mx = bx + Math.round(bw * ph / C.DAYLEN);
        scr.block(mx, 159, 1, 9, 1, 15, true); scr.block(mx + 1, 159, 1, 9, 1, 15, true);
        // kotel a nesený předmět
        line(scr, 21, 'KOTEL ' + G.delivered + '/' + C.NEED, 5, 4);
        if (p.carry) {
            line(scr, 21, 'NESEŠ:', 7, 96);
            spritePx(scr, 140, 168, ZH.SPR.items[p.carry.type], 15, false);
            ZH.drawText(scr, 152, 167, ZH.ITEM_TYPES[p.carry.type], 15, 1);
        } else {
            line(scr, 21, 'RUCE JSOU PRÁZDNÉ', 2, 96);
        }
        line(scr, 22, 'ŽIVOTY ' + Math.max(0, G.lives) + '   SKÓRE ' + pad(G.score, 6), 6);
        if (G.msgT > 0 && G.msg) { line(scr, 23, G.msg, 15); }
        else { line(scr, 23, 'REKORD ' + pad(view.hi, 6) + (view.muted ? '   ZVUK VYP' : ''), 4); }
        // forma
        if (p.form === 'w') { ZH.drawText(scr, 200, 183, 'VLK', 14, 1); }
    }

    function banner(scr, a, b) {
        scr.fillCells(3, 5, 26, 7, 7, 1, 1);
        scr.block(24, 40, 208, 56, 0, 0, false);
        ZH.drawText(scr, Math.floor((256 - ZH.textWidth(a, 2)) / 2), 44, a, 15, 2);
        line(scr, 8, b, 15);
    }

    function drawGame(scr, view) {
        drawRoom(scr, view);
        drawHud(scr, view);
        var G = view.G;
        if (view.state === 'paused') { banner(scr, 'PAUZA', 'P - POKRAČOVAT'); }
        else if (view.state === 'over') {
            banner(scr, 'KONEC HRY', G.over === 'time' ? 'DOŠEL ČAS - KLETBA TRVÁ' : 'ZAKLETÝ HRAD TĚ POHLTIL');
            line(scr, 10, 'SKÓRE ' + pad(G.score, 6) + '  MEZERNÍK = MENU', 15);
        } else if (view.state === 'win') {
            banner(scr, 'KLETBA ZRUŠENA', 'DNŮ: ' + Math.min(G.day, C.MAXDAYS) + '  SKÓRE ' + pad(G.score, 6));
            line(scr, 10, 'MEZERNÍK = MENU', 15);
        }
    }

    function drawTitle(scr, view) {
        var fr = view.frame;
        scr.clear(0, 7);
        var title = 'ZAKLETÝ HRAD';
        var x = Math.floor((256 - ZH.textWidth(title, 2)) / 2);
        var cols = [10, 14, 12, 13, 11, 9];
        for (var i = 0; i < title.length; i++) {
            ZH.drawText(scr, x + i * 12, 6, title.charAt(i), cols[(i + (fr >> 3)) % cols.length], 2);
        }
        // hromádka kostek
        var bx = 128, by = 50;
        cube(scr, bx, by, 6, 0);
        cube(scr, bx - 16, by + 8, 2, 0);
        cube(scr, bx + 16, by + 8, 2, 0);
        cube(scr, bx, by + 16, 6, 0);
        cube(scr, bx, by + 4, 14, 0);
        var k;
        var hx = 60 + ((fr >> 1) % 140);
        var night = ((fr >> 6) & 1) === 1;
        spritePx(scr, 40, 78, ZH.SPR.heroF[(fr >> 3) & 1], 15, false);
        spritePx(scr, 200, 82, ZH.SPR.wolfF[(fr >> 3) & 1], 14, false);
        spritePx(scr, hx, 88, ZH.SPR.ghost[(fr >> 3) & 1], 13, false);
        spritePx(scr, 20, 56, night ? ZH.SPR.moon : ZH.SPR.sun, night ? 13 : 14, false);
        for (k = 0; k < 8; k++) { spritePx(scr, 24 + k * 26, 112, ZH.SPR.items[k], ((fr >> 3) + k) & 1 ? 15 : 14, false); }
        line(scr, 15, 'REKORD ' + pad(view.hi, 6), 6);
        line(scr, 16, 'ŠIPKY NEBO WASD - POHYB', 7);
        line(scr, 17, 'MEZERNÍK - SKOK  ENTER - POLOŽIT', 7);
        line(scr, 18, 'P - PAUZA     M - ZVUK', 7);
        line(scr, 19, 'NOS PŘEDMĚTY (PO JEDNOM) DO KOTLE', 5);
        line(scr, 20, 'V HALE UPROSTŘED. MÁŠ 30 DNÍ!', 5);
        line(scr, 21, 'V NOCI SE MĚNÍŠ VE VLKODLAKA:', 13);
        line(scr, 22, 'RYCHLEJŠÍ A SKOČÍŠ DVA BLOKY', 13);
        if ((fr >> 4) & 1) { line(scr, 23, 'STISKNI MEZERNÍK NEBO KLEPNI', 15); }
    }

    ZH.render = { drawGame: drawGame, drawTitle: drawTitle, pad: pad };
})(typeof window !== 'undefined' ? window : globalThis);
