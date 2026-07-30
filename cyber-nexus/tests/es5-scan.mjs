// Zero-dependency ES5-shape scanner for the shipped vendor JS.
// ----------------------------------------------------------------------------
// The shipped files (`vendor/failsafe.js`, `vendor/game.js`,
// `vendor/icons-offline.js`) advertise ES5 compatibility, but Node parses
// everything as ES2015+, so simply `new Function(src)` proves nothing: a
// function *declaration inside a block* — illegal in strict-mode ES5 — parses
// happily here and merely becomes block-scoped. This module implements the
// checks a real ES5 parser would make, using only string scanning.
//
// It is deliberately conservative: it strips comments/strings/regexes first,
// then tracks a brace stack so it can tell a function body from a plain block.
// Used by tests/failsafe.test.mjs and tests/game.test.mjs.

/** Replace comments, string literals and regex literals with same-length
 *  filler so all offsets stay valid and no keyword inside a string is seen. */
export function stripLiterals (src) {
    const out = src.split('');
    let i = 0;
    const n = src.length;
    // Tracks whether a `/` starts a regex (rather than being division).
    let prevSignificant = '';
    const blank = (from, to, keepNewlines = true) => {
        for (let k = from; k < to && k < n; k++) {
            out[k] = (keepNewlines && src[k] === '\n') ? '\n' : ' ';
        }
    };
    while (i < n) {
        const c = src[i];
        const c2 = src[i + 1];
        if (c === '/' && c2 === '/') {
            let j = i; while (j < n && src[j] !== '\n') { j++; }
            blank(i, j); i = j; continue;
        }
        if (c === '/' && c2 === '*') {
            let j = src.indexOf('*/', i + 2); j = (j === -1) ? n : j + 2;
            blank(i, j); i = j; continue;
        }
        if (c === '"' || c === "'" || c === '`') {
            let j = i + 1;
            while (j < n) {
                if (src[j] === '\\') { j += 2; continue; }
                if (src[j] === c) { j++; break; }
                j++;
            }
            blank(i + 1, j - 1, false);
            i = j; prevSignificant = 'x'; continue;
        }
        if (c === '/') {
            // Regex literal iff the previous significant char cannot end an expression.
            const canPrecedeRegex = prevSignificant === '' || '(,=:[!&|?{};+-*%~^<>'.includes(prevSignificant);
            if (canPrecedeRegex) {
                let j = i + 1, inClass = false, closed = false;
                while (j < n) {
                    const d = src[j];
                    if (d === '\\') { j += 2; continue; }
                    if (d === '\n') { break; }
                    if (d === '[') { inClass = true; }
                    else if (d === ']') { inClass = false; }
                    else if (d === '/' && !inClass) { j++; closed = true; break; }
                    j++;
                }
                if (closed) { blank(i + 1, j - 1, false); i = j; prevSignificant = 'x'; continue; }
            }
        }
        if (!/\s/.test(c)) { prevSignificant = c; }
        i++;
    }
    return out.join('');
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

/** Find `function name (...) {` declarations whose nearest enclosing brace is a
 *  plain block (if/else/for/while/try/switch/bare) rather than a function body.
 *  Those are a SyntaxError for a strict-mode ES5 parser. */
export function findBlockScopedFunctionDeclarations (rawSrc) {
    const src = stripLiterals(rawSrc);
    const found = [];
    // Brace stack: each entry says what kind of `{` opened this scope.
    const stack = [];
    // Positions of `{` that open a function body, precomputed by walking every
    // `function` keyword and matching its parameter list.
    const functionBodyOpens = new Set();
    const declStarts = [];
    const fnRe = /\bfunction\b/g;
    let m;
    while ((m = fnRe.exec(src)) !== null) {
        const start = m.index;
        let j = fnRe.lastIndex;
        while (j < src.length && /[\s*]/.test(src[j])) { j++; }        // generators too
        let name = '';
        while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) { name += src[j]; j++; }
        while (j < src.length && /\s/.test(src[j])) { j++; }
        if (src[j] !== '(') { continue; }
        let depth = 0;
        while (j < src.length) {
            if (src[j] === '(') { depth++; }
            else if (src[j] === ')') { depth--; if (depth === 0) { j++; break; } }
            j++;
        }
        while (j < src.length && /\s/.test(src[j])) { j++; }
        if (src[j] !== '{') { continue; }
        functionBodyOpens.add(j);
        if (name) {
            // Statement position => declaration; after `=`/`(`/`return` etc => expression.
            let k = start - 1;
            while (k >= 0 && /\s/.test(src[k])) { k--; }
            const prev = k >= 0 ? src[k] : '';
            if (prev === '' || prev === '{' || prev === '}' || prev === ';') {
                declStarts.push({ index: start, name });
            }
        }
    }
    const declByIndex = new Map(declStarts.map(d => [d.index, d]));
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (declByIndex.has(i)) {
            const enclosing = stack[stack.length - 1];
            // Top level of the file, or directly inside a function body, is fine.
            if (enclosing && enclosing !== 'function') {
                const d = declByIndex.get(i);
                found.push({ name: d.name, line: lineOf(rawSrc, i), kind: enclosing });
            }
        }
        if (c === '{') { stack.push(functionBodyOpens.has(i) ? 'function' : 'block'); }
        else if (c === '}') { stack.pop(); }
    }
    return found;
}

/** ES6+ syntax that must never appear in a shipped ES5 vendor file. */
export function findEs6Syntax (rawSrc) {
    const src = stripLiterals(rawSrc);
    const hits = [];
    const rules = [
        ['arrow function', /=>/g],
        ['let/const', /\b(?:let|const)\s+[A-Za-z_$[{]/g],
        ['class', /\bclass\s+[A-Za-z_$]/g],
        ['template literal', /`/g],
        ['spread/rest', /\.\.\./g],
        ['ES module syntax', /^\s*(?:import|export)\s/gm],
        ['for..of', /\bfor\s*\(\s*(?:var\s+)?[A-Za-z_$][A-Za-z0-9_$]*\s+of\s/g],
    ];
    for (const [label, re] of rules) {
        let m;
        while ((m = re.exec(src)) !== null) {
            hits.push({ rule: label, line: lineOf(rawSrc, m.index), text: m[0].trim().slice(0, 60) });
        }
    }
    return hits;
}
