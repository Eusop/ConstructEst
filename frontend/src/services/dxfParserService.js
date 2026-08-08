import DxfParser from 'dxf-parser';

/**
 * Frontend DXF parsing — reads a File's text content and extracts a
 * simplified, renderer-friendly shape list (see DXFPreview) plus its
 * bounding box. Entirely client-side for now; a future backend parser
 * would return the same `{ shapes, bounds }` shape, so callers (see
 * DxfDropzone) wouldn't need to change.
 *
 * Only the entity types common in 2D floor plans are supported (lines,
 * polylines, circles, arcs) — anything else is skipped rather than
 * failing the whole parse.
 */

export function isDxfFilename(name) {
  return /\.dxf$/i.test(name ?? '');
}

function extractShapes(dxf) {
  const shapes = [];

  (dxf?.entities ?? []).forEach((entity) => {
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
 * read/parsed, or if it parses but contains no supported geometry — both
 * are treated as "invalid" by callers.
 *
 * @param {File} file
 */
export async function parseDxfFile(file) {
  const text = await file.text();
  const parser = new DxfParser();
  const dxf = parser.parseSync(text);

  const shapes = extractShapes(dxf);
  const bounds = computeBounds(shapes);
  if (!bounds) {
    throw new Error('No renderable geometry found in this DXF file.');
  }

  return { shapes, bounds };
}
