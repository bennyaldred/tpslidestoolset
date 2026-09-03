/**
 * Everything that touches the presentation: creating shapes, restyling a
 * selection, and reading a previously inserted shape back into the editor.
 */

/** Alt-text title stamped on shapes we create, so we can recognise our own. */
var VF_SHAPE_TAG = 'Variable Type';

/** Cascade offset (points) so repeated inserts do not land exactly on top of each other. */
var VF_CASCADE_STEP = 14;
var VF_CASCADE_WRAP = 8;

function vfActiveSlide() {
  var presentation = SlidesApp.getActivePresentation();
  var selection = presentation.getSelection();
  if (selection) {
    var page = selection.getCurrentPage();
    if (page && page.getPageType() === SlidesApp.PageType.SLIDE) {
      return page.asSlide();
    }
  }
  var slides = presentation.getSlides();
  if (!slides.length) {
    throw new Error('This presentation has no slides to insert into.');
  }
  return slides[0];
}

function vfAlignmentFor(name) {
  switch (name) {
    case 'center': return SlidesApp.ParagraphAlignment.CENTER;
    case 'right': return SlidesApp.ParagraphAlignment.END;
    case 'justify': return SlidesApp.ParagraphAlignment.JUSTIFIED;
    default: return SlidesApp.ParagraphAlignment.START;
  }
}

/**
 * Count shapes on the slide that we previously inserted, so a run of inserts
 * cascades instead of piling up in one spot.
 */
function vfCascadeOffset(slide) {
  var elements = slide.getPageElements();
  var mine = 0;
  for (var i = 0; i < elements.length; i++) {
    try {
      if (elements[i].getTitle() === VF_SHAPE_TAG) mine++;
    } catch (ignored) {
      // Some element types do not expose a title; they are not ours.
    }
  }
  return (mine % VF_CASCADE_WRAP) * VF_CASCADE_STEP;
}

/**
 * Work out where a new element of the given size should sit: centred, then
 * cascaded, then clamped so it stays on the canvas.
 */
function vfPlacement(slide, widthPt, heightPt) {
  var presentation = SlidesApp.getActivePresentation();
  var pageWidth = presentation.getPageWidth();
  var pageHeight = presentation.getPageHeight();

  var width = Math.min(widthPt, pageWidth);
  var height = Math.min(heightPt, pageHeight);
  var offset = vfCascadeOffset(slide);

  var left = (pageWidth - width) / 2 + offset;
  var top = (pageHeight - height) / 2 + offset;

  left = Math.max(0, Math.min(left, pageWidth - width));
  top = Math.max(0, Math.min(top, pageHeight - height));

  return { left: left, top: top, width: width, height: height };
}

/**
 * Store the design on the shape's alt text so "Load from selection" can
 * restore the exact axis values later. Slides shows alt text to the user, so
 * we keep it short and label it.
 */
function vfStampSpec(element, spec) {
  try {
    element.setTitle(VF_SHAPE_TAG);
    element.setDescription(JSON.stringify({
      vf: 1,
      family: spec.family,
      values: spec.values,
      fontSize: spec.fontSize,
      color: spec.color
    }));
  } catch (ignored) {
    // Alt text is a convenience; never fail an insert over it.
  }
}

function vfReadSpec(element) {
  try {
    if (element.getTitle() !== VF_SHAPE_TAG) return null;
    var parsed = JSON.parse(element.getDescription());
    return parsed && parsed.vf ? parsed : null;
  } catch (ignored) {
    return null;
  }
}

/**
 * Apply a resolved style to a TextRange. Shared by insert and restyle so the
 * two paths can never drift apart.
 */
function vfApplyTextStyle(textRange, spec, resolved) {
  var style = textRange.getTextStyle();
  style.setFontFamilyAndWeight(resolved.fontFamily, resolved.weight);
  style.setItalic(resolved.italic);
  if (spec.fontSize) style.setFontSize(spec.fontSize);
  if (spec.color) style.setForegroundColor(spec.color);
  if (spec.underline !== undefined) style.setUnderline(!!spec.underline);

  var paragraphStyle = textRange.getParagraphStyle();
  paragraphStyle.setParagraphAlignment(vfAlignmentFor(spec.align));
  if (spec.lineSpacing) paragraphStyle.setLineSpacing(spec.lineSpacing);
}

/**
 * Insert the design as a real, editable Slides text box.
 *
 * @param {Object} spec Design from the sidebar: family, axes, values, text,
 *     fontSize, color, align, lineSpacing, widthPt, heightPt.
 * @return {{ok: boolean, message: string, resolved: Object}}
 */
function vfInsertTextShape(spec) {
  if (!spec || !spec.family) throw new Error('No font selected.');
  var text = spec.text === undefined || spec.text === '' ? 'Variable' : spec.text;

  var resolved = vfResolveSlidesStyle({
    family: spec.family,
    axes: spec.axes,
    values: spec.values,
    allowFauxItalic: spec.allowFauxItalic
  });

  var slide = vfActiveSlide();
  // The sidebar measures the rendered preview, so the box matches what the
  // user saw. Fall back to a rough estimate if the measurement is missing.
  var fontSize = spec.fontSize || 48;
  var widthPt = spec.widthPt || Math.max(120, text.length * fontSize * 0.6);
  var heightPt = spec.heightPt || fontSize * 1.6;
  // A little slack: Slides lays text out slightly differently from the browser
  // and we would rather have a roomy box than a clipped one.
  var box = vfPlacement(slide, widthPt * 1.08 + 8, heightPt * 1.15 + 8);

  var shape = slide.insertShape(
    SlidesApp.ShapeType.TEXT_BOX, box.left, box.top, box.width, box.height);
  shape.getFill().setTransparent();
  shape.getBorder().setTransparent();
  shape.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  var textRange = shape.getText();
  textRange.setText(text);
  vfApplyTextStyle(textRange, spec, resolved);
  vfStampSpec(shape, spec);

  shape.select();

  return {
    ok: true,
    message: 'Inserted "' + resolved.fontFamily + '" ' + resolved.weight +
      (resolved.italic ? ' italic' : ''),
    resolved: resolved
  };
}

/**
 * Restyle whatever is selected. Handles both a text selection inside a shape
 * and one or more selected shapes.
 */
function vfApplyToSelection(spec) {
  if (!spec || !spec.family) throw new Error('No font selected.');
  var resolved = vfResolveSlidesStyle({
    family: spec.family,
    axes: spec.axes,
    values: spec.values,
    allowFauxItalic: spec.allowFauxItalic
  });

  var selection = SlidesApp.getActivePresentation().getSelection();
  if (!selection) throw new Error('Nothing is selected.');

  var type = selection.getSelectionType();
  var updated = 0;

  if (type === SlidesApp.SelectionType.TEXT) {
    var textRange = selection.getTextRange();
    if (textRange && textRange.asString().length) {
      vfApplyTextStyle(textRange, spec, resolved);
      updated = 1;
    } else {
      // Cursor placed in a shape with no highlighted run: style the whole shape.
      var element = selection.getPageElementRange();
      if (element) {
        var elements = element.getPageElements();
        for (var i = 0; i < elements.length; i++) {
          updated += vfStyleElement(elements[i], spec, resolved);
        }
      }
    }
  } else if (type === SlidesApp.SelectionType.PAGE_ELEMENT) {
    var range = selection.getPageElementRange();
    var selected = range ? range.getPageElements() : [];
    for (var j = 0; j < selected.length; j++) {
      updated += vfStyleElement(selected[j], spec, resolved);
    }
  } else {
    throw new Error('Select a text box or some text first.');
  }

  if (!updated) throw new Error('The selection has no text to restyle.');

  return {
    ok: true,
    message: 'Restyled ' + updated + (updated === 1 ? ' shape' : ' shapes'),
    resolved: resolved
  };
}

/** @return {number} 1 if the element carried text we could style, else 0. */
function vfStyleElement(element, spec, resolved) {
  var type = element.getPageElementType();
  if (type !== SlidesApp.PageElementType.SHAPE) return 0;
  var shape = element.asShape();
  var textRange = shape.getText();
  if (!textRange || !textRange.asString().replace(/\s/g, '').length) return 0;
  vfApplyTextStyle(textRange, spec, resolved);
  vfStampSpec(shape, spec);
  return 1;
}

/**
 * Read a design back out of the selected shape, so a shape inserted earlier
 * can be reopened with its original axis values instead of the snapped ones.
 */
function vfLoadFromSelection() {
  var selection = SlidesApp.getActivePresentation().getSelection();
  if (!selection) return { ok: false, message: 'Nothing is selected.' };

  var range = selection.getPageElementRange();
  var elements = range ? range.getPageElements() : [];
  for (var i = 0; i < elements.length; i++) {
    var spec = vfReadSpec(elements[i]);
    if (spec) {
      if (elements[i].getPageElementType() === SlidesApp.PageElementType.SHAPE) {
        spec.text = elements[i].asShape().getText().asString().replace(/\n$/, '');
      }
      return { ok: true, spec: spec };
    }
  }
  return {
    ok: false,
    message: 'That shape was not created here, so it has no stored axis values.'
  };
}
