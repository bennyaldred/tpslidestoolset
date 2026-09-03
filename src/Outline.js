/**
 * Converts glyph outlines into DrawingML custom geometry.
 *
 * The sidebar extracts outlines with opentype.js at the exact axis values and
 * sends them here as compact command arrays. This module turns them into the
 * `<a:custGeom>` path that PowerPoint (and therefore the Google Slides PPTX
 * importer) understands as a freeform vector shape.
 *
 * Command arrays use the SVG-ish shape opentype.js produces, in points, with
 * y growing downward and the baseline at y = 0:
 *   ['M', x, y] ['L', x, y] ['C', x1, y1, x2, y2, x, y] ['Q', x1, y1, x, y] ['Z']
 */

/** English Metric Units per point. DrawingML measures everything in EMU. */
var VF_EMU_PER_POINT = 12700;

function vfPointsToEmu(points) {
  return Math.round(points * VF_EMU_PER_POINT);
}

function vfEscapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Bounding box of a command list, in the incoming point coordinates.
 * Control points are included: a curve never leaves its control hull, so this
 * is a safe (if slightly generous) box, and it keeps the maths cheap.
 */
function vfCommandsBounds(commands) {
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < commands.length; i++) {
    var command = commands[i];
    for (var j = 1; j < command.length; j += 2) {
      var x = command[j];
      var y = command[j + 1];
      if (typeof x !== 'number' || typeof y !== 'number') continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (minX === Infinity) return { x1: 0, y1: 0, x2: 0, y2: 0, width: 0, height: 0 };
  return { x1: minX, y1: minY, x2: maxX, y2: maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Emit the `<a:pathLst>` body for a command list.
 *
 * All contours go into a single `<a:path>`: TrueType draws counters as
 * reverse-wound contours, and a renderer using the nonzero winding rule turns
 * those into holes only when they share one path element.
 *
 * @param {Array} commands Command arrays in points.
 * @param {{x1: number, y1: number}} origin Translation applied before scaling.
 * @return {string}
 */
function vfCommandsToPathXml(commands, origin, widthEmu, heightEmu) {
  var parts = [];
  parts.push('<a:path w="' + widthEmu + '" h="' + heightEmu + '">');

  function point(x, y) {
    return '<a:pt x="' + vfPointsToEmu(x - origin.x1) + '" y="' + vfPointsToEmu(y - origin.y1) + '"/>';
  }

  // Track the current point so quadratic segments can be promoted to cubics.
  var currentX = 0;
  var currentY = 0;
  var open = false;

  for (var i = 0; i < commands.length; i++) {
    var command = commands[i];
    var type = command[0];

    if (type === 'M') {
      if (open) parts.push('<a:close/>');
      parts.push('<a:moveTo>' + point(command[1], command[2]) + '</a:moveTo>');
      currentX = command[1];
      currentY = command[2];
      open = true;
    } else if (type === 'L') {
      parts.push('<a:lnTo>' + point(command[1], command[2]) + '</a:lnTo>');
      currentX = command[1];
      currentY = command[2];
    } else if (type === 'C') {
      parts.push('<a:cubicBezTo>' +
        point(command[1], command[2]) +
        point(command[3], command[4]) +
        point(command[5], command[6]) +
        '</a:cubicBezTo>');
      currentX = command[5];
      currentY = command[6];
    } else if (type === 'Q') {
      // DrawingML has quadBezTo, but PowerPoint and the Slides importer are
      // both happiest with cubics, so raise the degree here.
      var qx = command[1];
      var qy = command[2];
      var endX = command[3];
      var endY = command[4];
      var c1x = currentX + (2 / 3) * (qx - currentX);
      var c1y = currentY + (2 / 3) * (qy - currentY);
      var c2x = endX + (2 / 3) * (qx - endX);
      var c2y = endY + (2 / 3) * (qy - endY);
      parts.push('<a:cubicBezTo>' +
        point(c1x, c1y) + point(c2x, c2y) + point(endX, endY) +
        '</a:cubicBezTo>');
      currentX = endX;
      currentY = endY;
    } else if (type === 'Z') {
      parts.push('<a:close/>');
      open = false;
    }
  }
  if (open) parts.push('<a:close/>');
  parts.push('</a:path>');
  return parts.join('');
}

/**
 * ---------------------------------------------------------------------------
 * Contour grouping
 * ---------------------------------------------------------------------------
 *
 * Google Slides fills imported geometry with the even-odd rule, but TrueType
 * glyphs are drawn for the nonzero rule and variable fonts routinely emit
 * overlapping contours (interpolating between masters leaves them overlapping;
 * nonzero resolves that silently). Under even-odd each overlap becomes a hole.
 *
 * The obvious fix — boolean-union the contours — turned out to be the wrong
 * one: every library tried mangled some fonts, filling counters solid or
 * shearing curves, because glyph outlines are full of tangential and
 * near-degenerate intersections.
 *
 * The fix used instead relies on even-odd applying *within a single path*.
 * Split the design into one shape per outer contour, each carrying only the
 * counters nested inside it:
 *
 *   - a counter inside its own outer contour  -> even-odd makes a hole. Correct.
 *   - two outer contours that overlap         -> separate shapes that overlap
 *                                                on the slide. Correct.
 *
 * No boolean arithmetic runs, so not a single coordinate changes: the geometry
 * on the slide is exactly what the font produced.
 */

/** Samples per curve when flattening. Only ever used to classify contours. */
var VF_CLASSIFY_SAMPLES = 12;

/** Split a flat command list into one list per contour. */
function vfSplitContours(commands) {
  var contours = [];
  var current = null;
  for (var i = 0; i < commands.length; i++) {
    var command = commands[i];
    if (command[0] === 'M') {
      current = [command];
      contours.push(current);
    } else if (current) {
      current.push(command);
    }
  }
  return contours.filter(function (contour) { return contour.length > 1; });
}

function vfCubicPoint(p0, p1, p2, p3, t) {
  var u = 1 - t;
  var a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]
  ];
}

/**
 * Flatten a contour to a polygon. This is used only to decide which contour
 * sits inside which; the emitted geometry keeps its original curves.
 */
function vfFlattenContour(contour) {
  var points = [];
  var current = [0, 0];
  for (var i = 0; i < contour.length; i++) {
    var command = contour[i];
    if (command[0] === 'M' || command[0] === 'L') {
      current = [command[1], command[2]];
      points.push(current);
    } else if (command[0] === 'C' || command[0] === 'Q') {
      var c1, c2, end;
      if (command[0] === 'C') {
        c1 = [command[1], command[2]];
        c2 = [command[3], command[4]];
        end = [command[5], command[6]];
      } else {
        // Raise the quadratic so one sampler covers both cases.
        var q = [command[1], command[2]];
        end = [command[3], command[4]];
        c1 = [current[0] + (2 / 3) * (q[0] - current[0]), current[1] + (2 / 3) * (q[1] - current[1])];
        c2 = [end[0] + (2 / 3) * (q[0] - end[0]), end[1] + (2 / 3) * (q[1] - end[1])];
      }
      for (var s = 1; s <= VF_CLASSIFY_SAMPLES; s++) {
        points.push(vfCubicPoint(current, c1, c2, end, s / VF_CLASSIFY_SAMPLES));
      }
      current = end;
    }
  }
  return points;
}

/** Fill in width/height on a caller-supplied frame. */
function vfNormalizeBounds(bounds) {
  return {
    x1: bounds.x1,
    y1: bounds.y1,
    x2: bounds.x2,
    y2: bounds.y2,
    width: bounds.x2 - bounds.x1,
    height: bounds.y2 - bounds.y1
  };
}

function vfPolygonArea(points) {
  var area = 0;
  for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j][0] * points[i][1]) - (points[i][0] * points[j][1]);
  }
  return area / 2;
}

function vfPointInPolygon(point, polygon) {
  var inside = false;
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    var xi = polygon[i][0], yi = polygon[i][1];
    var xj = polygon[j][0], yj = polygon[j][1];
    var intersects = ((yi > point[1]) !== (yj > point[1])) &&
      (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Is `inner` fully inside `outer`?
 *
 * Containment has to be strict. An earlier version took a majority vote, which
 * misread a contour that merely *overlaps* another — the crossbar of a heavy
 * `e`, say — as nested inside it, and subtracted it as a hole.
 */
function vfContourInside(innerPoints, outerPoints, outerBounds, innerBounds) {
  if (innerBounds.x1 < outerBounds.x1 - 1e-6 || innerBounds.x2 > outerBounds.x2 + 1e-6 ||
      innerBounds.y1 < outerBounds.y1 - 1e-6 || innerBounds.y2 > outerBounds.y2 + 1e-6) {
    // A contour that escapes the other's bounding box cannot be nested in it.
    return false;
  }
  var inside = 0;
  var tested = 0;
  var step = Math.max(1, Math.floor(innerPoints.length / 32));
  for (var i = 0; i < innerPoints.length; i += step) {
    tested++;
    if (vfPointInPolygon(innerPoints[i], outerPoints)) inside++;
  }
  // Allow a single ambiguous sample, for points that land on the boundary.
  return tested > 0 && inside >= tested - 1;
}

function vfPointsBounds(points) {
  var b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (var i = 0; i < points.length; i++) {
    if (points[i][0] < b.x1) b.x1 = points[i][0];
    if (points[i][0] > b.x2) b.x2 = points[i][0];
    if (points[i][1] < b.y1) b.y1 = points[i][1];
    if (points[i][1] > b.y2) b.y2 = points[i][1];
  }
  return b;
}

/**
 * Group contours into {outer, holes} sets, one group per emitted shape.
 *
 * Winding direction decides the role. TrueType draws a glyph's outer contours
 * one way round and its counters the other, so the sign of a contour's signed
 * area separates them — and, crucially, two *overlapping* outer contours share
 * a winding, so neither can ever be mistaken for a hole in the other. They
 * simply become separate shapes that overlap on the slide, which is right
 * under any fill rule.
 *
 * @param {Array} commands Flat command list.
 * @return {Array<Array>} One command list per shape: an outer contour followed
 *     by the holes nested inside it.
 */
function vfGroupContours(commands) {
  var contours = vfSplitContours(commands);
  if (contours.length < 2) return contours.length ? [commands] : [];

  var info = contours.map(function (contour) {
    var points = vfFlattenContour(contour);
    var signed = vfPolygonArea(points);
    return {
      contour: contour,
      points: points,
      bounds: vfPointsBounds(points),
      signed: signed,
      area: Math.abs(signed)
    };
  });

  // The largest contour is an outer one by definition; its winding sets the
  // convention for the rest of the design.
  var dominant = info[0];
  for (var d = 1; d < info.length; d++) {
    if (info[d].area > dominant.area) dominant = info[d];
  }
  var outerSign = dominant.signed >= 0 ? 1 : -1;

  var outers = [];
  var holes = [];
  for (var i = 0; i < info.length; i++) {
    if (!info[i].area) continue; // Degenerate contour; nothing to draw.
    var sign = info[i].signed >= 0 ? 1 : -1;
    if (sign === outerSign) outers.push(info[i]);
    else holes.push(info[i]);
  }

  // A font with no counter-wound contours at all: fall back to treating every
  // contour as its own shape rather than guessing at holes.
  if (!outers.length) {
    return info.map(function (entry) { return entry.contour.slice(); });
  }

  var groups = outers.map(function (entry) { return entry.contour.slice(); });

  for (var h = 0; h < holes.length; h++) {
    var best = -1;
    for (var o = 0; o < outers.length; o++) {
      if (!vfContourInside(holes[h].points, outers[o].points, outers[o].bounds, holes[h].bounds)) {
        continue;
      }
      if (best === -1 || outers[o].area < outers[best].area) best = o;
    }
    if (best === -1) {
      // Counter-wound but nested in nothing: keep it rather than drop it.
      groups.push(holes[h].contour.slice());
    } else {
      groups[best] = groups[best].concat(holes[h].contour);
    }
  }

  return groups;
}

/**
 * Build the `<p:sp>` elements for a design: one shape per outer contour.
 *
 * Every shape is given the same transform and the same path coordinate space
 * (the whole design's bounding box), so they line up exactly when Slides
 * reassembles them — only the contours inside each path differ.
 *
 * `bounds` overrides the frame the geometry is measured against. Text is
 * framed by its own ink, but an icon must be framed by its design box — the
 * em square every Material Symbol is drawn inside — or a short glyph like
 * `remove` would be blown up to the height of a tall one, and no two icons
 * would come out the same size.
 *
 * @param {{commands: Array, color: string, name: string, firstId: number,
 *          offsetXEmu: number, offsetYEmu: number,
 *          extWidthEmu: (number|undefined), extHeightEmu: (number|undefined),
 *          bounds: ({x1: number, y1: number, x2: number, y2: number}|undefined)}} options
 * @return {{xml: string, count: number, widthEmu: number, heightEmu: number,
 *           naturalWidthEmu: number, naturalHeightEmu: number}}
 */
function vfBuildShapesXml(options) {
  var bounds = options.bounds
    ? vfNormalizeBounds(options.bounds)
    : vfCommandsBounds(options.commands);
  var naturalWidthEmu = Math.max(1, vfPointsToEmu(bounds.width));
  var naturalHeightEmu = Math.max(1, vfPointsToEmu(bounds.height));
  var widthEmu = Math.max(1, Math.round(options.extWidthEmu || naturalWidthEmu));
  var heightEmu = Math.max(1, Math.round(options.extHeightEmu || naturalHeightEmu));
  var color = (options.color || '#000000').replace('#', '').toUpperCase();
  var offsetX = options.offsetXEmu || 0;
  var offsetY = options.offsetYEmu || 0;
  var baseName = options.name || 'Variable type';
  var id = options.firstId || 2;

  var groups = vfGroupContours(options.commands);
  if (!groups.length) groups = [options.commands];

  var parts = [];
  for (var i = 0; i < groups.length; i++) {
    // Share the design-wide bounds so every shape uses one coordinate frame.
    var pathXml = vfCommandsToPathXml(groups[i], bounds, naturalWidthEmu, naturalHeightEmu);
    parts.push(
      '<p:sp>' +
        '<p:nvSpPr>' +
          '<p:cNvPr id="' + (id + i) + '" name="' +
            vfEscapeXml(baseName + ' ' + (i + 1)) + '"/>' +
          '<p:cNvSpPr/><p:nvPr/>' +
        '</p:nvSpPr>' +
        '<p:spPr>' +
          '<a:xfrm>' +
            '<a:off x="' + offsetX + '" y="' + offsetY + '"/>' +
            '<a:ext cx="' + widthEmu + '" cy="' + heightEmu + '"/>' +
          '</a:xfrm>' +
          '<a:custGeom>' +
            '<a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>' +
            '<a:rect l="0" t="0" r="' + naturalWidthEmu + '" b="' + naturalHeightEmu + '"/>' +
            '<a:pathLst>' + pathXml + '</a:pathLst>' +
          '</a:custGeom>' +
          '<a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill>' +
          '<a:ln><a:noFill/></a:ln>' +
        '</p:spPr>' +
        '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>' +
      '</p:sp>');
  }

  return {
    xml: parts.join(''),
    count: groups.length,
    widthEmu: widthEmu,
    heightEmu: heightEmu,
    naturalWidthEmu: naturalWidthEmu,
    naturalHeightEmu: naturalHeightEmu
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VF_EMU_PER_POINT: VF_EMU_PER_POINT,
    vfPointsToEmu: vfPointsToEmu,
    vfEscapeXml: vfEscapeXml,
    vfCommandsBounds: vfCommandsBounds,
    vfNormalizeBounds: vfNormalizeBounds,
    vfCommandsToPathXml: vfCommandsToPathXml,
    vfBuildShapesXml: vfBuildShapesXml,
    vfSplitContours: vfSplitContours,
    vfFlattenContour: vfFlattenContour,
    vfPolygonArea: vfPolygonArea,
    vfPointInPolygon: vfPointInPolygon,
    vfGroupContours: vfGroupContours
  };
}
