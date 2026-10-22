// Zvuky přes WebAudio – "beeper" (čtvercová vlna), vlastní melodie na titulní obrazovce.
(function (root) {
    'use strict';

    var ZH = root.ZH = root.ZH || {};

    var ac = null, muted = false, tuneTimer = null, tuneStep = 0;

    try {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (AC) { ac = new AC(); }
    } catch (e) { ac = null; }

    function unlock() {
        if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* ignorovat */ } }
    }

    function beep(freq, dur, slideTo, vol, delay) {
        if (!ac || muted) { return; }
        try {
            var t0 = ac.currentTime + (delay || 0);
            var o = ac.createOscillator(), g = ac.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(freq, t0);
            if (slideTo) { o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur); }
            g.gain.setValueAtTime(vol || 0.04, t0);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            o.connect(g); g.connect(ac.destination);
            o.start(t0); o.stop(t0 + dur + 0.02);
        } catch (e) { /* ignorovat */ }
    }

    // temná melodie titulní obrazovky (0 = pauza), 32 kroků po 170 ms
    var TUNE = [
        220, 0, 262, 0, 330, 0, 262, 220, 208, 0, 247, 0, 311, 0, 247, 208,
        220, 0, 262, 330, 440, 0, 392, 330, 294, 0, 262, 247, 220, 0, 0, 0
    ];
    var BASS = [55, 0, 0, 0, 55, 0, 0, 0, 52, 0, 0, 0, 52, 0, 0, 0, 55, 0, 0, 0, 55, 0, 0, 0, 49, 0, 0, 0, 55, 0, 0, 0];

    ZH.sound = {
        unlock: unlock,
        toggleMute: function () { muted = !muted; if (muted) { ZH.sound.stopTune(); } return muted; },
        isMuted: function () { return muted; },
        jump: function () { beep(200, 0.16, 520, 0.035); },
        land: function () { beep(110, 0.04, 0, 0.03); },
        pick: function () { beep(880, 0.07, 0, 0.05); beep(1320, 0.1, 0, 0.05, 0.07); },
        drop: function () { beep(440, 0.12, 180, 0.04); },
        push: function () { beep(90, 0.1, 70, 0.05); },
        door: function () { beep(330, 0.05, 0, 0.04); beep(440, 0.07, 0, 0.04, 0.05); },
        deliver: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.12, 0, 0.05, i * 0.1); }); },
        wolf: function () { beep(300, 0.6, 120, 0.06); beep(200, 0.5, 90, 0.05, 0.3); },
        dawn: function () { beep(400, 0.3, 900, 0.04); },
        die: function () { beep(660, 0.7, 50, 0.05); },
        over: function () { [392, 330, 262, 196].forEach(function (f, i) { beep(f, 0.25, 0, 0.05, i * 0.22); }); },
        win: function () { [523, 659, 784, 659, 784, 1047, 1047].forEach(function (f, i) { beep(f, 0.14, 0, 0.05, i * 0.13); }); },
        startTune: function () {
            if (tuneTimer || !ac) { return; }
            tuneTimer = setInterval(function () {
                var n = TUNE[tuneStep % TUNE.length], b = BASS[tuneStep % BASS.length];
                if (n) { beep(n, 0.15, 0, 0.03); }
                if (b) { beep(b, 0.32, 0, 0.035); }
                tuneStep++;
            }, 170);
        },
        stopTune: function () { if (tuneTimer) { clearInterval(tuneTimer); tuneTimer = null; } tuneStep = 0; }
    };
})(typeof window !== 'undefined' ? window : globalThis);
