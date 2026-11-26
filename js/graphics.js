// js/graphics.js
// Procedural, randomized card graphic generator using HTML5 Canvas

// Pseudo-random number generator from seed
class PRNG {
    constructor(seed = 12345) {
        this.s = Math.abs(seed) % 2147483647;
        if (this.s <= 0) this.s += 2147483646;
    }
    next() {
        return (this.s = (this.s * 16807) % 2147483647) / 2147483647;
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
    choice(arr) {
        return arr[this.int(0, arr.length - 1)];
    }
}

// Generate harmonious color palette based on base hue
export function generatePalette(rng) {
    const baseHue = rng.range(0, 360);
    const mode = rng.choice(['complementary', 'triadic', 'analogous', 'split']);
    let hues = [baseHue];

    if (mode === 'complementary') {
        hues.push((baseHue + 180) % 360);
        hues.push((baseHue + 30) % 360);
        hues.push((baseHue + 210) % 360);
    } else if (mode === 'triadic') {
        hues.push((baseHue + 120) % 360);
        hues.push((baseHue + 240) % 360);
        hues.push((baseHue + 60) % 360);
    } else if (mode === 'analogous') {
        hues.push((baseHue + 35) % 360);
        hues.push((baseHue + 70) % 360);
        hues.push((baseHue - 35 + 360) % 360);
    } else { // split
        hues.push((baseHue + 150) % 360);
        hues.push((baseHue + 210) % 360);
        hues.push((baseHue + 40) % 360);
    }

    return hues.map((h, i) => {
        const sat = rng.range(75, 95);
        const light = [60, 50, 68, 75][i % 4];
        return `hsl(${Math.round(h)}, ${sat}%, ${light}%)`;
    });
}

// Master generator for a card pair
export function generateCardGraphic(pairId, style = 'all', size = 300) {
    const seed = (pairId + 1) * 9973 + Math.floor(Math.random() * 89999);
    const rng = new PRNG(seed);

    const availableStyles = ['mandala', 'crystal', 'cyber', 'cosmic', 'geometric'];
    const chosenType = (style === 'all' || !availableStyles.includes(style)) 
        ? availableStyles[pairId % availableStyles.length] 
        : style;

    const colors = generatePalette(rng);

    // Create offscreen canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw the pattern
    renderPattern(ctx, chosenType, rng, colors, size);

    const dataUrl = canvas.toDataURL('image/png');

    return {
        pairId,
        seed,
        type: chosenType,
        colors,
        dataUrl,
        async getBlob() {
            return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        }
    };
}

// Render pattern to any canvas context deterministically
export function renderPattern(ctx, type, rng, colors, size) {
    const cx = size / 2;
    const cy = size / 2;

    // Reset and draw card face background
    ctx.clearRect(0, 0, size, size);

    // Dark sleek card graphic container background
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, size * 0.7);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // Soft subtle grid texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const step = size / 8;
    for (let i = step; i < size; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, size);
        ctx.moveTo(0, i); ctx.lineTo(size, i);
        ctx.stroke();
    }

    ctx.save();

    switch (type) {
        case 'mandala':
            drawMandala(ctx, cx, cy, rng, colors, size);
            break;
        case 'crystal':
            drawCrystal(ctx, cx, cy, rng, colors, size);
            break;
        case 'cyber':
            drawCyber(ctx, cx, cy, rng, colors, size);
            break;
        case 'cosmic':
            drawCosmic(ctx, cx, cy, rng, colors, size);
            break;
        case 'geometric':
        default:
            drawGeometric(ctx, cx, cy, rng, colors, size);
            break;
    }

    ctx.restore();

    // Subtle gloss ring/border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, size - 12, size - 12);
}

// 1. Mandala / Sacred Geometry
function drawMandala(ctx, cx, cy, rng, colors, size) {
    const petals = rng.choice([6, 8, 10, 12]);
    const maxR = size * 0.38;

    for (let layer = 0; layer < 4; layer++) {
        const r = maxR * ((layer + 1) / 4);
        const col = colors[layer % colors.length];
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 3;

        for (let i = 0; i < petals; i++) {
            const angle = (Math.PI * 2 / petals) * i + (layer % 2 === 1 ? Math.PI / petals : 0);
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;

            ctx.beginPath();
            ctx.arc(px, py, maxR * 0.12, 0, Math.PI * 2);
            ctx.stroke();

            // Interconnecting lines
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
            ctx.stroke();
        }
    }

    // Glowing core
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.25);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, colors[0]);
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.25, 0, Math.PI * 2);
    ctx.fill();
}

// 2. Crystal / Gemstone
function drawCrystal(ctx, cx, cy, rng, colors, size) {
    const facets = rng.choice([5, 6, 7, 8]);
    const rOuter = size * 0.40;
    const rInner = size * 0.22;

    const outerPoints = [];
    const innerPoints = [];

    for (let i = 0; i < facets; i++) {
        const a = (Math.PI * 2 / facets) * i - Math.PI / 2;
        outerPoints.push({ x: cx + Math.cos(a) * rOuter, y: cy + Math.sin(a) * rOuter });
        innerPoints.push({ x: cx + Math.cos(a) * rInner, y: cy + Math.sin(a) * rInner });
    }

    // Draw facets with different color tints and opacities
    for (let i = 0; i < facets; i++) {
        const next = (i + 1) % facets;
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.5 + ((i % 3) * 0.2);

        // Outer facet trapezoid
        ctx.beginPath();
        ctx.moveTo(outerPoints[i].x, outerPoints[i].y);
        ctx.lineTo(outerPoints[next].x, outerPoints[next].y);
        ctx.lineTo(innerPoints[next].x, innerPoints[next].y);
        ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Central cap
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.moveTo(innerPoints[0].x, innerPoints[0].y);
    for (let i = 1; i < facets; i++) ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Specular highlight gleam
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(innerPoints[0].x * 0.9 + cx * 0.1, innerPoints[0].y * 0.9 + cy * 0.1, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
}

// 3. Cyber / Neon Badge
function drawCyber(ctx, cx, cy, rng, colors, size) {
    const r = size * 0.36;

    // Glowing outer hexagon
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 4;
    ctx.shadowColor = colors[0];
    ctx.shadowBlur = 15;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Circuit cross / nodes
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = 3;
    const innerR = r * 0.6;
    for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + Math.PI / 4;
        const x1 = cx + Math.cos(a) * (innerR * 0.3);
        const y1 = cy + Math.sin(a) * (innerR * 0.3);
        const x2 = cx + Math.cos(a) * innerR;
        const y2 = cy + Math.sin(a) * innerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = colors[2 % colors.length];
        ctx.beginPath();
        ctx.arc(x2, y2, size * 0.035, 0, Math.PI * 2);
        ctx.fill();
    }

    // Cyber target reticle
    ctx.strokeStyle = colors[3 % colors.length];
    ctx.beginPath();
    ctx.arc(cx, cy, innerR * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.025, 0, Math.PI * 2);
    ctx.fill();
}

// 4. Cosmic / Planetary Constellation
function drawCosmic(ctx, cx, cy, rng, colors, size) {
    const planetR = size * 0.22;

    // Planet body gradient
    const grad = ctx.createLinearGradient(cx - planetR, cy - planetR, cx + planetR, cy + planetR);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
    ctx.fill();

    // Diagonal planetary ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 6);
    ctx.scale(1.8, 0.45);

    ctx.strokeStyle = colors[2 % colors.length];
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, planetR * 1.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Surrounding stars/constellation dots
    const starCount = rng.int(4, 7);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < starCount; i++) {
        const a = rng.range(0, Math.PI * 2);
        const dist = rng.range(planetR * 1.3, size * 0.42);
        const sx = cx + Math.cos(a) * dist;
        const sy = cy + Math.sin(a) * dist;
        const sSize = rng.range(2, 5);

        ctx.beginPath();
        ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 5. Geometric / Modern Abstract
function drawGeometric(ctx, cx, cy, rng, colors, size) {
    const shapeCount = rng.int(3, 5);

    for (let i = 0; i < shapeCount; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;

        const w = size * rng.range(0.25, 0.45);
        const h = size * rng.range(0.25, 0.45);
        const ox = cx + rng.range(-size * 0.15, size * 0.15);
        const oy = cy + rng.range(-size * 0.15, size * 0.15);

        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(rng.range(0, Math.PI));

        const shape = rng.choice(['rect', 'circle', 'triangle', 'arc']);
        if (shape === 'rect') {
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else if (shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(0, -h / 2);
            ctx.lineTo(w / 2, h / 2);
            ctx.lineTo(-w / 2, h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, w / 2, 0, Math.PI);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }
}
