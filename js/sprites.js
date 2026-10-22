// Sprity jako pole řetězců ('X' = bod). Vše vlastní kresba.
(function (root) {
    'use strict';

    var ZH = root.ZH = root.ZH || {};

    var HERO_F = [[
        '....XXXX....',
        '...XXXXXX.X.',
        '.XXXXXXXXXX.',
        '...X.XX.X...',
        '...XXXXXX...',
        '....XXXX....',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        '.XX.XXXX.XX.',
        '.XX.XXXX.XX.',
        '....XXXX....',
        '....XXXX....',
        '....X..X....',
        '....X..X....',
        '...XX..XX...',
        '...XX..XX...'
    ], [
        '....XXXX....',
        '...XXXXXX.X.',
        '.XXXXXXXXXX.',
        '...X.XX.X...',
        '...XXXXXX...',
        '....XXXX....',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        '.XX.XXXX.XX.',
        '.XX.XXXX.XX.',
        '....XXXX....',
        '....XXXX....',
        '....XX.X....',
        '...XX..X....',
        '...XX..XX...',
        '..XX....X...'
    ]];
    var HERO_B = [[
        '....XXXX....',
        '...XXXXXX.X.',
        '.XXXXXXXXXX.',
        '...XXXXXX...',
        '...XXXXXX...',
        '....XXXX....',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        '.XXXXXXXXXX.',
        '.XX.XXXX.XX.',
        '....XXXX....',
        '....XXXX....',
        '....X..X....',
        '....X..X....',
        '...XX..XX...',
        '...XX..XX...'
    ], [
        '....XXXX....',
        '...XXXXXX.X.',
        '.XXXXXXXXXX.',
        '...XXXXXX...',
        '...XXXXXX...',
        '....XXXX....',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        '.XXXXXXXXXX.',
        '.XX.XXXX.XX.',
        '....XXXX....',
        '....XXXX....',
        '....XX.X....',
        '...XX..X....',
        '...XX..XX...',
        '..XX....X...'
    ]];

    var WOLF_F = [[
        'X..........X',
        'XX........XX',
        'XXXXXXXXXXXX',
        'XX.XXXXXX.XX',
        'XXXXXXXXXXXX',
        '.XXXX..XXXX.',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        'XXXXXXXXXXXX',
        'XX.XXXXXX.XX',
        'XX.XX..XX.XX',
        'XX.X....X.XX'
    ], [
        'X..........X',
        'XX........XX',
        'XXXXXXXXXXXX',
        'XX.XXXXXX.XX',
        'XXXXXXXXXXXX',
        '.XXXX..XXXX.',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        'XXXXXXXXXXXX',
        '.X.XXXXXX.X.',
        'XX.XX..XX.XX',
        'X..XX..XX..X'
    ]];
    var WOLF_B = [[
        'X..........X',
        'XX........XX',
        'XXXXXXXXXXXX',
        'XXXXXXXXXXXX',
        'XXXXXXXXXXXX',
        '.XXXXXXXXXX.',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        'XXXXXXXXXXXX',
        'XX.XXXXXX.XX',
        'XX.XX..XX.XX',
        'XX.X....X.XX'
    ], [
        'X..........X',
        'XX........XX',
        'XXXXXXXXXXXX',
        'XXXXXXXXXXXX',
        'XXXXXXXXXXXX',
        '.XXXXXXXXXX.',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        'XXXXXXXXXXXX',
        '.X.XXXXXX.X.',
        'XX.XX..XX.XX',
        'X..XX..XX..X'
    ]];

    var GHOST = [[
        '....XXXX....',
        '...XXXXXX...',
        '..XXXXXXXX..',
        '..XX.XX.XX..',
        '..XX.XX.XX..',
        '..XXXXXXXX..',
        '..XXX..XXX..',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        '.XXXXXXXXXX.',
        '.XXXXXXXXXX.',
        '.XX.XXXX.XX.',
        '.X..XXXX..X.',
        '....X..X....'
    ], [
        '....XXXX....',
        '...XXXXXX...',
        '..XXXXXXXX..',
        '..XX.XX.XX..',
        '..XX.XX.XX..',
        '..XXXXXXXX..',
        '..XXX..XXX..',
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        '.XXXXXXXXXX.',
        '.XXXXXXXXXX.',
        '.XXXX..XXXX.',
        '.XX..XX..XX.',
        '.X...XX....X'
    ]];

    var BALL = [[
        '......XX......',
        '..X...XX...X..',
        '...X.XXXX.X...',
        '....XXXXXX....',
        '.X.XXXXXXXX.X.',
        '..XXXX..XXXX..',
        'XXXXXX..XXXXXX',
        'XXXXXX..XXXXXX',
        '..XXXXXXXXXX..',
        '.X.XXXXXXXX.X.',
        '....XXXXXX....',
        '...X.XXXX.X...',
        '..X...XX...X..',
        '......XX......'
    ], [
        '.X....XX....X.',
        '..X...XX...X..',
        '...X.XXXX.X...',
        'X...XXXXXX...X',
        '.XXXXXXXXXXXX.',
        '..XXXXXXXXXX..',
        'XXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXX',
        '..XXXXXXXXXX..',
        '.XXXXXXXXXXXX.',
        'X...XXXXXX...X',
        '...X.XXXX.X...',
        '..X...XX...X..',
        '.X....XX....X.'
    ]];

    // 8 předmětů: kniha, láhev, lebka, svíce, kalich, prsten, houba, krystal
    var ITEMS = [[
        '.XXXXXX.',
        'XXXXXXXX',
        'XX.X.X.X',
        'XXXXXXXX',
        'XX.X.X.X',
        'XXXXXXXX',
        '.XXXXXX.',
        '........'
    ], [
        '...XX...',
        '...XX...',
        '..XXXX..',
        '.XXXXXX.',
        '.XXXXXX.',
        '.XXXXXX.',
        '.XXXXXX.',
        '..XXXX..'
    ], [
        '..XXXX..',
        '.XXXXXX.',
        'XXXXXXXX',
        'XX.XX.XX',
        'XXXXXXXX',
        '.XXXXXX.',
        '..X..X..',
        '..XXXX..'
    ], [
        '...X....',
        '...XX...',
        '...X....',
        '..XXX...',
        '..XXX...',
        '..XXX...',
        '..XXX...',
        '.XXXXX..'
    ], [
        'XXXXXXXX',
        'X.XXXX.X',
        'X.XXXX.X',
        '.XXXXXX.',
        '..XXXX..',
        '...XX...',
        '...XX...',
        '.XXXXXX.'
    ], [
        '..XXXX..',
        '.X....X.',
        'X......X',
        'X......X',
        '.X....X.',
        '..XXXX..',
        '...XX...',
        '........'
    ], [
        '..XXXX..',
        '.XXXXXX.',
        'XXXXXXXX',
        'XX.XX.XX',
        'XXXXXXXX',
        '...XX...',
        '...XX...',
        '..XXXX..'
    ], [
        '...XX...',
        '..XXXX..',
        '.XXXXXX.',
        'XXXXXXXX',
        '.XXXXXX.',
        '..XXXX..',
        '...XX...',
        '........'
    ]];

    var SPIKES = [
        '..X.....X.....X.',
        '..X....XXX....X.',
        '.XXX...XXX...XXX',
        '.XXX..XXXXX..XXX',
        'XXXXX.XXXXX.XXXX',
        'XXXXXXXXXXXXXXXX'
    ];

    var CAULDRON = [
        '......X..X..X...........',
        '.....X..X..X............',
        '......XX..XX.....X......',
        '...XXXXXXXXXXXXXXXXXX...',
        '..X..................X..',
        '.XXXXXXXXXXXXXXXXXXXXXX.',
        'XXXXXXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXX',
        '.XXXXXXXXXXXXXXXXXXXXXX.',
        '..XXXXXXXXXXXXXXXXXXXX..',
        '...XXXXXXXXXXXXXXXXXX...',
        '....XXXXXXXXXXXXXXXX....',
        '...X..X........X..X.....',
        '..XX..XX......XX..XX....'
    ];

    var SUN = ['..X.X.X.', '...XXX..', 'X.XXXXX.X'.slice(0, 8), '.XXXXXXX', 'X.XXXXX.', '...XXX..', '..X.X.X.', '........'];
    var MOON = ['..XXX...', '.XX.....', 'XX......', 'XX......', 'XX......', '.XX...X.', '..XXXX..', '........'];

    var SHADOW = [
        '..XXXXXXXX..',
        '.XXXXXXXXXX.',
        '..XXXXXXXX..'
    ];

    ZH.SPR = {
        heroF: HERO_F, heroB: HERO_B, wolfF: WOLF_F, wolfB: WOLF_B, ghost: GHOST, ball: BALL,
        items: ITEMS, spikes: SPIKES, cauldron: CAULDRON, sun: SUN, moon: MOON, shadow: SHADOW
    };
})(typeof window !== 'undefined' ? window : globalThis);
