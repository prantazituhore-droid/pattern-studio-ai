export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function normalizeHex(input: string): string {
  let clean = input.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }
  return '#7C3AED';
}

export function hexToRgb(hex: string): RGB {
  const norm = normalizeHex(hex).slice(1);
  return {
    r: parseInt(norm.slice(0, 2), 16),
    g: parseInt(norm.slice(2, 4), 16),
    b: parseInt(norm.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex({ h, s, l }: HSL): string {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return rgbToHex({ r: v, g: v, b: v });
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return rgbToHex({
    r: hue2rgb(p, q, hn + 1 / 3) * 255,
    g: hue2rgb(p, q, hn) * 255,
    b: hue2rgb(p, q, hn - 1 / 3) * 255,
  });
}

export function generateHarmonyPalette(
  baseHex: string,
  mode: 'complementary' | 'analogous' | 'monochromatic' | 'triadic'
): { background: string; colors: string[] } {
  const baseHsl = rgbToHsl(hexToRgb(baseHex));

  if (mode === 'complementary') {
    return {
      background: hslToHex({ h: baseHsl.h, s: Math.max(15, baseHsl.s * 0.4), l: 12 }),
      colors: [
        normalizeHex(baseHex),
        hslToHex({ h: baseHsl.h + 180, s: baseHsl.s, l: baseHsl.l }),
        hslToHex({ h: baseHsl.h + 180, s: Math.max(20, baseHsl.s - 20), l: Math.min(88, baseHsl.l + 22) }),
        hslToHex({ h: baseHsl.h, s: Math.max(15, baseHsl.s - 25), l: 90 }),
      ],
    };
  }

  if (mode === 'analogous') {
    return {
      background: hslToHex({ h: baseHsl.h - 20, s: 25, l: 14 }),
      colors: [
        normalizeHex(baseHex),
        hslToHex({ h: baseHsl.h + 30, s: baseHsl.s, l: baseHsl.l }),
        hslToHex({ h: baseHsl.h - 30, s: baseHsl.s, l: Math.min(82, baseHsl.l + 10) }),
        hslToHex({ h: baseHsl.h + 15, s: 45, l: 88 }),
      ],
    };
  }

  if (mode === 'triadic') {
    return {
      background: hslToHex({ h: baseHsl.h, s: 22, l: 11 }),
      colors: [
        normalizeHex(baseHex),
        hslToHex({ h: baseHsl.h + 120, s: baseHsl.s, l: baseHsl.l }),
        hslToHex({ h: baseHsl.h + 240, s: baseHsl.s, l: baseHsl.l }),
        hslToHex({ h: baseHsl.h, s: 20, l: 92 }),
      ],
    };
  }

  // Monochromatic
  return {
    background: hslToHex({ h: baseHsl.h, s: Math.min(45, baseHsl.s), l: 12 }),
    colors: [
      hslToHex({ h: baseHsl.h, s: baseHsl.s, l: 32 }),
      normalizeHex(baseHex),
      hslToHex({ h: baseHsl.h, s: Math.max(20, baseHsl.s - 10), l: 72 }),
      hslToHex({ h: baseHsl.h, s: Math.max(12, baseHsl.s - 25), l: 92 }),
    ],
  };
}

/**
 * Extracts dominant distinct colors from an image URL or data URL using canvas quantization.
 */
export async function extractColorsFromImage(imageUrl: string, count = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Quantize to 24-step bins
          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const key = `${qr},${qg},${qb}`;
          const existing = buckets.get(key);
          if (existing) {
            existing.r += r;
            existing.g += g;
            existing.b += b;
            existing.n += 1;
          } else {
            buckets.set(key, { r, g, b, n: 1 });
          }
        }

        const sorted = Array.from(buckets.values())
          .sort((a, b) => b.n - a.n)
          .map((bucket) => ({
            r: bucket.r / bucket.n,
            g: bucket.g / bucket.n,
            b: bucket.b / bucket.n,
          }));

        const chosen: RGB[] = [];
        for (const candidate of sorted) {
          const isDistinct = chosen.every((c) => {
            const dist = Math.hypot(c.r - candidate.r, c.g - candidate.g, c.b - candidate.b);
            return dist > 48;
          });
          if (isDistinct) {
            chosen.push(candidate);
          }
          if (chosen.length >= count) break;
        }

        if (chosen.length === 0 && sorted.length > 0) {
          chosen.push(sorted[0]);
        }

        resolve(chosen.map(rgbToHex));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Unable to load image for color extraction.'));
    img.src = imageUrl;
  });
}
