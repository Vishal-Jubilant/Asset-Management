import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
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


def build_request_pdf(request_data: dict, requester_data: dict = None) -> bytes:
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
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a')
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#64748b')
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

    # 1. Header Section: Item Name + Status Badge
    status_str = str(request_data.get('status') or 'Pending').strip()
    status_clean = status_str.replace("Pending with ", "Pending with ")
    status_lower = status_str.lower()

    if status_lower == 'approved':
        badge_bg = colors.HexColor('#dcfce7')
        badge_border = colors.HexColor('#86efac')
        badge_text_hex = '#15803d'
        badge_text = 'APPROVED'
    elif status_lower == 'rejected':
        badge_bg = colors.HexColor('#ffe4e6')
        badge_border = colors.HexColor('#fca5a5')
        badge_text_hex = '#be123c'
        badge_text = 'DECLINED'
    elif 'returned' in status_lower:
        badge_bg = colors.HexColor('#fef3c7')
        badge_border = colors.HexColor('#fde68a')
        badge_text_hex = '#b45309'
        badge_text = 'RETURNED'
    else:
        badge_bg = colors.HexColor('#f1f5f9')
        badge_border = colors.HexColor('#cbd5e1')
        badge_text_hex = '#475569'
        badge_text = status_clean.upper()

    badge_p = Paragraph(
        f"<font color='{badge_text_hex}'><b>{badge_text}</b></font>",
        ParagraphStyle('BadgeP', alignment=1, fontSize=9.5, leading=12)
    )

    item_name = request_data.get('item') or 'Asset Request'
    created_at_fmt = format_dt(request_data.get('createdAt'))

    header_data = [
        [
            Paragraph(f"<b>{item_name}</b>", title_style),
            Table([[badge_p]], colWidths=[95], rowHeights=[22], style=[
                ('BACKGROUND', (0,0), (-1,-1), badge_bg),
                ('BOX', (0,0), (-1,-1), 1, badge_border),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
                ('TOPPADDING', (0,0), (-1,-1), 3),
            ])
        ],
        [
            Paragraph(f"Requested on {created_at_fmt}", subtitle_style),
            ""
        ]
    ]

    header_table = Table(header_data, colWidths=[428, 95])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
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
        ]]

        for h in history:
            name = h.get('name') or 'User'
            role = h.get('role') or ''
            action_raw = str(h.get('action') or '').lower()
            is_skipped = h.get('skipped') or action_raw in ['skip', 'skipped']
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
            elif action_raw in ['return', 'returned']:
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

            hist_rows.append([
                Paragraph(f"<b>{name}</b>", td_style),
                Paragraph(role, td_style),
                Paragraph(f"<font color='{act_color}'><b>{action_label}</b></font>", td_style),
                Paragraph(date_fmt, td_style),
                Paragraph(comment_display, td_style)
            ])

        hist_table = Table(hist_rows, colWidths=[90, 85, 75, 110, 163])
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
