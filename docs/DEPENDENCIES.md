# External services and dependencies

| What | Used for | Notes / limits |
|---|---|---|
| Leaflet 1.9.4 (unpkg.com) | Map library | Loaded with an SRI hash (same as the original). Needed for the map; if blocked, the app shows an error state and search still works. |
| OpenStreetMap tile server (`tile.openstreetmap.org`) | Street map tiles | Subject to the OSM tile usage policy; fine for a student project, not for heavy traffic. Attribution is shown. |
| Esri World Imagery tiles | Satellite layer | Third-party terms apply; attribution shown. |
| `routing.openstreetmap.de/routed-foot` (OSRM) | Walking routes | Free community demo server. No API key. No SLA; may rate-limit or go down. Receives start + destination coordinates only after the user confirms. For serious traffic use a provider with an SLA (e.g. OpenRouteService, Mapbox, GraphHopper) — those need an API key and a small backend/proxy to keep the key private. |
| Overpass API (`overpass-api.de`, `overpass.kumi.systems`) | Optional extra OSM building/POI layer | Only when the user presses "Load campus map data". Public servers with usage limits. |
| cdnjs — Leaflet.draw 1.0.4 | Boundary drawing for contributors | Loaded only on demand; no SRI hash. |
| Browser APIs | Geolocation, localStorage, Service Worker, `<dialog>` | Geolocation needs HTTPS (or localhost) and user permission. |
| Hosting | Netlify or Cloudflare Pages (free tiers are enough) | Provides HTTPS. |

**Removed:** Google Fonts (privacy + render-blocking). The site uses the system font stack. **No** analytics, ads, cookies, accounts, backend or API keys.
