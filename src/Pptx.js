/**
 * Builds a minimal, valid PPTX containing the outlined text as freeform
 * vector shapes.
 *
 * This exists because the Slides API cannot create custom geometry — the only
 * documented shape constructor takes a fixed enum of preset shapes. The PPTX
 * importer, on the other hand, maps `<a:custGeom>` onto the freeform shape
 * type Slides already has (the one its own polyline/curve tool draws). So we
 * round-trip through a one-slide deck to get true vectors into the editor.
 *
 * Returns parts as {path, xml} so the caller can zip them however it likes.
 */

var VF_PPTX_NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

var VF_XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

/** Google Slides' default 16:9 canvas, in EMU (10in x 5.625in). */
var VF_DEFAULT_SLIDE_WIDTH_EMU = 9144000;
var VF_DEFAULT_SLIDE_HEIGHT_EMU = 5143500;

function vfContentTypesXml() {
  return VF_XML_DECL +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '</Types>';
}

function vfRootRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
    '</Relationships>';
}

function vfPresentationXml(widthEmu, heightEmu) {
  return VF_XML_DECL +
    '<p:presentation ' + VF_PPTX_NS + '>' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>' +
    '<p:sldSz cx="' + widthEmu + '" cy="' + heightEmu + '"/>' +
    '<p:notesSz cx="6858000" cy="9144000"/>' +
    '</p:presentation>';
}

function vfPresentationRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
    '</Relationships>';
}

/** Empty placeholder-free background, shared by the master and the layout. */
function vfEmptyCommonSlideData(name) {
  return '<p:cSld' + (name ? ' name="' + name + '"' : '') + '>' +
    '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
    '<p:spTree>' +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
    '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '</p:spTree>' +
    '</p:cSld>';
}

var VF_COLOR_MAP =
  '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" ' +
  'accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" ' +
  'hlink="hlink" folHlink="folHlink"/>';

function vfSlideMasterXml() {
  return VF_XML_DECL +
    '<p:sldMaster ' + VF_PPTX_NS + '>' +
    vfEmptyCommonSlideData() +
    VF_COLOR_MAP +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    '</p:sldMaster>';
}

function vfSlideMasterRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
    '</Relationships>';
}

function vfSlideLayoutXml() {
  return VF_XML_DECL +
    '<p:sldLayout ' + VF_PPTX_NS + ' type="blank" preserve="1">' +
    vfEmptyCommonSlideData('Blank') +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sldLayout>';
}

function vfSlideLayoutRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
    '</Relationships>';
}

function vfSlideRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '</Relationships>';
}

/**
 * @param {string} shapesXml Concatenated `<p:sp>` (and/or `<p:grpSp>`) elements.
 */
function vfSlideXml(shapesXml) {
  return VF_XML_DECL +
    '<p:sld ' + VF_PPTX_NS + '>' +
    '<p:cSld><p:spTree>' +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
    '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    shapesXml +
    '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sld>';
}

/** A minimal theme that still satisfies the required schema sequence. */
function vfThemeXml() {
  var fill =
    '<a:fillStyleLst>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '</a:fillStyleLst>';
  var line =
    '<a:lnStyleLst>' +
    '<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
    '<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
    '<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
    '</a:lnStyleLst>';
  var effect =
    '<a:effectStyleLst>' +
    '<a:effectStyle><a:effectLst/></a:effectStyle>' +
    '<a:effectStyle><a:effectLst/></a:effectStyle>' +
    '<a:effectStyle><a:effectLst/></a:effectStyle>' +
    '</a:effectStyleLst>';
  var bgFill =
    '<a:bgFillStyleLst>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '</a:bgFillStyleLst>';

  return VF_XML_DECL +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Variable Type">' +
    '<a:themeElements>' +
    '<a:clrScheme name="Office">' +
    '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>' +
    '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
    '<a:dk2><a:srgbClr val="44546A"/></a:dk2>' +
    '<a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>' +
    '<a:accent1><a:srgbClr val="4472C4"/></a:accent1>' +
    '<a:accent2><a:srgbClr val="ED7D31"/></a:accent2>' +
    '<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>' +
    '<a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
    '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>' +
    '<a:accent6><a:srgbClr val="70AD47"/></a:accent6>' +
    '<a:hlink><a:srgbClr val="0563C1"/></a:hlink>' +
    '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>' +
    '</a:clrScheme>' +
    '<a:fontScheme name="Office">' +
    '<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>' +
    '</a:fontScheme>' +
    '<a:fmtScheme name="Office">' + fill + line + effect + bgFill + '</a:fmtScheme>' +
    '</a:themeElements>' +
    '<a:objectDefaults/><a:extraClrSchemeLst/>' +
    '</a:theme>';
}

/**
 * Assemble the full package.
 *
 * @param {{shapesXml: string, slideWidthEmu: (number|undefined),
 *          slideHeightEmu: (number|undefined)}} options
 * @return {Array<{path: string, xml: string}>} Parts in the order they should
 *     be zipped; `[Content_Types].xml` must come first.
 */
function vfBuildPptxParts(options) {
  var width = options.slideWidthEmu || VF_DEFAULT_SLIDE_WIDTH_EMU;
  var height = options.slideHeightEmu || VF_DEFAULT_SLIDE_HEIGHT_EMU;
  return [
    { path: '[Content_Types].xml', xml: vfContentTypesXml() },
    { path: '_rels/.rels', xml: vfRootRelsXml() },
    { path: 'ppt/presentation.xml', xml: vfPresentationXml(width, height) },
    { path: 'ppt/_rels/presentation.xml.rels', xml: vfPresentationRelsXml() },
    { path: 'ppt/theme/theme1.xml', xml: vfThemeXml() },
    { path: 'ppt/slideMasters/slideMaster1.xml', xml: vfSlideMasterXml() },
    { path: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', xml: vfSlideMasterRelsXml() },
    { path: 'ppt/slideLayouts/slideLayout1.xml', xml: vfSlideLayoutXml() },
    { path: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', xml: vfSlideLayoutRelsXml() },
    { path: 'ppt/slides/slide1.xml', xml: vfSlideXml(options.shapesXml) },
    { path: 'ppt/slides/_rels/slide1.xml.rels', xml: vfSlideRelsXml() }
  ];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VF_DEFAULT_SLIDE_WIDTH_EMU: VF_DEFAULT_SLIDE_WIDTH_EMU,
    VF_DEFAULT_SLIDE_HEIGHT_EMU: VF_DEFAULT_SLIDE_HEIGHT_EMU,
    vfBuildPptxParts: vfBuildPptxParts,
    vfSlideXml: vfSlideXml
  };
}
