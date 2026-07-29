// Convert UI reference screenshots to JPEG and delete the PNG originals.
// ---------------------------------------------------------------------------
// Full-page PNG screenshots are ~1-2 MB each and these are review material,
// not game assets. 45 of them once reached 34 MB in Git; as JPEG they are
// 3.4 MB. design/preview/shots/*.png is gitignored so an un-shrunk capture
// cannot be committed by accident — run this before opening a PR.
//
// Usage:  node design/tools/shrink-shots.mjs [dir] [maxWidth] [quality]
// Needs a Chromium build only because the sandbox has no image library; any
// `cwebp`/`convert` on a normal machine would do the same job.
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';

const dir = (process.argv[2] || 'design/preview/shots').replace(/\/?$/, '/');
const maxW = Number(process.argv[3] || 1280);
const quality = Number(process.argv[4] || 0.82);

if (!existsSync(dir)) { console.error('no such directory: ' + dir); process.exit(1); }
const pngs = readdirSync(dir).filter(f => f.endsWith('.png'));
if (!pngs.length) { console.log('nothing to shrink in ' + dir); process.exit(0); }

let chromium;
try { ({ chromium } = (await import('playwright-core')).default || await import('playwright-core')); }
catch { console.error('playwright-core not installed; skipping'); process.exit(0); }

const exe = process.env.CHROMIUM_PATH || '/tmp/cbin/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
let before = 0, after = 0;

for (const f of pngs) {
    before += statSync(dir + f).size;
    const b64 = readFileSync(dir + f).toString('base64');
    const out = await page.evaluate(async ({ d, w, q }) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
        const s = Math.min(1, w / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', q);
    }, { d: b64, w: maxW, q: quality });
    const buf = Buffer.from(out.split(',')[1], 'base64');
    writeFileSync(dir + f.replace(/\.png$/, '.jpg'), buf);
    unlinkSync(dir + f);
    after += buf.length;
}
await browser.close();
console.log(`${pngs.length} files: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
