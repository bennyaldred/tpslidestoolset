# Variable Type — a variable-font designer for Google Slides

A Google Slides add-on that gives you real variable-font axis controls — weight,
width, optical size, slant, grade, roundness, and whatever custom axes a family
ships — and puts the result on your slide as **native vector shapes**.

Slides has no variable-font support of its own, and its API cannot create
custom geometry. This gets around both, exactly:

| | |
|---|---|
| What lands on the slide | Native Slides freeform vector shapes, grouped |
| Axis fidelity | **Exact**, every axis, including custom ones |
| Geometry | Shaped with HarfBuzz, the engine browsers render text with — measured worst case 0.09% of pixels against the browser's own rendering |
| Tracking | Supported |
| Recolour / resize in Slides | Yes, losslessly — it is vector, not a picture |
| Text stays editable | No. It is artwork; design first, insert last |

Nothing is ever inserted as a raster image.

## How the vector mode works

The Slides API cannot create custom geometry — `createShape` accepts a fixed
enum of preset shapes and nothing else. But Slides itself *does* have freeform
vector shapes (its own polyline/curve tool draws them), and its PowerPoint
importer maps DrawingML `<a:custGeom>` bezier paths onto exactly that shape
type.

So the add-on takes that road, automatically:

```
axis values
   -> glyph outlines            (HarfBuzz, variations applied, in the sidebar)
   -> self-crossing contours resolved          (paper.js, in the sidebar)
   -> one <a:custGeom> shape per outer contour (Outline.js)
   -> a one-slide .pptx         (Pptx.js)
   -> Drive converts it to Slides
   -> the shapes are copied onto your current slide
   -> the temporary file is deleted
```

This is the well-known "export an SVG, paste it into PowerPoint, upload it,
copy it across" trick — done for you in one click, without leaving Slides.

## Install

Everything lives in one Apps Script project. `build/` holds the whole add-on
as **three files** you can paste straight into the editor — no npm, no clasp.

### Paste it in (5 minutes)

1. Open any Google Slides deck → **Extensions → Apps Script**.
2. Rename the default `Code.gs` file to **Code**, and replace its contents with
   [`build/Code.gs`](build/Code.gs).
3. **+ → HTML**, name it **Sidebar** (exactly — `Code.gs` loads it by name), and
   replace its contents with [`build/Sidebar.html`](build/Sidebar.html).
4. **Project Settings** → tick *Show "appsscript.json" manifest file in editor*.
   Back in the editor, replace `appsscript.json` with
   [`build/appsscript.json`](build/appsscript.json).
5. **Enable the Drive API** — needed by vector mode only. In the left sidebar:
   **Services → + → Drive API → Add**. This switches the API on in the Cloud
   project behind your script; without it, vector inserts fail with a Drive 403.
6. Save, then reload the Slides deck.
7. **Extensions → Variable Type → Open Variable Type**. Approve the permission
   prompt on first run.

That is a working add-on for you, in that deck. To use it everywhere, publish it
(below).

Step 5 is not optional: the vector import is the whole add-on.

### Or with clasp

```bash
npm install
npx clasp login
npx clasp create --type slides --title "Variable Type"
cp .clasp.json.example .clasp.json      # then set your scriptId
npx clasp push                          # pushes src/, not build/
```

## Publishing it as a Workspace add-on

Once the pasted version works, turn the same script into an add-on your whole
domain (or the public) can install. This is a **Google Workspace Editor
Add-on** — the classic type, which is what allows the HTML sidebar the live
font preview needs. (Card-based Workspace Add-ons cannot render a font
preview.)

1. **Deploy a version.** In the Apps Script editor: *Deploy → New deployment →
   Add-on*. Note the **Deployment ID**, and the **Script ID** from
   *Project Settings*.
2. **Attach a Cloud project.** *Project Settings → Google Cloud Platform
   project → Change project*, and point it at a standard GCP project you own.
   A default project cannot be published. Enable the **Google Drive API** in
   that project too — moving to a standard project means you now manage API
   enablement yourself, and the editor's *Services* shortcut no longer does it
   for you.
3. **Configure the OAuth consent screen** in that Cloud project: app name, a
   support email, a logo, plus links to a homepage, privacy policy and terms.
   Set the user type — *Internal* for your own Workspace domain, *External* for
   the public.
4. **Enable the Google Workspace Marketplace SDK** in the Cloud project, then
   fill in its *App Configuration* (add-on type: **Slides**, with the Script ID
   and Deployment ID from step 1) and its *Store Listing*.
5. **Publish.** Internal apps go live for your domain immediately. Public
   listings go through Google's review.

### One thing to know before you publish publicly

`https://www.googleapis.com/auth/presentations` is a **sensitive** scope, so a
public listing needs Google's OAuth verification (an extra review, typically
including a security questionnaire). Two ways around it:

Publish **internally** to your own Workspace domain and no verification is
needed. A public listing needs the review, because the add-on has to open the
temporary converted file to copy its shapes out.

`urlFetchWhitelist` is already set in the manifest — Marketplace requires it for
any add-on that calls `UrlFetchApp`, and it covers the two endpoints the server
touches (the Google Fonts catalogue, and Drive for the vector conversion).

## Using it

The sidebar has two tabs.

### Type

- **Typeface** — every variable family on Google Fonts (~2000), fetched live
  with its real axis ranges. Opens on **Google Sans Flex**. Falls back to a
  bundled list if the fetch fails.
- **Axes** — one slider per axis, with a numeric field for exact values.
- **Type settings** — size, tracking, line height, colour, alignment.
- **Insert vector outlines** — drops the design on the current slide as a group
  of vector shapes.

### Icons

The same pipeline applied to [Material Symbols](https://fonts.google.com/icons),
which is a variable icon font — so every icon comes in as vector shapes, not a
picture, with its axes live.

- **Style** — Outlined, Rounded or Sharp.
- **Icon** — pick from the grid, or search by name. The full set is ~4,300
  icons, fetched from Google's published codepoints list; a common subset is
  bundled for when that is unreachable.
- **Axes** — `FILL`, `GRAD`, `opsz` and `wght`, previewed live in the grid.
- **Insert icon** — every icon is framed by the font's em square rather than by
  its own ink, so a full-height icon and a short one like `remove` come out
  exactly the same size.

The icon font is a few megabytes, so it is only fetched when the tab is first
opened.

## Development

```bash
npm install
npm test         # 36 unit tests, no network or Google account needed
npm run preview  # dist/preview.html — the sidebar with a mock backend
npm run build    # build/ — the three paste-ready Apps Script files
```

`src/` is the source of truth. `build/` is generated and committed so it can be
copied straight out of GitHub; rebuild it after any change to `src/`.

`dist/preview.html` runs the real mapping and fidelity code against fixture
fonts, so the UI can be iterated on in a normal browser without deploying.

### Layout

| File | Role |
|---|---|
| `src/Code.js` | Entry points and the `api*` surface the sidebar calls |
| `src/FontCatalog.js` | Google Fonts catalogue, cached, with a bundled fallback |
| `src/AxisRegistry.js` | Axis display names, slider steps, ordering |
| `src/Outline.js` | Glyph outlines → DrawingML `<a:custGeom>`, one shape per outer contour |
| `src/Pptx.js` | Minimal valid PPTX package |
| `src/VectorInsert.js` | Drive conversion and copying shapes onto your slide |
| `src/Sidebar*.html` | The sidebar UI |

Apps Script evaluates every `.gs` file into one shared global scope, so the
`.js` files declare plain globals (prefixed `vf`) rather than using modules.
The tests load them the same way, via `node:vm`, which keeps the tests honest
about how the code will actually run.

## Troubleshooting

**"Vector mode needs the Drive API…"** — do step 5 of the install: *Services → +
→ Drive API → Add*, wait a minute, retry. On a standard Cloud project, enable
*Google Drive API* in the Cloud console instead.

**Vector shapes import as rectangles or blobs** — the cross-presentation copy
did not carry the custom geometry. Tick **Import onto a new slide instead** in
the sidebar; that path uses `insertSlide()` and leaves the outlines one
cut-and-paste from your slide.

**"Could not load …jsdelivr…"** — vector mode loads `opentype.js`, the woff2
decompressor and `paper.js` from a CDN. If your network blocks it,
editable-text mode still works.

**Notches or bites out of letterforms** — Slides fills custom geometry with the
even-odd rule, so contours that cross themselves punch through as holes. The
sidebar resolves those before export and warns if it could not; check that
`paper.js` loaded. Overlapping *separate* contours are handled by emitting them
as separate shapes and need no library at all.

**Vector output does not match the preview** — both should now be identical;
the sidebar shapes text with HarfBuzz, the same engine the browser uses to
render the preview. If they differ, that is a bug worth reporting.

**The preview shows a fallback font** — the family has not downloaded yet, or
the sidebar cannot reach `fonts.googleapis.com`. The font list itself comes
from the server, so a populated list with a wrong-looking preview points at the
browser's connection, not the add-on's.

**Insert does nothing and the sidebar looks stuck** — open *Extensions → Apps
Script → Executions* to see the server-side error.

## Known limits

- **Outlines are not text.** You cannot retype them. Design first, insert last.
- **Shaping is full OpenType.** Vector mode shapes with HarfBuzz, so kerning,
  ligatures and complex scripts behave as they do in the browser.
- **Each insert is a group, not one shape.** There is one shape per outer
  contour — roughly one per letter, more for letters with counters — grouped
  together. That is what keeps the geometry exact, and it makes individual
  letters selectable inside the group.
- **Vector mode needs a CDN.** HarfBuzz (WebAssembly), the woff2 decompressor
  and `paper.js` load from jsDelivr. If your network blocks it, vector mode
  reports the failure and editable-text mode still works.
- **Very long text** in vector mode is refused past 120,000 path segments — a
  headline outlines fine, a paragraph should stay as text.
- **Optical size in preview** reflects the axis value you set, not the size the
  text is displayed at.

## Licence

MIT.
