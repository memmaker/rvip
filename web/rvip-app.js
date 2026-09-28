/*
 * rvip-app.js: the app code every RVIP web port shares (saves, help, crashes).
 * The only copy: games load it as ../rvip-app.js; roguelikes-index/deploy.sh uploads it.
 *
 *   var app = RvipApp({
 *     name: 'hack',                                  // console tag; errors from <name>-core*.js are crashes
 *     save: function () { return path || null; },   // the save file in Module.FS (Export save); an array of
 *                                                    //   paths = one JSON bundle {key: base64} (<name>-save.json)
 *     clear: function () {},                          // delete the save files (New game, Import save); may return a Promise
 *     put: function (file, data) { return err; },     // write an imported save (Uint8Array); a string = refuse with that
 *                                                    //   message; a bundle calls it once per file with {name: key}; may be async
 *     exportName: function (path) {},                 // optional: download name (default: basename)
 *     flush: function (done) {},                      // optional: have the game write its save first, then done()
 *     helpText: '...',                                // optional: shown if help.html won't load
 *     noSave: '...',                                  // optional: Export message when there is no save yet
 *     root: '/game',                                  // optional: bundle keys are paths minus this (default: basename)
 *     read: function (path) {},                       // optional: bytes (or a Promise) of a save outside Module.FS
 *     sync: function (cb) {},                         // optional: persist a store outside Module.FS, then cb(err)
 *     newGame: function () {}                         // optional: replaces New game (e.g. restart only, saves kept)
 *   });
 *   save/read may return Promises. Bundles import whatever their file name if the file parses as one.
 *   app.running  (the game sets it true in onRuntimeInitialized; false stops key handling)
 *   app.status(msg, isError);  app.sync(cb);  app.crashed(err)  (Module.onAbort)
 *   app.exportSave(); app.importSave(file); app.newGame(); app.toggleHelp()
 * RvipApp.dir: the game's IndexedDB folder, '/' + its URL folder (unique on the server, so no two games
 *   share one: IDBFS names the database after the mount point). RvipApp.mount(err => ..., old) mounts and
 *   loads it; old = { dir: '/save', files: ['x.sav'] } moves those files over once from a folder used before.
 * Buttons it wires if present: #btn-export #btn-import #import-file #btn-new #btn-help #help-close;
 * #status, #help, #help-body as in every game's index.html. While help is open it takes all keys.
 */
(function () {
	'use strict';
	function $(id) { return document.getElementById(id); }

	var dir = '/' + (location.pathname.split('/').filter(function (p) { return p && !/\./.test(p); }).pop() || 'game');

	function mount(done, old) {
		var F = Module.FS;
		F.mkdirTree(dir); F.mount(Module.IDBFS, {}, dir);
		F.syncfs(true, function (err) {
			if (!old || old.files.some(function (f) { return F.analyzePath(dir + '/' + f).exists; })) return done(err);
			/* only if that database exists: mounting it would create an empty one on every load */
			(indexedDB.databases ? indexedDB.databases() : Promise.resolve([{ name: old.dir }])).then(function (dbs) {
				if (dbs.some(function (d) { return d.name === old.dir; })) move(err); else done(err);
			}, function () { done(err); });
		});
		function move(err) {
			F.mkdirTree(old.dir); F.mount(Module.IDBFS, {}, old.dir);
			F.syncfs(true, function () {
				old.files.forEach(function (f) {
					try { F.writeFile(dir + '/' + f, F.readFile(old.dir + '/' + f)); F.unlink(old.dir + '/' + f); } catch (e) { /* not there */ }
				});
				F.syncfs(false, function () { F.unmount(old.dir); F.syncfs(false, function () { done(err); }); });
			});
		}
	}

	window.RvipApp = function (o) {
		var app = { running: false }, syncing = false, again = false, cbs = [], helpLoaded = false;
		function FS() { return window.Module && Module.FS; }

		app.status = function (msg, isError) { var s = $('status'); if (!s) return; s.textContent = msg; s.className = isError ? 'error' : ''; s.hidden = !msg; };
		function flash(msg) { app.status(msg, true); setTimeout(function () { app.status(''); }, 2000); }

		/* write IDBFS to IndexedDB; cb(err) when done; calls during a sync join the next one */
		app.sync = function (cb) {
			if (!o.sync && !FS()) { if (cb) cb(); return; }
			if (typeof cb === 'function') cbs.push(cb);
			if (syncing) { again = true; return; }
			syncing = true;
			var mine = cbs; cbs = [];
			(o.sync || function (f) { FS().syncfs(false, f); })(function (err) {
				syncing = false;
				if (err) app.status('Saving to browser storage (IndexedDB) failed: ' + err + '. Use "Export save" to keep a copy.', true);
				mine.forEach(function (f) { f(err); });
				if (again) { again = false; app.sync(); }
			});
		};
		function reload(err) { if (!err) location.reload(); }

		function b64(u8) { var t = ''; for (var i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); }
		function unb64(t) { var b = atob(t), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
		function read(p) { return Promise.resolve(o.read ? o.read(p) : FS().readFile(p)); }
		function key(p) { return o.root && p.indexOf(o.root) === 0 ? p.slice(o.root.length) : p.split('/').pop(); }
		function download(data, name) {
			var a = document.createElement('a');
			a.href = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
			a.download = name;
			document.body.appendChild(a); a.click();
			setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
		}
		function fail(err) { app.status('Export failed: ' + (err && err.message || err), true); }
		app.exportSave = function () {
			(o.flush && app.running ? o.flush : function (f) { f(); })(function () {
				Promise.resolve(o.save()).then(function (p) {
					if (!p || !p.length) { flash(o.noSave || 'There is no saved game yet.'); return; }
					if (!Array.isArray(p)) return read(p).then(function (d) { download(d, o.exportName ? o.exportName(p) : p.split('/').pop()); });
					return Promise.all(p.map(read)).then(function (ds) {
						var bundle = {};
						p.forEach(function (f, i) { bundle[key(f)] = b64(ds[i]); });
						download(JSON.stringify(bundle), o.name + '-save.json');
					});
				}).catch(fail);
			});
		};
		/* a bundle: a JSON object of base64 strings -> [[key, bytes], ...], else null */
		function unbundle(data) {
			if (data[0] !== 123) return null;   /* '{' */
			try {
				var b = JSON.parse(new TextDecoder().decode(data)), ks = Object.keys(b);
				if (!ks.length || ks.some(function (k) { return typeof b[k] !== 'string'; })) return null;
				return ks.map(function (k) { return [k, unb64(b[k])]; });
			} catch (e) { return null; }
		}
		app.importSave = function (file) {
			var r = new FileReader();
			r.onload = function () {
				if (!confirm('Replace the current game with "' + file.name + '"?')) return;
				app.running = false;
				var data = new Uint8Array(r.result), list = unbundle(data) || [[null, data]];
				Promise.resolve(o.clear()).then(function () {
					return list.reduce(function (pr, e) {
						return pr.then(function (err) { return typeof err === 'string' ? err : o.put(e[0] === null ? file : { name: e[0] }, e[1]); });
					}, Promise.resolve());
				}).then(function (err) {
					if (typeof err === 'string') { app.status(err, true); return; }
					app.sync(reload);
				}).catch(function (err) { app.status('Import failed: ' + (err && err.message || err), true); });
			};
			r.readAsArrayBuffer(file);
		};
		app.newGame = function () {
			if (o.newGame) return o.newGame();
			if (!confirm('Delete the saved game in this browser and start a new one?')) return;
			app.running = false;
			Promise.resolve(o.clear()).then(function () { app.sync(reload); });
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
	RvipApp.dir = dir;
	RvipApp.mount = mount;
})();
