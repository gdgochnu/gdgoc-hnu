import QRCode from 'qrcode';
import { writeFileSync } from 'fs';

const BLUE = '#4285F4', RED = '#EA4335', YELLOW = '#FBBC04', GREEN = '#34A853';

function finderSVG(x: number, y: number, outer: string, inner: string, m: number) {
  const r = m * 0.35;
  return `<rect x="${x}" y="${y}" width="${7*m}" height="${7*m}" rx="${r*2}" fill="${outer}"/>
<rect x="${x+m}" y="${y+m}" width="${5*m}" height="${5*m}" rx="${r}" fill="#ffffff"/>
<rect x="${x+2*m}" y="${y+2*m}" width="${3*m}" height="${3*m}" rx="${r*0.8}" fill="${inner}"/>`;
}

function logoBadge(cx: number, cy: number, r: number) {
  const s = (r * 0.52) / 60;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${r*0.08}"/>
<g transform="translate(${cx} ${cy}) scale(${s})">
<path d="M-48,18 C-52,8 -52,-8 -44,-18 L-26,-8 C-30,-2 -30,2 -26,8 Z" fill="${BLUE}"/>
<path d="M-44,-18 C-36,-30 -20,-38 0,-38 L0,-20 C-14,-20 -24,-14 -26,-8 Z" fill="${RED}"/>
<path d="M0,-38 C20,-38 36,-30 44,-18 L26,-8 C24,-14 14,-20 0,-20 Z" fill="${YELLOW}"/>
<path d="M44,-18 C52,-8 52,8 48,18 L26,8 C30,2 30,-2 26,-8 Z" fill="${GREEN}"/>
<circle cx="0" cy="0" r="12" fill="#ffffff"/>
</g>`;
}

async function main() {
  const url = 'https://gdgoc-hnu.app/verify/DEMO2024';
  const size = 300;
  const rawSvg: string = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: size,
    color: { dark: '#1e293b', light: '#ffffff' },
  });

  const vbMatch = rawSvg.match(/viewBox="0 0 (\d+) \d+"/);
  const totalModules = vbMatch ? parseInt(vbMatch[1], 10) : 25;
  const m = size / totalModules;
  const margin = 1 * m;
  const inner = totalModules - 2;

  const innerSvg = rawSvg
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .trim();

  const tlX = margin, tlY = margin;
  const trX = margin + (inner - 7) * m, trY = margin;
  const blX = margin, blY = margin + (inner - 7) * m;
  const finderPx = 7 * m;
  const cx = size / 2, cy = size / 2;
  const logoRadius = m * 3.2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<rect width="${size}" height="${size}" fill="#ffffff" rx="${m*0.5}"/>
${innerSvg}
<rect x="${tlX-0.5}" y="${tlY-0.5}" width="${finderPx+1}" height="${finderPx+1}" fill="#ffffff"/>
<rect x="${trX-0.5}" y="${trY-0.5}" width="${finderPx+1}" height="${finderPx+1}" fill="#ffffff"/>
<rect x="${blX-0.5}" y="${blY-0.5}" width="${finderPx+1}" height="${finderPx+1}" fill="#ffffff"/>
${finderSVG(tlX, tlY, BLUE, BLUE, m)}
${finderSVG(trX, trY, RED, RED, m)}
${finderSVG(blX, blY, GREEN, GREEN, m)}
${logoBadge(cx, cy, logoRadius)}
</svg>`;

  writeFileSync('C:/Users/pc/.gemini/antigravity-ide/brain/2842eaf9-3370-4ef9-bae0-da800502dccd/qr_preview.svg', svg, 'utf-8');
  console.log('SVG written, bytes:', svg.length);
}

main().catch(console.error);
