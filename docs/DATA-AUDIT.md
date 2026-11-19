# Campus data audit (nothing was changed)

`site/data/places.js` is **byte-identical** to the file you uploaded (SHA-256 in `docs/places.js.sha256`). The automated test also evaluates both files and
checks all 115 records (names, categories, coordinates, flags) are equal. The app only *reads* this file. No coordinate was generated, rounded or moved.

- 115 directory entries: **79 with coordinates**, 36 without.
- Without coordinates (shown as "not mapped yet", never as pins): Hostel Reception, Student Help / Information Desk, Uni-Hospital, Blocks 2–13, 16, 17, 19–24, 29, 30, 40, 41, 42–50 (numbered entries only; Block 41D exists separately as a hostel with coordinates).
- Duplicate ids: none.

## Questionable entries — reported, NOT changed
Please check these on site or in your source notes:

| Entries | Finding |
|---|---|
| `block-55` / `school-mechanical-engineering-block55` | identical coordinates (same building listed twice) |
| `block-56` / `school-civil-engineering-block56` | identical coordinates |
| `block-57` / `school-agriculture-block57` | identical coordinates |
| `block-38` / `lpu-startup-school` | 4 m apart — likely the same building or one mislabelled |
| `block-36` / `school-electronics-electrical` | 12 m apart |
| `block-33` / `block-34` | 15 m apart (Block 34 pin is a community-reported approximation, per the comment in the file) |
| `school-film-production` / `management-block` | 14 m apart |
| `school-hotel-management` vs `block-15` (Lovely School of Hospitality) | ~ 5 m apart; possibly the same building under two names |
| `girls-hostels-area` | an "area reference", not a single building |
| `campus-center` | general area point, not a building entrance |

## Behaviour change to be aware of
The earlier release auto-filled *missing* block coordinates from OpenStreetMap features whose name matched "Block N", and let a user click an OSM
footprint to assign coordinates to a selected directory entry. Those two shortcuts were **not ported**, because they silently created unverified
coordinates in the directory. Saved overrides from the old release (`lpu-directory-coordinate-overrides-v1`) are still read if present.
To add coordinates for the 36 missing entries, edit `site/data/places.js` (or `src/` data) with field-verified values, or use the Contributor tools to export GeoJSON.
