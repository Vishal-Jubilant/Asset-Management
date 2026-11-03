/**
 * Utility to convert Excel / tabular clipboard data (or clipboard images)
 * into a high-resolution PNG image File for attachments.
 */

/**
 * Parses table structure from HTML or TSV into a 2D matrix of cell objects:
 * [ [ { text, isBold }, ... ], ... ]
 */
export const parseTableFromClipboard = (clipboardData) => {
  if (!clipboardData) return null;

  const html = clipboardData.getData('text/html') || '';
  const text = clipboardData.getData('text/plain') || '';

  // 1. Try HTML table first (preserves rich structure)
  if (html && (html.includes('<table') || html.includes('<TABLE'))) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (table) {
        const trs = Array.from(table.querySelectorAll('tr'));
        const matrix = [];

        trs.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td, th'));
          if (cells.length > 0) {
            const row = cells.map(cell => {
              // Convert <br> to newline
              const clone = cell.cloneNode(true);
              clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
              const cellText = (clone.innerText || clone.textContent || '').trim();
              const isBold = cell.tagName.toLowerCase() === 'th' ||
                cell.querySelector('b, strong') !== null ||
                /bold|700|800|900/.test(cell.style.fontWeight || '');

              return { text: cellText, isBold };
            });
            matrix.push(row);
          }
        });

        // Ensure table has more than 1 cell or multiple rows
        if (matrix.length > 0 && (matrix.length > 1 || matrix[0].length > 1)) {
          return matrix;
        }
      }
    } catch (e) {
      console.warn('Failed to parse HTML table from clipboard:', e);
    }
  }

  // 2. Fallback to TSV (Tab Separated Values)
  if (text && text.includes('\t')) {
    const lines = text.trim().split(/\r\n|\n|\r/).filter(Boolean);
    if (lines.length > 0) {
      const matrix = lines.map(line =>
        line.split('\t').map(c => ({ text: c.trim(), isBold: false }))
      );
      if (matrix.length > 0 && (matrix.length > 1 || matrix[0].length > 1)) {
        return matrix;
      }
    }
  }

  return null;
};

/**
 * Checks if the clipboard contains an image file, an HTML table, or TSV data.
 */
export const isTableOrImageData = (clipboardData) => {
  if (!clipboardData) return false;

  // 1. Check for image in items
  const hasImage = Array.from(clipboardData.items || []).some(item => item.type && item.type.startsWith('image/'));
  if (hasImage) return true;

  // 2. Check for parsed table (HTML table or TSV with multiple cells/rows)
  const tableData = parseTableFromClipboard(clipboardData);
  if (tableData && tableData.length > 0) {
    return true;
  }

  return false;
};

/**
 * Word-wraps text preserving delimiters (spaces, slashes, hyphens)
 * so long identifiers (e.g. UPI/P2A/584592555570/...) wrap nicely.
 */
const wrapCellText = (ctx, text, maxWidth) => {
  if (!text) return [''];
  const paragraphs = text.split(/\r\n|\n|\r/);
  const allLines = [];

  paragraphs.forEach(paragraph => {
    // Split keeping separators: spaces, slashes, hyphens, underscores
    const tokens = paragraph.split(/([ \t]+|[\/\-_])/).filter(Boolean);
    let currentLine = '';

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const testLine = currentLine + token;
      const width = ctx.measureText(testLine).width;

      if (width > maxWidth && currentLine.length > 0) {
        allLines.push(currentLine.trim());
        currentLine = token.startsWith(' ') ? token.trim() : token;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.length > 0) {
      allLines.push(currentLine.trim());
    }
  });

  return allLines.length > 0 ? allLines : [''];
};

/**
 * Renders a 2D matrix of cell objects to a clean, high-DPI Excel-styled PNG image.
 * Matches Excel table aesthetics: crisp 1px borders, white background, Segoe UI / Arial font.
 */
export const convertTableToImageFile = async (matrix, filenamePrefix = 'excel_table') => {
  if (!matrix || matrix.length === 0) {
    throw new Error('Empty matrix provided to convertTableToImageFile');
  }

  const numCols = Math.max(...matrix.map(r => r.length));
  // Normalize row lengths
  const normalizedMatrix = matrix.map(row => {
    const newRow = [...row];
    while (newRow.length < numCols) {
      newRow.push({ text: '', isBold: false });
    }
    return newRow;
  });

  // Typography settings
  const fontSize = 13;
  const fontFamily = '"Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  const normalFont = `${fontSize}px ${fontFamily}`;
  const boldFont = `bold ${fontSize}px ${fontFamily}`;
  const lineHeight = 19;
  const paddingX = 10;
  const paddingY = 8;

  // Offscreen canvas for measuring
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  mCtx.font = normalFont;

  // Calculate optimal column widths
  // Clamp between 80px and 450px depending on column count and longest text tokens
  const colWidths = [];
  for (let c = 0; c < numCols; c++) {
    let maxSingleTokenWidth = 60;
    let maxFullTextWidth = 60;

    for (let r = 0; r < normalizedMatrix.length; r++) {
      const cell = normalizedMatrix[r][c];
      mCtx.font = cell.isBold ? boldFont : normalFont;

      const fullW = mCtx.measureText(cell.text).width;
      if (fullW > maxFullTextWidth) maxFullTextWidth = fullW;

      // Check max individual token
      const tokens = cell.text.split(/([ \t]+|[\/\-_])/).filter(Boolean);
      tokens.forEach(tok => {
        const tw = mCtx.measureText(tok).width;
        if (tw > maxSingleTokenWidth) maxSingleTokenWidth = tw;
      });
    }

    // Dynamic width decision
    let chosenWidth;
    if (numCols <= 2) {
      // For 2 columns (like in UPI / Remarks screenshot), give generous room
      chosenWidth = Math.min(Math.max(maxSingleTokenWidth + paddingX * 2 + 10, maxFullTextWidth + paddingX * 2, 100), 520);
    } else {
      chosenWidth = Math.min(Math.max(maxSingleTokenWidth + paddingX * 2 + 10, 80), 380);
    }
    colWidths.push(Math.ceil(chosenWidth));
  }

  // Pre-wrap text for every cell and compute row heights
  const cellLines = [];
  const rowHeights = [];

  for (let r = 0; r < normalizedMatrix.length; r++) {
    cellLines[r] = [];
    let maxLinesInRow = 1;

    for (let c = 0; c < numCols; c++) {
      const cell = normalizedMatrix[r][c];
      mCtx.font = cell.isBold ? boldFont : normalFont;
      const availableWidth = colWidths[c] - paddingX * 2;
      const lines = wrapCellText(mCtx, cell.text, availableWidth);
      cellLines[r][c] = lines;
      if (lines.length > maxLinesInRow) {
        maxLinesInRow = lines.length;
      }
    }

    const rHeight = Math.max(maxLinesInRow * lineHeight + paddingY * 2, 32);
    rowHeights.push(rHeight);
  }

  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const totalHeight = rowHeights.reduce((a, b) => a + b, 0);

  // High-DPI scaling (2x for crisp text and lines on all displays)
  const dpr = Math.min(window.devicePixelRatio || 2, 3);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(totalWidth * dpr);
  canvas.height = Math.ceil(totalHeight * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 1. Draw solid white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // 2. Draw table cells and borders
  let currentY = 0;
  for (let r = 0; r < normalizedMatrix.length; r++) {
    let currentX = 0;
    const rh = rowHeights[r];

    for (let c = 0; c < numCols; c++) {
      const cw = colWidths[c];
      const cell = normalizedMatrix[r][c];

      // Cell border: crisp 1px solid black, Excel style
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(currentX + 0.5, currentY + 0.5, cw, rh);

      // Cell text
      ctx.font = cell.isBold ? boldFont : normalFont;
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      const lines = cellLines[r][c];
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, currentX + paddingX, currentY + paddingY + lIdx * lineHeight);
      });

      currentX += cw;
    }
    currentY += rh;
  }

  // 3. Convert to PNG Blob and File
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        const pad = n => String(n).padStart(2, '0');
        const now = new Date();
        const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const fileName = `${filenamePrefix}_${dateStr}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        resolve(file);
      } else {
        reject(new Error('Canvas rendering toBlob failed.'));
      }
    }, 'image/png');
  });
};

/**
 * Main handler to process a paste event for adding an image attachment.
 * Returns: { success: true, file, isTable: boolean } or { success: false }
 */
export const processPasteToAttachment = async (clipboardData) => {
  if (!clipboardData) return { success: false };

  // 1. Check if there's an image file directly (e.g. Snipping tool, Copy as Picture, or image item)
  const items = Array.from(clipboardData.items || []);
  const imageItem = items.find(item => item.type && item.type.startsWith('image/'));

  // Also check if clipboard has table data
  const tableData = parseTableFromClipboard(clipboardData);

  // If table data is present (from copying cells in Excel / Google Sheets),
  // rendering it to canvas provides perfect crisp table rendering!
  if (tableData) {
    try {
      const file = await convertTableToImageFile(tableData, 'excel_table');
      return { success: true, file, isTable: true };
    } catch (err) {
      console.error('Error converting table to image:', err);
    }
  }

  // If there was no table, but there is an image item in clipboard (screenshot, copied image file)
  if (imageItem) {
    const blob = imageItem.getAsFile();
    if (blob) {
      const pad = n => String(n).padStart(2, '0');
      const now = new Date();
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fileName = `pasted_image_${dateStr}.png`;
      const file = new File([blob], fileName, { type: blob.type || 'image/png' });
      return { success: true, file, isTable: false };
    }
  }

  return { success: false };
};

