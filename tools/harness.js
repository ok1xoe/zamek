// Společná atrapa DOM pro testy v Node: načte hru přesně tak, jak ji načte prohlížeč.
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');

var handlers = {};
function mockCanvas() {
    return {
        width: 256, height: 192, style: {},
        getContext: function () {
            return { createImageData: function (w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; }, putImageData: function () {} };
        },
        addEventListener: function (n, f) { (handlers['canvas:' + n] = handlers['canvas:' + n] || []).push(f); }
    };
}
var canvas = mockCanvas();
global.window = globalThis;
global.document = {
    getElementById: function () { return canvas; },
    querySelectorAll: function () { return []; },
    addEventListener: function (n, f) { (handlers[n] = handlers[n] || []).push(f); },
    body: { style: {} }, hidden: false
};
global.localStorage = (function () { var s = {}; return { getItem: function (k) { return s[k] === undefined ? null : s[k]; }, setItem: function (k, v) { s[k] = String(v); } }; })();
globalThis.addEventListener = function () {};
globalThis.matchMedia = function () { return { matches: false }; };
globalThis.innerWidth = 1024; globalThis.innerHeight = 768;
globalThis.requestAnimationFrame = function () {};

['font', 'gfx', 'world', 'engine', 'sprites', 'render', 'sound', 'main'].forEach(function (f) {
    var file = path.join(__dirname, '..', 'js', f + '.js');
    vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
});

function crc32(buf) {
    var c, crc = 0xFFFFFFFF;
    for (var n = 0; n < buf.length; n++) {
        c = (crc ^ buf[n]) & 0xFF;
        for (var k = 0; k < 8; k++) { c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; }
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
    var len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    var td = Buffer.concat([Buffer.from(type), data]);
    var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}
// uloží framebuffer (256x192 s atributy) do PNG zvětšeného scale-krát
function savePng(scr, file, scale) {
    scale = scale || 3;
    var W = 256 * scale, H = 192 * scale, raw = Buffer.alloc((W * 3 + 1) * H);
    for (var y = 0; y < H; y++) {
        raw[y * (W * 3 + 1)] = 0;
        for (var x = 0; x < W; x++) {
            var sx = Math.floor(x / scale), sy = Math.floor(y / scale), ci = (sy >> 3) * 32 + (sx >> 3);
            var col = ZH.PAL[(scr.bits[sy * 256 + sx] ? scr.ink[ci] : scr.paper[ci]) + (scr.bright[ci] ? 8 : 0)];
            var o = y * (W * 3 + 1) + 1 + x * 3;
            raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2];
        }
    }
    var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
    fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

module.exports = { ZH: globalThis.ZH, handlers: handlers, savePng: savePng };
