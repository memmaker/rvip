/*
 * rvip-app.js: the app code every RVIP web port shares (saves, help, crashes).
 * The only copy: games load it as ../rvip-app.js; roguelikes-index/deploy.sh uploads it.
 *
 *   var app = RvipApp({
 *     name: 'hack',                                  // console tag; errors from <name>-core*.js are crashes
 *     save: function () { return path || null; },   // the save file in Module.FS (Export save)
 *     clear: function () {},                          // delete the save files (New game, Import save)
 *     put: function (file, data) { return err; },     // write an imported save (Uint8Array); a string = refuse with that message
 *     exportName: function (path) {},                 // optional: download name (default: basename)
 *     flush: function (done) {},                      // optional: have the game write its save first, then done()
 *     helpText: '...'                                 // optional: shown if help.html won't load
 *   });
 *   app.running  (the game sets it true in onRuntimeInitialized; false stops key handling)
 *   app.status(msg, isError);  app.sync(cb);  app.crashed(err)  (Module.onAbort)
 *   app.exportSave(); app.importSave(file); app.newGame(); app.toggleHelp()
 * Buttons it wires if present: #btn-export #btn-import #import-file #btn-new #btn-help #help-close;
 * #status, #help, #help-body as in every game's index.html. While help is open it takes all keys.
 */
(function () {
	'use strict';
	function $(id) { return document.getElementById(id); }

	window.RvipApp = function (o) {
		var app = { running: false }, syncing = false, again = false, cbs = [], helpLoaded = false;
		function FS() { return window.Module && Module.FS; }

		app.status = function (msg, isError) { var s = $('status'); if (!s) return; s.textContent = msg; s.className = isError ? 'error' : ''; s.hidden = !msg; };
		function flash(msg) { app.status(msg, true); setTimeout(function () { app.status(''); }, 2000); }

		/* write IDBFS to IndexedDB; cb(err) when done; calls during a sync join the next one */
		app.sync = function (cb) {
			if (!FS()) { if (cb) cb(); return; }
			if (typeof cb === 'function') cbs.push(cb);
			if (syncing) { again = true; return; }
			syncing = true;
			var mine = cbs; cbs = [];
			FS().syncfs(false, function (err) {
				syncing = false;
				if (err) app.status('Saving to browser storage (IndexedDB) failed: ' + err + '. Use "Export save" to keep a copy.', true);
				mine.forEach(function (f) { f(err); });
				if (again) { again = false; app.sync(); }
			});
		};
		function reload(err) { if (!err) location.reload(); }

		app.exportSave = function () {
			(o.flush && app.running ? o.flush : function (f) { f(); })(function () {
				var p = o.save();
				if (!p) { flash('There is no saved game yet.'); return; }
				var a = document.createElement('a');
				a.href = URL.createObjectURL(new Blob([FS().readFile(p)], { type: 'application/octet-stream' }));
				a.download = o.exportName ? o.exportName(p) : p.split('/').pop();
				document.body.appendChild(a); a.click();
				setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
			});
		};
		app.importSave = function (file) {
			var r = new FileReader();
			r.onload = function () {
				if (!confirm('Replace the current game with "' + file.name + '"?')) return;
				app.running = false;
				o.clear();
				var err = o.put(file, new Uint8Array(r.result));
				if (typeof err === 'string') { app.status(err, true); return; }
				app.sync(reload);
			};
			r.readAsArrayBuffer(file);
		};
		app.newGame = function () {
			if (!confirm('Delete the saved game in this browser and start a new one?')) return;
			app.running = false;
			o.clear();
			app.sync(reload);
		};

		app.crashed = function (err) {
			if (!app.running) return;
			app.running = false;
			var msg = (err && (err.message || err.reason && err.reason.message)) || String(err);
			console.error('[' + o.name + '] crash:', err);
			app.status('The game crashed (' + msg + '). Reload the page to continue from the last save.', true);
		};
		window.addEventListener('unhandledrejection', function (e) {
			if (e.reason && e.reason.name === 'ExitStatus') return;   /* exit() is the normal end */
			app.crashed(e.reason);
		});
		window.addEventListener('error', function (e) {
			if (e.error && e.error.name === 'ExitStatus') return;
			if (e.error instanceof WebAssembly.RuntimeError || (e.filename || '').indexOf(o.name + '-core') >= 0) app.crashed(e.error || e.message);
		});

		/* help: the game guide (help.html, made at build time) */
		app.toggleHelp = function () {
			var h = $('help'), b = $('help-body');
			h.hidden = !h.hidden;
			if (!h.hidden && !helpLoaded) {
				helpLoaded = true;
				fetch('help.html').then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
					.then(function (t) { b.innerHTML = t; })
					.catch(function (err) { helpLoaded = false; b.textContent = 'Could not load the guide (' + err + '). ' + (o.helpText || 'Press ? in the game for its own help.'); });
			}
			if (!h.hidden) b.focus();
		};
		document.addEventListener('keydown', function (e) {       /* capture: before the game's handler */
			var h = $('help');
			if (!h || h.hidden) return;
			if (e.key === 'Escape') { h.hidden = true; e.preventDefault(); }
			e.stopImmediatePropagation();
		}, true);

		function wire() {
			function on(id, f) { var e = $(id); if (e) e.onclick = f; }
			on('btn-export', app.exportSave);
			on('btn-import', function () { $('import-file').click(); });
			on('btn-new', app.newGame);
			on('btn-help', app.toggleHelp);
			on('help-close', app.toggleHelp);
			var f = $('import-file');
			if (f) f.onchange = function () { if (this.files[0]) app.importSave(this.files[0]); this.value = ''; };
		}
		if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
		return app;
	};
})();
