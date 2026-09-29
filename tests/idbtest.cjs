const path = require('path'); const { spawn } = require('child_process');
const pw = require(process.env.PLAYWRIGHT);
(async () => {
  const srv = spawn('python3', [path.join(__dirname, 'nocache.py'), '8838', path.join(__dirname, 'www')], { stdio: 'ignore' });
  process.on('exit', () => srv.kill('SIGKILL'));
  await new Promise(r => setTimeout(r, 600));
  const b = await pw.chromium.launch();
  for (const g of process.argv.slice(2)) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
    const errs = [], prompts = []; p.on('pageerror', e => errs.push(String(e)));
    p.on('dialog', d => { if (d.type() === 'prompt') prompts.push(d.message()); d.accept('Tester'); });
    await p.goto('http://localhost:8838/' + g + '/'); await p.waitForTimeout(5000);
    const B = () => document.getElementById('btn-tiles') || document.getElementById('btn-tileset');
    const t0 = await p.evaluate(() => { const b = document.getElementById('btn-tiles') || document.getElementById('btn-tileset'); return b ? b.textContent : 'no tiles'; });
    await p.evaluate(() => { const b = document.getElementById('btn-tiles') || document.getElementById('btn-tileset'); if (b) b.click(); }); await p.waitForTimeout(1500);
    const t1 = await p.evaluate(() => { const b = document.getElementById('btn-tiles') || document.getElementById('btn-tileset'); return b ? b.textContent : '-'; });
    await p.evaluate(() => new Promise(r => Module.FS.syncfs(false, r))); await p.waitForTimeout(800);
    await p.reload(); await p.waitForTimeout(5000);
    const t2 = await p.evaluate(() => { const b = document.getElementById('btn-tiles') || document.getElementById('btn-tileset'); return b ? b.textContent : '-'; });
    const lay = await p.evaluate(() => { try { const f = Module.FS.readdir(RvipApp.dir).length; } catch (e) {} const found = []; const walk = d => { try { Module.FS.readdir(d).forEach(n => { if (n[0] === '.') return; const q = d + '/' + n; try { if (Module.FS.isDir(Module.FS.stat(q).mode)) walk(q); else if (/layout|web-name|web-tiles/.test(n)) found.push(q + ' ' + Module.FS.readFile(q, { encoding: 'utf8' }).slice(0, 400).match(/"(name|tiles)":"[^"]*"|^[^{].*/g)); } catch (e) {} }); } catch (e) {} }; walk('/' + location.pathname.split('/').filter(Boolean).pop()); return found.join(' | '); });
    const ls = await p.evaluate(() => localStorage.length);
    console.log(g, '| tiles', t0, '->', t1, '| after reload', t2, '| prompts', prompts.length, '| layout', lay, '| localStorage', ls, '| errors', errs.join(' | ') || 'none');
    await ctx.close();
  }
  await b.close(); process.exit(0);
})();
