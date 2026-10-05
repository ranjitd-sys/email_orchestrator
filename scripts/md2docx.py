"""Convert WHAT_WE_BUILT.md to a styled HTML page with embedded diagram images."""

import html
import os
import re
import sys

SRC, OUT = sys.argv[1], sys.argv[2]
BASE = os.path.dirname(os.path.abspath(SRC))

lines = open(SRC, encoding="utf-8").read().split("\n")
out = []
i = 0


def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def is_row(line):
    return line.strip().startswith("|") and line.strip().endswith("|")


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


while i < len(lines):
    line = lines[i]
    s = line.strip()

    if not s:
        i += 1
        continue

    if s.startswith("```"):
        i += 1
        buf = []
        while i < len(lines) and not lines[i].strip().startswith("```"):
            buf.append(lines[i])
            i += 1
        i += 1
        out.append("<pre>" + html.escape("\n".join(buf), quote=False) + "</pre>")
        continue

    if re.match(r"^-{3,}$", s):
        out.append("<hr>")
        i += 1
        continue

    # image
    m = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)$", s)
    if m:
        src = m.group(2)
        path = src if os.path.isabs(src) else os.path.normpath(os.path.join(BASE, src))
        if os.path.exists(path):
            from PIL import Image
            import base64

            with open(path, "rb") as fh:
                b64 = base64.b64encode(fh.read()).decode()
            with Image.open(path) as im:
                iw, ih = im.size
            # A4 content width is ~176mm; keep a small margin
            max_w = 640
            if iw > max_w:
                w = max_w
                h = int(ih * max_w / iw)
            else:
                w, h = iw, ih
            out.append(
                f'<figure><img src="data:image/png;base64,{b64}" width="{w}" height="{h}" '
                f'alt="{html.escape(m.group(1))}"></figure>'
            )
        else:
            out.append(f"<p><em>[missing image: {html.escape(src)}]</em></p>")
        i += 1
        continue

    m = re.match(r"^(#{1,6})\s+(.*)$", s)
    if m:
        lvl = len(m.group(1))
        tid = re.sub(r"[^a-z0-9]+", "-", m.group(2).lower()).strip("-")
        cls = ' class="first"' if not out else ""
        out.append(f'<h{lvl}{cls} id="{tid}">{inline(m.group(2))}</h{lvl}>')
        i += 1
        continue

    if is_row(line):
        rows = []
        while i < len(lines) and is_row(lines[i]):
            rows.append(cells(lines[i]))
            i += 1
        head = rows[0]
        body = [r for r in rows[1:] if not all(re.fullmatch(r":?-{2,}:?", c) for c in r)]
        if head and head[0] == "" and head[-1] == "":
            out.append('<table class="kv">')
            for r in body:
                if len(r) >= 2:
                    out.append(f"<tr><th>{inline(r[0])}</th><td>{inline(r[1])}</td></tr>")
            out.append("</table>")
        else:
            out.append("<table>")
            out.append("<tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr>")
            for r in body:
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            out.append("</table>")
        continue

    if re.match(r"^-\s+", s):
        items = []
        while i < len(lines) and re.match(r"^-\s+", lines[i].strip()):
            items.append(re.sub(r"^-\s+", "", lines[i].strip()))
            i += 1
        out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
        continue

    if re.match(r"^\d+\.\s+", s):
        items = []
        while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
            items.append(re.sub(r"^\d+\.\s+", "", lines[i].strip()))
            i += 1
        out.append("<ol>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>")
        continue

    para = [s]
    i += 1
    while (
        i < len(lines)
        and lines[i].strip()
        and not re.match(r"^(#{1,6}\s|-\s|\d+\.\s|```|!\[|>)", lines[i].strip())
        and not re.match(r"^-{3,}$", lines[i].strip())
        and not is_row(lines[i])
    ):
        para.append(lines[i].strip())
        i += 1
    out.append(f"<p>{inline(' '.join(para))}</p>")

body = "\n".join(out)

page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Email Orchestrator — What We Built</title>
<style>
  @page {{ size: A4; margin: 18mm 16mm; }}
  body {{ font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.5;
         color: #18202c; margin: 0; }}
  h1.first {{ font-size: 26pt; border: none; padding: 0; margin: 12mm 0 2mm; color: #1e3a8a; }}
  p.tagline {{ font-size: 13pt; color: #6c7888; margin: 0 0 8mm; }}
  h1 {{ font-size: 21pt; margin: 12mm 0 4mm; padding-bottom: 2mm; border-bottom: 1px solid #ccd;
        page-break-after: avoid; }}
  h2 {{ font-size: 15pt; margin: 9mm 0 3mm; color: #1e3a8a; page-break-after: avoid; }}
  h3 {{ font-size: 12.5pt; margin: 6mm 0 2mm; color: #33455c; page-break-after: avoid; }}
  p {{ margin: 0 0 3mm; }}
  ul, ol {{ margin: 0 0 3mm 6mm; padding-left: 5mm; }}
  li {{ margin-bottom: 1.2mm; }}
  table {{ border-collapse: collapse; width: 100%; margin: 3mm 0 5mm; font-size: 10pt;
           page-break-inside: avoid; }}
  th, td {{ border: 1px solid #b9c2cc; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }}
  th {{ background: #eef2f7; font-weight: 600; }}
  table.kv th {{ width: 32%; background: #f6f8fb; }}
  code {{ font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; background: #f2f4f7;
          padding: 0 1mm; }}
  pre {{ font-family: Consolas, "Courier New", monospace; font-size: 8.8pt; line-height: 1.35;
         background: #f7f8fa; border: 1px solid #d8dee6; border-left: 3px solid #2563eb;
         padding: 3mm 4mm; white-space: pre-wrap; page-break-inside: avoid; }}
  figure {{ margin: 4mm 0 6mm; text-align: center; page-break-inside: avoid; }}
  figure img {{ max-width: 100%; border: 1px solid #dfe4ea; }}
  hr {{ border: none; border-top: 1px solid #d8dee6; margin: 6mm 0; }}
  a {{ color: #1e3a8a; }}
  blockquote {{ border-left: 3px solid #f59e0b; background: #fffbeb; margin: 3mm 0;
                padding: 2.5mm 4mm; color: #5b4415; }}
</style>
</head>
<body>

{body}

</body>
</html>
"""

open(OUT, "w", encoding="utf-8").write(page)
print("html written:", OUT)