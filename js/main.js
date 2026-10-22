// Hra Zakletý hrad: stavy, vstup, smyčka (logika 50 Hz).
(function (root) {
    'use strict';

    var ZH = root.ZH;
    var canvas = document.getElementById('screen');
    var ctx = canvas.getContext('2d');
    var scr = new ZH.Screen();

    var state = 'title';        // title | play | dying | over | win | paused
    var G = null, hi = 0, frame = 0, stateTimer = 0, prevState = 'play';
    var held = { left: false, right: false, up: false, down: false, jump: false, act: false };

    try { hi = parseInt(localStorage.getItem('zamek.hi'), 10) || 0; } catch (e) { hi = 0; }

    function setBorder(color) {
        var c = ZH.PAL[color & 7];
        document.body.style.background = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    }

    function saveHi() {
        if (G && G.score > hi) {
            hi = G.score;
            try { localStorage.setItem('zamek.hi', String(hi)); } catch (e) { /* ignorovat */ }
        }
    }

    function startGame() {
        G = ZH.newGame();
        state = 'play';
        ZH.sound.stopTune();
        setBorder(ZH.THEMES[G.R.def.theme].border);
    }

    function toTitle() {
        state = 'title';
        setBorder(0);
        ZH.sound.startTune();
    }

    function sounds(ev) {
        for (var i = 0; i < ev.length; i++) {
            var s = ZH.sound[ev[i] === 'dusk' ? 'wolf' : ev[i]];
            if (typeof s === 'function') { s(); }
        }
    }

    function tick() {
        frame++;
        if (state === 'play') {
            var inp = { dx: (held.right ? 1 : 0) - (held.left ? 1 : 0), dy: (held.down ? 1 : 0) - (held.up ? 1 : 0), jump: held.jump, act: held.act };
            var ev = ZH.tick(G, inp);
            sounds(ev);
            saveHi();
            if (ev.indexOf('door') >= 0 || ev.indexOf('start') >= 0) { setBorder(ZH.THEMES[G.R.def.theme].border); }
            if (G.won) { state = 'win'; ZH.sound.win(); saveHi(); }
            else if (G.over) { state = 'over'; ZH.sound.over(); saveHi(); }
            else if (G.p.dead) { state = 'dying'; stateTimer = 50; }
        } else if (state === 'dying') {
            if (--stateTimer <= 0) {
                ZH.respawn(G);
                if (G.over) { state = 'over'; ZH.sound.over(); saveHi(); }
                else { state = 'play'; setBorder(ZH.THEMES[G.R.def.theme].border); }
            }
        }
    }

    function draw() {
        var view = { state: state, G: G, hi: hi, frame: frame, muted: ZH.sound.isMuted() };
        if (state === 'title' || !G) { ZH.render.drawTitle(scr, view); }
        else { ZH.render.drawGame(scr, view); }
        scr.render(ctx);
    }

    // ---------- vstup ----------
    function press() {
        ZH.sound.unlock();
        if (state === 'title') { startGame(); }
        else if (state === 'over' || state === 'win') { toTitle(); }
    }

    function togglePause() {
        if (state === 'play') { prevState = state; state = 'paused'; }
        else if (state === 'paused') { state = prevState; }
    }

    var KEYS = {
        37: 'left', 65: 'left', 39: 'right', 68: 'right', 38: 'up', 87: 'up', 40: 'down', 83: 'down',
        32: 'jump', 90: 'jump', 13: 'act', 88: 'act', 16: 'act'
    };

    document.addEventListener('keydown', function (e) {
        var k = KEYS[e.keyCode];
        if (k) {
            e.preventDefault();
            held[k] = true;
            if (!e.repeat && (e.keyCode === 32 || e.keyCode === 13)) { press(); }
        } else if (e.keyCode === 80) {
            togglePause();
        } else if (e.keyCode === 77) {
            if (!ZH.sound.toggleMute() && state === 'title') { ZH.sound.startTune(); }
        }
        ZH.sound.unlock();
    });

    document.addEventListener('keyup', function (e) {
        var k = KEYS[e.keyCode];
        if (k) { held[k] = false; }
    });

    Array.prototype.forEach.call(document.querySelectorAll('#touch button'), function (b) {
        var act = b.getAttribute('data-act');
        function down(e) {
            e.preventDefault();
            ZH.sound.unlock();
            if (act === 'pause') { togglePause(); return; }
            held[act] = true;
            if (act === 'jump' || act === 'act') { press(); }
        }
        function up(e) { e.preventDefault(); if (act !== 'pause') { held[act] = false; } }
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('pointerleave', up);
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });

    canvas.addEventListener('pointerdown', function () {
        if (state === 'title' || state === 'over' || state === 'win') { press(); }
        else if (state === 'paused') { togglePause(); }
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden && state === 'play') { prevState = 'play'; state = 'paused'; }
    });
    window.addEventListener('blur', function () {
        held.left = held.right = held.up = held.down = held.jump = held.act = false;
    });

    // ---------- celočíselné měřítko ----------
    function fit() {
        var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        var availH = window.innerHeight - (touch ? 160 : 24);
        var s = Math.min(window.innerWidth / 256, availH / 192);
        s = s >= 1 ? Math.floor(s) : Math.max(0.5, s);
        canvas.style.width = Math.round(256 * s) + 'px';
        canvas.style.height = Math.round(192 * s) + 'px';
    }
    window.addEventListener('resize', fit);
    fit();

    // ---------- smyčka (fixní krok 50 Hz) ----------
    var last = 0, acc = 0, STEP = 1000 / 50;

    function loop(ts) {
        var dt = Math.min(250, ts - last || 0);
        last = ts;
        if (state !== 'paused') {
            acc += dt;
            while (acc >= STEP) { tick(); acc -= STEP; }
        } else {
            acc = 0;
            frame++;
        }
        draw();
        requestAnimationFrame(loop);
    }

    ZH.game = {
        _get: function () { return { state: state, G: G }; },
        _tick: tick, _draw: draw, _start: startGame, _held: held, _scr: scr, _press: press, _pause: togglePause,
        _setState: function (s) { state = s; }
    };

    toTitle();
    requestAnimationFrame(loop);
})(window);
