// From this directory: node render-transfer.mjs > fig-09-transfer.svg
// Requires Node.js 16+. No package dependencies.
import { readFileSync } from 'node:fs';

function renderFigure(data) {
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const colors = {
    ink: 'var(--ink, #293441)', subdued: 'var(--muted, #526071)', grid: 'var(--line, #dce2e9)',
    gain: 'var(--chart-teal, #2b7975)', loss: 'var(--chart-red, #ac4d5b)'
  };
  function text(x, y, value, { size = 18, weight = 450, anchor = 'start', color = colors.ink } = {}) {
    return `  <text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${color}">${escape(value)}</text>`;
  }
  const unit = 30; // viewBox units per percentage point
  const zero = 139;
  const elements = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 351" role="img" aria-label="Changes at 50 percent code, compared with text only" style="min-width:0;max-width:560px;margin-inline:auto;font-variant-numeric:tabular-nums" font-family="system-ui, sans-serif">',
    '  <title>Changes at 50% code, compared with text only</title>',
    '  <desc>At 470M parameters and 400B total training tokens, replacing half the text with code changed NL reasoning by +2.8 percentage points, world knowledge by −1.4 and code by +8.6.</desc>',
    `  <!-- ${escape(data.location)} Source: ${data.source} -->`,
    text(8, 26, 'Change in percentage points', { size: 20, weight: 650 }),
    text(8, 53, 'Text only → 50% code', { color: colors.subdued })
  ];
  data.metrics.forEach((row, index) => {
    const y = 94 + index * 91;
    const delta = Math.round((row.balancedOnly - row.textOnly) * 10) / 10;
    const endpoint = Math.round((zero + delta * unit) * 10) / 10;
    const signed = (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1);
    const color = delta >= 0 ? colors.gain : colors.loss;
    const raw = row.textOnly.toFixed(1) + ' → ' + row.balancedOnly.toFixed(1);
    elements.push(
      text(8, y, row.name, { size: 20, weight: 620 }),
      text(472, y, raw, { size: 20, anchor: 'end' }),
      text(8, y + 23, row.metric, { color: colors.subdued }),
      `  <path d="M 61 ${y+43} H 449" stroke="${colors.grid}" fill="none" stroke-width="1.5"/>`,
      `  <path d="M ${zero} ${y+33} v 20" stroke="${colors.subdued}" fill="none" stroke-width="1.2"/>`,
      `  <path d="M ${zero} ${y+43} H ${endpoint}" stroke="${color}" fill="none" stroke-width="7"/>`,
      text(endpoint + (delta >= 0 ? 9 : -9), y + 49, signed, { anchor: delta >= 0 ? 'start' : 'end', weight: 650, color })
    );
  });
  elements.push(text(zero, 348, '0', { anchor: 'middle', color: colors.subdued }), '</svg>', '');
  return elements.join('\n');
}

const data = JSON.parse(readFileSync(new URL('./aryabumi-table2.json', import.meta.url), 'utf8'));
process.stdout.write(renderFigure(data));
