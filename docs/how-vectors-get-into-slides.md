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

1. **Outlines.** `opentype.js` parses the variable font and applies the axis
   coordinates (`fvar`/`gvar`), then returns real glyph paths for the instance.
   This happens in the sidebar, because Apps Script cannot run WebAssembly and
   the font arrives as woff2, which needs a Brotli-based decompressor.
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

That pattern is diagnostic. TrueType glyphs are drawn assuming the **nonzero
winding** rule, and variable fonts lean on it hard — interpolating between
masters routinely leaves contours overlapping, because nonzero resolves them
silently. Google Slides fills imported `custGeom` with the **even-odd** rule
instead, which turns every overlap into a hole. Letters with no overlapping
contours were unaffected, which is why `V` and `r` survived.

Rendering the same path locally with `fill-rule="evenodd"` reproduced the
defect exactly, including the position of the bite in the `e`.

DrawingML has no fill-rule attribute, so the rule cannot be declared. The fix
is to make the geometry rule-independent: union the contours before export, so
no two overlap and even-odd and nonzero agree. paper.js does this on the
beziers directly (`resolveCrossings().reorient(true, true)`), so nothing is
flattened into line segments. It costs about 30% more path data and 10–30ms.

The lesson generalises: anything exported to Slides as custom geometry should
be overlap-free before it leaves.

## Why not a raster image

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
- After the overlap fix, the whole chain — outlines, union, command arrays,
  `vfBuildShapeXml`, and the path read back out of the resulting XML — was
  rendered under **even-odd**, the rule Slides actually uses. Clean at both the
  default instance and `wght 900 / wdth 151`.
- Confirmed in Slides itself: imported shapes arrive as editable vector
  freeforms, so `Slide.insertShape(shape)` does carry custom geometry across
  presentations.
