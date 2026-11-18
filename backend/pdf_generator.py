import io
import math
import re
import base64
from html.parser import HTMLParser
from xml.sax.saxutils import escape as xml_escape
from datetime import datetime
from bs4 import BeautifulSoup
from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Flowable, Image as RLImage
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print total page numbers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header banner
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(36, 804, 559, 804)
        self.drawString(36, 810, "ASSET MANAGEMENT SYSTEM")
        self.setFont("Helvetica", 8)
        self.drawRightString(559, 810, "Official Request & Approval Record")

        # Footer banner
        self.line(36, 45, 559, 45)
        now_str = datetime.now().strftime("%b %d, %Y, %I:%M %p")
        self.drawString(36, 32, f"Confidential • Generated on {now_str}")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 32, page_text)
        self.restoreState()


def format_dt(dt_val):
    if not dt_val:
        return "N/A"
    dt_str = str(dt_val).strip()
    try:
        if "T" in dt_str:
            d = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            return d.strftime("%b %d, %Y, %I:%M %p")
    except Exception:
        pass
    return dt_str


class StarBadge(Flowable):
    """Draws a premium 24-point official starburst seal with APPROVED or REJECTED."""
    def __init__(self, status='APPROVED', size=64):
        super().__init__()
        self.status = str(status).upper()
        self.size = size
        self.width = size
        self.height = size

    def wrap(self, availWidth, availHeight):
        return self.width, self.height

    def draw(self):
        canv = self.canv
        cx = self.width / 2.0
        cy = self.height / 2.0
        r_out = self.size / 2.0
        r_in = r_out * 0.86
        points = 24

        is_approved = 'APPROV' in self.status
        if is_approved:
            primary = colors.HexColor('#059669')    # emerald 600
            dark = colors.HexColor('#065f46')       # emerald 800
            light_bg = colors.HexColor('#ecfdf5')   # emerald 50
            ring = colors.HexColor('#10b981')       # emerald 500
            text = 'APPROVED'
        else:
            primary = colors.HexColor('#dc2626')    # red 600
            dark = colors.HexColor('#991b1b')       # red 800
            light_bg = colors.HexColor('#fef2f2')   # red 50
            ring = colors.HexColor('#ef4444')       # red 500
            text = 'REJECTED'

        canv.saveState()

        # 1. 24-point Starburst perimeter
        p = canv.beginPath()
        step = math.pi / points
        for i in range(2 * points):
            r = r_out if i % 2 == 0 else r_in
            x = cx + r * math.cos(i * step)
            y = cy + r * math.sin(i * step)
            if i == 0:
                p.moveTo(x, y)
            else:
                p.lineTo(x, y)
        p.close()

        canv.setFillColor(light_bg)
        canv.setStrokeColor(primary)
        canv.setLineWidth(1.4)
        canv.drawPath(p, fill=1, stroke=1)

        # 2. Concentric solid outer circle
        canv.setStrokeColor(primary)
        canv.setLineWidth(1.1)
        canv.circle(cx, cy, r_out * 0.77, fill=0, stroke=1)

        # 3. Inner dashed security ring
        canv.setStrokeColor(ring)
        canv.setLineWidth(0.6)
        canv.setDash(1.5, 1.5)
        canv.circle(cx, cy, r_out * 0.70, fill=0, stroke=1)
        canv.setDash()

        # 4. Top Stars: 3 mini stars
        canv.setFont('Helvetica', 4.5)
        canv.setFillColor(primary)
        canv.drawCentredString(cx, cy + (r_out * 0.38), '★  ★  ★')

        # 5. Central Bold Typography
        canv.setFont('Helvetica-Bold', 7)
        canv.setFillColor(dark)
        canv.drawCentredString(cx, cy - 2.5, text)

        # 6. Bottom Subtext: VERIFIED & VALID
        canv.setFont('Helvetica-Bold', 3.8)
        canv.setFillColor(primary)
        canv.drawCentredString(cx, cy - (r_out * 0.44), 'VERIFIED & VALID')

        canv.restoreState()


def decode_image_data(data_uri_or_b64: str) -> bytes | None:
    """Decodes a base64 string or data URI into raw image bytes."""
    if not data_uri_or_b64 or not isinstance(data_uri_or_b64, str):
        return None
    raw = data_uri_or_b64.strip()
    if raw.startswith('data:'):
        if ',' in raw:
            raw = raw.split(',', 1)[1]
    raw = re.sub(r'\s+', '', raw)
    if not raw:
        return None
    missing_padding = len(raw) % 4
    if missing_padding:
        raw += '=' * (4 - missing_padding)
    try:
        return base64.b64decode(raw)
    except Exception:
        return None


def is_image_attachment(att: dict) -> bool:
    """Strictly checks whether an attachment object represents a supported image format."""
    if not isinstance(att, dict):
        return False
    name = str(att.get('name') or '').lower().strip()
    att_type = str(att.get('type') or '').lower().strip()
    data = str(att.get('data') or '').strip().lower()

    # Explicit exclusions: PDF, Word, Excel, text, zip, etc.
    non_img_exts = ('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip', '.rar', '.7z', '.json')
    if any(name.endswith(ext) for ext in non_img_exts):
        return False
    if 'pdf' in att_type or 'word' in att_type or 'excel' in att_type or 'spreadsheet' in att_type or 'text/' in att_type:
        return False
    if data.startswith('data:application/pdf') or data.startswith('data:application/msword') or data.startswith('data:application/vnd'):
        return False

    # Positive image check
    img_exts = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.tiff', '.tif')
    if any(name.endswith(ext) for ext in img_exts):
        return True
    if att_type.startswith('image/'):
        return True
    if data.startswith('data:image/'):
        return True

    return False


def make_reportlab_image(image_bytes: bytes, max_w: float = 507, max_h: float = 380) -> RLImage | None:
    """Converts image bytes into a scaled ReportLab RLImage flowable fitting within max_w and max_h."""
    if not image_bytes:
        return None
    try:
        pil_img = PILImage.open(io.BytesIO(image_bytes))
        orig_w, orig_h = pil_img.size
        if orig_w <= 0 or orig_h <= 0:
            return None

        aspect = orig_h / float(orig_w)
        target_w = min(float(orig_w), float(max_w))
        target_h = target_w * aspect
        if target_h > max_h:
            target_h = float(max_h)
            target_w = target_h / aspect

        out_buf = io.BytesIO()
        if pil_img.format == 'PNG' or pil_img.mode in ('RGBA', 'LA') or (pil_img.mode == 'P' and 'transparency' in pil_img.info):
            pil_img.save(out_buf, format='PNG')
        elif pil_img.format == 'JPEG' and pil_img.mode == 'RGB':
            pil_img.save(out_buf, format='JPEG', quality=95)
        else:
            pil_img.convert('RGB').save(out_buf, format='JPEG', quality=95)

        out_buf.seek(0)
        return RLImage(out_buf, width=target_w, height=target_h)
    except Exception:
        return None


class RichDescriptionTextParser(HTMLParser):
    """Extracts non-table text and inline images from sanitized HTML description for PDF generation."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self._text_parts = []
        self._images = []
        self._bold_depth = 0
        self._italic_depth = 0
        self._table_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == 'table':
            self._table_depth += 1
            return
        if self._table_depth > 0:
            return

        if tag == 'img':
            attrs_dict = dict(attrs)
            src = (attrs_dict.get('src') or '').strip()
            if src:
                self._images.append(src)
            return

        if tag == 'br':
            self._text_parts.append('<br/>')
        elif tag in ('b', 'strong'):
            self._bold_depth += 1
            self._text_parts.append('<b>')
        elif tag in ('i', 'em'):
            self._italic_depth += 1
            self._text_parts.append('<i>')
        elif tag == 'li':
            if self._text_parts and not self._text_parts[-1].endswith('<br/>'):
                self._text_parts.append('<br/>')
            self._text_parts.append('• ')
        elif tag in ('div', 'p', 'h1', 'h2', 'h3', 'h4'):
            if self._text_parts and not self._text_parts[-1].endswith('<br/>'):
                self._text_parts.append('<br/>')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == 'table':
            if self._table_depth > 0:
                self._table_depth -= 1
            return
        if self._table_depth > 0:
            return

        if tag in ('b', 'strong') and self._bold_depth > 0:
            self._bold_depth -= 1
            self._text_parts.append('</b>')
        elif tag in ('i', 'em') and self._italic_depth > 0:
            self._italic_depth -= 1
            self._text_parts.append('</i>')
        elif tag in ('div', 'p', 'li', 'h1', 'h2', 'h3', 'h4'):
            if self._text_parts and not self._text_parts[-1].endswith('<br/>'):
                self._text_parts.append('<br/>')

    def handle_data(self, data):
        if self._table_depth > 0:
            return
        cleaned = data.replace('\u00a0', ' ').replace('\r\n', '\n').replace('\r', '\n')
        if cleaned:
            self._text_parts.append(xml_escape(cleaned).replace('\n', '<br/>'))

    def get_clean_html(self):
        while self._bold_depth > 0:
            self._text_parts.append('</b>')
            self._bold_depth -= 1
        while self._italic_depth > 0:
            self._text_parts.append('</i>')
            self._italic_depth -= 1
        joined = ''.join(self._text_parts)
        cleaned = re.sub(r'^(?:\s*<br/>\s*)+', '', joined)
        cleaned = re.sub(r'(?:\s*<br/>\s*)+$', '', cleaned)
        cleaned = re.sub(r'(?:<br/>\s*){3,}', '<br/><br/>', cleaned)
        return cleaned.strip()

    def get_images(self):
        return list(self._images)


def parse_css_style(style_str: str) -> dict:
    """Extracts CSS declarations from an inline style string."""
    decls = {}
    if not style_str:
        return decls
    for part in style_str.split(';'):
        if ':' in part:
            k, v = part.split(':', 1)
            decls[k.strip().lower()] = v.strip()
    return decls


def parse_html_table_to_reportlab(table_soup, max_width: float = 523) -> Table | None:
    """
    Converts a BeautifulSoup <table> into a styled ReportLab Table flowable.
    Handles colspans, rowspans, background-colors, borders, bold, alignment,
    and automatically trims fully-blank boundary rows/columns from Excel pastes.
    """
    tr_tags = table_soup.find_all('tr')
    if not tr_tags:
        return None

    row_count = len(tr_tags)
    raw_rows = []
    for tr in tr_tags:
        cells = tr.find_all(['td', 'th'])
        raw_rows.append(cells)

    max_cols = 1
    for cells in raw_rows:
        row_cols = sum(int(c.get('colspan', 1)) for c in cells)
        if row_cols > max_cols:
            max_cols = row_cols

    grid = [[None for _ in range(max_cols)] for _ in range(row_count)]
    grid_spans = []

    for r_idx, cells in enumerate(raw_rows):
        c_idx = 0
        for cell in cells:
            while c_idx < max_cols and grid[r_idx][c_idx] is not None:
                c_idx += 1
            if c_idx >= max_cols:
                break

            colspan = 1
            rowspan = 1
            try:
                colspan = max(1, int(cell.get('colspan', 1)))
            except Exception:
                pass
            try:
                rowspan = max(1, int(cell.get('rowspan', 1)))
            except Exception:
                pass

            if c_idx + colspan > max_cols:
                colspan = max_cols - c_idx

            for dr in range(rowspan):
                for dc in range(colspan):
                    curr_r = r_idx + dr
                    curr_c = c_idx + dc
                    if curr_r < row_count and curr_c < max_cols:
                        if dr == 0 and dc == 0:
                            grid[curr_r][curr_c] = cell
                        else:
                            grid[curr_r][curr_c] = '__SPANNED__'

            if colspan > 1 or rowspan > 1:
                end_c = min(max_cols - 1, c_idx + colspan - 1)
                end_r = min(row_count - 1, r_idx + rowspan - 1)
                grid_spans.append(((c_idx, r_idx), (end_c, end_r)))

            c_idx += colspan

    col_has_content = [False] * max_cols
    for c in range(max_cols):
        for r in range(row_count):
            item = grid[r][c]
            if item and item != '__SPANNED__':
                text = item.get_text(strip=True)
                style = parse_css_style(item.get('style', ''))
                bg = style.get('background-color') or item.get('bgcolor')
                if text or bg:
                    col_has_content[c] = True
                    break
            elif item == '__SPANNED__':
                col_has_content[c] = True
                break

    row_has_content = [False] * row_count
    for r in range(row_count):
        for c in range(max_cols):
            item = grid[r][c]
            if item and item != '__SPANNED__':
                text = item.get_text(strip=True)
                style = parse_css_style(item.get('style', ''))
                bg = style.get('background-color') or item.get('bgcolor')
                if text or bg:
                    row_has_content[r] = True
                    break
            elif item == '__SPANNED__':
                row_has_content[r] = True
                break

    if not any(row_has_content) or not any(col_has_content):
        return None

    first_col = next(i for i, v in enumerate(col_has_content) if v)
    last_col = len(col_has_content) - 1 - next(i for i, v in enumerate(reversed(col_has_content)) if v)
    first_row = next(i for i, v in enumerate(row_has_content) if v)
    last_row = len(row_has_content) - 1 - next(i for i, v in enumerate(reversed(row_has_content)) if v)

    active_cols = list(range(first_col, last_col + 1))
    active_rows = list(range(first_row, last_row + 1))

    trimmed_col_count = len(active_cols)
    trimmed_row_count = len(active_rows)

    cell_style_base = ParagraphStyle(
        'TableCellNormal',
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#0f172a')
    )
    cell_style_bold = ParagraphStyle(
        'TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#0f172a')
    )

    table_data = []
    t_styles = [
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]

    for new_r, r in enumerate(active_rows):
        row_data = []
        for new_c, c in enumerate(active_cols):
            cell_node = grid[r][c]
            if cell_node is None or cell_node == '__SPANNED__':
                row_data.append('')
                continue

            style = parse_css_style(cell_node.get('style', ''))
            bg_color_str = style.get('background-color') or cell_node.get('bgcolor')
            if bg_color_str:
                clean_hex = bg_color_str.strip().lower()
                try:
                    if clean_hex.startswith('#'):
                        t_styles.append(('BACKGROUND', (new_c, new_r), (new_c, new_r), colors.HexColor(clean_hex)))
                    elif clean_hex in ('window', 'white'):
                        t_styles.append(('BACKGROUND', (new_c, new_r), (new_c, new_r), colors.HexColor('#ffffff')))
                except Exception:
                    pass

            text = cell_node.get_text().strip()
            is_bold = (
                cell_node.name == 'th' or
                'bold' in style.get('font-weight', '') or
                cell_node.find(['b', 'strong']) is not None
            )

            align = style.get('text-align', '').lower()
            if align == 'center':
                t_styles.append(('ALIGN', (new_c, new_r), (new_c, new_r), 'CENTER'))
            elif align == 'right':
                t_styles.append(('ALIGN', (new_c, new_r), (new_c, new_r), 'RIGHT'))
            else:
                t_styles.append(('ALIGN', (new_c, new_r), (new_c, new_r), 'LEFT'))

            border_val = style.get('border', '').lower()
            if 'solid' in border_val or '.5pt' in border_val or '1px' in border_val:
                t_styles.append(('BOX', (new_c, new_r), (new_c, new_r), 0.5, colors.HexColor('#94a3b8')))

            if text:
                safe_t = xml_escape(text).replace('\n', '<br/>')
                p = Paragraph(f"<b>{safe_t}</b>" if is_bold else safe_t, cell_style_bold if is_bold else cell_style_base)
                row_data.append(p)
            else:
                row_data.append('')

        table_data.append(row_data)

    for (start_c, start_r), (end_c, end_r) in grid_spans:
        if start_c <= last_col and end_c >= first_col and start_r <= last_row and end_r >= first_row:
            n_start_c = max(0, start_c - first_col)
            n_end_c = min(trimmed_col_count - 1, end_c - first_col)
            n_start_r = max(0, start_r - first_row)
            n_end_r = min(trimmed_row_count - 1, end_r - first_row)
            if n_start_c != n_end_c or n_start_r != n_end_r:
                t_styles.append(('SPAN', (n_start_c, n_start_r), (n_end_c, n_end_r)))

    col_weights = [1.0] * trimmed_col_count
    for c_idx in range(trimmed_col_count):
        max_len = 0
        for r_idx in range(trimmed_row_count):
            item = table_data[r_idx][c_idx]
            if isinstance(item, Paragraph):
                max_len = max(max_len, len(item.text))
        col_weights[c_idx] = max(1.0, float(max_len))

    col_weights = [w ** 0.65 for w in col_weights]
    total_w = sum(col_weights)
    col_widths = [(w / total_w) * max_width for w in col_weights]

    min_col_w = min(40, max_width / trimmed_col_count)
    col_widths = [max(min_col_w, cw) for cw in col_widths]
    curr_sum = sum(col_widths)
    col_widths = [(cw / curr_sum) * max_width for cw in col_widths]

    rl_table = Table(table_data, colWidths=col_widths)
    rl_table.setStyle(TableStyle(t_styles))
    return rl_table


def build_description_flowables(desc_content, body_text_style):
    """
    Builds the Request Details PDF flowables, preserving:
    1. Text paragraphs and inline formatting
    2. HTML/Excel Tables (with cell colors, borders, spans, and typography)
    3. Inline pasted images in document order
    """
    text_box_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 9),
    ])

    raw = (desc_content or '').strip()
    if not raw:
        t = Table([[Paragraph("No description provided.", body_text_style)]], colWidths=[523])
        t.setStyle(text_box_style)
        return [t]

    if not re.search(r'<\s*(table|div|p|br|span|b|strong|i|em|u|ul|ol|li|tr|td|th|img)\b', raw, re.I):
        safe_xml = xml_escape(raw).replace('\r\n', '\n').replace('\r', '\n').replace('\n', '<br/>')
        t = Table([[Paragraph(safe_xml, body_text_style)]], colWidths=[523])
        t.setStyle(text_box_style)
        return [t]

    soup = BeautifulSoup(raw, 'html.parser')
    tables = soup.find_all('table')
    images = soup.find_all('img')

    if not tables and not images:
        parser = RichDescriptionTextParser()
        try:
            parser.feed(raw)
            parser.close()
        except Exception:
            pass
        clean_text_html = parser.get_clean_html() or "No description provided."
        t = Table([[Paragraph(clean_text_html, body_text_style)]], colWidths=[523])
        t.setStyle(text_box_style)
        return [t]

    marker_map = {}
    counter = 0

    for tbl in tables:
        m = f"___TABLE_MARKER_{counter}___"
        counter += 1
        marker_map[m] = parse_html_table_to_reportlab(tbl, max_width=523)
        tbl.replace_with(soup.new_string(m))

    for img in images:
        m = f"___IMG_MARKER_{counter}___"
        counter += 1
        src = img.get('src', '')
        img_bytes = decode_image_data(src)
        rl_img = make_reportlab_image(img_bytes, max_w=507, max_h=240) if img_bytes else None
        marker_map[m] = rl_img
        img.replace_with(soup.new_string(m))

    parts = re.split(r'(___(?:TABLE|IMG)_MARKER_\d+___)', str(soup))
    flowables = []

    for p in parts:
        p_clean = p.strip()
        if not p_clean:
            continue
        if p_clean in marker_map:
            item = marker_map[p_clean]
            if p_clean.startswith('___TABLE_MARKER_') and item:
                flowables.append(item)
                flowables.append(Spacer(1, 8))
            elif p_clean.startswith('___IMG_MARKER_') and item:
                img_card = Table([[item]], colWidths=[523])
                img_card.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
                    ('PADDING', (0,0), (-1,-1), 8),
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ]))
                flowables.append(img_card)
                flowables.append(Spacer(1, 8))
        else:
            parser = RichDescriptionTextParser()
            try:
                parser.feed(p)
                parser.close()
            except Exception:
                pass
            clean = parser.get_clean_html()
            if clean:
                t = Table([[Paragraph(clean, body_text_style)]], colWidths=[523])
                t.setStyle(text_box_style)
                flowables.append(t)
                flowables.append(Spacer(1, 6))

    if flowables and isinstance(flowables[-1], Spacer):
        flowables.pop()

    if not flowables:
        t = Table([[Paragraph("No description provided.", body_text_style)]], colWidths=[523])
        t.setStyle(text_box_style)
        flowables.append(t)

    return flowables


def build_request_pdf(request_data: dict, requester_data: dict = None, users_map: dict = None) -> bytes:
    """
    Builds a pixel-perfect, clean, and professional PDF summary of an Asset Request
    matching the exact card layout of the RequestDetailsModal, without the attachments section.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=44,
        bottomMargin=44
    )

    users_map = users_map or {}

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=0,
        spaceAfter=0
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#64748b'),
        spaceBefore=0,
        spaceAfter=0
    )
    section_head_style = ParagraphStyle(
        'SectionHead',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )
    label_style = ParagraphStyle(
        'MetaLabel',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#64748b')
    )
    value_bold_style = ParagraphStyle(
        'MetaValBold',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor('#0f172a')
    )
    body_text_style = ParagraphStyle(
        'BodyText',
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor('#334155')
    )
    th_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )
    td_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#334155')
    )
    td_bold_style = ParagraphStyle(
        'TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#0f172a')
    )

    story = []

    # 1. Header Section: Item Name + Requested Date (Left), Star Status Badge (Top Right)
    item_name = request_data.get('item') or 'Asset Request'
    created_at_fmt = format_dt(request_data.get('createdAt'))
    final_status = str(request_data.get('status') or 'Approved').strip()

    left_header = [
        Paragraph(f"<b>{item_name}</b>", title_style),
        Spacer(1, 2),
        Paragraph(f"Requested on {created_at_fmt}", subtitle_style),
    ]

    header_data = [
        [
            left_header,
            StarBadge(status=final_status, size=64)
        ]
    ]

    header_table = Table(header_data, colWidths=[459, 64])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 12))

    # 2. Metadata Cards (3 Columns: REQUEST ID, REQUESTED BY, CATEGORY)
    req_by_name = (requester_data or {}).get('name') or str(request_data.get('requestedBy') or 'User')
    req_by_role = (requester_data or {}).get('role') or 'User'
    req_dept = (requester_data or {}).get('department')
    if req_dept:
        req_role_full = f"{req_dept} {req_by_role}"
    else:
        req_role_full = req_by_role

    meta_grid = [
        [
            Paragraph("REQUEST ID", label_style),
            Paragraph("REQUESTED BY", label_style),
            Paragraph("CATEGORY", label_style),
        ],
        [
            Paragraph(f"<b>{request_data.get('id', 'N/A')}</b>", value_bold_style),
            Paragraph(f"<b>{req_by_name}</b> <font size=8 color='#64748b'>({req_role_full})</font>", value_bold_style),
            Paragraph(f"<b>{request_data.get('category', 'General')}</b>", value_bold_style),
        ]
    ]

    meta_table = Table(meta_grid, colWidths=[174, 175, 174])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('BOTTOMPADDING', (0,0), (-1,0), 2),
        ('TOPPADDING', (0,1), (-1,1), 2),
        ('BOTTOMPADDING', (0,1), (-1,1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 3. Request Details / Justification Box
    story.append(Paragraph("Request Details", section_head_style))
    desc_content = request_data.get('justification') or "No description provided."
    story.extend(build_description_flowables(desc_content, body_text_style))
    story.append(Spacer(1, 14))

    # 4. Attached Images (Images only; strictly skip PDF, Word, Excel, etc.)
    raw_attachments = request_data.get('attachments') or []
    image_attachments = [a for a in raw_attachments if is_image_attachment(a)]
    if image_attachments:
        story.append(Paragraph("Attached Images", section_head_style))
        for idx, att in enumerate(image_attachments, 1):
            att_name = att.get('name') or f"Image {idx}"
            att_data = att.get('data') or ''
            img_bytes = decode_image_data(att_data)
            if not img_bytes:
                continue
            rl_img = make_reportlab_image(img_bytes, max_w=507, max_h=380)
            if not rl_img:
                continue

            card_content = [
                [Paragraph(f"<b>Attachment {idx}: {xml_escape(att_name)}</b>", label_style)],
                [Spacer(1, 4)],
                [rl_img]
            ]
            att_card = Table(card_content, colWidths=[523])
            att_card.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
                ('PADDING', (0,0), (-1,-1), 8),
                ('ALIGN', (0,2), (0,2), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(att_card)
            story.append(Spacer(1, 10))
        story.append(Spacer(1, 4))

    # 5. Approval History & Comments Audit Trail
    history = request_data.get('commentsHistory') or []
    if history:
        story.append(Paragraph("Approval History & Comments", section_head_style))
        hist_rows = [[
            Paragraph("<b>Approver / User</b>", th_style),
            Paragraph("<b>Role</b>", th_style),
            Paragraph("<b>Action</b>", th_style),
            Paragraph("<b>Date & Time</b>", th_style),
            Paragraph("<b>Comments / Remarks</b>", th_style),
            Paragraph("<b>Return To</b>", th_style),
        ]]

        for h in history:
            name = h.get('name') or 'User'
            role = h.get('role') or ''
            action_raw = str(h.get('action') or '').lower()
            is_skipped = h.get('skipped') or action_raw in ['skip', 'skipped']
            is_returned = action_raw in ['return', 'returned']
            date_fmt = format_dt(h.get('date'))
            comment_text = str(h.get('comment') or '').replace('[System: ', '').replace(']', '').strip()

            if is_skipped:
                action_label = 'SKIPPED'
                act_color = '#b45309'
                comment_display = comment_text or 'Skipped due to no response'
            elif action_raw in ['approve', 'approved']:
                action_label = 'APPROVED'
                act_color = '#15803d'
                comment_display = comment_text or 'Approved.'
            elif action_raw in ['reject', 'rejected', 'decline']:
                action_label = 'DECLINED'
                act_color = '#be123c'
                comment_display = comment_text or 'Declined.'
            elif is_returned:
                action_label = 'RETURNED'
                act_color = '#b45309'
                comment_display = comment_text or 'Returned for edits.'
            elif action_raw in ['edit', 'resubmit', 'resubmitted']:
                action_label = 'RESUBMITTED'
                act_color = '#2563eb'
                comment_display = comment_text or 'Request resubmitted.'
            else:
                action_label = action_raw.upper() if action_raw else 'ACTION'
                act_color = '#475569'
                comment_display = comment_text or 'No comments filled.'

            replies = h.get('replies') or []
            if isinstance(replies, list) and replies:
                for rep in replies:
                    rep_name = rep.get('name') or 'User'
                    rep_comment = rep.get('comment') or ''
                    comment_display += f"<br/><font size=7.5 color='#2563eb'><b>Reply ({rep_name}):</b> {rep_comment}</font>"

            added_flow = h.get('addedFlow') or []
            if isinstance(added_flow, list) and added_flow:
                flow_strs = [f"{f.get('name', '')} ({f.get('department', '')} {f.get('role', '')})".strip() for f in added_flow]
                comment_display += f"<br/><font size=7 color='#047857'><b>Added Flow:</b> {', '.join(flow_strs)}</font>"

            # Format Return To column
            if is_returned:
                return_raw = (
                    h.get('sentToStr') or 
                    h.get('returnTarget') or 
                    h.get('sentTo') or 
                    h.get('returnedTo') or 
                    ''
                )
                if isinstance(return_raw, dict):
                    return_raw = return_raw.get('label') or return_raw.get('value') or ''
                elif isinstance(return_raw, list):
                    return_raw = ", ".join([str(x.get('label', x.get('value', x)) if isinstance(x, dict) else x) for x in return_raw])
                else:
                    return_raw = str(return_raw).strip()

                if not return_raw:
                    return_raw = (requester_data or {}).get('name') or str(request_data.get('requestedBy') or '')

                if " - " in return_raw:
                    parts = return_raw.split(" - ", 1)
                    t_name = parts[0].strip()
                    t_role = parts[1].strip()
                    return_display = f"<b>{t_name}</b><br/><font size=7 color='#64748b'>({t_role})</font>"
                elif return_raw:
                    target_user = users_map.get(return_raw.lower().strip()) or users_map.get(str(return_raw).strip())
                    if target_user:
                        t_name = target_user.get('name') or return_raw
                        t_dept = target_user.get('department') or ''
                        t_role = target_user.get('role') or target_user.get('departmentRole') or 'User'
                        t_role_label = 'MD' if t_role.lower() == 'md' else ('Admin' if t_role.lower() == 'admin' else ('Head' if t_role.lower() == 'head' else t_role.capitalize()))
                        t_full_role = f"{t_dept} {t_role_label}".strip() if t_dept and t_role_label != 'MD' else t_role_label
                        return_display = f"<b>{t_name}</b><br/><font size=7 color='#64748b'>({t_full_role})</font>"
                    else:
                        return_display = f"<b>{return_raw}</b>"
                else:
                    return_display = "<font color='#94a3b8'>—</font>"
            else:
                return_display = "<font color='#94a3b8'>—</font>"

            hist_rows.append([
                Paragraph(f"<b>{name}</b>", td_style),
                Paragraph(role, td_style),
                Paragraph(f"<font color='{act_color}'><b>{action_label}</b></font>", td_style),
                Paragraph(date_fmt, td_style),
                Paragraph(comment_display, td_style),
                Paragraph(return_display, td_style)
            ])

        hist_table = Table(hist_rows, colWidths=[80, 75, 65, 100, 118, 85])
        hist_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(hist_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
