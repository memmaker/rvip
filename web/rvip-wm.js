/*
 * rvip-wm.js: the tiling window manager of every RVIP web port (RVIP.md 5b).
 * The only copy: games load it as ../rvip-wm.js; roguelikes-index/deploy.sh uploads it.
 *
 * The game owns its windows (<div class="win" id="t-ID"> with a title bar
 * <div class="t"><span class="name">) and draws into them; this file only
 * places them. Layout = binary tree, leaves are window ids:
 *   'map'  or  { d: 'v'|'h', r: 0..1, a: node, b: node }
 * ('v' = a above b, 'h' = a left of b; r = share of a). Windows never overlap
 * and fill #game; the only space between them is the drag bar.
 *
 *   var wm = RvipWM({
 *     area: $('game'), menu: $('btn-layout'),        // menu replaces this button
 *     wins: [{ id: 'map', title: 'Map' }, { id: 'inv', title: 'Inventory' }, ...],
 *     multi: tree, single: tree,                      // default layouts
 *     state: saved || null,                           // from the game's IDBFS layout file
 *     save: function (state) {},                      // store state (debounce is ours)
 *     layout: function (rects) {},                    // rects[id] = [x, y, w, h] of shown windows
 *     zoom: { map: function (size, d) {} },           // windows that redraw/scale on A− / A+
 *     size: { side: function () { return px; } },     // optional: a window's drawn size before
 *                                                     // any A−/A+ (canvas panes not at CSS size)
 *     noFont: 'map',                                  // a window without A− / A+
 *     fontMax: { map: 40 }                            // optional: a window's A+ limit (default 28)
 *   });
 *   wm.apply()  after a resize;  wm.shown(id);  wm.reset();  wm.rects
 * A− / A+ on a title bar: the WM keeps one size per window and per mode (multi:
 * state.fs[id], one window: state.fs1[id]; 8..28 px; default: size[id]() if
 * given, else the body's CSS font-size), sets it as the window body's font-size
 * (also on load and on a mode switch) and calls zoom[id](size, d) if given.
 * RvipWM.fontSize(id) reads it; wm.zoomed(id) is the size A−/A+ set in this
 * mode, 0 if none (a game can fit the window then). A mode switch runs
 * layout(rects): read the sizes there.
 */
(function () {
	'use strict';
	var GUT = 4, MIN = 60;

	var CSS = '' +
		'.wm-bar{position:absolute;z-index:2;background:var(--gut,#1d1d23);touch-action:none}' +
		'.wm-bar.v{cursor:row-resize}.wm-bar.h{cursor:col-resize}' +
		'.wm-bar:hover,.wm-bar.drag{background:var(--gut-hover,#d9b24c)}' +
		'.win.wm-off{display:none!important}' +
		/* prompt line (-more-, questions): the game puts it in the map body, shows it only while in use */
		'.wm-topl{position:absolute;left:0;top:0;z-index:2;max-width:100%;padding:2px 6px;background:rgba(0,0,0,.8);' +
		'border:1px solid var(--line,#2b2b33);border-width:0 1px 1px 0;font:13px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap}' +
		'.wm-topl[hidden]{display:none}' +
		'.wm-single .win>.t{display:none!important}' +
		'.win>.t{cursor:grab;user-select:none}' +
		'.win>.t .wm-btns{flex:none;display:flex;gap:2px;visibility:hidden}' +
		'.win>.t:hover .wm-btns{visibility:visible}' +
		'.win>.t .wm-btns button{padding:0 5px;font-size:11px;line-height:14px;height:16px;cursor:pointer}' +
		'.win>.t .zoom{display:none!important}' +
		'.win>.t input{flex:1;min-width:0;font:inherit;color:inherit;background:#000;border:1px solid var(--accent,#d9b24c)}' +
		'.wm-drop{position:absolute;z-index:4;background:rgba(217,178,76,.25);border:2px solid var(--accent,#d9b24c);pointer-events:none}' +
		'.wm-menu{position:fixed;z-index:20;background:var(--panel,#16161a);border:1px solid var(--line,#2b2b33);border-radius:6px;' +
		'padding:4px 0;box-shadow:0 6px 24px rgba(0,0,0,.5);font-size:13px}' +
		'.wm-menu label{display:flex;gap:8px;align-items:center;padding:3px 12px;cursor:pointer;white-space:nowrap}' +
		'.wm-menu label:hover{background:#22222a}' +
		'.wm-menu[hidden]{display:none}' +
		'.wm-menu hr{border:0;border-top:1px solid var(--line,#2b2b33);margin:5px 0}' +
		'.wm-menu button{display:block;width:100%;margin:0;padding:4px 14px;border:0;border-radius:0;background:none;text-align:left;white-space:nowrap}' +
		'.wm-menu button:hover{background:#22222a}' +
		'.wm-list{overflow:auto!important;padding:3px 8px;font:13px/1.45 ui-monospace,Menlo,monospace;color:#dcdcdc}' +
		'.wm-list>div:not(.wm-vh){display:flex;align-items:center;gap:6px}.wm-ic{flex:none;width:16px;height:16px}' +
		'.wm-list b{flex:none;min-width:1.2em;text-align:center}.wm-vh{color:var(--dim,#8a8a96);margin-top:4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em}';

	function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
	function clone(o) { return JSON.parse(JSON.stringify(o)); }
	function leaves(n, out) { out = out || []; if (typeof n === 'string') out.push(n); else if (n) { leaves(n.a, out); leaves(n.b, out); } return out; }
	function remove(n, id) {                  /* tree without leaf id (or null) */
		if (typeof n === 'string') return n === id ? null : n;
		var a = remove(n.a, id), b = remove(n.b, id);
		if (!a) return b; if (!b) return a;
		n.a = a; n.b = b; return n;
	}
	function replace(n, id, sub) {
		if (typeof n === 'string') return n === id ? sub : n;
		n.a = replace(n.a, id, sub); n.b = replace(n.b, id, sub); return n;
	}

	function addCSS() { if (!document.getElementById('wm-css')) { var st = el('style'); st.id = 'wm-css'; st.textContent = CSS; document.head.appendChild(st); } }

	window.RvipWM = function (o) {
		var area = o.area, wm = { rects: {} }, ids = o.wins.map(function (w) { return w.id; });
		var S, bars = [], barEls = [], drop = el('div', 'wm-drop'), menu = null, saveT = 0;
		addCSS();
		drop.hidden = true; area.appendChild(drop);

		function valid(t) { var l = leaves(t); return l.length && l.every(function (id) { return ids.indexOf(id) >= 0; }) && new Set(l).size === l.length; }
		function fresh() { return { v: 2, mode: 'multi', multi: clone(o.multi), single: clone(o.single), titles: {}, fs: {}, fs1: {} }; }
		S = fresh();
		if (o.state && o.state.v === 2) {
			if (o.state.mode === 'single') S.mode = 'single';
			if (valid(o.state.multi)) S.multi = o.state.multi;
			if (o.state.titles) ids.forEach(function (id) { if (typeof o.state.titles[id] === 'string') S.titles[id] = o.state.titles[id].slice(0, 40); });
			['fs', 'fs1'].forEach(function (k) {
				if (o.state[k]) ids.forEach(function (id) { var v = +o.state[k][id]; if (v >= 8 && v <= fmax(id)) S[k][id] = v; });
			});
		}
		cur = { S: S, body: body, size: o.size, fs: fs };
		function fmax(id) { return (o.fontMax && o.fontMax[id]) || 28; }
		/* the sizes of the mode shown */
		function fs() { return S.mode === 'single' ? S.fs1 : S.fs; }
		function tree() { return S.mode === 'single' ? S.single : S.multi; }
		function save() { clearTimeout(saveT); saveT = setTimeout(function () { o.save(clone(S)); }, 300); }
		function win(id) { return document.getElementById('t-' + id); }
		function body(id) { var w = win(id); return w && (w.querySelector('.body') || w); }
		function title(id) { return S.titles[id] || o.wins[ids.indexOf(id)].title; }

		/* ---- placing ---- */
		function place(e, r) { e.style.left = r[0] + 'px'; e.style.top = r[1] + 'px'; e.style.width = Math.max(0, r[2]) + 'px'; e.style.height = Math.max(0, r[3]) + 'px'; }
		function walk(n, r, gut, out) {
			if (typeof n === 'string') { out[n] = r; return; }
			var v = n.d === 'v', len = v ? r[3] : r[2], g = gut ? GUT : 0;
			var sa = Math.round(Math.max(Math.min(MIN, len / 2), Math.min(len - g - Math.min(MIN, len / 2), (len - g) * n.r)));
			var ra = v ? [r[0], r[1], r[2], sa] : [r[0], r[1], sa, r[3]];
			var rb = v ? [r[0], r[1] + sa + g, r[2], r[3] - sa - g] : [r[0] + sa + g, r[1], r[2] - sa - g, r[3]];
			if (gut) bars.push({ n: n, r: v ? [r[0], r[1] + sa, r[2], g] : [r[0] + sa, r[1], g, r[3]], box: r });
			walk(n.a, ra, gut, out); walk(n.b, rb, gut, out);
		}
		var lastMode = S.mode;
		wm.apply = function () {
			var single = S.mode === 'single', t = tree(), shown = leaves(t), rects = {};
			if (S.mode !== lastMode) { lastMode = S.mode; ids.forEach(fontSet); }
			area.classList.toggle('wm-single', single);
			bars = [];
			walk(t, [0, 0, area.clientWidth, area.clientHeight], !single, rects);
			ids.forEach(function (id) { var w = win(id); if (w) w.classList.toggle('wm-off', shown.indexOf(id) < 0); });
			shown.forEach(function (id) { place(win(id), rects[id]); });
			/* bar elements are reused (a bar being dragged must survive) */
			while (barEls.length > bars.length) barEls.pop().remove();
			while (barEls.length < bars.length) {
				var e = el('div', 'wm-bar'); e.title = 'Drag to resize'; area.appendChild(e); barEls.push(e);
				e.addEventListener('pointerdown', function (ev) { resize(this, ev); });
			}
			bars.forEach(function (b, i) { var e = barEls[i]; e._b = b; e.className = 'wm-bar ' + b.n.d + (e.classList.contains('drag') ? ' drag' : ''); place(e, b.r); });
			wm.rects = rects;
			o.layout(rects);
			if (menu) syncMenu();
		};
		function resize(e, ev) {
			e.setPointerCapture(ev.pointerId); e.classList.add('drag');
			var g = area.getBoundingClientRect(), b = e._b, v = b.n.d === 'v';
			function move(m) {
				b = e._b;
				var p = v ? m.clientY - g.top - b.box[1] : m.clientX - g.left - b.box[0], len = v ? b.box[3] : b.box[2];
				/* nested parallel bars keep their absolute position: only this edge moves */
				var k = v ? 1 : 0, keep = bars.filter(function (x) { return x.n !== b.n && x.n.d === b.n.d && leaves(x.n).every(function (id) { return leaves(b.n).indexOf(id) >= 0; }); })
					.map(function (x) { return [x.n, x.r[k]]; });
				b.n.r = Math.max(0.03, Math.min(0.97, p / (len - GUT)));
				keep.forEach(function (q) {     /* pre-order: parents fixed before children */
					bars = []; walk(tree(), [0, 0, area.clientWidth, area.clientHeight], true, {});
					var nb = bars.filter(function (x) { return x.n === q[0]; })[0];
					q[0].r = Math.max(0.03, Math.min(0.97, (q[1] - nb.box[k]) / (nb.box[k + 2] - GUT)));
				});
				wm.apply();
			}
			function up() { e.classList.remove('drag'); e.removeEventListener('pointermove', move); e.removeEventListener('pointerup', up); save(); }
			e.addEventListener('pointermove', move); e.addEventListener('pointerup', up);
			ev.preventDefault();
		}

		/* ---- show / hide, mode ---- */
		wm.shown = function (id) { return leaves(tree()).indexOf(id) >= 0; };
		function toggle(id, on) {
			if (S.mode === 'single') S.mode = 'multi';
			if (!on) { var t = remove(S.multi, id); if (t) S.multi = t; }
			else if (!wm.shown(id)) {        /* split the biggest window along its long side */
				var best = null, r = wm.rects;
				leaves(S.multi).forEach(function (k) { if (r[k] && (!best || r[k][2] * r[k][3] > r[best][2] * r[best][3])) best = k; });
				var wide = best && r[best][2] > r[best][3] * 1.6;
				S.multi = best ? replace(S.multi, best, { d: wide ? 'h' : 'v', r: 0.6, a: best, b: id }) : id;
			}
			wm.apply(); save();
		}
		wm.reset = function () { var t = S.titles; S = fresh(); cur.S = S; lastMode = S.mode; ids.forEach(function (id) { titleEl(id); fontSet(id); }); wm.apply(); save(); };

		/* ---- title bars: hover buttons, rename, drag to rearrange ---- */
		function titleEl(id) { var w = win(id), n = w && w.querySelector('.t .name'); if (n) n.textContent = title(id); }
		function rename(id, nameEl) {
			var i = el('input'), fin = false; i.value = title(id); nameEl.replaceWith(i); i.focus(); i.select();
			function done(ok) {
				if (fin || !i.parentNode) return;   /* Enter, then the blur that removing the input fires */
				fin = true;
				if (ok) { var v = i.value.trim(); if (v && v !== o.wins[ids.indexOf(id)].title) S.titles[id] = v; else delete S.titles[id]; save(); }
				i.replaceWith(nameEl); titleEl(id); if (menu) buildMenu();
			}
			i.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
			i.addEventListener('blur', function () { done(true); });
		}
		function btn(txt, tip, f) { var b = el('button', '', txt); b.title = tip; b.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); }); b.addEventListener('click', function (e) { e.stopPropagation(); f(); }); return b; }
		ids.forEach(function (id) {
			var w = win(id); if (!w) return;
			var t = w.querySelector('.t');
			if (!t) { t = el('div', 't'); t.appendChild(el('span', 'name')); w.insertBefore(t, w.firstChild); }
			var nm = t.querySelector('.name'), bs = el('span', 'wm-btns');
			bs.appendChild(btn('✎', 'Rename this window', function () { rename(id, nm); }));
			if (id !== o.noFont) { bs.appendChild(btn('A−', 'Smaller text', function () { fontBy(id, -1); })); bs.appendChild(btn('A+', 'Bigger text', function () { fontBy(id, 1); })); }
			bs.appendChild(btn('×', 'Close this window (Windows menu brings it back)', function () { toggle(id, false); }));
			t.appendChild(bs); titleEl(id); fontSet(id);
			nm.addEventListener('dblclick', function () { rename(id, nm); });
			t.addEventListener('pointerdown', function (e) { if (e.button === 0 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') drag(id, e); });
		});
		function fontSet(id) { var b = body(id), f = fs(); if (b) b.style.fontSize = f[id] ? f[id] + 'px' : ''; }
		function fontBy(id, d) {
			var f = fs();
			f[id] = Math.max(8, Math.min(fmax(id), Math.round(window.RvipWM.fontSize(id)) + d));
			fontSet(id); if (o.zoom && o.zoom[id]) o.zoom[id](f[id], d); save();
		}
		wm.zoomed = function (id) { return fs()[id] || 0; };
		function drag(id, e0) {
			var g = area.getBoundingClientRect(), target = null, side = null, moved = false;
			function hit(m) {
				var x = m.clientX - g.left, y = m.clientY - g.top; target = null;
				leaves(S.multi).forEach(function (k) { var r = wm.rects[k]; if (r && x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) target = k; });
				if (!target || target === id) { drop.hidden = true; target = null; return; }
				var r = wm.rects[target], fx = (x - r[0]) / r[2], fy = (y - r[1]) / r[3];
				side = Math.abs(fx - 0.5) < 0.25 && Math.abs(fy - 0.5) < 0.25 ? 'swap' : Math.abs(fx - 0.5) > Math.abs(fy - 0.5) ? (fx < 0.5 ? 'l' : 'r') : (fy < 0.5 ? 't' : 'b');
				var d = side === 'swap' ? r : side === 'l' ? [r[0], r[1], r[2] / 2, r[3]] : side === 'r' ? [r[0] + r[2] / 2, r[1], r[2] / 2, r[3]] : side === 't' ? [r[0], r[1], r[2], r[3] / 2] : [r[0], r[1] + r[3] / 2, r[2], r[3] / 2];
				place(drop, d); drop.hidden = false;
			}
			function move(m) { if (!moved && Math.abs(m.clientX - e0.clientX) + Math.abs(m.clientY - e0.clientY) < 6) return; moved = true; hit(m); }
			function up() {
				document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
				drop.hidden = true;
				if (!target) return;
				if (side === 'swap') { S.multi = replace(replace(S.multi, target, '\u0000'), id, target); S.multi = replace(S.multi, '\u0000', id); }
				else {
					var t = remove(S.multi, id), first = side === 'l' || side === 't';
					S.multi = replace(t, target, { d: side === 'l' || side === 'r' ? 'h' : 'v', r: 0.5, a: first ? id : target, b: first ? target : id });
				}
				wm.apply(); save();
			}
			if (S.mode !== 'multi') return;
			document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
		}

		/* ---- Windows drop-down in the top bar ---- */
		function buildMenu() {
			menu.innerHTML = '';
			[['multi', 'Multi-window'], ['single', 'One window']].forEach(function (m) {
				var l = el('label'), i = el('input'); i.type = 'radio'; i.name = 'wm-mode'; i.value = m[0];
				i.onchange = function () { S.mode = m[0]; wm.apply(); save(); };
				l.appendChild(i); l.appendChild(document.createTextNode(m[1])); menu.appendChild(l);
			});
			menu.appendChild(el('hr'));
			ids.forEach(function (id) {
				var l = el('label'), i = el('input'); i.type = 'checkbox'; i.dataset.id = id;
				i.onchange = function () { toggle(id, i.checked); };
				l.appendChild(i); l.appendChild(document.createTextNode(title(id))); menu.appendChild(l);
			});
			menu.appendChild(el('hr'));
			menu.appendChild(btn('Reset windows', 'Default layout, sizes and titles', function () { wm.reset(); if (o.onReset) o.onReset(); }));
			syncMenu();
		}
		function syncMenu() {
			menu.querySelectorAll('input[name=wm-mode]').forEach(function (i) { i.checked = i.value === S.mode; });
			menu.querySelectorAll('input[type=checkbox]').forEach(function (i) { i.checked = S.mode === 'multi' && wm.shown(i.dataset.id); });
		}
		if (o.menu) {
			var b = o.menu; b.textContent = 'Windows ▾'; b.title = 'Window layout: one or multi-window, show or hide windows';
			var nb = b.cloneNode(true); b.replaceWith(nb); b = nb;   /* drop the game's old reset handler */
			menu = el('div'); buildMenu(); window.RvipWM.dropdown(b, menu);
		}
		wm.state = function () { return clone(S); };
		/* 'multi' or 'single'; with m, switch to it */
		wm.mode = function (m) { if (m && m !== S.mode) { S.mode = m; wm.apply(); save(); } return S.mode; };
		return wm;
	};
	/* ---- top-bar drop-down: button b opens element menu below it; one open
	 * at a time; a click outside, Esc or a button in it closes it ---- */
	var drops = [], cur = null;
	/* the size A− / A+ gave window id (px), else the game's size[id](), else its body's CSS font-size */
	window.RvipWM.fontSize = function (id) {
		var b = cur && cur.body(id), z = cur && cur.size && cur.size[id];
		return (cur && cur.fs()[id]) || (z && +z()) || (b && parseFloat(getComputedStyle(b).fontSize)) || 13;
	};

	window.RvipWM.dropdown = function (b, menu) {
		addCSS(); menu.classList.add('wm-menu'); menu.hidden = true; document.body.appendChild(menu); drops.push(menu);
		b.addEventListener('click', function (e) {
			e.stopPropagation();
			var open = menu.hidden;
			drops.forEach(function (m) { m.hidden = true; });
			if (!open) return;
			var r = b.getBoundingClientRect(); menu.style.left = r.left + 'px'; menu.style.top = r.bottom + 4 + 'px'; menu.hidden = false;
		});
		menu.addEventListener('click', function (e) { e.stopPropagation(); if (e.target.tagName === 'BUTTON') menu.hidden = true; });
		document.addEventListener('click', function () { menu.hidden = true; });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { menu.hidden = true; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
	};
	/* ---- shared content helpers ---- */
	/* Visible window: s = lines "M<glyph><name>[\t<css colour>]" (monster) or
	 * "I<glyph><name>[\t<css colour>]" (item); name and colour come from the
	 * game (RVIP W0), nothing is guessed here */
	/* icon(t): optional, an element for the tile number after the colour field */
	window.RvipWM.visible = function (body, s, icon) {
		if (body._vis === s) return;
		body._vis = s;
		var mon = [], itm = [];
		s.split('\n').forEach(function (l) {
			if (!l) return;
			var g = l.charAt(1), f = l.slice(2).split('\t'), name = f[0], col = f[1] || null;
			if (l.charAt(0) === 'M') mon.push([g, name, col, f[2]]);
			else itm.push([g, name, col, f[2]]);
		});
		function group(rows) {                     /* "3 × giant rat" */
			var out = [], seen = {};
			rows.forEach(function (r) { var k = r[0] + r[1]; if (seen[k]) seen[k][3]++; else out.push(seen[k] = [r[0], r[1], r[2], 1, r[3]]); });
			return out;
		}
		body.innerHTML = '';
		[['Monsters', group(mon)], ['Items', group(itm)]].forEach(function (sec) {
			var h = document.createElement('div'); h.className = 'wm-vh'; h.textContent = sec[0] + (sec[1].length ? '' : ': none'); body.appendChild(h);
			sec[1].forEach(function (r) {
				var d = document.createElement('div'), b = document.createElement('b');
				b.textContent = r[0]; if (r[2]) b.style.color = d.style.color = r[2];
				var ic = icon && r[4] !== undefined && icon(+r[4]);
				d.appendChild(ic || b); d.appendChild(document.createTextNode(' ' + (r[3] > 1 ? r[3] + ' × ' : '') + r[1]));
				body.appendChild(d);
			});
		});
	};
	/* Message window, a div per line in list l, last 500 kept, following the end
	 * if it was there. A line is a string or {t, cls, color} (colour from the
	 * game). A repeat of the line above becomes "line (xN)", for games that
	 * don't fold their own; dataset.s holds the line as sent.
	 * RvipWM.log(l, line) appends, RvipWM.log(l, line, true) replaces the last
	 * line (a game that folds its own repeats), RvipWM.setLog(l, lines) replaces
	 * them all. */
	function logAdd(l, m) {
		if (typeof m === 'string') m = { t: m };
		var d = l.lastChild;
		if (d && d.dataset.s === m.t && d.className === (m.cls || '')) { d.textContent = m.t + ' (x' + (d.dataset.n = +d.dataset.n + 1) + ')'; return; }
		d = document.createElement('div'); d.dataset.s = m.t; d.dataset.n = 1; d.textContent = m.t;
		if (m.cls) d.className = m.cls;
		if (m.color) d.style.color = m.color;
		l.appendChild(d);
		if (l.childNodes.length > 500) l.removeChild(l.firstChild);
	}
	function logEnd(l, f) { f(); l.scrollTop = l.scrollHeight; }
	/* The map camera (RVIP.md W4), one for every game: the game sends the player's map cell, the page
	   calls this with the player's centre (x, y) in the map canvas `cv` (w × h px, shown in a vw × vh
	   window; default: its parent). Player centred, clamped at the map edges; a map smaller than its
	   window is centred. Sets the canvas margins, returns the offset { x, y }. */
	window.RvipWM.center = function (cv, x, y, w, h, vw, vh) {
		function ax(c, size, view) { return size <= view ? -Math.floor((view - size) / 2) : Math.max(0, Math.min(size - view, Math.round(c - view / 2))); }
		var o = { x: ax(x, w, vw || cv.parentNode.clientWidth), y: ax(y, h, vh || cv.parentNode.clientHeight) };
		cv.style.marginLeft = -o.x + 'px'; cv.style.marginTop = -o.y + 'px';
		return o;
	};
	/* Prompt line over the map (RVIP.md 5 / W4): the game's live message row (questions,
	 * -more-, the newest message). Shown while it has text. A key hides it only when the
	 * game waits for a command, so a question stays up until answered; a poll from inside
	 * a question brings it back. The game feeds both: RvipWM.prompt.text(s) whenever its
	 * message row changes, RvipWM.prompt.wait(atCmd) from every key poll. */
	window.RvipWM.prompt = (function () {
		var node = null, txt = '', atCmd = true;
		function box() {
			if (node) return node;
			var body = document.querySelector('#t-map .body, #t-main .body') || document.body;
			if (getComputedStyle(body).position === 'static') body.style.position = 'relative';
			node = el('div', 'wm-topl'); node.hidden = true; body.appendChild(node);
			return node;
		}
		document.addEventListener('keydown', function () { if (atCmd && node) node.hidden = true; });
		return {
			text: function (s) { s = (s || '').replace(/\s+$/, ''); if (s === txt) return; txt = s; box().textContent = s; box().hidden = !s; },
			wait: function (a) { atCmd = !!a; if (!atCmd && txt) box().hidden = false; }
		};
	})();
	/* Pop-up over the map (menus, lists, multi-line questions). It starts inside the map
	 * window's body, never over its title bar, and stays inside the game area (it may
	 * spread over the windows right of / below the map; it scrolls when larger).
	 * RvipWM.popup(pop) puts it at the body's top-left; o.x shifts it right by o.x px
	 * (clamped so it stays inside); o.center centres it on the body. Call it after the
	 * pop-up is filled and shown. RvipWM.popupBox() = the room it has, {w, h}. */
	function popRect(pop) {
		var body = document.querySelector('#t-map .body, #t-main .body'), par = pop ? pop.offsetParent : body && body.offsetParent;
		if (!body || !par) return null;
		var r = body.getBoundingClientRect(), g = par.getBoundingClientRect();
		return { x: r.left - g.left, y: r.top - g.top, bw: r.width, bh: r.height, w: g.right - r.left, h: g.bottom - r.top };
	}
	window.RvipWM.popupBox = function () { var r = popRect(); return r ? { w: r.w, h: r.h } : { w: 0, h: 0 }; };
	window.RvipWM.popup = function (pop, o) {
		o = o || {};
		var r = popRect(pop);
		if (!r) return;
		pop.style.maxWidth = r.w + 'px'; pop.style.maxHeight = r.h + 'px';
		var w = pop.offsetWidth, h = pop.offsetHeight;
		pop.style.left = r.x + (o.center ? Math.max(0, (r.bw - w) / 2) : Math.max(0, Math.min(r.w - w, o.x || 0))) + 'px';
		pop.style.top = r.y + (o.center ? Math.max(0, (r.bh - h) / 2) : 0) + 'px';
	};
	window.RvipWM.log = function (l, m, replace) { logEnd(l, function () { if (replace && l.lastChild) l.removeChild(l.lastChild); logAdd(l, m); }); };
	window.RvipWM.setLog = function (l, ms) { logEnd(l, function () { l.textContent = ''; ms.forEach(function (m) { logAdd(l, m); }); }); };
	/* Run report (roguelikes-index/server/CONTRACT.md). q = "g=..&ev=..&..." without id/at.
	   Stamps a unique run id + end time, keeps it in an IndexedDB outbox ('rvip-outbox';
	   never localStorage) and resends (on every page load and when back online) until the
	   server answers 2xx: a win is never lost. */
	var outDB = null;
	function outbox(op, url, done) {                /* op: 'put' | 'del' | 'all' */
		function fail() { if (done) done([]); }
		function run(d) {
			try {
				var st = d.transaction('urls', op === 'all' ? 'readonly' : 'readwrite').objectStore('urls');
				var q = op === 'put' ? st.put(url, url) : op === 'del' ? st.delete(url) : st.getAll();
				q.onsuccess = function () { if (done) done(q.result || []); };
				q.onerror = fail;
			} catch (e) { fail(); }
		}
		if (outDB) return run(outDB);
		try {
			var r = indexedDB.open('rvip-outbox', 1);
			r.onupgradeneeded = function () { r.result.createObjectStore('urls'); };
			r.onsuccess = function () { outDB = r.result; run(outDB); };
			r.onerror = fail;
		} catch (e) { fail(); }
	}
	function send(url) {
		return fetch(url, { keepalive: true, cache: 'no-store' }).then(function (r) {
			if (r.ok) outbox('del', url);
		}).catch(function () { /* offline: stays in the outbox */ });
	}
	window.RvipWM.flush = function () { outbox('all', null, function (l) { l.forEach(send); }); };
	window.RvipWM.report = function (q) {
		var url = '/roguelikes/beacon?' + q + '&id=' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + '&at=' + Date.now();
		outbox('put', url, function () { send(url); });
	};
	/* reports a page before 2026-09-28 left in the old localStorage outbox: moved over once */
	try {
		var old = JSON.parse(window.localStorage.getItem('rvip-outbox') || '[]');
		window.localStorage.removeItem('rvip-outbox');
		old.forEach(function (u) { outbox('put', u); });
	} catch (e) { /* none */ }
	window.addEventListener('online', window.RvipWM.flush);
	setTimeout(window.RvipWM.flush, 3000);
})();
