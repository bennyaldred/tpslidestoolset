/**
 * The vector route: turn glyph outlines into native Slides freeform shapes.
 *
 * Slides can hold freeform vector shapes — its own polyline/curve tool draws
 * them — but neither the Apps Script API nor the REST API will create one.
 * The PPTX importer will, so we take that road:
 *
 *   outlines -> <a:custGeom> -> one-slide .pptx -> Drive converts it to a
 *   Slides file -> copy the shapes onto the user's slide -> delete the temp.
 *
 * The user never sees the round trip; it replaces the manual
 * "export SVG, paste into PowerPoint, upload, copy across" workflow.
 */

var VF_DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id';
var VF_DRIVE_FILE_URL = 'https://www.googleapis.com/drive/v3/files/';
var VF_PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
var VF_SLIDES_MIME = 'application/vnd.google-apps.presentation';

/** Keep the design inside the slide with a small breathing margin. */
var VF_FIT_MARGIN_RATIO = 0.06;

function vfAuthHeaders() {
  return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
}

/**
 * Upload the .pptx and let Drive convert it to a Google Slides file.
 * Uses the REST API directly so the add-on does not need the broad DriveApp
 * scope — `drive.file` covers files this add-on creates.
 *
 * @return {string} The converted presentation's file id.
 */
function vfUploadAndConvert(pptxBlob, name) {
  var boundary = '-------vf' + Utilities.getUuid();
  var metadata = { name: name, mimeType: VF_SLIDES_MIME };

  // Build the multipart/related body as bytes: the PPTX part is binary, so it
  // cannot go through string concatenation without corrupting the zip.
  var head = Utilities.newBlob(
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: ' + VF_PPTX_MIME + '\r\n\r\n'
  ).getBytes();
  var tail = Utilities.newBlob('\r\n--' + boundary + '--\r\n').getBytes();
  var body = head.concat(pptxBlob.getBytes()).concat(tail);

  var response = UrlFetchApp.fetch(VF_DRIVE_UPLOAD_URL, {
    method: 'post',
    contentType: 'multipart/related; boundary=' + boundary,
    payload: body,
    headers: vfAuthHeaders(),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Drive could not convert the vector file (HTTP ' + code + '): ' +
      response.getContentText().slice(0, 300));
  }
  return JSON.parse(response.getContentText()).id;
}

function vfDeleteDriveFile(fileId) {
  try {
    UrlFetchApp.fetch(VF_DRIVE_FILE_URL + fileId + '?supportsAllDrives=true', {
      method: 'delete',
      headers: vfAuthHeaders(),
      muteHttpExceptions: true
    });
  } catch (ignored) {
    // A stray temp file is untidy, not broken.
  }
}

/**
 * Work out the on-slide size for a design, scaled down if it would overflow.
 * @return {{width: number, height: number, scale: number}} Points.
 */
function vfFitToSlide(naturalWidthPt, naturalHeightPt) {
  var presentation = SlidesApp.getActivePresentation();
  var maxWidth = presentation.getPageWidth() * (1 - VF_FIT_MARGIN_RATIO * 2);
  var maxHeight = presentation.getPageHeight() * (1 - VF_FIT_MARGIN_RATIO * 2);
  var scale = Math.min(1, maxWidth / naturalWidthPt, maxHeight / naturalHeightPt);
  return {
    width: naturalWidthPt * scale,
    height: naturalHeightPt * scale,
    scale: scale
  };
}

/**
 * Zip the PPTX parts. `Utilities.zip` builds the directory tree from blob
 * names, and `[Content_Types].xml` must be the first entry.
 */
function vfZipPptx(parts) {
  var blobs = parts.map(function (part) {
    return Utilities.newBlob(part.xml, 'application/xml', part.path);
  });
  return Utilities.zip(blobs, 'variable-type.pptx').setContentType(VF_PPTX_MIME);
}

/**
 * Insert the design as native vector shapes.
 *
 * @param {{commands: Array, color: string, text: string, family: string,
 *          spec: Object, newSlide: boolean}} payload
 * @return {{ok: boolean, message: string}}
 */
function vfInsertVector(payload) {
  if (!payload || !payload.commands || !payload.commands.length) {
    throw new Error('No outlines were produced. Try a different font or some text.');
  }

  var presentation = SlidesApp.getActivePresentation();
  var bounds = vfCommandsBounds(payload.commands);
  if (!bounds.width || !bounds.height) {
    throw new Error('The outlines are empty — check that the text has visible characters.');
  }

  var fitted = vfFitToSlide(bounds.width, bounds.height);
  var slideWidthEmu = vfPointsToEmu(presentation.getPageWidth());
  var slideHeightEmu = vfPointsToEmu(presentation.getPageHeight());
  var extWidthEmu = vfPointsToEmu(fitted.width);
  var extHeightEmu = vfPointsToEmu(fitted.height);

  var shape = vfBuildShapeXml({
    commands: payload.commands,
    color: payload.color,
    name: (payload.text || 'Variable type').slice(0, 60) + ' — ' + (payload.family || ''),
    id: 2,
    offsetXEmu: Math.round((slideWidthEmu - extWidthEmu) / 2),
    offsetYEmu: Math.round((slideHeightEmu - extHeightEmu) / 2),
    extWidthEmu: extWidthEmu,
    extHeightEmu: extHeightEmu
  });

  var parts = vfBuildPptxParts({
    shapesXml: shape.xml,
    slideWidthEmu: slideWidthEmu,
    slideHeightEmu: slideHeightEmu
  });

  var fileId = vfUploadAndConvert(vfZipPptx(parts), 'Variable Type import (temporary)');
  try {
    var imported = SlidesApp.openById(fileId);
    var sourceSlides = imported.getSlides();
    if (!sourceSlides.length) throw new Error('The converted file had no slides.');
    var sourceSlide = sourceSlides[0];

    if (payload.newSlide) {
      // Import wholesale as a new slide right after the current one.
      var index = vfCurrentSlideIndex(presentation);
      presentation.insertSlide(index + 1, sourceSlide);
      return {
        ok: true,
        message: 'Added vector outlines on a new slide after this one.',
        scale: fitted.scale
      };
    }

    // Copy the shapes straight onto the slide the user is looking at.
    var target = vfActiveSlide();
    var sourceElements = sourceSlide.getPageElements();
    var copied = [];
    for (var i = 0; i < sourceElements.length; i++) {
      var element = sourceElements[i];
      if (element.getPageElementType() !== SlidesApp.PageElementType.SHAPE) continue;
      var placed = target.insertShape(element.asShape());
      placed.setLeft(element.getLeft())
        .setTop(element.getTop())
        .setWidth(element.getWidth())
        .setHeight(element.getHeight());
      copied.push(placed);
    }
    if (!copied.length) {
      throw new Error('The converted file contained no shapes to copy.');
    }

    var result = copied.length > 1 ? target.group(copied) : copied[0];
    vfStampSpec(result, payload.spec || {});
    result.select();

    return {
      ok: true,
      message: 'Inserted ' + copied.length +
        (copied.length === 1 ? ' vector shape.' : ' vector shapes (grouped).'),
      scale: fitted.scale
    };
  } finally {
    vfDeleteDriveFile(fileId);
  }
}

function vfCurrentSlideIndex(presentation) {
  var selection = presentation.getSelection();
  var current = selection ? selection.getCurrentPage() : null;
  var slides = presentation.getSlides();
  if (current) {
    var currentId = current.getObjectId();
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].getObjectId() === currentId) return i;
    }
  }
  return slides.length - 1;
}
