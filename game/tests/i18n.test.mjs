import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const catalogCode = fs.readFileSync(new URL('../vendor/locales/ui.js', import.meta.url), 'utf8');
const runtimeCode = fs.readFileSync(new URL('../vendor/i18n.js', import.meta.url), 'utf8');
const locales = ['ru', 'en', 'zh', 'ja', 'hi', 'sw'];
function fixture(saved, blocked = false) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <main-menu><button data-string="Start">НАЧАТЬ</button></main-menu>
        <settings-screen><fieldset class="aurora-appearance"><legend>Оформление</legend></fieldset></settings-screen>
        <div id="game-menu-overlay"><button title="Закрыть"><svg></svg>Закрыть</button></div>
        <div id="archives-overlay"><h3>ПОКАЗАТЕЛИ</h3></div>
        <div id="graph-overlay"><span class="graph-chip">узлов: 205</span>
          <div class="graph-edge choice"><span class="graph-edge-text">Назад</span></div></div>
        <text-box><p data-content="text">Начать</p><div class="aurora-meta"><span>Клик или пробел — дальше</span></div></text-box>
        <choice-container><button>Закрыть</button></choice-container>
        <dialog-log><div data-spoke="ren" data-log-jump="3" title="Вернуться к этой реплике (−3)"><p>Назад</p></div></dialog-log>
        </body></html>`, { url: 'https://local.test', runScripts: 'outside-only' });
    if (saved) dom.window.localStorage.setItem('SeirinGame_UILanguage', saved);
    if (blocked) Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('blocked'); } });
    dom.window.eval(catalogCode);
    dom.window.eval(runtimeCode);
    let table = { Start: 'НАЧАТЬ', Close: 'ЗАКРЫТЬ', Resolution: 'Разрешение', AutoPlay: 'АВТО', Hide: 'СКРЫТЬ' };
    const engine = { translation(name, values) { if (values) table = {...table, ...values}; return table; } };
    dom.window.SeirinI18n.installEngine(engine);
    return { dom, w: dom.window, api: dom.window.SeirinI18n, engine };
}

test('all six catalogs have identical keys and placeholders', () => {
    const context = { window: {} }; vm.runInNewContext(catalogCode, context);
    const tables = context.window.SeirinUICatalog;
    assert.deepEqual(Object.keys(tables), locales);
    for (const code of locales) {
        assert.deepEqual(Object.keys(tables[code]), Object.keys(tables.en));
        for (const key of Object.keys(tables.en)) {
            assert.ok(tables[code][key].trim(), `${code}: ${key}`);
            assert.deepEqual(tables[code][key].match(/\{\w+\}/g), key.match(/\{\w+\}/g));
        }
    }
});

test('live switching translates chrome, attributes, CSS and new UI but never story', async () => {
    const {dom, w, api, engine} = fixture();
    try {
        await new Promise(resolve => w.setTimeout(resolve, 10));
        for (const code of [...locales, 'en', 'ru']) {
            assert.equal(api.setLanguage(code), true);
            const table = w.SeirinUICatalog[code];
            assert.equal(w.document.documentElement.lang, code === 'zh' ? 'zh-Hans' : code);
            assert.equal(w.document.querySelector('[data-string="Start"]').textContent, table['Начать']);
            assert.equal(engine.translation('English').Start, table['Начать']);
            assert.equal(w.document.querySelector('#game-menu-overlay button').title, table['Закрыть']);
            assert.equal(w.document.querySelector('legend').textContent, table['Оформление']);
            assert.equal(w.document.querySelector('.graph-chip').textContent, table['узлов: {n}'].replace('{n}', '205'));
            assert.equal(w.document.querySelector('[data-log-jump]').title, table['Вернуться к этой реплике (−{n})'].replace('{n}', '3'));
            assert.equal(w.document.querySelector('text-box p').textContent, 'Начать');
            assert.equal(w.document.querySelector('choice-container button').textContent, 'Закрыть');
            assert.equal(w.document.querySelector('[data-spoke] p').textContent, 'Назад');
            assert.equal(w.document.querySelector('.graph-edge-text').textContent, 'Назад');
            assert.equal(w.document.querySelectorAll('.seirin-language').length, 2);
            assert.ok(w.document.documentElement.style.getPropertyValue('--ui-response').includes(table['Ваш ответ']));
        }
        api.setLanguage('ja');
        w.document.querySelector('#archives-overlay').innerHTML = '<h3>ПОКАЗАТЕЛИ</h3>';
        await new Promise(resolve => w.setTimeout(resolve, 20));
        assert.equal(w.document.querySelector('#archives-overlay h3').textContent, 'ステータス');
        const select = w.document.querySelector('.seirin-language select');
        select.value = 'sw'; select.dispatchEvent(new w.Event('change'));
        assert.equal(api.getLanguage(), 'sw');
        assert.equal(w.localStorage.getItem('SeirinGame_UILanguage'), 'sw');
        assert.ok(w.document.querySelector('#game-menu-overlay svg'), 'icons preserved');
    } finally { dom.window.close(); }
});

test('restore, invalid language, missing key, blocked storage and fallback', () => {
    for (const blocked of [false, true]) {
        const {dom, api, w} = fixture('hi', blocked);
        try {
            assert.equal(api.getLanguage(), blocked ? 'ru' : 'hi');
            assert.equal(api.setLanguage('unsupported'), false);
            assert.equal(api.setLanguage('zh'), true);
            assert.equal(api.t('unknown-key'), 'unknown-key');
            delete w.SeirinUICatalog.zh['Начать'];
            assert.equal(api.t('Начать'), 'Start');
        } finally { dom.window.close(); }
    }
    const {dom, api} = fixture('bad-locale');
    assert.equal(api.getLanguage(), 'ru'); dom.window.close();
});

test('engine toggle text and persisted-language tooltips keep their current meaning', () => {
    const {dom, w, api} = fixture('ja');
    try {
        const menu = w.document.querySelector('main-menu');
        menu.innerHTML = '<button data-string="AutoPlay" title="停止">停止</button>' +
            '<button data-string="Hide">表示</button>';
        api.setLanguage('en');
        assert.equal(menu.querySelector('[data-string="AutoPlay"]').textContent, 'Stop');
        assert.equal(menu.querySelector('[data-string="AutoPlay"]').title, 'Stop');
        assert.equal(menu.querySelector('[data-string="Hide"]').textContent, 'Show');
        api.setLanguage('ru');
        assert.equal(menu.querySelector('[data-string="AutoPlay"]').textContent, 'Стоп');
    } finally { dom.window.close(); }
});


test('engine keys disambiguate identical translations after a persisted-language boot', () => {
    const {dom, w, api} = fixture('sw');
    try {
        const screen = w.document.querySelector('settings-screen');
        screen.insertAdjacentHTML('beforeend', '<span data-string="Resolution">Mwonekano</span>');
        api.setLanguage('en');
        assert.equal(screen.querySelector('[data-string="Resolution"]').textContent, 'Resolution');
        assert.equal(screen.querySelector('legend').textContent, 'Appearance');
    } finally { dom.window.close(); }
});

test('story markup in a dialogue-log row is not a localization root', () => {
    const {dom, w, api} = fixture();
    try {
        w.document.querySelector('[data-spoke] p').innerHTML = '<span data-string="Close">Закрыть</span>';
        api.setLanguage('en');
        assert.equal(w.document.querySelector('[data-spoke] p').textContent, 'Закрыть');
    } finally { dom.window.close(); }
});
