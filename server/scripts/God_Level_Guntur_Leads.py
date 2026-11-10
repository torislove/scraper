import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import sys
import os

"""
God Level Leads Exporter for Scraper.co.in
Formats raw CSV/JSON leads into an executive-grade styled Excel workbook.
"""

def generate_god_level_excel(input_csv='Doctors_Guntur.csv', output_file='God_Level_Guntur_Leads-v2.xlsx', city_filter='Guntur', category_title='Healthcare'):
    if not os.path.exists(input_csv):
        print(f"Error: Input file {input_csv} does not exist.")
        return

    # Load and clean data
    df = pd.read_csv(input_csv)
    df = df.drop_duplicates(subset=['Business Name', 'Primary Phone'], keep='first')
    
    if 'City / Mandal' in df.columns:
        df['City / Mandal'] = df['City / Mandal'].fillna('').astype(str).str.strip().str.lower()
        if city_filter:
            mask = df['City / Mandal'].str.contains(city_filter.lower())
            if mask.any():
                df = df[mask].copy()
        df['City / Mandal'] = df['City / Mandal'].str.title()

    cols_to_drop = ['GSTIN', 'Follow Up Date', 'CRM Notes', 'Deal Value (INR)', 'CRM Stage']
    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
    df = df.fillna('')
    
    if 'Pincode' in df.columns:
        df['Pincode'] = pd.to_numeric(df['Pincode'], errors='coerce').fillna(0).astype(int)
        df['Pincode'] = df['Pincode'].replace(0, '')

    # Initialize Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"Premium {city_filter} Leads"
    ws.sheet_view.showGridLines = False  # Turn off default gridlines for a cleaner app-like look

    # Define Premium Colors & Styles
    COLOR_BRAND = "0F172A"      # Slate 900 (Deep dark blue/black)
    COLOR_HEADER = "1E293B"     # Slate 800
    COLOR_ROW_ALT = "F8FAFC"    # Slate 50 (Very light grey for zebra stripes)
    COLOR_ROW_NORM = "FFFFFF"   # White
    COLOR_TOP_TIER = "F0FDF4"   # Green 50 (Highlight for high rating rows)
    COLOR_METRICS_BG = "FEFCE8" # Yellow 50 (Highlight for Rating/Review columns)
    COLOR_BORDER = "E2E8F0"     # Slate 200 (Subtle borders)

    font_title = Font(name="Segoe UI", size=22, bold=True, color="FFFFFF")
    font_subtitle = Font(name="Segoe UI", size=11, italic=True, color="94A3B8")
    font_header = Font(name="Segoe UI", size=12, bold=True, color="FFFFFF")
    font_data = Font(name="Segoe UI", size=11, color="334155")
    font_highlight = Font(name="Segoe UI", size=11, bold=True, color="166534")

    fill_brand = PatternFill(fill_type="solid", start_color=COLOR_BRAND, end_color=COLOR_BRAND)
    fill_header = PatternFill(fill_type="solid", start_color=COLOR_HEADER, end_color=COLOR_HEADER)
    fill_alt = PatternFill(fill_type="solid", start_color=COLOR_ROW_ALT, end_color=COLOR_ROW_ALT)
    fill_norm = PatternFill(fill_type="solid", start_color=COLOR_ROW_NORM, end_color=COLOR_ROW_NORM)
    fill_top_tier = PatternFill(fill_type="solid", start_color=COLOR_TOP_TIER, end_color=COLOR_TOP_TIER)
    fill_metrics = PatternFill(fill_type="solid", start_color=COLOR_METRICS_BG, end_color=COLOR_METRICS_BG)

    border_thin = Border(bottom=Side(style='thin', color=COLOR_BORDER),
                         top=Side(style='thin', color=COLOR_BORDER),
                         left=Side(style='thin', color=COLOR_BORDER),
                         right=Side(style='thin', color=COLOR_BORDER))
                         
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_title = Alignment(horizontal="left", vertical="center")

    # Create Premium Dashboard Header Area
    ws.merge_cells('A1:J2')
    ws['A1'] = f"🏥 {city_filter} {category_title} Leads - Premium Directory"
    ws['A1'].font = font_title
    ws['A1'].fill = fill_brand
    ws['A1'].alignment = align_title

    ws.merge_cells('A3:J3')
    ws['A3'] = f"  Generated for B2B Outreach by Scraper.co.in | Total Verified Leads: {len(df)} | Auto-Filtered & Cleaned"
    ws['A3'].font = font_subtitle
    ws['A3'].fill = fill_brand
    ws['A3'].alignment = align_title

    # Spacer row
    ws.merge_cells('A4:J4')
    ws['A4'].fill = PatternFill(fill_type="solid", start_color="FFFFFF", end_color="FFFFFF")

    # Prepare display columns
    target_cols = ['Business Name', 'Category', 'Primary Phone', 'Secondary Phone', 'Email', 'Address', 'Pincode', 'Rating', 'Reviews Count', 'WhatsApp Direct URL']
    for c in target_cols:
        if c not in df.columns:
            df[c] = ''
    df_display = df[target_cols]

    # Write Headers
    header_row = 5
    for col_num, col_name in enumerate(target_cols, 1):
        cell = ws.cell(row=header_row, column=col_num, value=col_name)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = border_thin

    # Write Data with advanced conditional formatting logic
    for row_num, row_data in enumerate(df_display.values, start=header_row+1):
        # Determine if it's a "Top Tier" lead (Rating >= 4.7 and Reviews > 100)
        is_top_tier = False
        rating_val = row_data[7]
        review_val = row_data[8]
        try:
            if float(rating_val) >= 4.7 and float(review_val) > 100:
                is_top_tier = True
        except:
            pass

        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_num, value=value)
            cell.font = font_data
            cell.border = border_thin
            
            # Apply Row Fills
            if is_top_tier:
                cell.fill = fill_top_tier
                if col_num in [8, 9]: # Make the text dark green in rating cols for top tier
                    cell.font = font_highlight
            else:
                if row_num % 2 == 0:
                    cell.fill = fill_alt
                else:
                    cell.fill = fill_norm
            
            # Apply Column-specific Fills (highlighting the metrics columns softly)
            if col_num in [8, 9] and not is_top_tier:
                cell.fill = fill_metrics

            # Apply Alignment
            if col_num in [7, 8, 9]: # Center align numbers/metrics
                cell.alignment = align_center
            else:
                cell.alignment = align_left # Left align text, allow wrapping

    # Perfectly adjust column widths
    widths = {
        'A': 40, # Business Name
        'B': 24, # Category
        'C': 18, # Primary Phone
        'D': 18, # Secondary Phone
        'E': 35, # Email
        'F': 55, # Address
        'G': 12, # Pincode
        'H': 14, # Rating
        'I': 16, # Reviews
        'J': 28  # WhatsApp URL
    }
    for col_letter, width in widths.items():
        ws.column_dimensions[col_letter].width = width

    # Adjust Row Heights for breathing room
    ws.row_dimensions[1].height = 25
    ws.row_dimensions[2].height = 25
    ws.row_dimensions[3].height = 22
    ws.row_dimensions[4].height = 10 # Spacer
    ws.row_dimensions[5].height = 30 # Header

    for r in range(6, ws.max_row + 1):
        ws.row_dimensions[r].height = 35 # Taller rows for readability

    # Freeze Panes (Locks the header when scrolling)
    ws.freeze_panes = 'A6'

    # Apply Auto-filters to data
    ws.auto_filter.ref = f"A5:J{ws.max_row}"

    wb.save(output_file)
    print(f"File saved as {output_file}")

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else 'Doctors_Guntur.csv'
    out = sys.argv[2] if len(sys.argv) > 2 else 'God_Level_Guntur_Leads-v2.xlsx'
    city = sys.argv[3] if len(sys.argv) > 3 else 'Guntur'
    cat = sys.argv[4] if len(sys.argv) > 4 else 'Healthcare'
    generate_god_level_excel(inp, out, city, cat)

