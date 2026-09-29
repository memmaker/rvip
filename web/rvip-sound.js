/* rvip-sound.js  shared RVIP web sound: the game (WASM) names the sounds,
 * this only plays them.  RVIPSound.play(['sound_Bell', ...], vol 0..1)
 * plays the files <base><name>.wav one after another (a name with its own
 * extension, 'hit.mp3', is used as is).  Browsers start
 * audio only after a user gesture, so the context resumes on first input. */
var RVIPSound = (function () {
	var ctx, base = 'sound/', cache = {}, end = 0;

	function audio() {
		if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
		if (ctx.state === 'suspended') ctx.resume();
		return ctx;
	}
	['keydown', 'pointerdown'].forEach(function (e) {
		addEventListener(e, audio, { capture: true, once: true });
	});
	function load(name) {
		return cache[name] || (cache[name] = fetch(base + name + (/\.\w+$/.test(name) ? '' : '.wav'))
			.then(function (r) { if (!r.ok) throw r.status; return r.arrayBuffer(); })
			.then(function (b) { return audio().decodeAudioData(b); })
			.catch(function () { return null; }));
	}
	return {
		base: function (b) { base = b; },
		play: function (names, vol) {
			var a = audio(), bufs = names.map(load);
			Promise.all(bufs).then(function (bs) {
				var g = a.createGain(), t = Math.max(end, a.currentTime);
				g.gain.value = vol;
				g.connect(a.destination);
				bs.forEach(function (b) {
					if (!b) return;
					var s = a.createBufferSource();
					s.buffer = b; s.connect(g); s.start(t); t += b.duration;
				});
				end = t;
			});
		}
	};
})();
