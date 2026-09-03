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

If you only want **Editable text** mode, skip step 5 entirely — nothing else
touches Drive.

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

- **Publish internally** to your own Workspace domain — no verification needed.
- **Ship editable-text mode only.** Drop `presentations` down to
  `presentations.currentonly` and remove `drive.file` from the manifest. Both
  remaining scopes are non-sensitive. Vector mode then fails with a permission
  error and everything else works, because only vector mode opens the temporary
  converted file.

`urlFetchWhitelist` is already set in the manifest — Marketplace requires it for
any add-on that calls `UrlFetchApp`, and it covers the two endpoints the server
touches (the Google Fonts catalogue, and Drive for the vector conversion).

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
npm test         # 33 unit tests, no network or Google account needed
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

## Troubleshooting

**"Vector mode needs the Drive API…"** — do step 5 of the install: *Services → +
→ Drive API → Add*, wait a minute, retry. On a standard Cloud project, enable
*Google Drive API* in the Cloud console instead.

**Vector shapes import as rectangles or blobs** — the cross-presentation copy
did not carry the custom geometry. Tick **Import onto a new slide instead** in
the sidebar; that path uses `insertSlide()` and leaves the outlines one
cut-and-paste from your slide.

**"Could not load …jsdelivr…"** — vector mode loads `opentype.js` and the woff2
decompressor from a CDN. If your network blocks it, editable-text mode still
works.

**The preview shows a fallback font** — the family has not downloaded yet, or
the sidebar cannot reach `fonts.googleapis.com`. The font list itself comes
from the server, so a populated list with a wrong-looking preview points at the
browser's connection, not the add-on's.

**Insert does nothing and the sidebar looks stuck** — open *Extensions → Apps
Script → Executions* to see the server-side error.

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
