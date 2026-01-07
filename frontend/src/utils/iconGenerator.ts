/**
 * Icon Generator - Manga Visor
 * Generates a themed PNG icon at runtime to update the taskbar
 */

import { Theme } from '../themes';

export async function generateThemedIcon(theme: Theme): Promise<string> {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    const { accent, accentHover } = theme.colors;

    // 1. Draw rounded background with gradient
    const radius = size * 0.2;
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, accentHover);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    // 2. Draw Globe Icon (SVG Path)
    // Scale the path from 24x24 to proportional icon size
    const scale = size * 0.6 / 24;
    const offset = size * 0.2;

    ctx.save();
    ctx.translate(offset, offset);
    ctx.scale(scale, scale);

    const p = new Path2D('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z');

    ctx.fillStyle = 'white';
    ctx.fill(p);
    ctx.restore();

    return canvas.toDataURL('image/png');
}
