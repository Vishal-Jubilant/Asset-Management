import io
import math
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Flowable
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
    desc_table = Table([[Paragraph(desc_content, body_text_style)]], colWidths=[523])
    desc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 9),
    ]))
    story.append(desc_table)
    story.append(Spacer(1, 14))

    # 4. Approval Status Workflow
    workflow = request_data.get('approvalSequence') or []
    if workflow:
        story.append(Paragraph("Approval Status Workflow", section_head_style))
        wf_rows = [[
            Paragraph("<b>Step</b>", th_style),
            Paragraph("<b>Role / Department</b>", th_style),
            Paragraph("<b>Assigned Approver(s)</b>", th_style),
            Paragraph("<b>Step Status</b>", th_style),
        ]]
        for idx, step in enumerate(workflow):
            step_num = step.get('step', idx + 1)
            role = step.get('role', 'Head')
            dept = step.get('department', '')
            role_text = f"{dept} {role}".strip() if dept else role
            approvers = step.get('approvers', [])
            approvers_str = ", ".join([
                a.get('value', a.get('label', str(a))) if isinstance(a, dict) else str(a)
                for a in approvers
            ]) or "N/A"
            step_status = (step.get('status') or 'pending').lower()

            if step_status == 'approved':
                st_color = '#15803d'
                st_text = 'APPROVED'
            elif step_status == 'skipped':
                st_color = '#b45309'
                st_text = 'SKIPPED'
            elif step_status == 'rejected':
                st_color = '#be123c'
                st_text = 'DECLINED'
            elif step_status == 'returned':
                st_color = '#b45309'
                st_text = 'RETURNED'
            else:
                st_color = '#2563eb'
                st_text = 'PENDING'

            wf_rows.append([
                Paragraph(f"<b>Step {step_num}</b>", td_style),
                Paragraph(role_text, td_style),
                Paragraph(approvers_str, td_bold_style),
                Paragraph(f"<font color='{st_color}'><b>{st_text}</b></font>", td_style)
            ])

        wf_table = Table(wf_rows, colWidths=[65, 175, 193, 90])
        wf_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(wf_table)
        story.append(Spacer(1, 14))

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
