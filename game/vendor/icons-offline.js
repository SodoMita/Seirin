/* ============================================================================
 * Offline icon shim (JS side) — the FAILSAFE half of icons-offline.css.
 * ----------------------------------------------------------------------------
 * The CSS maps every known fa-* class to a Unicode glyph. This script is the
 * safety net for everything else: it scans the DOM (including nodes added
 * later by the engine), and whenever it finds a fa-* icon class with NO glyph
 * mapping it
 *   1. marks the element with .failsafe-icon-missing (renders ◆, not a box)
 *   2. warns ONCE per icon name so the gap gets fixed instead of shipping
 *
 * It never throws and never rewrites game markup — it only adds a marker
 * class. Keep the name list below in sync with icons-offline.css.
 * ========================================================================== */
(function (global) {
    'use strict';

    /* Icons that have a glyph rule in icons-offline.css. */
    var KNOWN_ICONS = [
        'fa-arrow-left', 'fa-cog', 'fa-comments', 'fa-eye', 'fa-eye-slash',
        'fa-fast-forward', 'fa-lock', 'fa-play-circle', 'fa-save', 'fa-sort',
        'fa-stop-circle', 'fa-times', 'fa-times-circle', 'fa-undo',
        'fa-bolt', 'fa-book', 'fa-building', 'fa-check', 'fa-coins',
        'fa-database', 'fa-exclamation-triangle', 'fa-hand-holding-heart',
        'fa-handshake', 'fa-map-marker-alt', 'fa-microchip', 'fa-network-wired',
        'fa-question', 'fa-shield-alt', 'fa-terminal', 'fa-user-secret',
        'fa-volume-mute', 'fa-volume-up'
    ];

    /* fa-* classes that are NOT icon names (sizing/stacking/modifiers).
     * Kept permissive: anything not matched here is treated as an icon name
     * and, if unmapped, reported — a false ALARM is cheaper than a missed one. */
    var MODIFIER_RE = /^fa(-(\d+x|xs|sm|lg|fw|spin|pulse|border|inverse|li|ul|flip-[\w-]+|rotate-\d+|pull-[\w-]+|swap-opacity|primary(-color|-opacity)?|secondary(-color|-opacity)?|transform|symbol|mask(-id)?|i2svg|title-id|pseudo-element(-pending)?|w-\d+|stack(-\dx)?|layers([\w-]*)))?$/;
    function NOT_AN_ICON (className) { return MODIFIER_RE.test(className); }

    var known = {};
    KNOWN_ICONS.forEach(function (n) { known[n] = true; });
    var missing = {};

    function scanIcons (root) {
        var els;
        try {
            els = (root || document).querySelectorAll('.fas, .far, .fal, .fab, [class*=" fa-"], [class^="fa-"]');
        } catch (e) { return; }
        Array.prototype.forEach.call(els, function (el) {
            var classes = (el.className && typeof el.className === 'string') ? el.className.split(/\s+/) : [];
            var iconNames = classes.filter(function (c) {
                return c.indexOf('fa-') === 0 && !NOT_AN_ICON(c);
            });
            iconNames.forEach(function (name) {
                if (known[name]) { return; }
                if (!missing[name]) {
                    missing[name] = true;
                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn('[icons-offline] unmapped icon class "' + name + '" — add a glyph rule to icons-offline.css and KNOWN_ICONS in icons-offline.js. Rendering ◆.');
                    }
                }
                if (el.classList && !el.classList.contains('failsafe-icon-missing')) {
                    el.classList.add('failsafe-icon-missing');
                }
            });
        });
    }

    function start () {
        try { scanIcons(document); } catch (e) { /* never break the page */ }
        // The engine builds menus/settings lazily — re-scan as it adds nodes.
        if (typeof MutationObserver === 'function' && document.documentElement) {
            try {
                var pending = null;
                var observer = new MutationObserver(function () {
                    if (pending) { return; } // cheap debounce
                    pending = setTimeout(function () {
                        pending = null;
                        try { scanIcons(document); } catch (e) { /* ignore */ }
                    }, 250);
                });
                observer.observe(document.documentElement, { childList: true, subtree: true, attributes: false });
            } catch (e) { /* ignore */ }
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    }

    global.IconsOffline = {
        knownIcons: KNOWN_ICONS.slice(),
        isIconClass: function (c) { return c.indexOf('fa-') === 0 && !NOT_AN_ICON(c); },
        scan: scanIcons,
        missing: missing
    };
    if (typeof module !== 'undefined' && module.exports) { module.exports = global.IconsOffline; }
}(typeof self !== 'undefined' ? self : this));
