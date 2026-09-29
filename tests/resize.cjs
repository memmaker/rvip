const path = require('path'); const { spawn } = require('child_process');
const pw = require(process.env.PLAYWRIGHT);
(async () => {
  const srv = spawn('python3', [path.join(__dirname, 'nocache.py'), '8840', path.join(__dirname, 'www')], { stdio: 'ignore' });
  process.on('exit', () => srv.kill('SIGKILL'));
  await new Promise(r => setTimeout(r, 600));
  const b = await pw.chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(process.argv[2].startsWith('http') ? process.argv[2] : 'http://localhost:8840/' + process.argv[2] + '/'); await p.waitForTimeout(6000);
  const info = () => p.evaluate(() => [...document.querySelectorAll('.win')].filter(w => w.offsetParent).map(w => { const r = w.getBoundingClientRect(), b = w.querySelector('.body') || w; return w.id.replace('t-', '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' fs' + getComputedStyle(b).fontSize + (b.scrollHeight > b.clientHeight + 2 || b.scrollWidth > b.clientWidth + 2 ? ' scroll' : ''); }).join(' | '));
  console.log('1280x800:', await info());
  for (const [w, h] of [[700, 450], [420, 320]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(800); console.log(w + 'x' + h + ':', await info()); }
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(800);
  const barAt = i => p.evaluate(i => { const e = document.querySelectorAll('.wm-bar')[i]; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, e.classList.contains('v') ? 'v' : 'h']; }, i);
  const nb = await p.evaluate(() => document.querySelectorAll('.wm-bar').length);
  for (let i = 0; i < nb; i++) for (const to of [5, 3000]) {
    const [x, y, d] = await barAt(i);
    await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(d === 'v' ? x : to, d === 'v' ? to : y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
    console.log('bar ' + i + ' (' + d + ') to ' + to + ':', await info());
  }
  await p.screenshot({ path: path.join(__dirname, 'shots', 'resize-' + process.argv[2].replace(/[^a-z0-9]/gi, '_') + '.png') });
  console.log('errors', errs.join(' | ') || 'none');
  await b.close(); process.exit(0);
})();
