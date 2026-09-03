# Variable Type — a variable-font designer for Google Slides

A Google Slides add-on that gives you real variable-font axis controls — weight,
width, optical size, slant, grade, and whatever custom axes a family ships — and
puts the result into your slide as an **editable shape**.

Slides has no variable-font support of its own. The add-on offers two honest
ways around that, and tells you exactly what each one costs.

| | Editable text | Vector outlines |
|---|---|---|
| What lands on the slide | A real Slides text box | Native freeform vector shapes |
| Text stays editable | **Yes** — type in it, spell-check it, restyle it | No — it is artwork |
| Axis fidelity | `wght` snaps to steps of 100, `wdth` swaps to a sibling family, everything else is lost | **Exact**, every axis, including custom ones |
| Recolour / resize in Slides | Yes | Yes, losslessly (it is vector, not a picture) |
| Tracking (letter-spacing) | Not supported by Slides | Yes |
| Best for | Body copy and headings you will keep editing | Display type, logotypes, anything where the design matters |

Neither mode ever inserts a raster image.

## How the vector mode works

The Slides API cannot create custom geometry — `createShape` accepts a fixed
enum of preset shapes and nothing else. But Slides itself *does* have freeform
vector shapes (its own polyline/curve tool draws them), and its PowerPoint
importer maps DrawingML `<a:custGeom>` bezier paths onto exactly that shape
type.

So the add-on takes that road, automatically:

```
axis values
   -> glyph outlines            (opentype.js, variations applied, in the sidebar)
   -> <a:custGeom> bezier paths (Outline.js)
   -> a one-slide .pptx         (Pptx.js)
   -> Drive converts it to Slides
   -> the shapes are copied onto your current slide
   -> the temporary file is deleted
```

This is the well-known "export an SVG, paste it into PowerPoint, upload it,
copy it across" trick — done for you in one click, without leaving Slides.

## Install

The add-on is a container-bound Apps Script project. There is no marketplace
listing; you deploy it into your own presentation (or your own Workspace).

**With [clasp](https://github.com/google/clasp) (recommended):**

```bash
npm install
npx clasp login
npx clasp create --type slides --title "Variable Type"   # or: clasp clone <scriptId>
cp .clasp.json.example .clasp.json                        # then set your scriptId
npx clasp push
```

**By hand:** in your presentation choose *Extensions → Apps Script*, then create
one file per file in `src/` (the `.js` files become `.gs`; the `.html` files
keep their names) and paste the contents across. Update the manifest via
*Project Settings → Show "appsscript.json"*.

Then reload the presentation and open **Extensions → Variable Type → Open
Variable Type**.

### Permissions it asks for, and why

| Scope | Why |
|---|---|
| `presentations` | Read and write your slides. The broad scope (rather than `presentations.currentonly`) is needed because vector mode opens the temporary converted file. |
| `drive.file` | Create and delete the temporary PPTX/Slides file used by vector mode. Limited to files this add-on creates — it cannot see the rest of your Drive. |
| `script.external_request` | Fetch the font catalogue from Google Fonts. |
| `script.container.ui` | Show the sidebar. |
| `script.storage` | Save your presets. |

If you only ever use **Editable text** mode, you can narrow the manifest to
`presentations.currentonly` and drop `drive.file`; vector mode will then fail
with a permission error, and nothing else changes.

## Using it

- **Typeface** — every variable family on Google Fonts (~2000), fetched live
  with its real axis ranges. Falls back to a bundled list if the fetch fails.
- **Axes** — one slider per axis. Axes tagged `outline only` are ones Slides
  cannot express in a text box; they are exact in vector mode.
- **Insert** — drops the design on the current slide.
- **Apply to selection** — restyles the text boxes you have selected.
- **Load selection** — reopens a shape this add-on made with its original axis
  values. The design is stamped into the shape's alt text, so the round trip
  survives copy, paste, and reopening the deck. (It is visible in Slides' alt
  text dialog.)
- **Presets** — saved per user, not per deck.

### The fidelity report

In editable-text mode the sidebar lists every axis and what will actually
happen to it:

- **green** — applied exactly
- **amber** — approximated (weight snapped to the nearest 100; width swapped to
  a sibling family like *Roboto → Roboto Condensed*; slant substituted with
  italic)
- **red** — dropped; the static cut Slides renders is fixed at the font default

If any row is amber or red and the design matters, switch to vector outlines.

## Development

```bash
npm install
npm test        # 33 unit tests, no network or Google account needed
npm run preview # builds dist/preview.html — the sidebar with a mock backend
```

`dist/preview.html` runs the real mapping and fidelity code against fixture
fonts, so the UI can be iterated on in a normal browser without deploying.

### Layout

| File | Role |
|---|---|
| `src/Code.js` | Entry points and the `api*` surface the sidebar calls |
| `src/FontCatalog.js` | Google Fonts catalogue, cached, with a bundled fallback |
| `src/AxisRegistry.js` | Axis display names, slider steps, ordering |
| `src/FontMapping.js` | Axis values → what Slides can render, plus the fidelity report |
| `src/Insert.js` | Text-box insertion, restyling, alt-text round trip |
| `src/Outline.js` | Glyph outlines → DrawingML `<a:custGeom>` |
| `src/Pptx.js` | Minimal valid PPTX package |
| `src/VectorInsert.js` | Drive conversion and copying shapes onto your slide |
| `src/Settings.js` | Presets and preferences |
| `src/Sidebar*.html` | The sidebar UI |

Apps Script evaluates every `.gs` file into one shared global scope, so the
`.js` files declare plain globals (prefixed `vf`) rather than using modules.
The tests load them the same way, via `node:vm`, which keeps the tests honest
about how the code will actually run.

## Known limits

- **Vector outlines are not text.** You cannot retype them. Design first,
  outline last.
- **Shaping is basic.** Kerning and Latin ligature substitution work; complex
  scripts (Arabic, Indic) are not shaped correctly in vector mode. Use
  editable-text mode for those.
- **Vector mode needs a CDN.** `opentype.js` and the woff2 decompressor load
  from jsDelivr. If your network blocks it, vector mode reports the failure and
  editable-text mode still works.
- **Very long text** in vector mode is refused past 120,000 path segments — a
  headline outlines fine, a paragraph should stay as text.
- **Optical size in preview** reflects the axis value you set, not the size the
  text is displayed at.

## Licence

MIT.
