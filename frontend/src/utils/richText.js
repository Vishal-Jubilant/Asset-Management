/**
 * Utilities for rich-text / inline Excel table pasting, sanitization,
 * plain-text extraction, and safe display across the app.
 */

const ALLOWED_TAGS = new Set([
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
  'div', 'p', 'br', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'font'
]);

const STRIP_COMPLETELY_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta',
  'title', 'head', 'xml', 'form', 'input', 'button', 'textarea',
  'select', 'option', 'svg', 'noscript', 'colgroup', 'col'
]);

export const isHtmlContent = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /<\s*(table|div|p|br|span|b|strong|i|em|u|ul|ol|li|h[1-4]|font|tr|td|th)\b[^>]*>/i.test(str);
};

export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const formatPlainTextToSafeHtml = (str) => {
  if (!str) return '';
  return escapeHtml(str).replace(/\r\n|\n|\r/g, '<br />');
};

/**
 * Extracts readable plain text from HTML or plain strings
 * (used for table preview columns, CSV exports, and character counting).
 */
export const stripHtmlToText = (str) => {
  if (!str || typeof str !== 'string') return '';
  if (!isHtmlContent(str)) return str;

  try {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(str, 'text/html');
      doc.querySelectorAll('script, style').forEach((el) => el.remove());

      // Insert spacing around cells and block breaks so words don't mash together
      doc.querySelectorAll('td, th').forEach((cell) => {
        cell.appendChild(doc.createTextNode(' '));
      });
      doc.querySelectorAll('tr, p, div, li, br, h1, h2, h3, h4').forEach((blk) => {
        blk.appendChild(doc.createTextNode('\n'));
      });

      const text = (doc.body.textContent || '')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
      return text;
    }
  } catch (e) {
    // Fallback below
  }

  return str
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(tr|p|div|li|h[1-4])>|<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .trim();
};

/**
 * Normalizes a CSS color value, replacing Windows/Excel system colors
 * like `windowtext` and blocking unsafe tokens.
 */
const normalizeCssColor = (val, windowTextFallback = '#0f172a') => {
  if (!val) return '';
  const cleaned = String(val).replace(/!important/gi, '').trim();
  const lower = cleaned.toLowerCase();
  if (!lower || lower === 'none' || lower === 'transparent' || lower === 'auto' || lower === 'initial' || lower === 'inherit') {
    return '';
  }
  if (lower.includes('url(') || lower.includes('expression(') || lower.includes('javascript:')) {
    return '';
  }
  if (lower === 'windowtext' || lower === 'buttontext' || lower === 'captiontext') {
    return windowTextFallback;
  }
  if (lower === 'window') {
    return '#ffffff';
  }
  // Allow hex, rgb/rgba, hsl/hsla, or simple alpha color names
  if (/^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]{3,20})$/i.test(cleaned)) {
    return cleaned;
  }
  return '';
};

/**
 * Normalizes Excel / Google Sheets CSS borders (e.g. `.5pt solid windowtext` -> `1px solid #475569`).
 */
const normalizeCssBorder = (val) => {
  if (!val) return '';
  const cleaned = String(val).replace(/!important/gi, '').trim();
  const lower = cleaned.toLowerCase();
  if (!lower || lower === 'none' || lower === '0' || lower === '0px') {
    return 'none';
  }
  if (lower.includes('url(') || lower.includes('expression(')) {
    return '';
  }
  // Replace windowtext and subpixel Excel point borders (.5pt, 0.5pt)
  return cleaned
    .replace(/\bwindowtext\b/gi, '#475569')
    .replace(/\b0?\.5pt\b/gi, '1px')
    .replace(/\b1\.0pt\b/gi, '1px')
    .replace(/\b1\.5pt\b/gi, '1.5px')
    .replace(/\b2\.0pt\b/gi, '2px');
};

/**
 * Parses `<style>` CSS declarations from clipboard HTML so Excel `.xl*` class styles
 * (background colors, text colors, bold headers, alignments, borders) can be inlined.
 */
const parseClipboardStyleRules = (doc) => {
  const rulesMap = new Map();
  const styleElements = doc.querySelectorAll('style');

  styleElements.forEach((styleEl) => {
    const cssText = (styleEl.textContent || '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--|-->/g, '');

    // Match top-level `selector { declarations }` blocks (skip `@...` at-rules with nested braces cleanly)
    const ruleRegex = /([^{}@]+)\{([^{}]*)\}/g;
    let match;
    while ((match = ruleRegex.exec(cssText)) !== null) {
      const selectorGroup = match[1].trim();
      const declText = match[2].trim();
      if (!selectorGroup || !declText) continue;

      const decls = {};
      declText.split(';').forEach((part) => {
        const colonIdx = part.indexOf(':');
        if (colonIdx === -1) return;
        const prop = part.slice(0, colonIdx).trim().toLowerCase();
        const val = part.slice(colonIdx + 1).trim();
        if (prop && val && !prop.startsWith('mso-') && !prop.startsWith('-webkit-')) {
          decls[prop] = val;
        }
      });

      if (Object.keys(decls).length === 0) continue;

      selectorGroup.split(',').forEach((rawSel) => {
        const sel = rawSel.trim().toLowerCase();
        if (!sel) return;
        const existing = rulesMap.get(sel) || {};
        rulesMap.set(sel, { ...existing, ...decls });
      });
    }
  });

  return rulesMap;
};

const parseInlineStyleString = (styleStr) => {
  const decls = {};
  if (!styleStr) return decls;
  styleStr.split(';').forEach((part) => {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) return;
    const prop = part.slice(0, colonIdx).trim().toLowerCase();
    const val = part.slice(colonIdx + 1).trim();
    if (prop && val && !prop.startsWith('mso-')) {
      decls[prop] = val;
    }
  });
  return decls;
};

/**
 * Builds a clean, safe inline style string for allowed visual formatting properties.
 */
const buildSafeStyle = (decls, tagName) => {
  const safe = {};

  // Background color (`background` in Excel often holds a solid color or `color pattern`)
  const rawBg = decls['background-color'] || (decls['background'] ? decls['background'].split(/\s+/)[0] : '');
  const bgColor = normalizeCssColor(rawBg);
  if (bgColor) {
    safe['background-color'] = bgColor;
  }

  // Foreground text color
  const fgColor = normalizeCssColor(decls['color'], '');
  if (fgColor) {
    safe['color'] = fgColor;
  }

  // Typography & alignment
  if (decls['font-weight']) {
    const fw = decls['font-weight'].replace(/!important/gi, '').trim().toLowerCase();
    if (/^(bold|bolder|normal|[1-9]00)$/.test(fw)) {
      safe['font-weight'] = fw;
    }
  }
  if (decls['font-style']) {
    const fs = decls['font-style'].replace(/!important/gi, '').trim().toLowerCase();
    if (/^(italic|oblique|normal)$/.test(fs)) {
      safe['font-style'] = fs;
    }
  }
  if (decls['text-decoration']) {
    const td = decls['text-decoration'].replace(/!important/gi, '').trim().toLowerCase();
    if (/^(underline|line-through|none)$/.test(td)) {
      safe['text-decoration'] = td;
    }
  }
  if (decls['text-align']) {
    const ta = decls['text-align'].replace(/!important/gi, '').trim().toLowerCase();
    if (/^(left|center|right|justify)$/.test(ta)) {
      safe['text-align'] = ta;
    }
  }
  if (decls['vertical-align']) {
    const va = decls['vertical-align'].replace(/!important/gi, '').trim().toLowerCase();
    if (/^(top|middle|bottom)$/.test(va)) {
      safe['vertical-align'] = va;
    }
  }

  // Borders on tables & cells
  if (tagName === 'td' || tagName === 'th') {
    ['border', 'border-top', 'border-right', 'border-bottom', 'border-left'].forEach((bProp) => {
      if (decls[bProp]) {
        const norm = normalizeCssBorder(decls[bProp]);
        if (norm) safe[bProp] = norm;
      }
    });

    // Ensure every table cell has visible borders if none were explicitly applied (or if border was 'none', keep light grid so Excel ranges remain crisp)
    if (!safe['border'] && !safe['border-top'] && !safe['border-bottom'] && !safe['border-left'] && !safe['border-right']) {
      safe['border'] = '1px solid #cbd5e1';
    } else if (safe['border'] === 'none') {
      safe['border'] = '1px solid #e2e8f0';
    }

    safe['padding'] = '4px 8px';
    if (!safe['vertical-align']) safe['vertical-align'] = 'middle';
    if (tagName === 'th' && !safe['font-weight']) safe['font-weight'] = '700';
  }

  if (tagName === 'table') {
    safe['border-collapse'] = 'collapse';
    safe['margin'] = '6px 0';
    safe['font-size'] = '12px';
    safe['line-height'] = '1.4';
    safe['background-color'] = safe['background-color'] || '#ffffff';
  }

  const parts = Object.entries(safe).map(([k, v]) => `${k}: ${v}`);
  return parts.join('; ');
};

/**
 * Sanitizes rich HTML (or Excel/Google Sheets clipboard HTML) into self-contained,
 * XSS-safe HTML with inlined Excel colors, bold headers, alignments, and borders.
 */
export const sanitizeRichHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  if (typeof DOMParser === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. Parse `<style>` CSS rules BEFORE stripping `<style>` tags
  const rulesMap = parseClipboardStyleRules(doc);

  // 2. Remove dangerous / unnecessary elements completely
  doc.querySelectorAll(Array.from(STRIP_COMPLETELY_TAGS).join(',')).forEach((el) => el.remove());

  // 3. Remove HTML comments (including `<!--StartFragment-->`)
  const commentWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const comments = [];
  let cNode;
  while ((cNode = commentWalker.nextNode())) {
    comments.push(cNode);
  }
  comments.forEach((c) => c.remove());

  // 4. Clean and inline styles recursively
  const processElement = (el) => {
    const tag = el.tagName.toLowerCase();

    // Process children first
    Array.from(el.children).forEach(processElement);

    // Unwrap disallowed/proprietary wrapper elements (like <google-sheets-html-origin>, <o:p>, <a> without href etc.)
    if (!ALLOWED_TAGS.has(tag)) {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
      return;
    }

    // Collect merged CSS declarations: tag rules -> class rules -> tag.class rules -> inline style -> HTML attributes (bgcolor, color, align)
    let mergedDecls = {};
    if (rulesMap.has(tag)) {
      mergedDecls = { ...mergedDecls, ...rulesMap.get(tag) };
    }
    const classAttr = el.getAttribute('class') || '';
    if (classAttr) {
      classAttr.split(/\s+/).filter(Boolean).forEach((cls) => {
        const clsLower = cls.toLowerCase();
        if (rulesMap.has(`.${clsLower}`)) {
          mergedDecls = { ...mergedDecls, ...rulesMap.get(`.${clsLower}`) };
        }
        if (rulesMap.has(`${tag}.${clsLower}`)) {
          mergedDecls = { ...mergedDecls, ...rulesMap.get(`${tag}.${clsLower}`) };
        }
      });
    }

    // Check legacy HTML attributes (Excel / Word / <font>)
    const htmlBg = el.getAttribute('bgcolor');
    if (htmlBg) mergedDecls['background-color'] = htmlBg;
    const htmlColor = el.getAttribute('color');
    if (htmlColor) mergedDecls['color'] = htmlColor;
    const htmlAlign = el.getAttribute('align');
    if (htmlAlign) mergedDecls['text-align'] = htmlAlign;

    // Inline style overrides class rules
    const inlineDecls = parseInlineStyleString(el.getAttribute('style') || '');
    mergedDecls = { ...mergedDecls, ...inlineDecls };

    // Convert <font> cleanly to <span>
    let targetEl = el;
    if (tag === 'font') {
      const span = doc.createElement('span');
      while (el.firstChild) span.appendChild(el.firstChild);
      el.parentNode?.replaceChild(span, el);
      targetEl = span;
    }

    const effectiveTag = targetEl.tagName.toLowerCase();
    const colspan = targetEl.getAttribute('colspan');
    const rowspan = targetEl.getAttribute('rowspan');

    // Strip ALL existing attributes to ensure zero event handlers / Excel noise
    Array.from(targetEl.attributes).forEach((attr) => targetEl.removeAttribute(attr.name));

    if ((effectiveTag === 'td' || effectiveTag === 'th') && colspan && /^\d+$/.test(colspan) && Number(colspan) > 1) {
      targetEl.setAttribute('colspan', colspan);
    }
    if ((effectiveTag === 'td' || effectiveTag === 'th') && rowspan && /^\d+$/.test(rowspan) && Number(rowspan) > 1) {
      targetEl.setAttribute('rowspan', rowspan);
    }

    const safeStyle = buildSafeStyle(mergedDecls, effectiveTag);
    if (safeStyle) {
      targetEl.setAttribute('style', safeStyle);
    }
  };

  Array.from(doc.body.children).forEach(processElement);

  return doc.body.innerHTML.trim();
};

/**
 * Checks whether an HTML fragment contains a multi-cell table (at least 2 cells total)
 * so single-cell copies paste as normal plain text rather than a box.
 */
const hasMultiCellTable = (html) => {
  if (!html || !/<table\b/i.test(html)) return false;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return false;
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length > 1) return true;
    const cells = table.querySelectorAll('td, th');
    return cells.length > 1;
  } catch {
    return false;
  }
};

/**
 * Builds a styled HTML table from plain Tab-Separated Values (TSV).
 */
const buildHtmlTableFromTsv = (text) => {
  const lines = text.trim().split(/\r\n|\n|\r/).filter(Boolean);
  if (lines.length === 0) return '';
  const matrix = lines.map((line) => line.split('\t').map((c) => c.trim()));
  if (!(matrix.length > 1 || (matrix[0] && matrix[0].length > 1))) return '';

  const rowsHtml = matrix
    .map((row) => {
      const cellsHtml = row
        .map(
          (cell) =>
            `<td style="border: 1px solid #cbd5e1; padding: 4px 8px; vertical-align: middle;">${escapeHtml(cell)}</td>`
        )
        .join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    .join('');

  return `<table style="border-collapse: collapse; margin: 6px 0; font-size: 12px; line-height: 1.4; background-color: #ffffff;"><tbody>${rowsHtml}</tbody></table>`;
};

/**
 * Extracts inline rich HTML (especially tables from Excel / Google Sheets / TSV)
 * from ClipboardEvent.clipboardData for pasting directly inside the Description editor.
 */
export const clipboardToRichHtml = (clipboardData) => {
  if (!clipboardData) return { hasTable: false, html: null };

  const rawHtml = clipboardData.getData('text/html') || '';
  const plainText = clipboardData.getData('text/plain') || '';

  if (rawHtml && hasMultiCellTable(rawHtml)) {
    const cleanHtml = sanitizeRichHtml(rawHtml);
    if (cleanHtml && /<table\b/i.test(cleanHtml)) {
      return { hasTable: true, html: cleanHtml };
    }
  }

  if (plainText && plainText.includes('\t')) {
    const tsvTableHtml = buildHtmlTableFromTsv(plainText);
    if (tsvTableHtml) {
      return { hasTable: true, html: tsvTableHtml };
    }
  }

  return { hasTable: false, html: null };
};

