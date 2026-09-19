/* Seirin UI localization (ES5, no dependencies or network).
 * setLanguage(code): live, persisted UI preference; never changes story/save state.
 * t(source, params): Russian source key -> selected locale -> English -> source.
 * installEngine(engine): translates the existing chrome table, not engine scripts.
 * refresh(): projects only approved UI regions; never walks story text or choices.
 */
(function (global) {
    'use strict';
    var doc = global.document;
    var catalog = global.SeirinUICatalog;
    var languages = { ru: 'Русский', en: 'English', zh: '简体中文', ja: '日本語', hi: 'हिन्दी', sw: 'Kiswahili' };
    var storageKey = 'SeirinGame_UILanguage';
    var language = 'ru', engine = null, engineSource = null;
    var index = {}, reverseIndex = {}, key, code, observer, scheduled = false;
    var scopes = '#shell-header, #shell-footer, #game-menu-overlay, #archives-overlay, #graph-overlay, ' +
        '.aurora-title, #seirin-build-badge, main-menu, settings-screen, help-screen, save-screen, load-screen, loading-screen, ' +
        'gallery-screen, credits-screen, quick-menu, alert-modal, .aurora-meta, .aurora-log-hint, ' +
        'dialog-log [data-string], dialog-log [data-log-jump]';
    var excluded = '.graph-node-title, .graph-node-id, .graph-node-banner, .graph-target, ' +
        '.graph-edge.choice .graph-edge-text, [data-meta="where"], [data-hud-text], #hud-player-name, ' +
        '[data-spoke], save-slot .badge, save-slot figcaption, [data-content="context"], option, script, style, svg, input, textarea';
    function owns (obj, name) { return Object.prototype.hasOwnProperty.call(obj, name); }
    function normalize (text) { return text.replace(/^\s+|\s+$/g, '').toLowerCase(); }
    for (key in catalog.en) { if (owns(catalog.en, key)) { index[normalize(key)] = key; } }
    for (code in catalog) {
        if (!owns(catalog, code)) { continue; }
        for (key in catalog[code]) {
            if (owns(catalog[code], key)) { reverseIndex[normalize(catalog[code][key])] = key; }
        }
    }
    try {
        var saved = global.localStorage.getItem(storageKey);
        if (owns(languages, saved)) { language = saved; }
    } catch (e) { /* file:// or private browsing: in-memory selection still works */ }
    function t (source, params) {
        var canonical = index[normalize(source)] || source;
        var table = catalog[language] || catalog.en;
        var result = owns(table, canonical) ? table[canonical] : (catalog.en[canonical] || source);
        return result.replace(/\{(\w+)\}/g, function (match, name) {
            return params && owns(params, name) ? String(params[name]) : match;
        });
    }
    function engineTable () {
        if (!engine || !engineSource) { return; }
        var table = {}, name;
        for (name in engineSource) {
            if (owns(engineSource, name)) { table[name] = t(engineSource[name]); }
        }
        /* English is the engine's internal chrome namespace, NOT the story
         * language. Keeping it avoids the engine's multi-language script mode. */
        engine.translation('English', table);
    }
    function installEngine (eng) {
        engine = eng;
        engineSource = {};
        var source = eng.translation('English'), name;
        for (name in source) { if (owns(source, name)) { engineSource[name] = source[name]; } }
        engineTable();
    }
    function sourceFor (value) {
        var canonical = index[normalize(value)] || reverseIndex[normalize(value)];
        if (canonical) { return { key: canonical }; }
        var match = value.match(/^(?:сборка|Сборка) (.+)$/);
        if (match) { return { key: 'Сборка {n}', params: { n: match[1] } }; }
        match = value.match(/^узлов: (\d+)$/);
        if (match) { return { key: 'узлов: {n}', params: { n: match[1] } }; }
        match = value.match(/^Вернуться к этой реплике \(−(\d+)\)$/);
        if (match) { return { key: 'Вернуться к этой реплике (−{n})', params: { n: match[1] } }; }
        return null;
    }
    function project (node, attr, sourceKey) {
        var value = attr ? node.getAttribute(attr) : node.nodeValue;
        if (!value) { return; }
        var memo = node.__seirinI18n || (node.__seirinI18n = {});
        var slot = attr || 'text', entry = memo[slot];
        if (sourceKey || !entry || entry.output !== value) {
            var source = sourceKey ? { key: sourceKey } : sourceFor(value);
            if (!source) { delete memo[slot]; return; }
            entry = memo[slot] = source;
            entry.leading = value.match(/^\s*/)[0];
            entry.trailing = value.match(/\s*$/)[0];
        }
        var output = entry.leading + t(entry.key, entry.params) + entry.trailing;
        entry.output = output;
        if (output !== value) {
            if (attr) { node.setAttribute(attr, output); }
            else { node.nodeValue = output; }
        }
    }
    function walk (node, sourceKey) {
        if (node.nodeType === 3) {
            if (normalize(node.nodeValue)) { project(node, null, sourceKey); }
            return;
        }
        if (node.nodeType !== 1) { return; }
        /* Log rows contain story text: only their rewind tooltip is chrome. */
        if (node.hasAttribute('data-log-jump')) { project(node, 'title'); return; }
        if (node.matches(excluded)) {
            /* Input labels are UI, but user-entered values are never translated. */
            if (node.tagName === 'INPUT') { project(node, 'aria-label'); project(node, 'placeholder'); }
            return;
        }
        project(node, 'title'); project(node, 'aria-label'); project(node, 'placeholder');
        /* Engine keys are authoritative: translated words can collide (e.g.
         * Swahili Resolution and Appearance). Only the two engine toggles
         * retain their original key while showing the opposite action. */
        var stringKey = node.getAttribute('data-string');
        if (stringKey && engineSource && owns(engineSource, stringKey)) {
            sourceKey = engineSource[stringKey];
            var current = sourceFor(node.textContent);
            if (stringKey === 'AutoPlay' && current && current.key === 'Стоп') { sourceKey = 'Стоп'; }
            if (stringKey === 'Hide' && current && current.key === 'Показать') { sourceKey = 'Показать'; }
        }
        var children = node.childNodes, i;
        for (i = 0; i < children.length; i++) { walk(children[i], sourceKey); }
    }

    function picker () {
        var hosts = doc.querySelectorAll('main-menu, .aurora-appearance'), i, code;
        for (i = 0; i < hosts.length; i++) {
            if (hosts[i].querySelector('.seirin-language')) { continue; }
            var box = doc.createElement('div');
            box.className = 'seirin-language';
            var label = doc.createElement('label');
            var caption = doc.createElement('span');
            caption.textContent = 'Язык интерфейса';
            label.appendChild(caption);
            var select = doc.createElement('select');
            select.setAttribute('aria-label', 'Язык интерфейса');
            for (code in languages) {
                if (!owns(languages, code)) { continue; }
                var option = doc.createElement('option');
                option.value = code; option.lang = code; option.textContent = languages[code];
                select.appendChild(option);
            }
            select.value = language;
            select.addEventListener('change', function () { setLanguage(this.value); }, false);
            label.appendChild(select); box.appendChild(label);
            var note = doc.createElement('p');
            note.className = 'aurora-note';
            note.textContent = 'Только интерфейс. Текст истории пока остаётся на русском.';
            box.appendChild(note); hosts[i].appendChild(box);
        }
    }
    function refresh () {
        scheduled = false;
        picker();
        var slots = doc.querySelectorAll('save-slot'), j;
        for (j = 0; j < slots.length; j++) {
            var remove = slots[j].querySelector('[data-delete]');
            var badge = slots[j].querySelector('.badge');
            if (remove && badge) {
                var label = t('Удалить сохранение {n}', { n: badge.textContent });
                if (remove.getAttribute('aria-label') !== label) { remove.setAttribute('aria-label', label); }
            }
            var caption = slots[j].querySelector('figcaption');
            var date = slots[j].props && new Date(slots[j].props.date);
            if (caption && date && !isNaN(date.getTime())) {
                var formatted = date.toLocaleString(language === 'zh' ? 'zh-CN' : language);
                if (caption.textContent !== formatted) { caption.textContent = formatted; }
            }
        }
        var nodes = doc.querySelectorAll(scopes), i;
        for (i = 0; i < nodes.length; i++) {
            /* A selector matching a descendant must not bypass a story guard. */
            var ancestor = nodes[i].parentElement, guarded = false;
            while (ancestor && ancestor !== doc.body) {
                if (ancestor.matches(excluded)) { guarded = true; break; }
                ancestor = ancestor.parentElement;
            }
            if (!guarded) { walk(nodes[i]); }
        }
        /* Consume our own edits: do not observe/translate in an endless loop. */
        if (observer) { observer.takeRecords(); }
    }
    function schedule () {
        if (scheduled) { return; }
        scheduled = true;
        global.setTimeout(refresh, 0);
    }
    var cssStrings = {
        crossroads: 'Развилка', response: 'Ваш ответ', preferences: 'Ночная смена · предпочтения',
        load: 'Ночная смена · загрузка', save: 'Ночная смена · сохранение', saveTitle: 'Сохранить',
        help: 'Ночная смена · справка', night: 'Ночная смена', confirm: 'Подтверждение', log: 'История реплик'
    };
    function applyLanguage () {
        doc.documentElement.lang = language === 'zh' ? 'zh-Hans' : language;
        var name;
        for (name in cssStrings) {
            if (owns(cssStrings, name)) {
                doc.documentElement.style.setProperty('--ui-' + name, JSON.stringify(t(cssStrings[name])));
            }
        }
        doc.title = t('Сэйрин') + ': ' + t('Ночная смена') + ' — Resonance 2030';
        engineTable();
        var selects = doc.querySelectorAll('.seirin-language select'), i;
        for (i = 0; i < selects.length; i++) { selects[i].value = language; }
        refresh();
    }
    function setLanguage (code) {
        if (!owns(languages, code)) { return false; }
        language = code;
        try { global.localStorage.setItem(storageKey, code); } catch (e) { /* optional persistence */ }
        applyLanguage();
        return true;
    }
    global.SeirinI18n = {
        t: t, setLanguage: setLanguage, getLanguage: function () { return language; },
        languages: languages, installEngine: installEngine, refresh: refresh
    };
    function start () {
        applyLanguage();
        observer = new global.MutationObserver(schedule);
        observer.observe(doc.body, { childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder', 'data-string', 'data-log-jump'] });
    }
    if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', start, false); }
    else { start(); }
}(window));
