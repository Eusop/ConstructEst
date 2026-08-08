import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { colors } from '../theme/palette';

const PADDING_RATIO = 0.88;

function toScreenPoint(x, y, bounds, scale, offsetX, offsetY) {
  return [offsetX + (x - bounds.minX) * scale, offsetY + (bounds.maxY - y) * scale];
}

function drawShapes(ctx, shapes, bounds, width, height) {
  ctx.clearRect(0, 0, width, height);

  const boundsWidth = bounds.maxX - bounds.minX || 1;
  const boundsHeight = bounds.maxY - bounds.minY || 1;
  const scale = Math.min(width / boundsWidth, height / boundsHeight) * PADDING_RATIO;
  const offsetX = (width - boundsWidth * scale) / 2;
  const offsetY = (height - boundsHeight * scale) / 2;

  ctx.strokeStyle = colors.accentBlue;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  shapes.forEach((shape) => {
    ctx.beginPath();
    if (shape.type === 'polyline') {
      shape.points.forEach((point, index) => {
        const [x, y] = toScreenPoint(point.x, point.y, bounds, scale, offsetX, offsetY);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (shape.closed) ctx.closePath();
    } else if (shape.type === 'circle') {
      const [cx, cy] = toScreenPoint(shape.cx, shape.cy, bounds, scale, offsetX, offsetY);
      ctx.arc(cx, cy, shape.r * scale, 0, Math.PI * 2);
    } else if (shape.type === 'arc') {
      const [cx, cy] = toScreenPoint(shape.cx, shape.cy, bounds, scale, offsetX, offsetY);
      // DXF angles are degrees, counter-clockwise, Y-up; canvas angles are
      // radians, clockwise, Y-down — negating both flips consistently.
      const start = (-shape.endAngle * Math.PI) / 180;
      const end = (-shape.startAngle * Math.PI) / 180;
      ctx.arc(cx, cy, shape.r * scale, start, end);
    }
    ctx.stroke();
  });
}

/**
 * Reusable canvas renderer for already-parsed DXF geometry (see
 * services/dxfParserService) — rendering-only, no file I/O or validation
 * of its own, so it can be reused anywhere a parsed DXF needs to be drawn.
 * Auto-scales and centers the drawing to fit its container, and redraws
 * responsively when that container resizes.
 *
 * @param {object} props
 * @param {Array<object>} props.shapes
 * @param {{minX: number, minY: number, maxX: number, maxY: number}} props.bounds
 * @param {number|string} [props.height=220]
 */
function DXFPreview({ shapes, bounds, height = 220 }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !bounds) return undefined;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const heightPx = container.clientHeight;
      if (width === 0 || heightPx === 0) return;

      canvas.width = width * dpr;
      canvas.height = heightPx * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${heightPx}px`;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawShapes(ctx, shapes, bounds, width, heightPx);
    };

    render();

    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [shapes, bounds]);

  return (
    <Box ref={containerRef} sx={{ width: '100%', height }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </Box>
  );
}

export default DXFPreview;
