"""Rebuild the project report PDF from its checked-in Markdown source."""
from pathlib import Path
import re
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parent
FONT = Path('C:/Windows/Fonts')
for name, filename in [('Arial','arial.ttf'),('Arial-Bold','arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT / filename)))
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='VSBody', fontName='Arial', fontSize=10, leading=15.5, spaceAfter=10, textColor=colors.HexColor('#33463e')))
styles.add(ParagraphStyle(name='VSTitle', fontName='Arial-Bold', fontSize=25, leading=31, textColor=colors.HexColor('#173e30'), spaceAfter=20))
styles.add(ParagraphStyle(name='VSH2', fontName='Arial-Bold', fontSize=19, leading=25, spaceAfter=20, textColor=colors.HexColor('#173e30')))
styles.add(ParagraphStyle(name='VSCell', fontName='Arial', fontSize=8.4, leading=12, textColor=colors.HexColor('#33463e')))
styles.add(ParagraphStyle(name='VSHead', fontName='Arial-Bold', fontSize=8.4, leading=12, textColor=colors.white))
styles.add(ParagraphStyle(name='VSSmall', fontName='Arial', fontSize=9, leading=14, textColor=colors.HexColor('#647b6f')))
def text(value):
    value = escape(value.replace('’',"'").replace('“','"').replace('”','"').replace('±','+/-').replace('–','-').replace('—','-'))
    return re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', value)
def page_frame(canvas, doc):
    width, height = doc.pagesize
    if doc.page == 1:
        canvas.setFillColor(colors.HexColor('#173e30'))
        canvas.rect(0,height-15,width,15,fill=1,stroke=0)
    else:
        canvas.setFont('Arial',8)
        canvas.setFillColor(colors.HexColor('#647b6f'))
        canvas.drawString(48,height-31,'VITALSENSE AI  /  SOFTWARE ENGINEERING PROJECT')
        canvas.setStrokeColor(colors.HexColor('#cbded3'))
        canvas.line(48,height-40,width-48,height-40)
    canvas.setFont('Arial',8)
    canvas.setFillColor(colors.HexColor('#647b6f'))
    canvas.drawString(48,29,'Educational prototype  |  November 2026')
    canvas.drawRightString(width-48,29,f'{doc.page:02d}')

def build():
    source = (ROOT/'PROJECT_REPORT.md').read_text(encoding='utf-8').splitlines()
    story = [Spacer(1,120), Paragraph('VITALSENSE AI',styles['VSTitle']),
             Paragraph('Software Engineering<br/>Project Report',ParagraphStyle(name='Cover',parent=styles['VSTitle'],fontSize=34,leading=43)),
             Spacer(1,14),Paragraph('Health signal awareness and<br/>explainable risk indicators',ParagraphStyle(name='Sub',parent=styles['VSBody'],fontSize=17,leading=25)),
             Spacer(1,52),Paragraph('Sagnik Pal<br/>13 November 2026',styles['VSBody']),
             Spacer(1,26),Paragraph('React / Vite / Firebase / Conversational AI',styles['VSSmall']),
             Spacer(1,20),Paragraph('Educational prototype. Includes implemented features, verified software checks, and clearly identified integration and clinical limitations.',styles['VSSmall'])]
    i = next(i for i,line in enumerate(source) if line.startswith('## 1.'))
    while i < len(source):
        line = source[i].strip()
        if not line:
            i += 1; continue
        if line.startswith('## '):
            story.append(PageBreak())
            story.append(Paragraph(text(line[3:]),styles['VSH2']))
            i += 1; continue
        if line.startswith('|'):
            rows = []
            while i < len(source) and source[i].strip().startswith('|'):
                cells = [c.strip() for c in source[i].strip().strip('|').split('|')]
                if not all(re.match(r'^:?-+:?$', c) for c in cells): rows.append(cells)
                i += 1
            count = len(rows[0])
            widths = [72,214,213] if count == 3 and rows[0][0] == 'ID' else [166.3]*3 if count == 3 else [180,319] if count == 2 else [499/count]*count
            values = [[Paragraph(text(c),styles['VSHead'] if r == 0 else styles['VSCell']) for c in row] for r,row in enumerate(rows)]
            table = Table(values,colWidths=widths,repeatRows=1,hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#245640')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f0f6f2'),colors.white]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#dce6df'))]))
            story.extend([table,Spacer(1,17)]); continue
        paragraph = line
        i += 1
        while i < len(source) and source[i].strip() and not source[i].startswith(('## ','|')):
            paragraph += ' '+source[i].strip(); i += 1
        story.append(Paragraph(text(paragraph),styles['VSBody']))
    output = ROOT/'VitalSense_AI_Project_Report.pdf'
    SimpleDocTemplate(str(output),pagesize=(595.28,841.89),rightMargin=48,leftMargin=48,topMargin=65,bottomMargin=55,title='VitalSense AI - Software Engineering Project Report',author='Sagnik Pal').build(story,onFirstPage=page_frame,onLaterPages=page_frame)
    print(output)
if __name__ == '__main__': build()
