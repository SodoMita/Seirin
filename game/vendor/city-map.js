/* ============================================================================
 * Seirin: Night Shift — Resonance 2030
 * CITY MAP — deterministic vector city generator + read-only soft simulation
 * ----------------------------------------------------------------------------
 * The atlas is deliberately generated from SVG primitives rather than loaded
 * artwork. It has a 2D planning view and a CSS/SVG axonometric view with
 * building extrusion faces. No raster map, WebGL, fetch, or dependency is
 * needed. The city model is canonical to the setting document; the small
 * social/economy layer only reads the current VN state and never writes it.
 * ========================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    if (!doc) { return; }

    var VERSION = 'VECTOR-CITY-01';
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var MAX = 100;
    var currentDistrict = 'tetsuba';
    var currentLayer = 'all';
    var currentView = '2d';
    var generated = false;
    var wired = false;
    var tooltip = null;
    var districtNodes = {};
    var playerMarker = null;

    /* ------------------------------------------------------------------ *
     * Canonical Seirin districts. Bounds drive a deterministic street/block
     * generator; the irregular district paths keep the result from reading as
     * a collection of UI rectangles.
     * ------------------------------------------------------------------ */
    var DISTRICTS = [
        {
            id: 'mountain', label: 'ГОРНЫЕ ПОСЕЛЕНИЯ', short: 'Тэнро', kind: 'mountain',
            subtitle: 'водосбор / лесные общины',
            shape: 'M 45 42 C 118 16 175 28 224 48 C 282 8 351 30 393 78 L 384 213 C 321 231 245 216 190 228 C 126 210 80 225 35 191 Z',
            bounds: [52, 54, 320, 142], cx: 205, cy: 126,
            accent: '#8fb99a',
            base: { population: 6800, jobs: 2700, commerce: 34, cohesion: 82, transit: 28, pressure: 22 },
            stakeholders: 'общины · святилище Тэнро · Aquaforge',
            note: 'Лесной край удерживает водосбор Сэйрина. Доступ ограничен, поэтому доверие важнее скорости.'
        },
        {
            id: 'tsukimachi', label: 'ЦУКИМАТИ', short: 'Лунные кварталы', kind: 'old',
            subtitle: 'старый город / рынки / архивы',
            shape: 'M 82 236 C 142 214 207 228 253 215 C 304 226 351 211 409 241 L 432 395 C 393 438 334 449 281 438 C 219 461 150 431 98 446 L 73 364 Z',
            bounds: [105, 252, 292, 161], cx: 250, cy: 335,
            accent: '#f2bf73',
            base: { population: 28600, jobs: 19800, commerce: 76, cohesion: 71, transit: 69, pressure: 37 },
            stakeholders: 'чайный дом Когарэ-но-Ину · архивы · рынки',
            note: 'Старые улицы остались пешеходными. Торговые ряды, общинные архивы и цифровые пожертвования share one fragile network.'
        },
        {
            id: 'civic', label: 'СЭЙРИН-СИТИ', short: 'Городской узел', kind: 'civic',
            subtitle: 'вокзал / администрация / жильё',
            shape: 'M 434 220 L 644 201 L 681 264 L 662 406 L 447 422 L 416 342 Z',
            bounds: [451, 238, 190, 151], cx: 545, cy: 313,
            accent: '#9db6dc',
            base: { population: 35200, jobs: 31200, commerce: 68, cohesion: 54, transit: 91, pressure: 44 },
            stakeholders: 'вокзал Сэйрин · civic science council · жильцы',
            note: 'Пересадочный узел между старым городом, фабриками и портом. Здесь задержка в одном контуре быстро становится городской проблемой.'
        },
        {
            id: 'hikari', label: 'ХИКАРИ-НО-МАТИ', short: 'Светлый квартал', kind: 'business',
            subtitle: 'деловой центр / развлечения',
            shape: 'M 673 73 C 752 53 839 70 913 54 C 974 64 1056 91 1084 148 L 1041 303 C 973 327 903 301 839 318 C 775 306 700 331 653 286 L 646 165 Z',
            bounds: [682, 93, 360, 190], cx: 850, cy: 183,
            accent: '#6bd7e8',
            base: { population: 22400, jobs: 61200, commerce: 94, cohesion: 43, transit: 96, pressure: 67 },
            stakeholders: 'Akatomi Dynamics · Stardome · Aegis Sec',
            note: 'Стекло, реклама и холодный свет. Высокая занятость соседствует с дорогим жильём и плотным корпоративным наблюдением.'
        },
        {
            id: 'midori', label: 'МИДОРИ-ХАЙТС', short: 'Жилой пояс', kind: 'residential',
            subtitle: 'ветхое жильё / дворы / школы',
            shape: 'M 79 471 C 147 446 209 462 270 449 C 329 458 390 442 442 481 L 431 606 C 359 638 294 615 237 628 C 168 614 112 637 67 590 Z',
            bounds: [92, 482, 326, 119], cx: 251, cy: 548,
            accent: '#a7c88a',
            base: { population: 46800, jobs: 13700, commerce: 51, cohesion: 64, transit: 55, pressure: 49 },
            stakeholders: 'кооперативы жильцов · школы · Iron Requiem',
            note: 'Плотный жилой пояс между холмами и путями. Ремонтные мастерские поддерживают район, но аренда растёт быстрее зарплат.'
        },
        {
            id: 'tetsuba', label: 'ТЭЦУБА', short: 'Промышленный пояс', kind: 'industrial',
            subtitle: 'верфи / мастерские / R&D',
            shape: 'M 675 367 C 746 341 828 359 891 346 C 956 356 1015 382 1040 435 L 1013 575 C 957 603 898 580 837 596 C 769 586 709 607 662 555 L 653 448 Z',
            bounds: [680, 386, 322, 184], cx: 831, cy: 480,
            accent: '#d29c70',
            base: { population: 19800, jobs: 52400, commerce: 62, cohesion: 58, transit: 73, pressure: 72 },
            stakeholders: 'верфи · частные мастерские · CSR / R&D',
            note: 'Место ночной смены Рэна. Здесь промышленная безопасность, подрядчики и частная телеметрия важнее фасадов.'
        },
        {
            id: 'port', label: 'ПОРТ', short: 'Приливный пояс', kind: 'port',
            subtitle: 'контейнеры / доки / логистика',
            shape: 'M 414 574 C 535 548 632 568 724 555 C 842 563 933 542 1072 570 L 1141 626 L 1118 739 L 398 739 L 382 657 Z',
            bounds: [445, 591, 641, 124], cx: 790, cy: 664,
            accent: '#6ca3bd',
            base: { population: 9300, jobs: 43800, commerce: 58, cohesion: 46, transit: 78, pressure: 64 },
            stakeholders: 'таможня · сухой док · старые склады · докеры',
            note: 'Контейнерные терминалы и ремонтные доки. Срыв грузового окна отражается на магазинах, школах и цене топлива по всему городу.'
        }
    ];

    var POINTS = [
        { id: 'tenro', district: 'mountain', x: 218, y: 92, label: 'Святилище Тэнро', code: 'MNT-02', type: 'community' },
        { id: 'water', district: 'mountain', x: 112, y: 157, label: 'Источник Камикуры', code: 'WTR-01', type: 'water' },
        { id: 'tea', district: 'tsukimachi', x: 171, y: 303, label: 'Когарэ-но-Ину', code: 'TSK-11', type: 'social' },
        { id: 'market', district: 'tsukimachi', x: 322, y: 365, label: 'Торговые ряды', code: 'TSK-07', type: 'commerce' },
        { id: 'archive', district: 'tsukimachi', x: 272, y: 397, label: 'Общинный архив', code: 'TSK-14', type: 'civic' },
        { id: 'station', district: 'civic', x: 542, y: 278, label: 'Станция Сэйрин', code: 'TRN-01', type: 'transit' },
        { id: 'council', district: 'civic', x: 602, y: 359, label: 'Civic Science Council', code: 'CIV-03', type: 'civic' },
        { id: 'akatomi', district: 'hikari', x: 873, y: 120, label: 'Akatomi Dynamics HQ', code: 'HIK-01', type: 'corporate' },
        { id: 'stardome', district: 'hikari', x: 975, y: 238, label: 'Stardome', code: 'HIK-09', type: 'culture' },
        { id: 'school', district: 'midori', x: 172, y: 525, label: 'Midori civic school', code: 'MID-05', type: 'community' },
        { id: 'workshop', district: 'tetsuba', x: 749, y: 445, label: 'Iron Requiem yards', code: 'TET-04', type: 'industrial' },
        { id: 'aquaforge', district: 'tetsuba', x: 909, y: 405, label: 'Aquaforge field lab', code: 'TET-12', type: 'science' },
        { id: 'drydock', district: 'port', x: 614, y: 644, label: 'Сухой док 3', code: 'PRT-03', type: 'industrial' },
        { id: 'customs', district: 'port', x: 974, y: 623, label: 'Таможенный терминал', code: 'PRT-01', type: 'transit' }
    ];

    var ARTERIALS = [
        'M 48 213 C 213 200 326 232 451 270 C 590 311 697 348 824 368 C 968 391 1080 436 1163 510',
        'M 69 431 C 213 417 347 409 480 420 C 626 431 726 469 857 493 C 967 513 1069 535 1144 573',
        'M 392 32 C 421 151 430 268 434 393 C 438 488 452 595 479 733',
        'M 643 61 C 627 185 631 292 648 405 C 665 511 688 604 715 731',
        'M 1054 86 C 1015 207 1004 310 1017 429 C 1028 530 1060 627 1090 725'
    ];

    var TRANSIT = [
        'M 83 365 C 229 333 357 321 541 278 C 690 244 776 191 873 120',
        'M 541 278 C 613 335 690 413 749 445 C 804 491 839 573 893 665',
        'M 171 525 C 319 485 423 414 541 278',
        'M 614 644 C 715 626 811 622 974 623'
    ];

    var MARKER_GLYPHS = {
        corporate: '▣', commerce: '◆', civic: '＋', transit: '▤', industrial: '⬡',
        community: '●', water: '≈', social: '✦', culture: '★', science: '⌬'
    };

    function clamp (n, lo, hi) {
        return n < lo ? lo : (n > hi ? hi : n);
    }

    function hash (text) {
        var h = 2166136261;
        var i;
        text = String(text);
        for (i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function rng (seed) {
        var value = seed >>> 0;
        return function () {
            value = (value + 0x6D2B79F5) >>> 0;
            var t = value;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function escapeHtml (value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function svg (name, attrs, parent) {
        var node = doc.createElementNS(SVG_NS, name);
        var key;
        attrs = attrs || {};
        for (key in attrs) {
            if (Object.prototype.hasOwnProperty.call(attrs, key)) { node.setAttribute(key, attrs[key]); }
        }
        if (parent) { parent.appendChild(node); }
        return node;
    }

    function text (value, attrs, parent) {
        var node = svg('text', attrs, parent);
        node.textContent = value;
        return node;
    }

    function getDistrict (id) {
        var i;
        for (i = 0; i < DISTRICTS.length; i++) {
            if (DISTRICTS[i].id === id) { return DISTRICTS[i]; }
        }
        return DISTRICTS[0];
    }

    function playerState () {
        var p = {};
        var e = global.engine;
        try {
            if (e && typeof e.storage === 'function') { p = e.storage('player') || {}; }
        } catch (err) { p = {}; }
        return p;
    }

    function itemTotal (items) {
        var total = 0;
        var key;
        items = items || {};
        for (key in items) {
            if (Object.prototype.hasOwnProperty.call(items, key) && typeof items[key] === 'number') { total += items[key]; }
        }
        return total;
    }

    /* Read-only, deliberately soft: these values are signals for the map, not
       a second game economy. They make story choices visible in the city
       without introducing another state machine or changing a save. */
    function metricsFor (district, player) {
        var affinity = (player.miya_affinity || 0) + (player.momo_affinity || 0) + (player.ai_empathy || 0);
        var route = String(player.route || 'none');
        var alert = Number(player.akatomi_alert || 0);
        var depth = Number(player.philosophical_depth || 0);
        var cash = Number(player.money || 0);
        var hour = Number(player.time || 1260) % 1440 / 60;
        var night = hour >= 20 || hour < 6;
        var routeLift = 0;
        if (route === 'miya' && district.id === 'tsukimachi') { routeLift += 7; }
        if (route === 'ai' && (district.id === 'tetsuba' || district.id === 'port')) { routeLift += 7; }
        if (route === 'momo' && district.id === 'hikari') { routeLift += 8; }
        if (route.indexOf('solo_') === 0 && district.id === 'tetsuba') { routeLift += 4; }
        return {
            population: district.base.population,
            jobs: district.base.jobs,
            commerce: clamp(Math.round(district.base.commerce + cash / 9000 + (night ? -3 : 2) - alert * 0.12 + routeLift), 0, MAX),
            cohesion: clamp(Math.round(district.base.cohesion + affinity * 0.55 + depth * 0.6 - alert * 0.45 + routeLift * 0.6), 0, MAX),
            transit: clamp(Math.round(district.base.transit + (night ? -2 : 1) - alert * 0.08), 0, MAX),
            pressure: clamp(Math.round(district.base.pressure + alert * 0.72 + (night ? 5 : 0) - depth * 0.22 - routeLift * 0.35), 0, MAX),
            footfall: clamp(Math.round(district.base.commerce * 0.72 + (night ? 9 : 0) + routeLift + itemTotal(player.items) * 0.3), 0, MAX)
        };
    }

    function compactNumber (value) {
        if (value >= 1000) { return (value / 1000).toFixed(value >= 10000 ? 0 : 1) + 'k'; }
        return String(Math.round(value));
    }

    function metricColor (value, kind) {
        var hue;
        if (kind === 'pressure') { hue = 12 - value * 0.12; }
        else if (kind === 'social') { hue = 150 - value * 0.38; }
        else { hue = 192 - value * 0.86; }
        return 'hsl(' + Math.round(hue) + ', 65%, ' + (28 + Math.round(value * 0.26)) + '%)';
    }

    function makeDefs (root) {
        var defs = svg('defs', {}, root);
        var water = svg('linearGradient', { id: 'city-water-gradient', x1: '0%', y1: '0%', x2: '0%', y2: '100%' }, defs);
        svg('stop', { offset: '0%', 'stop-color': '#153f59' }, water);
        svg('stop', { offset: '100%', 'stop-color': '#071a2a' }, water);
        var land = svg('linearGradient', { id: 'city-land-gradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, defs);
        svg('stop', { offset: '0%', 'stop-color': '#172538' }, land);
        svg('stop', { offset: '100%', 'stop-color': '#0c1728' }, land);
        var glow = svg('filter', { id: 'city-marker-glow', x: '-80%', y: '-80%', width: '260%', height: '260%' }, defs);
        svg('feGaussianBlur', { stdDeviation: '3', result: 'blur' }, glow);
        var merge = svg('feMerge', {}, glow);
        svg('feMergeNode', { in: 'blur' }, merge);
        svg('feMergeNode', { in: 'SourceGraphic' }, merge);
        var hatch = svg('pattern', { id: 'city-hatch', width: '12', height: '12', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(30)' }, defs);
        svg('line', { x1: '0', y1: '0', x2: '0', y2: '12', stroke: '#9bc4d7', 'stroke-width': '2', opacity: '.16' }, hatch);
    }

    function makeBase (root) {
        svg('rect', { x: 0, y: 0, width: 1200, height: 760, fill: 'url(#city-land-gradient)' }, root);
        svg('path', { d: 'M 0 0 H 1200 V 760 H 0 Z', fill: 'none', stroke: '#61d3e6', 'stroke-width': '2', opacity: '.16' }, root);
        var water = svg('g', { 'class': 'city-layer-water' }, root);
        svg('path', { d: 'M 0 627 C 100 600 176 626 260 614 C 366 599 448 625 541 613 C 652 599 721 623 815 608 C 930 590 1053 618 1200 599 L 1200 760 L 0 760 Z', fill: 'url(#city-water-gradient)', stroke: '#4cb8d1', 'stroke-width': '2', opacity: '.95' }, water);
        svg('path', { d: 'M 0 657 C 112 632 205 650 294 642 C 419 632 507 657 620 641 C 738 625 830 649 941 632 C 1051 617 1114 637 1200 624', fill: 'none', stroke: '#78d9e5', 'stroke-width': '2', 'stroke-dasharray': '18 22', opacity: '.28' }, water);
        var mountains = svg('g', { 'class': 'city-layer-terrain' }, root);
        svg('path', { d: 'M 0 0 H 460 L 421 35 L 372 20 L 333 55 L 280 28 L 223 64 L 174 35 L 118 72 L 66 44 L 0 78 Z', fill: '#263a46', opacity: '.74' }, mountains);
        svg('path', { d: 'M 18 189 C 100 121 151 137 211 104 C 276 70 329 114 396 80 L 403 229 C 284 202 171 240 18 218 Z', fill: 'url(#city-hatch)', opacity: '.64' }, mountains);
        var green = svg('g', { 'class': 'city-layer-parks' }, root);
        svg('path', { d: 'M 48 458 C 122 431 186 435 230 452 C 191 478 122 505 62 502 Z', fill: '#284a45', stroke: '#78c49b', 'stroke-width': '1', opacity: '.8' }, green);
        svg('path', { d: 'M 352 126 C 399 101 435 111 466 139 C 432 175 397 189 359 178 Z', fill: '#284a45', stroke: '#78c49b', 'stroke-width': '1', opacity: '.76' }, green);
        svg('path', { d: 'M 465 468 C 515 437 583 442 617 473 C 574 510 514 511 475 502 Z', fill: '#284a45', stroke: '#78c49b', 'stroke-width': '1', opacity: '.76' }, green);
    }

    function makeDistricts (root) {
        var group = svg('g', { 'class': 'city-layer-districts' }, root);
        var i, d, node;
        districtNodes = {};
        for (i = 0; i < DISTRICTS.length; i++) {
            d = DISTRICTS[i];
            node = svg('path', {
                d: d.shape, 'class': 'city-district', 'data-district': d.id,
                fill: d.accent, 'fill-opacity': '.14', stroke: d.accent,
                'stroke-width': '2', 'stroke-opacity': '.6'
            }, group);
            districtNodes[d.id] = node;
            node.setAttribute('tabindex', '0');
            node.setAttribute('role', 'button');
            node.setAttribute('aria-label', d.label + ' — ' + d.subtitle);
        }
    }

    function makeRoads (root) {
        var roads = svg('g', { 'class': 'city-layer-roads' }, root);
        var local = svg('g', { 'class': 'city-layer-local-roads' }, roads);
        var i, d, x, y, b;
        for (i = 0; i < ARTERIALS.length; i++) {
            svg('path', { d: ARTERIALS[i], 'class': 'city-road city-road-shadow' }, roads);
            svg('path', { d: ARTERIALS[i], 'class': 'city-road city-road-arterial' }, roads);
            svg('path', { d: ARTERIALS[i], 'class': 'city-road city-road-lane' }, roads);
        }
        for (i = 0; i < DISTRICTS.length; i++) {
            d = DISTRICTS[i];
            if (d.kind === 'mountain') { continue; }
            b = d.bounds;
            for (x = b[0] + 24; x < b[0] + b[2] - 12; x += d.kind === 'industrial' ? 42 : 34) {
                svg('path', { d: 'M ' + x + ' ' + (b[1] + 8) + ' L ' + (x + 8) + ' ' + (b[1] + b[3] - 8), 'class': 'city-road city-road-local' }, local);
            }
            for (y = b[1] + 25; y < b[1] + b[3] - 10; y += d.kind === 'port' ? 34 : 30) {
                svg('path', { d: 'M ' + (b[0] + 8) + ' ' + y + ' L ' + (b[0] + b[2] - 8) + ' ' + (y + 4), 'class': 'city-road city-road-local' }, local);
            }
        }
    }

    function addBuilding (parent, district, x, y, w, h, level, index, rand) {
        var group = svg('g', { 'class': 'city-building', 'data-district': district.id, 'data-height': level, tabindex: '0', role: 'button' }, parent);
        var side = Math.round(4 + level * 0.38);
        var color = district.kind === 'industrial' || district.kind === 'port' ? '#3a4b5a' : '#33445a';
        if (district.kind === 'old') { color = '#4d4a55'; }
        if (district.kind === 'business') { color = '#2d5667'; }
        if (district.kind === 'mountain') { color = '#3d5b55'; }
        svg('polygon', { points: x + ',' + (y + h) + ' ' + (x + w) + ',' + (y + h) + ' ' + (x + w + side) + ',' + (y + h - side) + ' ' + (x + side) + ',' + (y + h - side), 'class': 'city-building-side city-building-side-front', fill: '#172635' }, group);
        svg('polygon', { points: x + ',' + y + ' ' + (x + w) + ',' + y + ' ' + (x + w + side) + ',' + (y - side) + ' ' + (x + side) + ',' + (y - side), 'class': 'city-building-side city-building-side-back', fill: '#526b79' }, group);
        svg('rect', { x: x, y: y, width: w, height: h, rx: district.kind === 'old' ? 2 : 1, fill: color, 'class': 'city-building-top' }, group);
        if (rand() > .35) {
            svg('line', { x1: x + 3, y1: y + h * .42, x2: x + w - 3, y2: y + h * .42, 'class': 'city-building-detail' }, group);
        }
        if (rand() > .62) {
            svg('rect', { x: x + w * .24, y: y + h * .18, width: Math.max(2, w * .18), height: Math.max(2, h * .2), 'class': 'city-building-solar' }, group);
        }
        group.setAttribute('aria-label', district.label + ' building ' + (index + 1));
    }

    function makeBuildings (root) {
        var group = svg('g', { 'class': 'city-layer-buildings' }, root);
        var i, row, col, d, b, rand, cols, rows, x, y, w, h, level, index;
        for (i = 0; i < DISTRICTS.length; i++) {
            d = DISTRICTS[i];
            if (d.kind === 'mountain') { continue; }
            b = d.bounds;
            rand = rng(hash('SEIRIN-2032|' + d.id));
            cols = d.kind === 'port' ? 12 : (d.kind === 'industrial' ? 8 : 9);
            rows = d.kind === 'port' ? 2 : (d.kind === 'residential' ? 3 : 4);
            index = 0;
            for (row = 0; row < rows; row++) {
                for (col = 0; col < cols; col++) {
                    if (rand() < (d.kind === 'old' ? .12 : .07)) { continue; }
                    x = b[0] + 13 + col * ((b[2] - 26) / cols) + rand() * 5;
                    y = b[1] + 10 + row * ((b[3] - 22) / rows) + rand() * 4;
                    w = Math.max(9, (b[2] - 36) / cols - 7 + rand() * 8);
                    h = Math.max(7, (b[3] - 28) / rows - 8 + rand() * 7);
                    level = 4 + Math.floor(rand() * (d.kind === 'business' ? 35 : (d.kind === 'industrial' ? 23 : 16)));
                    addBuilding(group, d, x, y, w, h, level, index, rand);
                    index++;
                }
            }
        }
    }

    function makeTransit (root) {
        var group = svg('g', { 'class': 'city-layer-transit' }, root);
        var i, line;
        for (i = 0; i < TRANSIT.length; i++) {
            line = TRANSIT[i];
            svg('path', { d: line, 'class': 'city-transit city-transit-shadow' }, group);
            svg('path', { d: line, 'class': 'city-transit city-transit-line' }, group);
        }
        for (i = 0; i < POINTS.length; i++) {
            if (POINTS[i].type === 'transit') {
                svg('circle', { cx: POINTS[i].x, cy: POINTS[i].y, r: 7, 'class': 'city-transit-station', 'data-district': POINTS[i].district }, group);
            }
        }
    }

    function makeLabels (root) {
        var group = svg('g', { 'class': 'city-layer-labels' }, root);
        var i, d, p;
        for (i = 0; i < DISTRICTS.length; i++) {
            d = DISTRICTS[i];
            text(d.label, { x: d.cx, y: d.cy - 8, 'class': 'city-district-label', 'text-anchor': 'middle' }, group);
            text(d.subtitle.toUpperCase(), { x: d.cx, y: d.cy + 12, 'class': 'city-district-subtitle', 'text-anchor': 'middle' }, group);
        }
        for (i = 0; i < POINTS.length; i++) {
            p = POINTS[i];
            text(p.code, { x: p.x + 10, y: p.y - 9, 'class': 'city-point-code', 'data-district': p.district }, group);
        }
    }

    function makePoints (root) {
        var group = svg('g', { 'class': 'city-layer-points' }, root);
        var i, p, marker;
        for (i = 0; i < POINTS.length; i++) {
            p = POINTS[i];
            marker = svg('g', { 'class': 'city-point', 'data-district': p.district, 'data-point': p.id, tabindex: '0', role: 'button', 'aria-label': p.label }, group);
            svg('circle', { cx: p.x, cy: p.y, r: 10, 'class': 'city-point-ring', 'data-type': p.type }, marker);
            text(MARKER_GLYPHS[p.type] || '•', { x: p.x, y: p.y + 4, 'class': 'city-point-glyph', 'text-anchor': 'middle' }, marker);
        }
    }

    function makeFrame (root) {
        var frame = svg('g', { 'class': 'city-layer-frame' }, root);
        var i;
        for (i = 0; i < 13; i++) {
            svg('line', { x1: 26 + i * 96, y1: 18, x2: 26 + i * 96, y2: 27, 'class': 'city-frame-tick' }, frame);
        }
        for (i = 0; i < 8; i++) {
            svg('line', { x1: 18, y1: 47 + i * 94, x2: 27, y2: 47 + i * 94, 'class': 'city-frame-tick' }, frame);
        }
        text('N', { x: 31, y: 42, 'class': 'city-compass' }, frame);
        svg('path', { d: 'M 35 46 L 30 58 L 35 55 L 40 58 Z', 'class': 'city-compass-arrow' }, frame);
        text('SEIRIN / URBAN VECTOR FIELD', { x: 1180, y: 744, 'class': 'city-frame-caption', 'text-anchor': 'end' }, frame);
    }

    function ensureGenerated () {
        var root = doc.getElementById('city-map-svg');
        if (!root || generated) { return; }
        root.setAttribute('viewBox', '0 0 1200 760');
        root.setAttribute('role', 'img');
        root.setAttribute('aria-labelledby', 'city-map-svg-title city-map-svg-desc');
        root.innerHTML = '';
        var titleNode = svg('title', { id: 'city-map-svg-title' }, root);
        titleNode.textContent = 'Сэйрин — процедурная векторная карта города';
        var descNode = svg('desc', { id: 'city-map-svg-desc' }, root);
        descNode.textContent = 'Сгенерированная сеть районов, кварталов, дорог, транспорта и городских узлов без растровых изображений.';
        makeDefs(root);
        makeBase(root);
        makeDistricts(root);
        makeRoads(root);
        makeBuildings(root);
        makeTransit(root);
        makeLabels(root);
        makePoints(root);
        makeFrame(root);
        generated = true;
    }

    function locationDistrict (player) {
        var location = String((player && player.location) || '').toLowerCase();
        if (location.indexOf('тэц') !== -1 || location.indexOf('workshop') !== -1) { return 'tetsuba'; }
        if (location.indexOf('порт') !== -1 || location.indexOf('port') !== -1 || location.indexOf('док') !== -1) { return 'port'; }
        if (location.indexOf('цуки') !== -1 || location.indexOf('tsuki') !== -1) { return 'tsukimachi'; }
        if (location.indexOf('лаборат') !== -1 || location.indexOf('aquaforge') !== -1) { return 'tetsuba'; }
        if (location.indexOf('додзё') !== -1 || location.indexOf('dojo') !== -1) { return 'civic'; }
        if (location.indexOf('хикари') !== -1 || location.indexOf('stardome') !== -1) { return 'hikari'; }
        return 'tetsuba';
    }

    function updateDistrictPaint (player) {
        var i, d, m, fill;
        for (i = 0; i < DISTRICTS.length; i++) {
            d = DISTRICTS[i];
            m = metricsFor(d, player);
            fill = d.accent;
            if (currentLayer === 'economy') { fill = metricColor(m.commerce, 'economy'); }
            if (currentLayer === 'social') { fill = metricColor(m.cohesion, 'social'); }
            if (currentLayer === 'pressure') { fill = metricColor(m.pressure, 'pressure'); }
            if (districtNodes[d.id]) {
                districtNodes[d.id].setAttribute('fill', fill);
                districtNodes[d.id].setAttribute('fill-opacity', currentLayer === 'all' ? '.14' : '.34');
                districtNodes[d.id].setAttribute('stroke-opacity', currentDistrict === d.id ? '.98' : '.6');
                districtNodes[d.id].setAttribute('stroke-width', currentDistrict === d.id ? '4' : '2');
            }
        }
    }

    function setText (id, value) {
        var node = doc.getElementById(id);
        if (node) { node.textContent = value; }
    }

    function renderInspector (player) {
        var d = getDistrict(currentDistrict);
        var m = metricsFor(d, player);
        var inspector = doc.getElementById('city-map-inspector');
        var points = [];
        var i;
        if (!inspector) { return; }
        for (i = 0; i < POINTS.length; i++) {
            if (POINTS[i].district === d.id) { points.push(POINTS[i]); }
        }
        inspector.innerHTML =
            '<div class="city-inspector-kicker">SELECTED DISTRICT · ' + escapeHtml(d.id.toUpperCase()) + '</div>' +
            '<h3 id="city-map-selected">' + escapeHtml(d.label) + '</h3>' +
            '<p class="city-inspector-sub">' + escapeHtml(d.short + ' · ' + d.subtitle) + '</p>' +
            '<p class="city-inspector-note">' + escapeHtml(d.note) + '</p>' +
            '<div class="city-metric-grid">' +
                '<div><span>ЖИТЕЛИ</span><b>' + compactNumber(m.population) + '</b></div>' +
                '<div><span>РАБОЧИЕ МЕСТА</span><b>' + compactNumber(m.jobs) + '</b></div>' +
                '<div><span>ТОРГОВЛЯ</span><b>' + m.commerce + '%</b></div>' +
                '<div><span>СВЯЗНОСТЬ</span><b>' + m.cohesion + '%</b></div>' +
                '<div><span>ТРАНЗИТ</span><b>' + m.transit + '%</b></div>' +
                '<div><span>ДАВЛЕНИЕ</span><b>' + m.pressure + '%</b></div>' +
            '</div>' +
            '<div class="city-inspector-bar"><span>SOFT SIGNAL / COHESION</span><i><em style="width:' + m.cohesion + '%"></em></i></div>' +
            '<div class="city-inspector-bar"><span>SOFT SIGNAL / ECONOMY</span><i><em class="economy" style="width:' + m.commerce + '%"></em></i></div>' +
            '<div class="city-inspector-bar"><span>SOFT SIGNAL / PRESSURE</span><i><em class="pressure" style="width:' + m.pressure + '%"></em></i></div>' +
            '<div class="city-stakeholders"><span>УЗЛЫ И СТЕЙКХОЛДЕРЫ</span><p>' + escapeHtml(d.stakeholders) + '</p>' +
                '<ul>' + points.map(function (point) { return '<li><b>' + escapeHtml(MARKER_GLYPHS[point.type] || '•') + '</b>' + escapeHtml(point.label) + '</li>'; }).join('') + '</ul></div>' +
            '<div class="city-inspector-foot">Модель наблюдения: не меняет сохранение и не предсказывает сюжет.</div>';
        var districtTitle = doc.getElementById('city-map-selected');
        if (districtTitle) { districtTitle.textContent = d.label; }
    }

    function renderSummary (player) {
        var population = 0;
        var jobs = 0;
        var cohesion = 0;
        var pressure = 0;
        var commerce = 0;
        var i, d, m;
        for (i = 0; i < DISTRICTS.length; i++) {
            d = DISTRICTS[i];
            m = metricsFor(d, player);
            population += m.population;
            jobs += m.jobs;
            cohesion += m.cohesion;
            pressure += m.pressure;
            commerce += m.commerce;
        }
        setText('city-total-population', compactNumber(population));
        setText('city-total-jobs', compactNumber(jobs));
        setText('city-total-cohesion', Math.round(cohesion / DISTRICTS.length) + '%');
        setText('city-total-pressure', Math.round(pressure / DISTRICTS.length) + '%');
        setText('city-total-commerce', Math.round(commerce / DISTRICTS.length) + '%');
        setText('city-map-clock', String(player.time === undefined ? '21:00' : formatTime(player.time)));
        setText('city-map-location', String(player.location || 'Тэцуба: Улица'));
        setText('city-map-seed', VERSION + ' / SEED 2032-07');
    }

    function formatTime (minutes) {
        var value = Number(minutes || 0) % 1440;
        if (value < 0) { value += 1440; }
        var h = Math.floor(value / 60);
        var m = value % 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function updatePlayerMarker (player) {
        var root = doc.getElementById('city-map-svg');
        var d = getDistrict(locationDistrict(player));
        if (!root) { return; }
        if (!playerMarker) {
            playerMarker = svg('g', { 'class': 'city-player-marker', 'data-district': d.id }, root);
            svg('circle', { cx: 0, cy: 0, r: 18, 'class': 'city-player-pulse' }, playerMarker);
            svg('circle', { cx: 0, cy: 0, r: 7, 'class': 'city-player-core' }, playerMarker);
            text('YOU', { x: 13, y: -12, 'class': 'city-player-label' }, playerMarker);
        }
        playerMarker.setAttribute('transform', 'translate(' + d.cx + ' ' + d.cy + ')');
        playerMarker.setAttribute('data-district', d.id);
    }

    function render () {
        var stage = doc.querySelector('.city-map-stage');
        var player = playerState();
        ensureGenerated();
        if (!stage || !generated) { return; }
        currentDistrict = currentDistrict || locationDistrict(player);
        stage.setAttribute('data-view', currentView);
        stage.setAttribute('data-layer', currentLayer);
        stage.className = 'city-map-stage view-' + currentView + ' layer-' + currentLayer;
        updateDistrictPaint(player);
        updatePlayerMarker(player);
        renderInspector(player);
        renderSummary(player);
        var viewButtons = doc.querySelectorAll('[data-city-view]');
        var layerButtons = doc.querySelectorAll('[data-map-layer]');
        var i;
        for (i = 0; i < viewButtons.length; i++) {
            viewButtons[i].classList.toggle('is-active', viewButtons[i].getAttribute('data-city-view') === currentView);
            viewButtons[i].setAttribute('aria-pressed', viewButtons[i].getAttribute('data-city-view') === currentView ? 'true' : 'false');
        }
        for (i = 0; i < layerButtons.length; i++) {
            layerButtons[i].classList.toggle('is-active', layerButtons[i].getAttribute('data-map-layer') === currentLayer);
            layerButtons[i].setAttribute('aria-pressed', layerButtons[i].getAttribute('data-map-layer') === currentLayer ? 'true' : 'false');
        }
    }

    function closestAttribute (node, attribute) {
        var current = node;
        while (current && current !== doc) {
            if (current.getAttribute && current.getAttribute(attribute)) { return current; }
            current = current.parentNode;
        }
        return null;
    }

    function showTooltip (event, node) {
        var id = node.getAttribute('data-point');
        var point = null;
        var i;
        for (i = 0; i < POINTS.length; i++) { if (POINTS[i].id === id) { point = POINTS[i]; break; } }
        if (!point || !tooltip) { return; }
        tooltip.textContent = point.label + ' · ' + point.code;
        tooltip.className = 'city-map-tooltip is-visible';
        var stage = doc.querySelector('.city-map-stage');
        var box = stage && stage.getBoundingClientRect ? stage.getBoundingClientRect() : null;
        if (box) {
            tooltip.style.left = clamp(event.clientX - box.left + 12, 8, box.width - 190) + 'px';
            tooltip.style.top = clamp(event.clientY - box.top + 12, 8, box.height - 42) + 'px';
        }
    }

    function hideTooltip () {
        if (tooltip) { tooltip.className = 'city-map-tooltip'; }
    }

    function wireMap () {
        if (wired) { return; }
        var overlay = doc.getElementById('city-map-overlay');
        var trigger = doc.getElementById('btn-city-map');
        var svgRoot = doc.getElementById('city-map-svg');
        if (!overlay || !svgRoot) { return; }
        wired = true;
        tooltip = doc.getElementById('city-map-tooltip');
        if (trigger) { trigger.addEventListener('click', open, false); }
        overlay.addEventListener('click', function (event) {
            var close = closestAttribute(event.target, 'data-city-close');
            var view = closestAttribute(event.target, 'data-city-view');
            var layer = closestAttribute(event.target, 'data-map-layer');
            var district = closestAttribute(event.target, 'data-district');
            if (close) { closeMap(); return; }
            if (view) { currentView = view.getAttribute('data-city-view') || '2d'; render(); return; }
            if (layer) { currentLayer = layer.getAttribute('data-map-layer') || 'all'; render(); return; }
            if (district && district.getAttribute('data-district')) {
                currentDistrict = district.getAttribute('data-district');
                render();
            }
            if (event.target === overlay) { closeMap(); }
        }, false);
        overlay.addEventListener('mousemove', function (event) {
            var point = closestAttribute(event.target, 'data-point');
            if (point) { showTooltip(event, point); } else { hideTooltip(); }
        }, false);
        overlay.addEventListener('mouseleave', hideTooltip, false);
        doc.addEventListener('keydown', function (event) {
            var escape = event.key === 'Escape' || event.keyCode === 27;
            if (escape && !overlay.hidden) { closeMap(); }
        }, false);
    }

    function open () {
        var overlay = doc.getElementById('city-map-overlay');
        if (!overlay) { return; }
        ensureGenerated();
        overlay.hidden = false;
        currentDistrict = locationDistrict(playerState());
        render();
        if (global.MechaUI && typeof global.MechaUI.syncModalFlag === 'function') { global.MechaUI.syncModalFlag(); }
    }

    function closeMap () {
        var overlay = doc.getElementById('city-map-overlay');
        if (overlay) { overlay.hidden = true; }
        hideTooltip();
        if (global.MechaUI && typeof global.MechaUI.syncModalFlag === 'function') { global.MechaUI.syncModalFlag(); }
    }

    function installMenuEntry () {
        var engine = global.engine || (global.Monogatari && global.Monogatari.default);
        var config;
        var i;
        if (!engine || typeof engine.configuration !== 'function') { return false; }
        try {
            config = engine.configuration('main-menu');
            if (config && config.buttons) {
                var present = false;
                for (i = 0; i < config.buttons.length; i++) {
                    if (config.buttons[i].data && config.buttons[i].data.action === 'open-city-map') { present = true; break; }
                }
                if (!present) { config.buttons.push({ string: 'CityMap', data: { action: 'open-city-map' } }); }
            }
            if (!engine.__seirinCityMapListener && typeof engine.registerListener === 'function') {
                engine.registerListener('open-city-map', { callback: open });
                engine.__seirinCityMapListener = true;
            }
            return true;
        } catch (error) { return false; }
    }

    function start () {
        wireMap();
        installMenuEntry();
        if (!wired) { global.setTimeout(start, 80); }
    }

    var CityMap = {
        version: VERSION,
        districts: DISTRICTS,
        points: POINTS,
        open: open,
        close: closeMap,
        render: render,
        metricsFor: metricsFor,
        start: start
    };
    global.SeirinCityMap = CityMap;
    start();
}(typeof self !== 'undefined' ? self : this));
