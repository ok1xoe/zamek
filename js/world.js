// Mapa hradu: 22 místností 7x7 dlaždic. Znaky:
//  . podlaha, 1-3 sloupec bloků, p tlačitelný blok, C drolící se blok, X ostnatý blok,
//  ^ ostny v podlaze, D padající blok ze stropu, K kotel.
// Řádek = souřadnice y (0 je zadní zeď vpravo), znak = x (0 je zadní zeď vlevo).
(function (root) {
    'use strict';

    var ZH = root.ZH = root.ZH || {};

    ZH.ITEM_TYPES = ['KNIHA', 'LÁHEV', 'LEBKA', 'SVÍCE', 'KALICH', 'PRSTEN', 'HOUBA', 'KŘIŠŤÁL'];

    // tmavé motivy: wall, block, floor (INK 0-15)
    ZH.THEMES = [
        { wall: 2, block: 6, floor: 1, border: 2 },
        { wall: 5, block: 13, floor: 1, border: 1 },
        { wall: 4, block: 12, floor: 1, border: 4 },
        { wall: 3, block: 11, floor: 1, border: 3 },
        { wall: 6, block: 14, floor: 2, border: 6 },
        { wall: 1, block: 9, floor: 5, border: 1 }
    ];

    var R = {};
    function room(id, name, theme, rows, items, enemies, extra) {
        R[id] = { id: id, name: name, theme: theme, rows: rows, items: items || [], enemies: enemies || [] };
        if (extra) { for (var k in extra) { R[id][k] = extra[k]; } }
    }
    function ball(x, y, vx, vy) { return { t: 'ball', x: x, y: y, vx: vx, vy: vy }; }
    function ghost(x, y) { return { t: 'ghost', x: x, y: y }; }
    function item(type, tx, ty) { return { type: type, tx: tx, ty: ty }; }

    room(1, 'Hradní brána', 0,
        ['..3....', '..2....', '..1.^..', '.......', '..p....', '.......', '.......'],
        [item(0, 2, 0)], [ball(5.5, 5.5, 2, 0)]);
    room(2, 'Zbrojnice', 1,
        ['.......', '.1...1.', '.......', '...X...', '.......', '.1...1.', '.......'],
        [item(1, 5, 1)], [ghost(6.5, 6.5)]);
    room(3, 'Hrobka', 3,
        ['3.....3', '.......', '.^^.^^.', '.......', '.^^.^^.', '.......', '.......'],
        [item(4, 3, 3)], [ball(1.5, 0.5, 0, 2)]);
    room(4, 'Nádvoří', 2,
        ['.......', '.22.22.', '.2...2.', '.......', '.2...2.', '.22.22.', '.......'],
        [item(5, 1, 1)], [ghost(3.5, 3.5)]);
    room(5, 'Alchymistova dílna', 4,
        ['.......', '..p....', '..2.X..', '.......', '.11.11.', '.......', '.......'],
        [item(2, 2, 2)], [ball(3.5, 3.5, 0, 2)]);
    room(6, 'Křižovatka', 5,
        ['..1.1..', '.......', '.1...1.', '...C...', '.1...1.', '.......', '..1.1..'],
        [], [ghost(1.5, 5.5)]);
    room(7, 'Trnová chodba', 0,
        ['.......', '..^.^..', '.......', '..^.^..', '.......', '..^.^..', '.......'],
        [], [ball(1.5, 1.5, 2, 2)]);
    room(8, 'Věžní schodiště', 1,
        ['3......', '2......', '1.^^...', '.......', '.......', '....p..', '.......'],
        [item(3, 0, 0)], [ghost(5.5, 1.5)]);
    room(9, 'Sklad beden', 2,
        ['......2', '.....p.', '.......', '..1.1..', '.......', '.......', '.......'],
        [item(6, 6, 0)], [ball(1.5, 4.5, 2, 0)]);
    room(10, 'Strážnice', 3,
        ['.......', '.22.22.', '.......', '..X....', '.......', '11...11', '.......'],
        [], [ghost(5.5, 5.5)]);
    room(11, 'Čarodějův kotel', 4,
        ['.1...1.', '.......', '..1.1..', '...K...', '..1.1..', '.......', '.1...1.'],
        [], [], { cauldron: true });
    room(12, 'Síň padajících bloků', 5,
        ['.......', '..D.D..', '.......', '..D.D..', '.......', '..D.D..', '.......'],
        [item(7, 3, 3)], []);
    room(13, 'Rozpadlá lávka', 0,
        ['.......', '.C...C.', '.C...C.', '.......', '.C...C.', '.C...C.', '.......'],
        [], [ball(3.5, 0.5, 0, 2)]);
    room(14, 'Zahrada duchů', 1,
        ['.......', '.X..X..', '.......', '..22...', '.......', '.X.....', '.......'],
        [], [ghost(4.5, 4.5), ghost(1.5, 1.5)]);
    room(15, 'Hřbitov', 2,
        ['..3.3..', '.......', '.^...^.', '..1.1..', '.^...^.', '.......', '..3.3..'],
        [], [ball(3.5, 2.5, 2, 0)]);
    room(16, 'Vstupní hala', 3,
        ['1.....1', '.......', '..1.1..', '.......', '..1.1..', '.......', '1.....1'],
        [], [], { start: { tx: 3, ty: 3 } });
    room(17, 'Kaple', 4,
        ['.......', '.1...1.', '..^.^..', '.......', '..^.^..', '.1...1.', '.......'],
        [], [ball(3.5, 3.5, 2, 2), ghost(6.5, 0.5)]);
    room(18, 'Zrcadlový sál', 5,
        ['.......', '.22.22.', '.2...2.', '...C...', '.2...2.', '.22.22.', '.......'],
        [], [ghost(3.5, 1.5)]);
    room(19, 'Sklep', 0,
        ['.......', '.X.....', '...X...', '.......', '.X.....', '.......', '.......'],
        [], [ball(5.5, 5.5, 0, 2)]);
    room(20, 'Ostnatý dvůr', 1,
        ['......1', '......1', '.^^.^^.', '.......', '.^^.^^.', '.......', '1......'],
        [], [ghost(5.5, 5.5)]);
    room(21, 'Komora', 2,
        ['.......', '..p....', '.......', '.1.....', '.......', '..1.1..', '.......'],
        [], [ball(4.5, 1.5, 2, 0)]);
    room(22, 'Sluneční věž', 3,
        ['.......', '..3.3..', '.......', '.......', '.......', '..3.3..', '.......'],
        [], [ghost(3.5, 3.5)]);

    ZH.ROOMS = R;
    ZH.START_ROOM = 16;

    // spoje: [A, B, strana u A]; strana u B je opačná. E = x roste, S = y roste
    var E = [[1, 2], [5, 6], [6, 7], [7, 8], [10, 11], [11, 12], [12, 13], [14, 15], [15, 16], [16, 17], [19, 20], [21, 22]];
    var S = [[1, 5], [2, 6], [3, 7], [4, 9], [5, 10], [6, 11], [7, 12], [8, 13], [9, 14], [10, 15], [11, 16], [12, 17], [13, 18], [15, 19], [16, 20], [17, 21], [18, 22]];
    var DOORS = {};
    for (var i = 1; i <= 22; i++) { DOORS[i] = {}; }
    E.forEach(function (l) { DOORS[l[0]].E = l[1]; DOORS[l[1]].W = l[0]; });
    S.forEach(function (l) { DOORS[l[0]].S = l[1]; DOORS[l[1]].N = l[0]; });
    ZH.DOORS = DOORS;
    ZH.OPP = { N: 'S', S: 'N', W: 'E', E: 'W' };
})(typeof window !== 'undefined' ? window : globalThis);
