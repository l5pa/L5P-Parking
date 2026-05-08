// Map engine loader — picks Leaflet (default) or Google Maps based on
// the ?engine= URL param, then injects the right vendor assets and
// engine module. Fires `mapEngineReady` when done so app.js can
// instantiate POIMap.
(function () {
    'use strict';

    const URL_PARAM = 'engine';
    const DEFAULT_ENGINE = 'leaflet';

    function readEngine() {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get(URL_PARAM);
        if (fromUrl === 'google' || fromUrl === 'leaflet') return fromUrl;
        return DEFAULT_ENGINE;
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load script ' + src));
            document.head.appendChild(s);
        });
    }

    function loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error('Failed to load stylesheet ' + href));
            document.head.appendChild(link);
        });
    }

    async function loadLeaflet() {
        await loadStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        await loadScript('src/map.js');
    }

    async function loadGoogle() {
        const cfg = window.APP_CONFIG || {};
        if (!cfg.GOOGLE_MAPS_API_KEY) {
            console.error('[engine-loader] GOOGLE_MAPS_API_KEY missing — falling back to Leaflet');
            return loadLeaflet();
        }
        if (!cfg.GOOGLE_MAPS_ID) {
            console.error('[engine-loader] GOOGLE_MAPS_ID missing — AdvancedMarkerElement will not render correctly');
        }
        // Google Maps dynamic library import bootstrap
        // Source: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
        ((g) => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(), u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a); })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)); })({
            key: cfg.GOOGLE_MAPS_API_KEY,
            v: 'weekly'
        });
        await loadScript('src/map-google.js');
    }

    async function init() {
        const engine = readEngine();
        try {
            if (engine === 'google') {
                await loadGoogle();
            } else {
                await loadLeaflet();
            }
            window.dispatchEvent(new CustomEvent('mapEngineReady', { detail: { engine } }));
        } catch (err) {
            console.error('[engine-loader] Failed to load engine "' + engine + '":', err);
        }
    }

    init();
})();
