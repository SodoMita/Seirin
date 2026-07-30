"""Regression test for reversibility: Back must both work and restore stats.

Requires a real browser via Playwright (dev-only):
    pip install playwright && playwright install chromium
    python tests/test_rewind.py

For environments without a browser, the zero-dependency unit tests and the
jsdom offline smoke test cover the same guarantees:
    node --test tests/failsafe.test.mjs
    node tests/offline-smoke.mjs        # needs `npm i jsdom` (dev-only)
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

URL = (Path(__file__).resolve().parent.parent / "index.html").as_uri()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await (await b.new_context(viewport={"width": 1366, "height": 820})).new_page()
        logs = []
        page.on("console", lambda m: logs.append(m.text[:140]) if m.type in ("error", "warning") else None)
        await page.goto(URL, wait_until="load")
        await page.wait_for_timeout(3000)
        await page.evaluate("()=>localStorage.clear()")
        await page.click('main-menu [data-action="start"]')
        await page.wait_for_timeout(1200)

        async def stat():
            return await page.evaluate("""()=>({l:window.engine.state('label'),s:window.engine.state('step'),
                karma:window.engine.storage('player').karma,
                hack:window.engine.storage('player').hacking,
                aria:window.engine.storage('flags').sided_with_aria})""")

        async def adv(n=1):
            for _ in range(n):
                if await page.locator("text-input.modal--active").count():
                    await page.fill("text-input input", "Zed")
                    await page.press("text-input input", "Enter")
                    await page.wait_for_timeout(1000)
                    continue
                await page.mouse.click(683, 300)
                await page.wait_for_timeout(550)

        # ---- TEST 1: bare-function replacement no longer blocks Back ----
        await page.evaluate("()=>window.engine.run('jump Chapter1_SideAria')")
        await page.wait_for_timeout(1800)
        s0 = await stat()
        await adv(4)
        s1 = await stat()
        for _ in range(3):
            await page.evaluate("()=>window.engine.rollback().catch(()=>{})")
            await page.wait_for_timeout(900)
        s2 = await stat()
        moved_back = s2["s"] < s1["s"]
        hack_restored = s2["hack"] < s1["hack"] or s2["s"] <= s0["s"]
        print(f"TEST 1 rollback across reversible():")
        print(f"   start {s0['s']} -> fwd {s1['s']} (hack {s1['hack']}) -> back {s2['s']} (hack {s2['hack']})")
        print(f"   [{'PASS' if moved_back else 'FAIL'}] Back actually moves (was blocked by bare fn before)")
        print(f"   [{'PASS' if hack_restored else 'FAIL'}] hacking un-awarded on rewind")

        # ---- TEST 2: choice with onChosen is now reversible ----
        await page.evaluate("()=>localStorage.clear()")
        await page.reload()
        await page.wait_for_timeout(3000)
        await page.click('main-menu [data-action="start"]')
        await page.wait_for_timeout(1200)
        for _ in range(30):
            if await page.locator("choice-container button[data-choice]").count():
                break
            await adv()
        await page.evaluate("()=>document.querySelectorAll('choice-container button[data-choice]')[0].click()")
        await page.wait_for_timeout(2000)
        for _ in range(30):
            if await page.locator("choice-container button[data-choice]").count():
                break
            await adv()
        before = await stat()
        await page.evaluate("()=>document.querySelectorAll('choice-container button[data-choice]')[0].click()")
        await page.wait_for_timeout(2200)
        chosen = await stat()
        for _ in range(6):
            await page.evaluate("()=>window.engine.rollback().catch(()=>{})")
            await page.wait_for_timeout(900)
        rewound = await stat()
        karma_ok = rewound["karma"] == before["karma"]
        flag_ok = rewound["aria"] == before["aria"]
        nonrev = [l for l in logs if 'not reversible' in l.lower()]
        print(f"\nTEST 2 rollback across choice onChosen/onRevert:")
        print(f"   before karma={before['karma']} aria={before['aria']}")
        print(f"   chosen karma={chosen['karma']} aria={chosen['aria']}")
        print(f"   rewound karma={rewound['karma']} aria={rewound['aria']}")
        print(f"   [{'PASS' if karma_ok else 'FAIL'}] karma restored to pre-choice value")
        print(f"   [{'PASS' if flag_ok else 'FAIL'}] sided_with_aria flag restored")
        print(f"   [{'PASS' if not nonrev else 'FAIL'}] no 'not reversible' warning  {nonrev[:1]}")
        await b.close()

asyncio.run(main())
