import { loadImageElement } from './seamlessAnalyzer';

export const MOCKUP_PRODUCTS = [
  { id: 'saree', label: 'Saree', category: 'Apparel' },
  { id: 'dress', label: 'Dress', category: 'Apparel' },
  { id: 'fabric', label: 'Draped Fabric', category: 'Textile' },
  { id: 'shirt', label: 'Shirt', category: 'Apparel' },
  { id: 'scarf', label: 'Silk Scarf', category: 'Apparel' },
  { id: 'wallpaper', label: 'Wallpaper', category: 'Interior' },
  { id: 'sofa', label: 'Sofa Fabric', category: 'Interior' },
  { id: 'cushion', label: 'Cushion', category: 'Interior' },
  { id: 'bedsheet', label: 'Bedsheet', category: 'Interior' },
  { id: 'floor-tiles', label: 'Floor Tiles', category: 'Architecture' },
  { id: 'wall-tiles', label: 'Wall Tiles', category: 'Architecture' },
  { id: 'gift-wrap', label: 'Gift Wrapping', category: 'Packaging' },
  { id: 'packaging', label: 'Luxury Packaging', category: 'Packaging' },
] as const;

export type MockupProductId = (typeof MOCKUP_PRODUCTS)[number]['id'];

export async function renderProductMockup(
  canvas: HTMLCanvasElement,
  patternUrl: string,
  product: MockupProductId,
  options: {
    tileScale: number; // 0.15 .. 1.5
    rotationDeg: number;
    darkBackdrop?: boolean;
  }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Studio environment background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (options.darkBackdrop) {
    bgGrad.addColorStop(0, '#18181b');
    bgGrad.addColorStop(1, '#09090b');
  } else {
    bgGrad.addColorStop(0, '#f4f4f5');
    bgGrad.addColorStop(1, '#e4e4e7');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const img = await loadImageElement(patternUrl);

  // Prepare normalized tile source at 320px base
  const tileBase = 320;
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileBase;
  tileCanvas.height = tileBase;
  const tctx = tileCanvas.getContext('2d');
  if (!tctx) return;
  tctx.drawImage(img, 0, 0, tileBase, tileBase);

  const pattern = ctx.createPattern(tileCanvas, 'repeat');
  if (!pattern) return;

  const matrix = new DOMMatrix()
    .translate(W / 2, H / 2)
    .rotate(options.rotationDeg)
    .scale(options.tileScale, options.tileScale);
  pattern.setTransform(matrix);

  // Helper to apply realistic fabric fold shading over a clipped shape
  const applyFabricFolds = (
    x: number,
    y: number,
    w: number,
    h: number,
    folds = 5,
    vertical = true
  ) => {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const grad = vertical
      ? ctx.createLinearGradient(x, y, x + w, y)
      : ctx.createLinearGradient(x, y, x, y + h);
    for (let i = 0; i <= folds; i++) {
      const stop = i / folds;
      grad.addColorStop(stop, i % 2 === 0 ? 'rgba(255,255,255,0.96)' : 'rgba(195,195,205,0.88)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;

  switch (product) {
    case 'saree': {
      // Draped Saree body + pleated lower skirt + flowing diagonal pallu
      ctx.beginPath();
      ctx.moveTo(W * 0.34, H * 0.12);
      ctx.lineTo(W * 0.56, H * 0.12);
      ctx.quadraticCurveTo(W * 0.68, H * 0.25, W * 0.72, H * 0.88);
      ctx.lineTo(W * 0.28, H * 0.88);
      ctx.quadraticCurveTo(W * 0.3, H * 0.48, W * 0.34, H * 0.12);
      ctx.closePath();
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip();
      applyFabricFolds(W * 0.26, H * 0.12, W * 0.48, H * 0.78, 9, true);
      // Decorative zari gold border along pallu & hem
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(W * 0.28, H * 0.86);
      ctx.lineTo(W * 0.72, H * 0.86);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(24,24,27,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Diagonal pallu sash
      ctx.beginPath();
      ctx.moveTo(W * 0.33, H * 0.13);
      ctx.lineTo(W * 0.47, H * 0.13);
      ctx.lineTo(W * 0.74, H * 0.62);
      ctx.lineTo(W * 0.57, H * 0.68);
      ctx.closePath();
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.save();
      ctx.clip();
      applyFabricFolds(W * 0.32, H * 0.13, W * 0.44, H * 0.56, 6, true);
      ctx.restore();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
      ctx.lineWidth = 4;
      ctx.stroke();
      break;
    }

    case 'dress': {
      // Tailored A-line sleeveless dress
      ctx.beginPath();
      ctx.moveTo(W * 0.39, H * 0.14);
      ctx.quadraticCurveTo(W * 0.5, H * 0.23, W * 0.61, H * 0.14);
      ctx.lineTo(W * 0.65, H * 0.18);
      ctx.quadraticCurveTo(W * 0.6, H * 0.3, W * 0.6, H * 0.39);
      ctx.lineTo(W * 0.75, H * 0.86);
      ctx.quadraticCurveTo(W * 0.5, H * 0.91, W * 0.25, H * 0.86);
      ctx.lineTo(W * 0.4, H * 0.39);
      ctx.quadraticCurveTo(W * 0.4, H * 0.3, W * 0.35, H * 0.18);
      ctx.closePath();
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip();
      applyFabricFolds(W * 0.24, H * 0.14, W * 0.52, H * 0.78, 8, true);
      // Waist seam
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.39, H * 0.39);
      ctx.lineTo(W * 0.61, H * 0.39);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(24,24,27,0.24)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'shirt': {
      // Tailored collared button-down shirt
      ctx.beginPath();
      ctx.moveTo(W * 0.38, H * 0.16);
      ctx.lineTo(W * 0.62, H * 0.16);
      ctx.lineTo(W * 0.83, H * 0.34);
      ctx.lineTo(W * 0.75, H * 0.47);
      ctx.lineTo(W * 0.66, H * 0.39);
      ctx.lineTo(W * 0.66, H * 0.84);
      ctx.lineTo(W * 0.34, H * 0.84);
      ctx.lineTo(W * 0.34, H * 0.39);
      ctx.lineTo(W * 0.25, H * 0.47);
      ctx.lineTo(W * 0.17, H * 0.34);
      ctx.closePath();
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip();
      applyFabricFolds(W * 0.16, H * 0.16, W * 0.68, H * 0.68, 6, true);
      // Center placket & collar
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(W * 0.485, H * 0.22, W * 0.03, H * 0.62);
      for (let b = 0; b < 5; b++) {
        ctx.beginPath();
        ctx.arc(W * 0.5, H * (0.28 + b * 0.11), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#e4e4e7';
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(24,24,27,0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'scarf': {
      // Flowing silk scarf with soft folded ends
      ctx.beginPath();
      ctx.moveTo(W * 0.2, H * 0.24);
      ctx.bezierCurveTo(W * 0.42, H * 0.12, W * 0.6, H * 0.34, W * 0.8, H * 0.2);
      ctx.lineTo(W * 0.82, H * 0.78);
      ctx.bezierCurveTo(W * 0.6, H * 0.88, W * 0.42, H * 0.66, W * 0.18, H * 0.78);
      ctx.closePath();
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip();
      applyFabricFolds(W * 0.18, H * 0.12, W * 0.64, H * 0.76, 10, true);
      ctx.restore();
      ctx.strokeStyle = 'rgba(24,24,27,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'fabric': {
      // Full lush draped silk fabric folds
      ctx.beginPath();
      ctx.roundRect(W * 0.12, H * 0.12, W * 0.76, H * 0.76, 12);
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip();
      applyFabricFolds(W * 0.12, H * 0.12, W * 0.76, H * 0.76, 11, true);
      // Diagonal silk sheen highlight
      const sheen = ctx.createLinearGradient(W * 0.12, H * 0.12, W * 0.88, H * 0.88);
      sheen.addColorStop(0, 'rgba(255,255,255,0.18)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
      sheen.addColorStop(1, 'rgba(0,0,0,0.16)');
      ctx.fillStyle = sheen;
      ctx.fillRect(W * 0.12, H * 0.12, W * 0.76, H * 0.76);
      ctx.restore();
      break;
    }

    case 'wallpaper': {
      // Interior wall with baseboard, framed mirror/art & ambient lamp glow
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H * 0.82);
      // Ambient radial room vignette
      const roomShade = ctx.createRadialGradient(W * 0.5, H * 0.35, W * 0.1, W * 0.5, H * 0.45, W * 0.75);
      roomShade.addColorStop(0, 'rgba(255,255,255,0.06)');
      roomShade.addColorStop(1, 'rgba(0,0,0,0.34)');
      ctx.fillStyle = roomShade;
      ctx.fillRect(0, 0, W, H * 0.82);
      // Baseboard & hardwood floor
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(0, H * 0.8, W, H * 0.04);
      ctx.fillStyle = '#d4d4d8';
      ctx.fillRect(0, H * 0.84, W, H * 0.16);
      // Minimal credenza silhouette for scale context
      ctx.fillStyle = '#27272a';
      ctx.fillRect(W * 0.24, H * 0.65, W * 0.52, H * 0.19);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(W * 0.22, H * 0.63, W * 0.56, H * 0.03);
      break;
    }

    case 'sofa': {
      // Modern 3-seater upholstered sofa
      ctx.beginPath();
      ctx.roundRect(W * 0.16, H * 0.3, W * 0.68, H * 0.32, 20); // Backrest
      ctx.roundRect(W * 0.12, H * 0.44, W * 0.11, H * 0.3, 14); // Left arm
      ctx.roundRect(W * 0.77, H * 0.44, W * 0.11, H * 0.3, 14); // Right arm
      ctx.roundRect(W * 0.21, H * 0.52, W * 0.58, H * 0.22, 12); // Seat
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip();
      applyFabricFolds(W * 0.12, H * 0.3, W * 0.76, H * 0.45, 5, false);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Legs
      ctx.fillStyle = '#27272a';
      ctx.fillRect(W * 0.17, H * 0.74, W * 0.03, H * 0.09);
      ctx.fillRect(W * 0.8, H * 0.74, W * 0.03, H * 0.09);
      break;
    }

    case 'cushion': {
      // Plush square throw pillow with soft corner curves
      ctx.beginPath();
      ctx.moveTo(W * 0.22, H * 0.2);
      ctx.quadraticCurveTo(W * 0.5, H * 0.23, W * 0.78, H * 0.2);
      ctx.quadraticCurveTo(W * 0.75, H * 0.5, W * 0.78, H * 0.8);
      ctx.quadraticCurveTo(W * 0.5, H * 0.77, W * 0.22, H * 0.8);
      ctx.quadraticCurveTo(W * 0.25, H * 0.5, W * 0.22, H * 0.2);
      ctx.closePath();
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip();
      const pillowShade = ctx.createRadialGradient(W * 0.46, H * 0.44, W * 0.08, W * 0.5, H * 0.5, W * 0.38);
      pillowShade.addColorStop(0, 'rgba(255,255,255,0.16)');
      pillowShade.addColorStop(0.7, 'rgba(0,0,0,0.04)');
      pillowShade.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = pillowShade;
      ctx.fillRect(W * 0.18, H * 0.18, W * 0.64, H * 0.64);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    case 'bedsheet': {
      // Overhead/3/4 bed duvet + two patterned pillows
      ctx.shadowColor = 'transparent';
      // Headboard
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.roundRect(W * 0.16, H * 0.14, W * 0.68, H * 0.24, 14);
      ctx.fill();
      // Duvet cover
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.roundRect(W * 0.14, H * 0.36, W * 0.72, H * 0.5, 16);
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip();
      applyFabricFolds(W * 0.14, H * 0.36, W * 0.72, H * 0.5, 7, false);
      ctx.restore();
      // Pillows
      ctx.fillStyle = '#fafafa';
      ctx.beginPath();
      ctx.roundRect(W * 0.21, H * 0.25, W * 0.26, H * 0.14, 12);
      ctx.roundRect(W * 0.53, H * 0.25, W * 0.26, H * 0.14, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.stroke();
      break;
    }

    case 'floor-tiles': {
      // Architectural tiled floor perspective with grout lines
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W * 0.12, H * 0.34);
      ctx.lineTo(W * 0.88, H * 0.34);
      ctx.lineTo(W * 0.98, H * 0.92);
      ctx.lineTo(W * 0.02, H * 0.92);
      ctx.closePath();
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.clip();
      // Grout grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 6; i++) {
        const y = H * 0.34 + (H * 0.58 * i) / 6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (let i = 0; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(W * (0.12 + (0.76 * i) / 6), H * 0.34);
        ctx.lineTo(W * (0.02 + (0.96 * i) / 6), H * 0.92);
        ctx.stroke();
      }
      const floorShade = ctx.createLinearGradient(0, H * 0.34, 0, H * 0.92);
      floorShade.addColorStop(0, 'rgba(0,0,0,0.28)');
      floorShade.addColorStop(0.5, 'rgba(255,255,255,0.08)');
      floorShade.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = floorShade;
      ctx.fillRect(0, H * 0.34, W, H * 0.58);
      ctx.restore();
      break;
    }

    case 'wall-tiles': {
      // Clean square ceramic wall tile grid with realistic glossy grout bevels
      ctx.shadowColor = 'transparent';
      const pad = W * 0.12;
      const size = W * 0.76;
      ctx.fillStyle = pattern;
      ctx.fillRect(pad, pad, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 3;
      const cells = 4;
      for (let i = 0; i <= cells; i++) {
        const pos = pad + (size * i) / cells;
        ctx.beginPath();
        ctx.moveTo(pos, pad);
        ctx.lineTo(pos, pad + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad, pos);
        ctx.lineTo(pad + size, pos);
        ctx.stroke();
      }
      // Glossy glaze sheen
      const glaze = ctx.createLinearGradient(pad, pad, pad + size, pad + size);
      glaze.addColorStop(0, 'rgba(255,255,255,0.18)');
      glaze.addColorStop(0.5, 'rgba(255,255,255,0)');
      glaze.addColorStop(1, 'rgba(0,0,0,0.14)');
      ctx.fillStyle = glaze;
      ctx.fillRect(pad, pad, size, size);
      break;
    }

    case 'gift-wrap': {
      // Wrapped gift box with satin ribbon & bow
      ctx.beginPath();
      ctx.roundRect(W * 0.22, H * 0.24, W * 0.56, H * 0.56, 8);
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      // Lid overlap shadow
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(W * 0.22, H * 0.36, W * 0.56, H * 0.025);
      // Satin ribbons
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(W * 0.47, H * 0.24, W * 0.06, H * 0.56);
      ctx.fillRect(W * 0.22, H * 0.49, W * 0.56, H * 0.06);
      // Bow loops
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(W * 0.43, H * 0.2, W * 0.08, W * 0.04, -0.35, 0, Math.PI * 2);
      ctx.ellipse(W * 0.57, H * 0.2, W * 0.08, W * 0.04, 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#EAB308';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'packaging': {
      // Luxury boutique carrier bag + matching rigid box
      ctx.beginPath();
      ctx.roundRect(W * 0.24, H * 0.26, W * 0.4, H * 0.56, 6);
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      // Side gusset shade
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(W * 0.56, H * 0.26, W * 0.08, H * 0.56);
      // Handles
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(W * 0.4, H * 0.26, W * 0.075, Math.PI, 0);
      ctx.stroke();
      // Companion box
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.roundRect(W * 0.52, H * 0.52, W * 0.3, H * 0.3, 6);
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}
