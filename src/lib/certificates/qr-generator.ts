import QRCode from 'qrcode';

/**
 * GDGoC HNU OS — Styled QR Code Generator
 * Transparent branded QR with official icon.svg mark in the center (no circle badge).
 */

const BLUE  = '#4285F4';
const RED   = '#EA4335';
const GREEN = '#34A853';

/** Official logo aspect from public/icons/icon.svg */
const LOGO_VB_W = 2626;
const LOGO_VB_H = 1438;
const LOGO_ASPECT = LOGO_VB_H / LOGO_VB_W;

/** Draw one colored finder pattern at (x, y). */
function finderSVG(
  x: number,
  y: number,
  outerColor: string,
  innerColor: string,
  m: number
): string {
  const r = m * 0.35;
  return [
    `<rect x="${x}" y="${y}" width="${7 * m}" height="${7 * m}" rx="${r * 2}" fill="${outerColor}"/>`,
    `<rect x="${x + m}" y="${y + m}" width="${5 * m}" height="${5 * m}" rx="${r}" fill="#ffffff"/>`,
    `<rect x="${x + 2 * m}" y="${y + 2 * m}" width="${3 * m}" height="${3 * m}" rx="${r * 0.8}" fill="${innerColor}"/>`,
  ].join('\n');
}

/**
 * Center mark = public/icons/icon.svg content (no circle / badge).
 * Paths copied from icon.svg so the mark stays identical to the brand asset.
 */
function logoMark(cx: number, cy: number, logoW: number): string {
  const logoH = logoW * LOGO_ASPECT;
  const s = logoW / LOGO_VB_W;
  const tx = cx - logoW / 2;
  const ty = cy - logoH / 2;

  return [
    `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${s.toFixed(6)})">`,
    `  <g transform="matrix(1,0,0,1,-187.080987,-447.09468)">`,
    `    <g transform="matrix(11.035293,0,0,11.035293,101.933164,479.696637)">`,
    `      <g transform="matrix(1,0,0,-1,-13.355328,124.285212)">`,
    `        <g transform="matrix(0.935681,0,0,1.000325,16.463455,-0.013508)">`,
    `          <path d="M184.315,67.704C197.784,59.968 211.217,52.169 224.732,44.513C237.56,37.245 252.653,43.948 255.561,58.092C257.244,66.274 253.591,75.113 246.204,79.418C221.986,93.531 197.733,107.588 173.359,121.43C165.815,125.714 158.044,124.926 151.169,119.676C144.185,114.346 141.984,106.994 143.622,98.437C145.492,91.923 149.772,87.568 155.609,84.31C165.26,78.924 174.754,73.254 184.315,67.704" fill="rgb(250,188,5)" fill-rule="nonzero" stroke="white" stroke-width="6.24"/>`,
    `        </g>`,
    `        <g transform="matrix(0.935795,0,0,0.998115,16.43659,0.000176)">`,
    `          <path d="M194.203,62.079C180.768,54.283 167.299,46.548 153.911,38.673C141.202,31.197 139.462,14.775 150.256,5.183C156.5,-0.364 165.981,-1.621 173.403,2.624C197.735,16.541 222.035,30.517 246.209,44.704C253.691,49.095 256.893,56.22 255.786,64.799C254.661,73.511 249.395,79.093 241.166,81.954C234.589,83.592 228.678,82.062 222.938,78.636C213.447,72.971 203.79,67.583 194.203,62.079" fill="rgb(16,157,88)" fill-rule="nonzero" stroke="white" stroke-width="6.24"/>`,
    `        </g>`,
    `      </g>`,
    `      <g transform="matrix(1,0,0,1,10.736566,0.066276)">`,
    `        <g transform="matrix(0.935394,0,0,1.001023,0,0)">`,
    `          <path d="M71.752,56.563C63.131,61.461 54.505,66.35 45.893,71.263C40.855,74.137 35.873,77.109 30.809,79.935C20.606,85.63 8.484,82.292 2.699,72.261C-2.822,62.689 0.351,50.279 10.177,44.543C34.202,30.52 58.289,16.599 82.463,2.834C89.877,-1.388 97.569,-0.857 104.425,4.19C111.661,9.517 114.03,17.013 112.405,25.801C111.397,27.927 110.795,30.42 109.286,32.095C106.831,34.82 104.041,37.429 100.935,39.345C91.323,45.272 81.496,50.85 71.752,56.563" fill="rgb(233,68,54)" fill-rule="nonzero" stroke="white" stroke-width="6.24"/>`,
    `        </g>`,
    `        <g transform="matrix(0.935731,0,0,1.001217,0.001317,-0.050683)">`,
    `          <path d="M61.867,62.057C70.42,67.073 78.967,72.1 87.528,77.102C92.535,80.028 97.6,82.857 102.579,85.828C112.613,91.818 115.784,103.984 109.989,114.009C104.459,123.577 92.126,127.035 82.245,121.392C58.088,107.597 33.989,93.699 9.981,79.646C2.618,75.336 -0.768,68.409 0.175,59.948C1.17,51.017 6.477,45.218 14.9,42.231C17.245,42.042 19.705,41.316 21.911,41.786C25.498,42.55 29.153,43.661 32.365,45.393C42.304,50.753 52.048,56.475 61.867,62.057" fill="rgb(67,133,243)" fill-rule="nonzero" stroke="white" stroke-width="6.23"/>`,
    `        </g>`,
    `      </g>`,
    `    </g>`,
    `  </g>`,
    `</g>`,
  ].join('\n');
}

export type StyledQROptions = {
  /**
   * Rasterize to PNG (needed for @react-pdf/renderer so the logo paints).
   * Keep false for web preview — SVG is crisp and avoids sharp's Node JSON-import warning.
   */
  forPdf?: boolean;
};

/**
 * Generate a styled GDGoC-branded QR code as an SVG string.
 * Transparent canvas; official icon.svg mark centered (no circle).
 */
export async function generateStyledQRSVG(url: string, size = 240): Promise<string> {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const count = qr.modules.size;
  const margin = 2;
  const total = count + margin * 2;
  const m = size / total;

  const rects: string[] = [];
  const center = count / 2;

  // Quiet zone for logo (~34% of QR width) — rectangular to match icon.svg aspect
  const logoWModules = Math.min(count * 0.34, 11);
  const logoHModules = logoWModules * LOGO_ASPECT;
  const clearPad = 0.55; // modules of padding around the mark

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.modules.get(c, r)) {
        const isTL = c < 7 && r < 7;
        const isTR = c >= count - 7 && r < 7;
        const isBL = c < 7 && r >= count - 7;

        const dx = Math.abs(c - center + 0.5);
        const dy = Math.abs(r - center + 0.5);
        const isLogoZone =
          dx < logoWModules / 2 + clearPad && dy < logoHModules / 2 + clearPad;

        if (!isTL && !isTR && !isBL && !isLogoZone) {
          const x = (c + margin) * m;
          const y = (r + margin) * m;
          rects.push(
            `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(m + 0.15).toFixed(2)}" height="${(m + 0.15).toFixed(2)}" fill="#1e293b"/>`
          );
        }
      }
    }
  }

  const tlX = margin * m;
  const tlY = margin * m;
  const trX = (count - 7 + margin) * m;
  const trY = margin * m;
  const blX = margin * m;
  const blY = (count - 7 + margin) * m;

  const cx = size / 2;
  const cy = size / 2;
  const logoW = logoWModules * m;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
  ${rects.join('\n  ')}
  ${finderSVG(tlX, tlY, BLUE, BLUE, m)}
  ${finderSVG(trX, trY, RED, RED, m)}
  ${finderSVG(blX, blY, GREEN, GREEN, m)}
  ${logoMark(cx, cy, logoW)}
</svg>`;
}

/**
 * Generate a styled QR as a data URL.
 * Transparent SVG data URL containing the official icon.svg mark.
 */
export async function generateStyledQRDataURL(
  url: string,
  size = 240,
  options: StyledQROptions = {}
): Promise<string> {
  const svg = await generateStyledQRSVG(url, size);

  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    const b64 = window.btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${b64}`;
  }

  const b64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

