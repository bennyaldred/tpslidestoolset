# How vector shapes get into Google Slides

Notes on why the add-on takes such an indirect route, and what was ruled out
along the way.

## The constraint

Google Slides renders freeform vector shapes. Its own UI draws them — the
polyline and curve tools in *Insert → Line*. The shape type exists, it is
native, and it survives copy, resize, recolour and grouping.

What is missing is a way to *create* one programmatically:

- **Apps Script**: `Slide.insertShape(shapeType, …)` takes a `ShapeType` enum.
  Every member is a preset (`RECTANGLE`, `ELLIPSE`, `CLOUD`, …). There is no
  path parameter.
- **Slides REST API**: `CreateShapeRequest.shapeType` is the same enum.
  `Shape` has no geometry field. `batchUpdate` cannot express a bezier.
- **Images**: `insertImage` accepts PNG/JPEG/GIF by URL or blob. No SVG. An
  image is also not an editable shape, which was the point.

So no API creates the shape type that Slides already supports.

## The way through

Slides' **PowerPoint importer** does create it. DrawingML expresses freeform
geometry as `<a:custGeom>` with an `<a:pathLst>` of `moveTo` / `lnTo` /
`cubicBezTo` / `close` segments, and the importer maps that onto the native
freeform shape.

That is the basis of the manual workflow people use today: export an SVG,
paste it into PowerPoint, save a `.pptx`, upload it to Google Slides, open it,
copy the shapes, paste them into the real deck.

Every step of that is automatable:

1. **Outlines.** HarfBuzz shapes the text and returns glyph outlines at the
   requested axis coordinates. This happens in the sidebar, because Apps Script
   cannot run WebAssembly and the font arrives as woff2, which needs a
   Brotli-based decompressor.
2. **Geometry.** `Outline.js` converts those paths to `<a:custGeom>`. All
   contours go into a single `<a:path>` so that counters — the hole in an `o` —
   knock out under the nonzero winding rule. TrueType quadratics are promoted
   to cubics, which every consumer handles. Coordinates are emitted in EMU
   (12700 per point) so the path space needs no scaling factor.
3. **Package.** `Pptx.js` writes the eleven parts a valid one-slide deck needs.
   `Utilities.zip` builds the archive; `[Content_Types].xml` goes first.
4. **Conversion.** The `.pptx` is uploaded to Drive with
   `mimeType: application/vnd.google-apps.presentation`, which makes Drive run
   the importer. This needs only `drive.file` — the add-on never sees other
   files.
5. **Placement.** The converted deck is opened and its shapes are copied onto
   the slide the user is looking at with `Slide.insertShape(shape)`, then
   grouped. The temporary file is deleted in a `finally` block.

If copying misbehaves for a particular deck, the sidebar offers *Import onto a
new slide instead*, which uses `Presentation.insertSlide(index, slide)` — a
documented cross-presentation copy — and leaves the shapes one cut-and-paste
away.

## Slides fills custom geometry with the even-odd rule

The first working import came back with letterforms that were *nearly* right:
a rectangular bite out of the `e`, notches where a bowl meets a stem, a step on
the `l`. `V`, `r` and `i` were clean.

TrueType glyphs are drawn assuming the **nonzero winding** rule, and variable
fonts lean on it hard — interpolating between masters routinely leaves contours
overlapping, which nonzero resolves silently. Google Slides fills imported
`custGeom` with the **even-odd** rule instead, which turns every overlap into a
hole. Letters with no overlapping contours were unaffected, which is why `V` and
`r` survived. Rendering the same path locally with `fill-rule="evenodd"`
reproduced the defect exactly, including the position of the bite.

DrawingML has no fill-rule attribute, so the rule cannot be declared. The
geometry has to be made rule-independent instead.

### Boolean union was the wrong fix

The obvious answer is to union the contours so none overlap. That was tried
first, with paper.js, and it was worse: it filled the counter of `b` solid in
Epilogue, sheared curves elsewhere, and a measured sweep put it at up to 4.7%
of pixels wrong. No variant helped — `resolveCrossings().reorient()` in all its
parameter combinations, uniting against an empty path, uniting per glyph, and a
polygon clipper on finely flattened curves (which was both worse and fifty
times larger). Glyph outlines are full of tangential and near-degenerate
intersections, and that is exactly where boolean libraries break down.

### What works: never put overlapping contours in one path

Even-odd applies **within a single path**. So the design is split into one
shape per outer contour, each carrying only the counters nested inside it:

- a counter inside its own outer contour → even-odd makes a hole. Correct.
- two outer contours that overlap → two separate shapes that overlap on the
  slide. Correct under any fill rule.

No boolean arithmetic runs, so not one coordinate changes — the geometry on the
slide is exactly what the font produced. A unit test asserts the invariant: the
commands emitted are a permutation of the commands that came in.

Roles are decided by **winding direction**, not by containment. TrueType winds
a glyph's outer contours one way and its counters the other, so the sign of a
contour's signed area separates them — and two overlapping outer contours share
a winding, so neither can ever be mistaken for a hole in the other. An earlier
version classified by nesting depth with a majority-vote containment test, and
misread the crossbar of a heavy `e` as nested inside the bowl, subtracting it.

One case remains that grouping cannot solve: a contour that crosses **itself**,
which at heavy weights is common (22% of contours across the test corpus).
There is nothing to separate, so those contours — and only those — are passed
individually through paper.js `resolveCrossings()`, guarded by a bounding-box
check that keeps the original if the result looks nothing like it. Resolving
one contour is the operation these libraries are most reliable at.

### opentype.js was not accurate enough

The outline extraction originally used opentype.js, and it was the single
largest source of error — larger than anything in the geometry pipeline.

- It got **variable-glyph interpolation wrong**. Google Sans Flex at `ROND 100`
  came back torn: the `V` sliced through, stems reduced to hairlines, the `r`
  broken apart. Rendering the same instance three ways — browser CSS,
  opentype.js, and the exported geometry — showed the browser correct and
  opentype.js progressively degrading from `ROND 50` onward. The exported
  geometry matched opentype.js to 0.000%, which is to say it was faithfully
  reproducing bad outlines.
- It **threw outright** on OpenType lookup types it does not implement, killing
  the insert for five of eighteen test families (Archivo, Chivo, Nunito,
  Outfit, Bricolage Grotesque).

Both are fixed by shaping with **HarfBuzz** instead — the reference OpenType
implementation, and the same engine the browser uses to render the sidebar
preview. It handles the full variation model, and it shapes every font in the
corpus. The lesson is that the reference for "exact" has to be the browser, not
another library: measuring the export against opentype.js only proved the two
agreed.

### Measured

A sweep of 18 variable families × 3 axis extremes renders the raw outlines
under nonzero (what the font means) against the final `custGeom` under even-odd
(what Slides shows), and pixel-diffs them:

| | reference | worst case | cases over 0.05% |
|---|---|---|---|
| whole-word boolean union | opentype.js | 4.73% | 22 of 54 (5 crashed outright) |
| one shape per outer contour | opentype.js | 0.106% | 1 of 54 |
| + HarfBuzz shaping | **the browser** | **0.092%** | **1 of 38** |

The first two rows measure against opentype.js, which was itself wrong; only
the last row measures against the browser, and it is the one that matters. The
remaining 0.092% is antialiasing along contour edges, not geometry.

## Why not a raster image## Why not a raster image

An earlier draft rendered the design to PNG via an SVG `foreignObject` with the
font inlined as a data URI. It was pixel-exact and completely inflexible: no
recolouring, no clean scaling, and not a shape. Once the PPTX route was proven
it was removed rather than kept as a lesser option.

## What was verified, and how

- The Google Fonts CSS2 API serves full axis ranges and the tuple-list form for
  `ital` (`:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900`); both
  `fonts.googleapis.com` and `fonts.gstatic.com` send
  `access-control-allow-origin: *`, so the sidebar can fetch the binary.
- Requesting a legacy `User-Agent` yields `.ttf`, but those are *static*
  instances with no `fvar` table — no shortcut around woff2 decompression.
- The woff2 → TTF → variable-instance → outline chain was run in Chromium:
  a 295KB woff2 decompresses to a 572KB TTF whose outlines change with `wght`
  and `wdth` exactly as they do in node.
- The generated `.pptx` opens in `python-pptx`, which reports the shape as
  `FREEFORM (5)` with the expected segment counts.
- The generated `<a:custGeom>` was parsed back out of the archive, rebuilt as
  an SVG path, and rendered next to the browser's own rendering of the same
  font at the same axis values. They match, down to the near-closed `e`
  aperture Roboto Flex has at `wght 900 / wdth 151 / opsz 144`.
- The whole chain — outlines, self-intersection resolution, grouping,
  `vfBuildShapesXml`, and the paths read back out of the resulting XML — is
  swept across 18 families at three axis extremes each and pixel-diffed under
  even-odd against the font's own nonzero rendering. See the table above.
- Confirmed in Slides itself: imported shapes arrive as editable vector
  freeforms, so `Slide.insertShape(shape)` does carry custom geometry across
  presentations.
