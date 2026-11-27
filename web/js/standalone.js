/* Wallpaper Engine without the Oley app: follow the player through Wallpaper Engine's own
   media integration and fetch lyrics from LRCLIB directly. Used only when the app can't be reached. */
(function () {
  'use strict';
  const O = window.Oley;
  O.Standalone = class {
    constructor(stage) {
      this.stage = stage;
      this.active = false;
      this.registered = false;
      this.track = null;
      this.thumb = null;
      this.duration = 0;
      this.playing = true;
      this.cache = {};
    }
    available() { return typeof window.wallpaperRegisterMediaPropertiesListener === 'function'; }
    start() {
      if (this.active || !this.available()) return false;
      this.active = true;
      if (!this.registered) {
        this.registered = true;
        window.wallpaperRegisterMediaPropertiesListener((e) => this.onProps(e));
        if (window.wallpaperRegisterMediaThumbnailListener) window.wallpaperRegisterMediaThumbnailListener((e) => this.onThumb(e));
        if (window.wallpaperRegisterMediaTimelineListener) window.wallpaperRegisterMediaTimelineListener((e) => this.onTimeline(e));
        if (window.wallpaperRegisterMediaPlaybackListener) window.wallpaperRegisterMediaPlaybackListener((e) => this.onPlayback(e));
      }
      return true;
    }
    stop() { this.active = false; }
    onProps(e) {
      if (!this.active || !e) return;
      if (!e.title) { this.track = null; this.stage.setTrack(null); return; }
      const id = 'we:' + (e.artist || '') + '|' + (e.title || '');
      if (this.track && this.track.id === id) return;
      this.track = { id, title: e.title, artist: e.artist || '', album: e.albumTitle || '', duration: this.duration || 0, art: this.thumb };
      this.stage.setTrack(this.track);
      this.fetchLyrics(this.track);
    }
    onThumb(e) {
      if (!this.active || !e || !e.thumbnail) return;
      this.thumb = e.thumbnail;
      if (this.track) { this.track = Object.assign({}, this.track, { art: e.thumbnail }); this.stage.setTrack(this.track); }
    }
    onTimeline(e) {
      if (!this.active || !e) return;
      this.duration = +e.duration || 0;
      this.stage.clock.report(+e.position || 0, this.playing, Date.now());
    }
    onPlayback(e) {
      if (!this.active || !e) return;
      const I = window.wallpaperMediaIntegration || {};
      this.playing = e.state === (I.PLAYBACK_PLAYING != null ? I.PLAYBACK_PLAYING : 1);
      const c = this.stage.clock;
      c.report(c.targetNow(), this.playing, Date.now());
    }
    async fetchLyrics(tr) {
      const key = tr.id;
      if (this.cache[key]) { this.stage.setLyrics(this.cache[key]); return; }
      const clean = (s) => String(s || '').replace(/\s*[([].*?(feat|ft\.|remaster|version|edit|live|mono|stereo).*?[)\]]/gi, '').replace(/\s+-\s+.*(remaster|version|edit|live).*$/i, '').trim();
      const artist = String(tr.artist || '').split(/,| & | feat\.? /i)[0].trim();
      const q = 'artist_name=' + encodeURIComponent(artist) + '&track_name=' + encodeURIComponent(clean(tr.title));
      let res = null;
      try {
        const r = await fetch('https://lrclib.net/api/get?' + q);
        if (r.ok) res = await r.json();
        if (!res || (!res.syncedLyrics && !res.plainLyrics)) {
          const s = await fetch('https://lrclib.net/api/search?' + q);
          if (s.ok) {
            const list = await s.json();
            res = (list || []).find((x) => x.syncedLyrics) || (list || [])[0] || null;
          }
        }
      } catch (e) {
        this.stage.setLyrics({ id: key, status: 'error', synced: false, lines: [] });
        return;
      }
      if (!this.track || this.track.id !== key) return;
      let out;
      if (res && res.instrumental) out = { id: key, status: 'instrumental', synced: false, lines: [] };
      else if (res && res.syncedLyrics) out = { id: key, status: 'synced', synced: true, lines: O.parseLRC(res.syncedLyrics) };
      else if (res && res.plainLyrics) out = { id: key, status: 'plain', synced: false, lines: [], plain: res.plainLyrics };
      else out = { id: key, status: 'none', synced: false, lines: [] };
      this.cache[key] = out;
      this.stage.setLyrics(out);
    }
  };
})();
