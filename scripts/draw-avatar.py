"""Regenerate original transparent PNG avatar assets. Optional authoring tool: Pillow.
No runtime dependency. Design: lavender arcade ghost with mint headset and star badge.
"""
from PIL import Image, ImageDraw
from pathlib import Path
out=Path(__file__).resolve().parent.parent/'public/assets'
for state in ['idle','speaking','laughing','thinking']:
 im=Image.new('RGBA',(640,640)); d=ImageDraw.Draw(im)
 # Headset back, arms, soft body
 d.arc((120,80,520,485),180,355,fill='#b9ef88',width=31)
 d.ellipse((91,331,200,449),fill='#9d7ed3',outline='#32263f',width=9)
 d.ellipse((440,329,549,447),fill='#9d7ed3',outline='#32263f',width=9)
 d.rounded_rectangle((158,119,482,515),radius=150,fill='#b89be8',outline='#32263f',width=10)
 d.ellipse((165,384,265,545),fill='#b89be8');d.ellipse((270,405,370,553),fill='#b89be8');d.ellipse((375,384,475,545),fill='#b89be8')
 d.arc((158,119,482,475),190,270,fill='#d5baf7',width=13)
 # Tapered face display
 d.rounded_rectangle((201,240,440,389),radius=58,fill='#30283d',outline='#806496',width=5)
 if state=='laughing':
  d.arc((237,269,287,309),185,355,fill='#cdfb9d',width=12);d.arc((355,269,405,309),185,355,fill='#cdfb9d',width=12)
 elif state=='thinking':
  d.rounded_rectangle((249,282,271,310),radius=9,fill='#cdfb9d');d.rounded_rectangle((365,272,387,300),radius=9,fill='#cdfb9d')
 else:
  d.rounded_rectangle((249,271,271,311),radius=11,fill='#cdfb9d');d.rounded_rectangle((365,271,387,311),radius=11,fill='#cdfb9d')
 if state in ['speaking','laughing']:
  d.ellipse((296,321,346,367),fill='#cef69d');d.ellipse((304,345,339,369),fill='#faafbd')
 elif state=='thinking':d.line((307,340,333,340),fill='#cdfb9d',width=8)
 else:d.arc((295,314,348,350),0,180,fill='#cdfb9d',width=7)
 d.ellipse((218,323,246,336),fill='#a97fac');d.ellipse((394,323,422,336),fill='#a97fac')
 d.rounded_rectangle((126,245,170,353),radius=16,fill='#caf29a',outline='#38452e',width=6)
 d.rounded_rectangle((470,245,514,353),radius=16,fill='#caf29a',outline='#38452e',width=6)
 d.line((490,348,475,390,416,395),fill='#c3ef92',width=10);d.ellipse((396,383,426,407),fill='#c3ef92',outline='#38452e',width=4)
 # A tiny chest star, not a human face or likeness.
 d.polygon([(320,425),(329,445),(351,450),(333,464),(338,486),(320,474),(302,486),(307,464),(289,450),(311,445)],fill='#ddfac0')
 if state=='thinking':
  d.ellipse((485,126,511,152),fill='#cef69d');d.ellipse((510,92,550,132),fill='#cef69d');d.ellipse((543,43,604,104),fill='#cef69d');d.text((567,61),'?',fill='#30283d',stroke_width=1)
 im.resize((512,512),Image.Resampling.LANCZOS).save(out/f'{state}.png')
