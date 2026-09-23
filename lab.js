/* ============================================================================
   SHARED LAB HELPERS — the colour arithmetic the labs measure with.

   Extracted on the third use. The Event detail lab computed contrast from live
   token values, the Date picker lab needed the same code, and this one needs it
   too — so like `lab.css` before it, one copy instead of three.

   Deliberately small. It is not a utility library, it is the four functions that
   turn `getComputedStyle` output into a contrast ratio, because a lab that claims
   "these two states are indistinguishable" has to have computed it.
   ============================================================================ */

// '#E4E4E7' or 'rgb(228, 228, 231)' or 'rgba(...)' -> [r, g, b]
function toRgb(css) {
  css = (css || '').trim();
  if (css[0] === '#') {
    const h = css.slice(1);
    const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
  }
  const n = (css.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
  return [n[0] || 0, n[1] || 0, n[2] || 0];
}

// The alpha of an `rgba()` value, which is only ever needed for the scrim.
function alphaOf(css) {
  const n = (String(css).match(/[\d.]+/g) || []).map(Number);
  return n.length === 4 ? n[3] : 1;
}

function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }

function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }

// WCAG relative luminance ratio, the number the contrast floors are written in.
function contrast(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// Hue in degrees, for the "these two are the closest pair in the palette" claims.
function hue(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}

// Painted OVER content, so text and its ground are dimmed by the same fraction.
const dim = (c, ov, a) => c.map((v, i) => ov[i] * a + v * (1 - a));

// One decimal, which is the precision every contrast figure in these labs uses.
const d1 = n => n.toFixed(1);

// Two decimals, for the figures whose entire finding is a margin of a few
// hundredths — rounding a 0.04 margin to "0.0" prints the opposite of the point.
const d2 = n => n.toFixed(2);

// Read a custom property off :root and hand back the colour.
function token(name) {
  return toRgb(getComputedStyle(document.documentElement).getPropertyValue(name));
}
