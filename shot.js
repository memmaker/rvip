// RVIP step 11 screenshot helper, loaded by the page via shotsrv.py: await import('/rvip-tools/shot.js')
window.shot = async (n, sel='#game .win') => {   // sel: windows to keep, e.g. '#t-map,#t-msg'
  const ws=[...document.querySelectorAll(sel)], rs=ws.map(e=>e.getBoundingClientRect());
  const L=Math.min(...rs.map(r=>r.left)), T=Math.min(...rs.map(r=>r.top));
  const c=document.createElement('canvas');
  c.width=Math.max(...rs.map(r=>r.right))-L; c.height=Math.max(...rs.map(r=>r.bottom))-T;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=false; x.fillStyle='#1b1a1f'; x.fillRect(0,0,c.width,c.height);
  ws.forEach((w,i)=>{ const r=rs[i]; x.fillStyle='#000'; x.fillRect(r.left-L,r.top-T,r.width,r.height);
    x.strokeStyle='#333'; x.strokeRect(r.left-L+.5,r.top-T+.5,r.width-1,r.height-1);
    const t=w.querySelector('.name'); if (t) { x.fillStyle='#888'; x.font='11px sans-serif'; x.fillText(t.textContent, r.left-L+6, r.top-T+13); }
    for (const k of w.querySelectorAll('canvas')) { const q=k.getBoundingClientRect();
      if (q.width && k.checkVisibility()) x.drawImage(k, q.left-L, q.top-T, q.width, q.height); } });
  for (const k of document.querySelectorAll('canvas')) { const q=k.getBoundingClientRect();   // pop-ups outside the windows
    if (!k.closest('.win') && q.width && k.checkVisibility()) x.drawImage(k, q.left-L, q.top-T, q.width, q.height); }
  await fetch('/?n='+n, {method:'POST', body:c.toDataURL('image/png')}); return [c.width, c.height]; };
// keys('xx{Enter}l', ms): send keydown/keypress per key to the page (when real key events don't reach the game)
window.keys = async (s, ms=120) => {
  const toks = s.match(/\{[^}]+\}|./g) || [];
  for (const t of toks) { const key = t.length > 1 ? t.slice(1,-1) : t;
    for (const type of ['keydown','keypress','keyup'])
      document.dispatchEvent(new KeyboardEvent(type, {key, bubbles:true, cancelable:true}));
    await new Promise(r => setTimeout(r, ms)); } };
