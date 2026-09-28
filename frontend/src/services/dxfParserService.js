import DxfParser from 'dxf-parser';

/**
 * Frontend DXF parsing. Reads a File's text and extracts a simple shape list
 * (see DXFPreview) plus its bounding box, all client-side. Only common 2D plan
 * entities are supported (lines, polylines, circles, arcs, MLINE); anything
 * else is skipped instead of failing the whole parse.
 */

// dxf-parser skips MLINE (AutoCAD multiline), so walls drawn with it showed
// nothing in the preview. This reads what the preview needs: layer,
// visibility, thickness (scale factor), justification, closed flag and the
// reference line vertices.
class MLineHandler {
  constructor() {
    this.ForEntityName = 'MLINE';
  }

  parseEntity(scanner, group) {
    const entity = { type: group.value, vertices: [], scale: 1, justification: 0, closed: false };
    let pendingX = null;
    let curr = scanner.next();
    while (!scanner.isEOF() && curr.code !== 0) {
      switch (curr.code) {
        case 8: entity.layer = curr.value; break;
        case 60: entity.visible = curr.value === 0; break;
        case 40: entity.scale = curr.value; break;
        case 70: entity.justification = curr.value; break;
        case 71: entity.closed = (curr.value & 2) !== 0; break;
        case 11: pendingX = curr.value; break;
        case 21:
          if (pendingX !== null) entity.vertices.push({ x: pendingX, y: curr.value });
          pendingX = null;
          break;
        default: break;
      }
      curr = scanner.next();
    }
    return entity;
  }
}

// The two faces of a standard two-line MLINE, as offsets from its reference
// line in units of its scale (wall thickness): centered for "zero"
// justification, one face for "top"/"bottom". Assumes AutoCAD's Standard
// style; a custom style with more elements shows only its outer two.
function mlineFaces(entity) {
  const shift = entity.justification === 0 ? 0.5 : entity.justification === 2 ? -0.5 : 0;
  const offsets = [0.5 - shift, -0.5 - shift].map((o) => o * entity.scale);
  const points = entity.closed && entity.vertices.length > 2 ? [...entity.vertices, entity.vertices[0]] : entity.vertices;
  const faces = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) continue;
    const nx = -(b.y - a.y) / length;
    const ny = (b.x - a.x) / length;
    offsets.forEach((o) => {
      faces.push({
        type: 'polyline',
        points: [{ x: a.x + nx * o, y: a.y + ny * o }, { x: b.x + nx * o, y: b.y + ny * o }],
        closed: false,
      });
    });
  }
  return faces;
}

export function isDxfFilename(name) {
  return /\.dxf$/i.test(name ?? '');
}

// Layers that are off or frozen are not drawn, matching AutoCAD (e.g. helper
// layers like FLOOR or BEAM/TRUSS kept for the engine). This only affects the
// preview; the backend engine still reads every layer.
function hiddenLayerNames(dxf) {
  const layers = dxf?.tables?.layer?.layers ?? {};
  return new Set(
    Object.values(layers)
      .filter((layer) => layer && (layer.visible === false || layer.frozen === true))
      .map((layer) => layer.name),
  );
}

function extractShapes(dxf) {
  const shapes = [];
  const hiddenLayers = hiddenLayerNames(dxf);

  (dxf?.entities ?? []).forEach((entity) => {
    if (hiddenLayers.has(entity.layer) || entity.visible === false) return;
    switch (entity.type) {
      case 'LINE': {
        const points = entity.vertices ?? [];
        if (points.length >= 2) shapes.push({ type: 'polyline', points, closed: false });
        break;
      }
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const points = entity.vertices ?? [];
        if (points.length >= 2) shapes.push({ type: 'polyline', points, closed: Boolean(entity.shape) });
        break;
      }
      case 'MLINE': {
        shapes.push(...mlineFaces(entity));
        break;
      }
      case 'CIRCLE': {
        if (entity.center && Number.isFinite(entity.radius)) {
          shapes.push({ type: 'circle', cx: entity.center.x, cy: entity.center.y, r: entity.radius });
        }
        break;
      }
      case 'ARC': {
        if (entity.center && Number.isFinite(entity.radius)) {
          shapes.push({
            type: 'arc',
            cx: entity.center.x,
            cy: entity.center.y,
            r: entity.radius,
            startAngle: entity.startAngle ?? 0,
            endAngle: entity.endAngle ?? 360,
          });
        }
        break;
      }
      default:
        break;
    }
  });

  return shapes;
}

function computeBounds(shapes) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const extend = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  shapes.forEach((shape) => {
    if (shape.type === 'polyline') {
      shape.points.forEach((point) => extend(point.x, point.y));
    } else {
      extend(shape.cx - shape.r, shape.cy - shape.r);
      extend(shape.cx + shape.r, shape.cy + shape.r);
    }
  });

  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Parses a DXF File into `{ shapes, bounds }`. Throws if the file can't be
 * parsed or has no supported geometry (both count as "invalid" for callers).
 *
 * @param {File} file
 */
export async function parseDxfFile(file) {
  const text = await file.text();
  const parser = new DxfParser();
  parser.registerEntityHandler(MLineHandler);
  const dxf = parser.parseSync(text);

  const shapes = extractShapes(dxf);
  const bounds = computeBounds(shapes);
  if (!bounds) {
    throw new Error('No renderable geometry found in this DXF file.');
  }

  return { shapes, bounds };
}
