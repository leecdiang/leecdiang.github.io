#!/usr/bin/env python3
"""Reproduce the two attributed CC BY 4.0 paper crops.

Optional dependency: PyMuPDF. This script downloads exactly the versioned PDF
URLs recorded in data/image_sources.json. It does not fetch product images or
alter figure labels. The complete PDF is held in memory, not redistributed.
"""
from pathlib import Path
import hashlib
import json
import urllib.request
import fitz

ASSET = Path(__file__).resolve().parents[1]
source = json.loads((ASSET/'data/image_sources.json').read_text(encoding='utf-8'))
for record in source['paper_figures']:
    url = record['source_pdf_url']
    raw = urllib.request.urlopen(url, timeout=60).read()
    if hashlib.sha256(raw).hexdigest() != record['source_sha256']:
        raise RuntimeError(f'The PDF bytes changed for {url}; verify the version before cropping.')
    doc = fitz.open(stream=raw,filetype='pdf')
    page = doc[record['physical_page']-1]
    image = page.get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(*record['crop_points']),alpha=False)
    output = ASSET/record['local_path']
    image.save(output)
    print(f'{output.name}: {image.width} x {image.height}; {record["license"]}')
