/* Generic RVIP page smoke test: node smoke.cjs <url-folder>...
 * Load, top bar, drop-downs, per-window A+/A− kept over a reload, IndexedDB names, errors. */
const path = require('path');
const { spawn } = require('child_process');
const pw = require(process.env.PLAYWRIGHT);
const S = __dirname, PORT = 8830;

(async () => {
	const srv = spawn('python3', [path.join(S, 'nocache.py'), String(PORT), path.join(S, 'www')], { stdio: 'ignore' });
	process.on('exit', () => srv.kill('SIGKILL'));
	await new Promise(r => setTimeout(r, 600));
	const browser = await pw.chromium.launch();
	for (const g of process.argv.slice(2)) {
		const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
		const page = await ctx.newPage();
		const errors = [];
		page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 160)));
		page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console ' + m.text().slice(0, 160)); });
		page.on('response', r => { if (r.status() >= 400 && !/beacon|favicon/.test(r.url())) errors.push(r.status() + ' ' + r.url().replace(/.*:\d+/, '')); });
		const out = { game: g };
		try {
			await page.goto(`http://localhost:${PORT}/${g}/`);
			await page.waitForTimeout(5000);
			out.bar = await page.evaluate(() => {
				const bar = document.getElementById('bar'); if (!bar) return 'NO BAR';
				return [...bar.children].filter(e => e.offsetParent !== null || e.classList.contains('sep')).map(e =>
					e.classList.contains('sep') ? '|' : e.classList.contains('hint') ? 'hints[' + [...e.querySelectorAll('kbd')].map(k => k.textContent).join(' ') + ']' :
					e.tagName === 'H1' ? null : e.tagName === 'SELECT' ? (e.options[e.selectedIndex] || {}).text || 'select' : e.textContent.trim()).filter(Boolean).join(' · ');
			});
			/* drop-downs: one open at a time, Esc closes */
			out.menus = await page.evaluate(async () => {
				const wait = ms => new Promise(r => setTimeout(r, ms));
				const vis = m => m && !m.hidden && getComputedStyle(m).display !== 'none';
				const f = document.getElementById('btn-file'), fm = document.getElementById('menu-file');
				const a = document.getElementById('btn-audio'), am = document.getElementById('menu-audio');
				const r = [];
				if (f && fm) {
					f.click(); await wait(80); r.push('file:' + (vis(fm) ? 'opens' : 'NOOPEN') + '[' + [...fm.children].map(c => c.tagName === 'HR' ? '—' : c.textContent.trim()).join(',') + ']');
					if (a && am) { a.click(); await wait(80); r.push(vis(fm) ? 'TWO-OPEN' : 'one-at-a-time'); }
					document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(80);
					r.push(vis(fm) || vis(am) ? 'ESC-KEEPS' : 'esc-closes');
					document.body.click(); await wait(50);
				} else r.push('NO FILE MENU');
				if (am) r.push('audio[' + [...am.querySelectorAll('label')].map(l => l.textContent.trim()).join(',') + ']');
				return r.join(' ');
			});
			await page.keyboard.press('Escape');
			/* per-window text size */
			const sizes = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.win')].filter(w => w.id && w.offsetParent).map(w => { const b = w.querySelector('.body') || w; return [w.id, getComputedStyle(b).fontSize]; })));
			const s0 = await sizes();
			const target = ['t-inv', 't-msg', 't-stat'].find(id => s0[id]) || Object.keys(s0).find(id => id !== 't-map');
			if (target) {
				const n = await page.locator(`#${target} .t button[title="Bigger text"]`).count();
				if (n) {
					await page.click(`#${target} .t button[title="Bigger text"]`, { force: true }); await page.waitForTimeout(700);
					const s1 = await sizes();
					const changed = Object.keys(s1).filter(k => s1[k] !== s0[k]);
					out.aplus = `${target} ${s0[target]}→${s1[target]}; changed: ${changed.join(',') || 'none'}`;
					await page.waitForTimeout(1500);
					await page.reload(); await page.waitForTimeout(5000);
					const s2 = await sizes();
					out.aplus += `; after reload ${s2[target]}`;
				} else out.aplus = `no A+ on ${target}`;
			} else out.aplus = 'no windows: ' + JSON.stringify(s0);
			out.tiles = await page.evaluate(async () => {
				const b = document.getElementById('btn-tiles') || document.getElementById('btn-tileset'); if (!b) return 'no tiles button';
				const seen = [b.textContent.trim()];
				for (let i = 0; i < 7; i++) { b.click(); await new Promise(r => setTimeout(r, 400)); const t = b.textContent.trim(); if (t === seen[0]) break; seen.push(t); }
				return seen.join(' → ');
			});
			out.zoomInBar = await page.evaluate(() => [...document.querySelectorAll('#bar [id*=zoom]')].map(e => e.id).join(',') || 'none');
			out.idb = await page.evaluate(async () => indexedDB.databases ? (await indexedDB.databases()).map(d => d.name).join(',') : '?');
			await page.screenshot({ path: path.join(S, 'shots', 'smoke-' + g + '.png') });
		} catch (e) { out.fail = e.message.split('\n')[0]; }
		out.errors = [...new Set(errors)].slice(0, 6);
		console.log(JSON.stringify(out));
		await ctx.close();
	}
	await browser.close();
	process.exit(0);
})();
