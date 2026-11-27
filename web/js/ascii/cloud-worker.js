/* Oley · ASCII 3D scenes: builds a design's points off the main thread, so playback never stutters. */
'use strict';
self.window = self;
self.Oley = {};
importScripts('cloud.js');
importScripts.apply(null, self.Oley.Cloud.FILES);
self.onmessage = (ev) => {
  const m = ev.data || {}, Cl = self.Oley.Cloud, d = Cl.find(m.name);
  if (!d) { self.postMessage({ key: m.key, err: 'no design ' + m.name, P: new Float32Array(0), L: new Float32Array(0) }); return; }
  const r = Cl.build(d, m.seed);
  r.key = m.key;
  self.postMessage(r, [r.P.buffer, r.L.buffer]);
};
