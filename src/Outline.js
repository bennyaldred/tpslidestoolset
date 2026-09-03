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
 * Build one `<p:sp>` holding the whole design as a single freeform shape.
 *
 * The path keeps its natural coordinate space while `<a:ext>` may be smaller,
 * which is how DrawingML scales geometry: that lets us fit an oversized design
 * onto the slide without touching a single coordinate.
 *
 * @param {{commands: Array, color: string, name: string, id: number,
 *          offsetXEmu: number, offsetYEmu: number,
 *          extWidthEmu: (number|undefined), extHeightEmu: (number|undefined)}} options
 * @return {{xml: string, widthEmu: number, heightEmu: number,
 *           naturalWidthEmu: number, naturalHeightEmu: number}}
 */
function vfBuildShapeXml(options) {
  var bounds = vfCommandsBounds(options.commands);
  var naturalWidthEmu = Math.max(1, vfPointsToEmu(bounds.width));
  var naturalHeightEmu = Math.max(1, vfPointsToEmu(bounds.height));
  var widthEmu = Math.max(1, Math.round(options.extWidthEmu || naturalWidthEmu));
  var heightEmu = Math.max(1, Math.round(options.extHeightEmu || naturalHeightEmu));
  var color = (options.color || '#000000').replace('#', '').toUpperCase();
  var pathXml = vfCommandsToPathXml(
    options.commands, bounds, naturalWidthEmu, naturalHeightEmu);

  var xml =
    '<p:sp>' +
      '<p:nvSpPr>' +
        '<p:cNvPr id="' + options.id + '" name="' + vfEscapeXml(options.name) + '"/>' +
        '<p:cNvSpPr/>' +
        '<p:nvPr/>' +
      '</p:nvSpPr>' +
      '<p:spPr>' +
        '<a:xfrm>' +
          '<a:off x="' + (options.offsetXEmu || 0) + '" y="' + (options.offsetYEmu || 0) + '"/>' +
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
    '</p:sp>';

  return {
    xml: xml,
    widthEmu: widthEmu,
    heightEmu: heightEmu,
    naturalWidthEmu: naturalWidthEmu,
    naturalHeightEmu: naturalHeightEmu
  };
}

/**
 * Split a command list into one list per contour, so each glyph (or each
 * closed shape) can become an independently selectable Slides shape.
 * Contours are grouped by the glyph index the sidebar tagged them with.
 */
function vfSplitByGlyph(commands, glyphIndexPerCommand) {
  var groups = [];
  var current = null;
  var currentIndex = null;
  for (var i = 0; i < commands.length; i++) {
    var index = glyphIndexPerCommand ? glyphIndexPerCommand[i] : 0;
    if (current === null || index !== currentIndex) {
      current = [];
      groups.push({ glyphIndex: index, commands: current });
      currentIndex = index;
    }
    current.push(commands[i]);
  }
  return groups;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VF_EMU_PER_POINT: VF_EMU_PER_POINT,
    vfPointsToEmu: vfPointsToEmu,
    vfEscapeXml: vfEscapeXml,
    vfCommandsBounds: vfCommandsBounds,
    vfCommandsToPathXml: vfCommandsToPathXml,
    vfBuildShapeXml: vfBuildShapeXml,
    vfSplitByGlyph: vfSplitByGlyph
  };
}
