# Chrome Web Store assets

Everything needed for the store entry, so the next update does not start from a
blank form.

| File | Purpose |
|---|---|
| `listing-en.md` | English name, summary and description, ready to paste |
| `listing-de.md` | German locale, the honest way to rank for "Quellen" and "Zitationen" |
| `privacy-form.md` | Every field of the privacy tab, including the per-permission justifications |
| `assets/promo-small-440x280.png` | Small promo tile |
| `assets/promo-large-1400x560.png` | Large promo tile |
| `assets/screenshot-1..4-1280x800.png` | Store screenshots |

All images are 24-bit PNG without an alpha channel, at the exact pixel sizes the
store requires. Anything else is rejected on upload.

## How the images were made

`store/source/` holds the HTML the images were rendered from, so they can be
regenerated or edited instead of being reverse-engineered out of a PNG. Rendering
was done headless at 2x and downscaled, which is why the type is crisp.

The palette is taken from the extension icon: paper `#E3D0B1`, forest accent
`#2D5F3F`, rules `#C9B694`.

The popup and settings screenshots are the real interface, rendered with a stubbed
`chrome` API and neutral demo data (`Research_Paper_2024.pdf` and friends). That
keeps private notebook titles out of a public store listing while still showing
the actual UI rather than a mockup.
