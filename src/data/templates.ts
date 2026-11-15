import { StudioTemplate } from '../types/studio';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

const MANDALA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect x="0" y="0" width="800" height="800" fill="#131124"/>
  <g id="outer-rings" stroke="#D4AF37" fill="none">
    <circle cx="400" cy="400" r="340" stroke-width="2" opacity="0.45"/>
    <circle cx="400" cy="400" r="310" stroke-width="4" stroke-dasharray="10 8"/>
    <circle cx="400" cy="400" r="245" stroke-width="2.5" opacity="0.7"/>
    <circle cx="400" cy="400" r="145" stroke-width="2" opacity="0.8"/>
  </g>
  <g id="lotus-petals" fill="#7C3AED" fill-opacity="0.32" stroke="#D4AF37" stroke-width="2.5">
    <path d="M400 90 C445 190 445 270 400 330 C355 270 355 190 400 90 Z"/>
    <path d="M400 710 C445 610 445 530 400 470 C355 530 355 610 400 710 Z"/>
    <path d="M90 400 C190 355 270 355 330 400 C270 445 190 445 90 400 Z"/>
    <path d="M710 400 C610 355 530 355 470 400 C530 445 610 445 710 400 Z"/>
    <path d="M181 181 C280 218 336 274 350 350 C274 336 218 280 181 181 Z"/>
    <path d="M619 181 C582 280 526 336 450 350 C464 274 520 218 619 181 Z"/>
    <path d="M181 619 C218 520 274 464 350 450 C336 526 280 582 181 619 Z"/>
    <path d="M619 619 C520 582 464 526 450 450 C526 464 582 520 619 619 Z"/>
  </g>
  <g id="inner-star" fill="#3B82F6" fill-opacity="0.45" stroke="#FDE68A" stroke-width="2">
    <polygon points="400,250 438,340 532,340 456,396 485,488 400,434 315,488 344,396 268,340 362,340"/>
    <circle cx="400" cy="400" r="56" fill="#D4AF37" fill-opacity="0.85" stroke="#131124" stroke-width="3"/>
    <circle cx="400" cy="400" r="24" fill="#131124"/>
  </g>
  <g id="corner-ornaments" fill="#D4AF37" opacity="0.75">
    <circle cx="0" cy="0" r="78" fill="none" stroke="#D4AF37" stroke-width="3"/>
    <circle cx="800" cy="0" r="78" fill="none" stroke="#D4AF37" stroke-width="3"/>
    <circle cx="0" cy="800" r="78" fill="none" stroke="#D4AF37" stroke-width="3"/>
    <circle cx="800" cy="800" r="78" fill="none" stroke="#D4AF37" stroke-width="3"/>
    <circle cx="0" cy="0" r="32"/>
    <circle cx="800" cy="0" r="32"/>
    <circle cx="0" cy="800" r="32"/>
    <circle cx="800" cy="800" r="32"/>
  </g>
</svg>`;

const SAREE_PAISLEY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect x="0" y="0" width="800" height="800" fill="#581C33"/>
  <g id="border-bands">
    <rect x="0" y="28" width="800" height="14" fill="#D4AF37"/>
    <rect x="0" y="54" width="800" height="6" fill="#FDE68A" opacity="0.7"/>
    <rect x="0" y="758" width="800" height="14" fill="#D4AF37"/>
    <rect x="0" y="740" width="800" height="6" fill="#FDE68A" opacity="0.7"/>
  </g>
  <g id="paisley-motifs" fill="#D4AF37" fill-opacity="0.22" stroke="#EAB308" stroke-width="3">
    <path d="M220 220 C300 180 340 280 280 360 C235 420 155 405 140 340 C125 275 165 245 220 220 Z"/>
    <path d="M580 220 C500 180 460 280 520 360 C565 420 645 405 660 340 C675 275 635 245 580 220 Z"/>
    <path d="M220 580 C300 620 340 520 280 440 C235 380 155 395 140 460 C125 525 165 555 220 580 Z"/>
    <path d="M580 580 C500 620 460 520 520 440 C565 380 645 395 660 460 C675 525 635 555 580 580 Z"/>
  </g>
  <g id="zari-medallion" fill="#FDE68A" stroke="#F59E0B" stroke-width="2.5">
    <path d="M400 250 C440 320 490 360 550 400 C490 440 440 480 400 550 C360 480 310 440 250 400 C310 360 360 320 400 250 Z" fill="#9D174D" fill-opacity="0.8"/>
    <circle cx="400" cy="400" r="46" fill="#D4AF37"/>
    <circle cx="400" cy="400" r="22" fill="#581C33"/>
  </g>
  <g id="gold-dots" fill="#FDE68A">
    <circle cx="100" cy="140" r="7"/>
    <circle cx="400" cy="140" r="9"/>
    <circle cx="700" cy="140" r="7"/>
    <circle cx="100" cy="660" r="7"/>
    <circle cx="400" cy="660" r="9"/>
    <circle cx="700" cy="660" r="7"/>
  </g>
</svg>`;

const ART_DECO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect x="0" y="0" width="800" height="800" fill="#0F172A"/>
  <g id="fans" fill="none" stroke="#C084FC" stroke-width="3">
    <path d="M0 400 A200 200 0 0 1 400 400" stroke="#D4AF37" stroke-width="4"/>
    <path d="M40 400 A160 160 0 0 1 360 400"/>
    <path d="M80 400 A120 120 0 0 1 320 400" stroke="#60A5FA"/>
    <path d="M400 400 A200 200 0 0 1 800 400" stroke="#D4AF37" stroke-width="4"/>
    <path d="M440 400 A160 160 0 0 1 760 400"/>
    <path d="M480 400 A120 120 0 0 1 720 400" stroke="#60A5FA"/>
    <path d="M200 800 A200 200 0 0 1 600 800" stroke="#D4AF37" stroke-width="4"/>
    <path d="M240 800 A160 160 0 0 1 560 800"/>
    <path d="M280 800 A120 120 0 0 1 520 800" stroke="#60A5FA"/>
    <path d="M200 0 A200 200 0 0 0 600 0" stroke="#D4AF37" stroke-width="4"/>
    <path d="M240 0 A160 160 0 0 0 560 0"/>
    <path d="M280 0 A120 120 0 0 0 520 0" stroke="#60A5FA"/>
  </g>
  <g id="rays" stroke="#D4AF37" stroke-width="2" opacity="0.65">
    <line x1="200" y1="400" x2="80" y2="230"/>
    <line x1="200" y1="400" x2="200" y2="200"/>
    <line x1="200" y1="400" x2="320" y2="230"/>
    <line x1="600" y1="400" x2="480" y2="230"/>
    <line x1="600" y1="400" x2="600" y2="200"/>
    <line x1="600" y1="400" x2="720" y2="230"/>
  </g>
</svg>`;

const BAUHAUS_GRID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect x="0" y="0" width="800" height="800" fill="#F8FAFC"/>
  <g id="geometric-blocks">
    <rect x="0" y="0" width="400" height="400" fill="#EEF2FF"/>
    <path d="M0 400 A400 400 0 0 1 400 0 L400 400 Z" fill="#2563EB"/>
    <circle cx="200" cy="200" r="90" fill="#F8FAFC"/>
    <rect x="400" y="0" width="400" height="400" fill="#7C3AED"/>
    <path d="M400 0 A400 400 0 0 0 800 400 L800 0 Z" fill="#1E293B"/>
    <circle cx="600" cy="200" r="70" fill="#DDD6FE"/>
    <rect x="0" y="400" width="400" height="400" fill="#1E293B"/>
    <circle cx="200" cy="600" r="140" fill="#7C3AED"/>
    <circle cx="200" cy="600" r="65" fill="#F8FAFC"/>
    <rect x="400" y="400" width="400" height="400" fill="#E2E8F0"/>
    <path d="M400 800 A400 400 0 0 1 800 400 L800 800 Z" fill="#2563EB"/>
    <rect x="480" y="480" width="120" height="120" fill="#0F172A"/>
  </g>
</svg>`;

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'tpl-royal-floral-silk',
    name: 'Royal Emerald Silk Brocade',
    category: 'Saree Design',
    style: 'Royal Mughal & Silk Brocade',
    description: 'Symmetrical golden botanical foliage and lotus blossoms on emerald silk.',
    imageUrl: '/src/assets/images/template_royal_floral_silk_1794759415067.jpg',
    isVector: false,
    palette: ['#064E3B', '#D4AF37', '#FDE68A', '#991B1B'],
    backgroundColor: '#064E3B',
    repeatMethod: 'grid',
    width: 1024,
    height: 1024,
  },
  {
    id: 'tpl-islamic-girih',
    name: 'Midnight Gold Girih Star',
    category: 'Islamic Art',
    style: 'Islamic Girih Tessellation',
    description: '8-pointed geometric star tessellation with turquoise ceramic accents.',
    imageUrl: '/src/assets/images/template_islamic_geometric_1794759415912.jpg',
    isVector: false,
    palette: ['#0F172A', '#D4AF37', '#06B6D4', '#F8FAFC'],
    backgroundColor: '#0F172A',
    repeatMethod: 'mirror',
    width: 1024,
    height: 1024,
  },
  {
    id: 'tpl-minimal-terrazzo',
    name: 'Alabaster Bauhaus Terrazzo',
    category: 'Modern Patterns',
    style: 'Geometric Bauhaus',
    description: 'Architectural stone base with cobalt arcs, lavender dots, and charcoal geometry.',
    imageUrl: '/src/assets/images/template_minimal_terrazzo_1794759416639.jpg',
    isVector: false,
    palette: ['#F5F5F4', '#2563EB', '#A78BFA', '#27272A'],
    backgroundColor: '#F5F5F4',
    repeatMethod: 'grid',
    width: 1024,
    height: 1024,
  },
  {
    id: 'tpl-vintage-botanical',
    name: 'Heritage Acanthus & Pomegranate',
    category: 'Wallpaper',
    style: 'Heritage Arts & Crafts',
    description: 'Classic Arts & Crafts intertwining sage acanthus foliage on warm parchment.',
    imageUrl: '/src/assets/images/template_vintage_botanical_1794759416493.jpg',
    isVector: false,
    palette: ['#FEF3C7', '#65A30D', '#B45309', '#27272A'],
    backgroundColor: '#F5EFE0',
    repeatMethod: 'mirror',
    width: 1024,
    height: 1024,
  },
  {
    id: 'tpl-vec-mandala',
    name: 'Sacred Indigo Mandala (Vector)',
    category: 'Mandala',
    style: 'Sacred Mandala Filigree',
    description: 'Editable multi-layer SVG vector mandala with lotus petals and corner medallions.',
    imageUrl: svgToDataUrl(MANDALA_SVG),
    isVector: true,
    svgMarkup: MANDALA_SVG,
    palette: ['#131124', '#7C3AED', '#3B82F6', '#D4AF37'],
    backgroundColor: '#131124',
    repeatMethod: 'grid',
    width: 800,
    height: 800,
  },
  {
    id: 'tpl-vec-saree',
    name: 'Crimson Zari Paisley (Vector)',
    category: 'Three-Piece Design',
    style: 'Banarasi Zari Ornamental',
    description: 'Editable vector zari border and symmetrical paisley motifs for apparel.',
    imageUrl: svgToDataUrl(SAREE_PAISLEY_SVG),
    isVector: true,
    svgMarkup: SAREE_PAISLEY_SVG,
    palette: ['#581C33', '#D4AF37', '#FDE68A', '#9D174D'],
    backgroundColor: '#581C33',
    repeatMethod: 'horizontal',
    width: 800,
    height: 800,
  },
  {
    id: 'tpl-vec-artdeco',
    name: 'Nocturne Art Deco Fan (Vector)',
    category: 'Luxury Patterns',
    style: 'Art Deco Luxury',
    description: 'Seamless-aligned geometric Art Deco shell arches in gold, violet, and cobalt.',
    imageUrl: svgToDataUrl(ART_DECO_SVG),
    isVector: true,
    svgMarkup: ART_DECO_SVG,
    palette: ['#0F172A', '#D4AF37', '#C084FC', '#60A5FA'],
    backgroundColor: '#0F172A',
    repeatMethod: 'half-drop',
    width: 800,
    height: 800,
  },
  {
    id: 'tpl-vec-bauhaus',
    name: 'Cobalt & Violet Bauhaus (Vector)',
    category: 'Floor and Wall Tiles',
    style: 'Geometric Bauhaus',
    description: 'Clean modular geometric tile blocks ready for architectural surfaces and branding.',
    imageUrl: svgToDataUrl(BAUHAUS_GRID_SVG),
    isVector: true,
    svgMarkup: BAUHAUS_GRID_SVG,
    palette: ['#F8FAFC', '#2563EB', '#7C3AED', '#1E293B'],
    backgroundColor: '#F8FAFC',
    repeatMethod: 'grid',
    width: 800,
    height: 800,
  },
];
