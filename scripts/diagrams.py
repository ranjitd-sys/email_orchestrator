"""Render diagram PNGs for WHAT_WE_BUILT.docx using Pillow.

Layout helpers compute positions so panels never overlap.
"""

import math
import os

from PIL import Image, ImageDraw, ImageFont

OUT = "docs/diagrams"
os.makedirs(OUT, exist_ok=True)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

BG = (255, 255, 255)
INK = (24, 32, 44)
MUTED = (108, 120, 136)
LINE = (178, 188, 200)
BLUE = (37, 99, 235)
BLUE_BG = (219, 234, 254)
GREEN = (5, 150, 105)
GREEN_BG = (209, 250, 229)
AMBER = (194, 116, 6)
AMBER_BG = (254, 243, 199)
PURPLE = (124, 58, 237)
PURPLE_BG = (237, 233, 254)
RED = (208, 34, 34)
RED_BG = (254, 226, 226)
GREY_BG = (241, 243, 246)
SLATE = (45, 60, 80)


def font(size, bold=False, mono=False):
    return ImageFont.truetype(MONO if mono else (FONT_B if bold else FONT), size)


class Sheet:
    def __init__(self, w, h, heading, sub=None):
        self.img = Image.new("RGB", (w, h), BG)
        self.d = ImageDraw.Draw(self.img)
        self.d.text((34, 26), heading, font=font(27, bold=True), fill=INK)
        if sub:
            self.d.text((34, 62), sub, font=font(15), fill=MUTED)

    def save(self, name):
        self.img.save(f"{OUT}/{name}")


def node(d, xy, label, sub, fill, outline, fh=19, sh=14, radius=12, mono=False):
    """Draw a box with a bold label and optional muted sub-lines."""
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=2)
    x0, y0, x1, y1 = xy
    label_lines = label.split("\n")
    lf = font(fh, bold=True, mono=mono)
    lh = fh + 6
    sub_lines = sub.split("\n") if sub else []
    sf = font(sh)
    slh = sh + 6
    total = lh * len(label_lines) + (slh * len(sub_lines) + 6 if sub_lines else 0)
    y = y0 + (y1 - y0 - total) / 2
    for line in label_lines:
        tw = d.textlength(line, font=lf)
        d.text((x0 + (x1 - x0 - tw) / 2, y), line, font=lf, fill=INK)
        y += lh
    if sub_lines:
        y += 6
        for line in sub_lines:
            tw = d.textlength(line, font=sf)
            d.text((x0 + (x1 - x0 - tw) / 2, y), line, font=sf, fill=MUTED)
            y += slh


def arrow(d, p0, p1, color=LINE, width=3, head=10):
    d.line([p0, p1], fill=color, width=width)
    ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    for s in (2.6, -2.6):
        d.line([p1, (p1[0] + head * math.cos(ang + s), p1[1] + head * math.sin(ang + s))],
               fill=color, width=width)


def panel(d, x, y, w, heading, lines, col=LINE, bg=GREY_BG, hf=None, lf=None):
    """Titled panel that grows to fit its lines. Returns the bottom y."""
    hf = hf or font(18, bold=True)
    lf = lf or font(15)
    pad = 20
    lh = 21
    head_h = 30
    h = pad + head_h + lh * len(lines) + pad
    d.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=bg, outline=col, width=2)
    d.text((x + pad, y + pad - 4), heading, font=hf, fill=SLATE if col is LINE else col)
    yy = y + pad + head_h
    for line in lines:
        fnt = lf
        if line.startswith("$"):
            fnt = font(13, mono=True)
            line = line[1:]
        d.text((x + pad, yy), line, font=fnt, fill=INK if fnt is lf else MUTED)
        yy += lh
    return y + h


def chips(d, x, y, labels, col, cw=76, ch=48, gap=14, fh=15):
    for i, lab in enumerate(labels):
        xx = x + i * (cw + gap)
        d.rounded_rectangle((xx, y, xx + cw, y + ch), radius=8, fill=BG, outline=col, width=2)
        tw = d.textlength(lab, font=font(fh, bold=True, mono=True))
        d.text((xx + (cw - tw) / 2, y + (ch - fh) / 2 - 1), lab, font=font(fh, bold=True, mono=True), fill=INK)
    return y + ch


# ------------------------------------------------------------------ 01 overview
def overview():
    s = Sheet(1500, 800, "Email Orchestrator — at a glance", "One lead, three stages, one queue")
    d = s.d
    y = 140
    stages = [
        ("1  PULL", "Pull the due email\nfrom PostgreSQL", BLUE_BG, BLUE),
        ("2  DECIDE", "State machine decides,\nactor builds payload", AMBER_BG, AMBER),
        ("3  SEND", "Push payload to the\nCloudflare Queue", GREEN_BG, GREEN),
        ("4  DELIVER", "Worker sends via\nBrevo or Resend", PURPLE_BG, PURPLE),
    ]
    x = 55
    for i, (lab, sub, bg, col) in enumerate(stages):
        node(d, (x, y, x + 290, y + 100), lab, sub, bg, col)
        if i < len(stages) - 1:
            arrow(d, (x + 300, y + 50), (x + 355, y + 50), color=col, width=4)
        x += 365

    y2 = 300
    node(d, (55, y2, 715, y2 + 250), "", "", BLUE_BG, BLUE)
    d.text((80, y2 + 18), "ORCHESTRATOR  ·  Bun", font=font(21, bold=True), fill=BLUE)
    d.text((80, y2 + 62), "Owns business state. Decides what to send and when.", font=font(16), fill=INK)
    d.text((80, y2 + 88), "Never talks to an email provider.", font=font(15), fill=MUTED)
    for i, t in enumerate([
        "Engagement state machine (domain/transition.ts)",
        "Scheduler flow: PULLED → DECIDED → SENT",
        "Per-step actors that build each payload",
        "PostgreSQL reads and writes, one transaction per email",
    ]):
        d.text((85, y2 + 130 + i * 28), "•  " + t, font=font(15), fill=INK)

    node(d, (755, y2, 1445, y2 + 250), "", "", PURPLE_BG, PURPLE)
    d.text((780, y2 + 18), "WORKER  ·  Cloudflare", font=font(21, bold=True), fill=PURPLE)
    d.text((780, y2 + 62), "Consumes the queue and performs the send.", font=font(16), fill=INK)
    d.text((780, y2 + 88), "Never chooses a sequence or a step.", font=font(15), fill=MUTED)
    for i, t in enumerate([
        "Queue consumer: ack / retry / dead-letter",
        "Providers: Brevo · Resend · mock",
        "Classifies failures as transient or permanent",
        "Stateless, so it scales freely",
    ]):
        d.text((785, y2 + 130 + i * 28), "•  " + t, font=font(15), fill=INK)

    panel(d, 55, 605, 1390, "ONE DIRECTION ONLY",
          ["They talk through the Cloudflare Queue only — no internal API, and no callback from the worker."],
          col=LINE, bg=GREY_BG, lf=font(16))
    s.save("01-overview.png")


# ------------------------------------------------------------------ 02 architecture
def architecture():
    s = Sheet(1560, 890, "System architecture", "An always-on server plus a one-shot daily job")
    d = s.d

    node(d, (55, 130, 455, 225), "Device cron", "0 9 * * *   bun run scheduler:tick", GREY_BG, LINE, fh=18)
    node(d, (55, 265, 455, 360), "Orchestrator server", "always on  ·  :3000/health", BLUE_BG, BLUE, fh=18)

    node(d, (545, 130, 955, 225), "Scheduler tick", "domain/run.ts → domain/tick.ts", AMBER_BG, AMBER, fh=18)
    node(d, (545, 300, 955, 440), "PostgreSQL 16", "leads · sequences · sequence_steps\nscheduled_actions · send_attempts",
         GREY_BG, SLATE, fh=19)

    stages = [("PULL", BLUE_BG, BLUE), ("DECIDE", AMBER_BG, AMBER), ("SEND", GREEN_BG, GREEN)]
    y = 130
    for i, (lab, bg, col) in enumerate(stages):
        node(d, (1045, y, 1255, y + 78), lab, None, bg, col, fh=19)
        if i < 2:
            arrow(d, (1150, y + 78), (1150, y + 104), color=col)
        y += 108

    node(d, (1345, 130, 1545, 225), "Cloudflare Queue", "EmailSendQueue", GREEN_BG, GREEN, fh=16)
    node(d, (1345, 285, 1545, 380), "Cloudflare Worker", "queue consumer", PURPLE_BG, PURPLE, fh=16)
    node(d, (1345, 440, 1545, 535), "Provider", "Brevo / Resend", RED_BG, RED, fh=16)
    node(d, (1345, 610, 1545, 700), "Dead-letter queue", "EmailSendDlq", RED_BG, RED, fh=15)

    arrow(d, (465, 178), (535, 178), color=AMBER)
    arrow(d, (750, 235), (750, 292), color=SLATE)
    d.text((762, 258), "PULLED", font=font(13, bold=True), fill=BLUE)
    arrow(d, (465, 312), (535, 312), color=BLUE)
    d.text((470, 292), "/health", font=font(12), fill=BLUE)
    d.line([(965, 370), (1000, 370), (1000, 169), (1035, 169)], fill=AMBER, width=3)
    arrow(d, (1000, 169), (1035, 169), color=AMBER, head=9)
    d.text((972, 250), "DECIDED", font=font(13, bold=True), fill=AMBER)
    arrow(d, (1265, 169), (1335, 169), color=GREEN, width=4)
    d.text((1285, 143), "push", font=font(12, bold=True), fill=GREEN)
    arrow(d, (1445, 235), (1445, 275), color=GREEN)
    arrow(d, (1445, 390), (1445, 430), color=PURPLE)
    d.line([(1335, 332), (1310, 332), (1310, 655), (1335, 655)], fill=RED, width=3)
    arrow(d, (1310, 655), (1335, 655), color=RED, head=9)
    d.text((1300, 480), "retry", font=font(12, bold=True), fill=RED)

    panel(d, 55, 500, 940, "Why is the scheduler a separate process?",
          ["The server stays up for health checks and, later, webhooks.",
           "Sending is batch work, so it runs on a timer and then exits."],
          col=LINE, bg=GREY_BG)

    panel(d, 1045, 770, 500, "Deploy target",
          ["Bun host: systemd / PM2 / Docker",
           "Cloudflare: Worker + Queues via Alchemy"], col=LINE, bg=GREY_BG)
    s.save("02-architecture.png")


# ------------------------------------------------------------------ 03 story
def story():
    s = Sheet(1500, 780, "The story of one email", "A lead enrolled on Tuesday — what happens next")
    d = s.d

    y = 165
    d.line([(110, y), (1390, y)], fill=LINE, width=3)
    marks = [
        (160, "Tuesday", "Lead uploaded\nNO_1 scheduled\nsends now", BLUE),
        (455, "Tuesday", "Cron tick pulls NO_1\npayload built\nqueued", AMBER),
        (740, "Wednesday", "Worker sends\nBrevo / Resend", PURPLE),
        (1020, "Friday", "NO_2 is due\ndelay_days = 2\ncron sends it", GREEN),
        (1330, "Saturday", "Lead opens NO_1\n→ OPENED\n→ NO_3 cancelled", RED),
    ]
    for x, day, txt, col in marks:
        d.ellipse((x - 11, y - 11, x + 11, y + 11), fill=col)
        d.text((x, y - 42), day, font=font(16, bold=True), fill=col, anchor="mm")
        d.multiline_text((x, y + 32), txt, font=font(14), fill=INK, anchor="ma", align="center", spacing=6)

    b1 = panel(d, 90, 330, 620, "IF the lead never opens",
               ["$NOT_OPENED", "$NO_1 → NO_2 → NO_3 → COMPLETE", "delays: 0 days, 2 days, 3 days"],
               col=BLUE, bg=BLUE_BG)
    b2 = panel(d, 780, 330, 630, "IF the lead opens or clicks",
               ["$OPENED → O_1 → O_2 → O_3", "the remaining NOT_OPENED steps are cancelled",
                "the OPENED sequence takes over"],
               col=AMBER, bg=AMBER_BG)

    panel(d, 90, b1 + 36, 1320, "How precise is “in 2 days”?",
          ["NO_2 becomes due exactly two days after NO_1 is processed — but it is sent at the next daily cron run.",
           "So in practice a two-day step is really “2 to 3 days”. Running the tick hourly would tighten this."],
          col=LINE, bg=GREY_BG, lf=font(16))
    s.save("03-story.png")


# ------------------------------------------------------------------ 04 flow
def flow():
    s = Sheet(1500, 660, "The scheduler flow", "One machine, three stages — domain/orchestrator-machine.ts")
    d = s.d

    y = 140
    boxes = [
        (55, 295, "PULLED", "load the due row\nFOR UPDATE SKIP LOCKED", BLUE_BG, BLUE),
        (395, 635, "DECIDED", "the machine picks\nthe actor for this step", AMBER_BG, AMBER),
        (735, 975, "SENT", "enqueue the payload\nlog attempt · QUEUED", GREEN_BG, GREEN),
        (1075, 1315, "done", "transaction\ncommitted", GREY_BG, LINE),
    ]
    for i, (x0, x1, lab, sub, bg, col) in enumerate(boxes):
        node(d, (x0, y, x1, y + 110), lab, sub, bg, col, fh=24)
        if i < len(boxes) - 1:
            arrow(d, (x1 + 10, y + 55), (boxes[i + 1][0] - 10, y + 55), color=col, width=4)

    exits = [
        ("row = null", "another run already took it", RED),
        ("stale sequence", "the lead moved on → cancel, no send", RED),
        ("DECIDE_FAILED", "roll the whole thing back", AMBER),
        ("ENQUEUE_FAILED", "roll the whole thing back", AMBER),
    ]
    ex = 900
    d.rounded_rectangle((ex, 320, 1445, 620), radius=12, fill=GREY_BG, outline=LINE, width=2)
    d.text((ex + 25, 340), "Ways an email does not get sent", font=font(18, bold=True), fill=SLATE)
    yy = 385
    for name, why, col in exits:
        d.ellipse((ex + 25, yy + 4, ex + 41, yy + 20), fill=col)
        d.text((ex + 55, yy), name, font=font(15, bold=True, mono=True), fill=col)
        d.text((ex + 55, yy + 22), why, font=font(14), fill=MUTED)
        yy += 58

    panel(d, 55, 330, 780, "Reading the diagram",
          ["Solid arrows are the happy path. Every other route ends the same way:",
           "the transaction rolls back, so no half-sent email and no orphan",
           "scheduled step is ever left behind."],
          col=LINE, bg=GREY_BG)
    s.save("04-flow.png")


# ------------------------------------------------------------------ 05 engagement
def engagement():
    s = Sheet(1560, 900, "The engagement state machine", "domain/transition.ts — pure decision logic, no I/O")
    d = s.d

    node(d, (60, 130, 290, 215), "NEW", None, GREY_BG, SLATE, fh=20)

    rows = [
        ("NOT_OPENED", ["NO_1", "NO_2", "NO_3"], BLUE, BLUE_BG),
        ("OPENED", ["O_1", "O_2", "O_3"], AMBER, AMBER_BG),
        ("CLICKED", ["C_1", "C_2", "C_3"], GREEN, GREEN_BG),
        ("REPLIED", ["R_1", "R_2", "R_3"], PURPLE, PURPLE_BG),
    ]
    y = 275
    for name, steps, col, bg in rows:
        node(d, (455, y, 745, y + 88), name, None, bg, col, fh=19, mono=True)
        d.text((770, y + 30), " → ".join(steps) + " → COMPLETE", font=font(15, mono=True), fill=INK)
        chips(d, 1130, y + 20, steps, col)
        y += 108

    node(d, (455, y, 745, y + 88), "SUPPRESSED", "terminal", RED_BG, RED, fh=19, mono=True)
    d.text((770, y + 30), "never contacted again", font=font(15), fill=MUTED)

    # SEND: NEW -> NOT_OPENED (elbow down into the first sequence row)
    arrow(d, (290, 172), (350, 172), color=BLUE, width=3)
    d.text((300, 144), "SEND", font=font(13, bold=True), fill=BLUE)
    d.line((350, 172, 350, 319), fill=BLUE, width=3)
    arrow(d, (350, 319), (447, 319), color=BLUE, head=9)

    # promotion arrows run up the left gutter so they never cross the step text
    for i, (col, name) in enumerate([(AMBER, "OPENED"), (GREEN, "CLICKED"), (PURPLE, "REPLIED")]):
        src_y = 275 + i * 108 + 44
        dst_y = 275 + (i + 1) * 108 + 44
        d.line((450, src_y, 400, src_y), fill=col, width=2)
        d.line((400, src_y, 400, dst_y), fill=col, width=2)
        arrow(d, (400, dst_y), (447, dst_y), color=col, head=8)
        d.text((300, (src_y + dst_y) / 2 - 8), name, font=font(12, bold=True), fill=col)

    # suppression from anywhere
    sup_y = y + 44
    d.line((170, 215, 170, sup_y), fill=RED, width=2)
    d.line((170, sup_y, 450, sup_y), fill=RED, width=2)
    arrow(d, (170, sup_y), (450, sup_y), color=RED, head=9)
    d.text((60, sup_y + 12), "HARD_BOUNCE · SPAM · UNSUBSCRIBED", font=font(12, bold=True), fill=RED)
    d.text((60, sup_y + 32), "INVALID_EMAIL · DO_NOT_CONTACT", font=font(12, bold=True), fill=RED)

    panel(d, 1150, y + 20, 370, "NEXT_STEP",
          ["What the scheduler sends. It walks one step", "forward and returns", "$ { engagement, step, actions }"],
          col=LINE, bg=GREY_BG)
    s.save("05-engagement.png")


# ------------------------------------------------------------------ 06 compound
def compound():
    s = Sheet(1560, 780, "DECIDED is a compound state", "Every state and every step is its own node")
    d = s.d

    d.rounded_rectangle((55, 130, 1505, 620), radius=16, fill=BG, outline=LINE, width=2)
    d.text((85, 150), "DECIDED", font=font(23, bold=True), fill=SLATE)
    d.text((85, 182), "routing — always guards on context.engagement, then on context.step",
           font=font(14, mono=True), fill=MUTED)

    groups = [
        ("NOT_OPENED", ["NO_1", "NO_2", "NO_3"], BLUE),
        ("OPENED", ["O_1", "O_2", "O_3"], AMBER),
        ("CLICKED", ["C_1", "C_2", "C_3"], GREEN),
        ("REPLIED", ["R_1", "R_2", "R_3"], PURPLE),
    ]
    x = 90
    for name, steps, col in groups:
        node(d, (x, 230, x + 300, 288), name, None, BG, col, fh=17, mono=True, radius=10)
        sx = x + 20
        for sname in steps:
            node(d, (sx, 330, sx + 120, 390), sname, None, BG, col, fh=15, mono=True, radius=8)
            d.line((x + 150, 288, x + 150, 312), fill=col, width=2)
            arrow(d, (x + 150, 312), (sx + 60, 325), color=col, head=8, width=2)
            sx += 140
        x += 360

    node(d, (90, 470, 400, 530), "NEW", None, GREY_BG, SLATE, fh=16, mono=True, radius=10)
    node(d, (430, 470, 790, 530), "SUPPRESSED", None, RED_BG, RED, fh=16, mono=True, radius=10)

    d.text((90, 570), "each leaf carries  meta: { actor: { step } }", font=font(15, mono=True), fill=INK)
    d.text((90, 594), "the machine says WHO handles this step — the driver calls it", font=font(14), fill=MUTED)

    panel(d, 880, 440, 590, "Why generate the nodes?",
          ["The step list comes from STEP_SEQUENCE in transition.ts,",
           "so both machines share one source of truth.",
           "Add a step there and a node appears here automatically."],
          col=LINE, bg=GREY_BG)
    s.save("06-compound.png")


# ------------------------------------------------------------------ 07 actors
def actors():
    s = Sheet(1440, 700, "Actors — different logic per state and step", "domain/actors.ts")
    d = s.d

    node(d, (480, 125, 900, 200), "actorFor(state, step)", None, BG, SLATE, fh=19, mono=True, radius=10)

    lanes = [
        ("1", "stepActors[step]", "per-step override", "$ registerStepActor(\"NO_1\", …)", BLUE, BLUE_BG),
        ("2", "stateActors[state]", "per-sequence default", "$ registerStateActor(\"OPENED\", …)", AMBER, AMBER_BG),
        ("3", "defaultActor", "generic fallback", "always available", GREEN, GREEN_BG),
    ]

    y = 265
    rail = 790
    d.line((rail, 200, rail, y + 2 * 140 + 43), fill=LINE, width=2)
    for num, name, what, code, col, bg in lanes:
        d.ellipse((90, y + 12, 160, y + 82), fill=col)
        tw = d.textlength(num, font=font(24, bold=True))
        d.text((90 + (70 - tw) / 2, y + 26), num, font=font(24, bold=True), fill=BG)
        node(d, (190, y, 620, y + 86), name, None, bg, col, fh=17, mono=True, radius=10)
        d.text((190, y - 24), what, font=font(15), fill=INK)
        d.text((190, y + 94), code, font=font(13, mono=True), fill=MUTED)
        arrow(d, (rail - 12, y + 43), (626, y + 43), color=LINE, head=9)
        y += 140

    panel(d, 850, 265, 540, "Every actor does three things",
          ["1.  Builds the payload for its own step", "2.  Creates the next step", "$     execute_at = now + delay_days",
           "3.  Returns both to the flow", "", "Nothing else in the flow needs to know",
           "how a step's email is built."],
          col=LINE, bg=GREY_BG)
    s.save("07-actors.png")


# ------------------------------------------------------------------ 08 transaction
def transaction():
    s = Sheet(1480, 720, "One transaction per email", "Why the actors run in the driver, not in an async invoke")
    d = s.d

    d.rounded_rectangle((55, 130, 690, 620), radius=14, fill=RED_BG, outline=RED, width=2)
    d.text((85, 152), "✕   XState invoke  (the first attempt)", font=font(19, bold=True), fill=RED)
    node(d, (100, 220, 330, 275), "outer transaction", None, BG, RED, fh=14, mono=True, radius=8)
    node(d, (100, 315, 330, 370), "new fiber", None, BG, RED, fh=14, mono=True, radius=8)
    node(d, (100, 410, 330, 465), "other connection", None, BG, RED, fh=14, mono=True, radius=8)
    notes = [
        (220, "holds the row lock from FOR UPDATE"),
        (315, "fromPromise does not inherit the"),
        (339, "transaction service"),
        (410, "UPDATE queued → blocks forever"),
        (434, "waiting for a lock it cannot get"),
    ]
    for yy, txt in notes:
        d.text((355, yy), txt, font=font(13), fill=MUTED)
    d.line((330, 275, 330, 315), fill=RED, width=2)
    d.line((330, 370, 330, 410), fill=RED, width=2)
    d.text((100, 505), "Result: every integration test timed out at 5s.", font=font(15, bold=True), fill=RED)

    d.rounded_rectangle((790, 130, 1425, 620), radius=14, fill=GREEN_BG, outline=GREEN, width=2)
    d.text((820, 152), "✓   Same fiber  (what we ship)", font=font(19, bold=True), fill=GREEN)
    stages = [("pullStage", 220), ("actor.decide", 315), ("sendStage", 410), ("COMMIT", 505)]
    for i, (name, yy) in enumerate(stages):
        node(d, (835, yy, 1075, yy + 52), name, None, BG, GREEN, fh=14, mono=True, radius=8)
        if i < len(stages) - 1:
            arrow(d, (955, yy + 52), (955, stages[i + 1][1] - 6), color=GREEN)
    d.line((1245, 246, 1245, 531), fill=GREEN, width=3)
    d.ellipse((1230, 231, 1260, 261), fill=GREEN)
    d.ellipse((1230, 516, 1260, 546), fill=GREEN)
    d.text((1275, 265), "one connection", font=font(13), fill=MUTED)
    d.text((1275, 287), "one transaction", font=font(13), fill=MUTED)
    d.text((1275, 309), "atomic commit or rollback", font=font(13), fill=MUTED)

    panel(d, 55, 645, 1370, "The rule",
          ["The state picks the actor and the driver runs it — never inside an async invoke."],
          col=LINE, bg=GREY_BG, lf=font(16))
    s.save("08-transaction.png")


# ------------------------------------------------------------------ 09 queue
def queue():
    s = Sheet(1440, 660, "The queue", "The only link between the orchestrator and the worker")
    d = s.d

    node(d, (80, 140, 460, 275), "Orchestrator", "$ publisher.push(payload)\n$ SendPayload + tags", BLUE_BG, BLUE, fh=20)
    node(d, (640, 125, 840, 290), "Queue", "$ EmailSendQueue", GREEN_BG, GREEN, fh=20)
    node(d, (980, 140, 1360, 275), "Worker", "$ ack · retry · dead-letter", PURPLE_BG, PURPLE, fh=20)

    arrow(d, (470, 207), (630, 207), color=GREEN, width=4)
    d.text((505, 180), "push", font=font(13, bold=True), fill=GREEN)
    arrow(d, (850, 207), (970, 207), color=PURPLE, width=4)
    d.text((872, 180), "consume", font=font(13, bold=True), fill=PURPLE)

    d.line((1170, 285, 1170, 340), fill=RED, width=3)
    d.line((1170, 340, 740, 340), fill=RED, width=3)
    arrow(d, (740, 340), (740, 300), color=RED, head=9)
    d.text((1170, 350), "retry — transient failure (429 or 5xx)", font=font(13, bold=True), fill=RED)

    panel(d, 80, 420, 600, "Which publisher is used?",
          ["$ CLOUDFLARE_* env vars present", "→ cloudflareQueue()  (real, durable)",
           "$ otherwise", "→ LocalQueue  (in memory — tests only)"],
          col=LINE, bg=GREY_BG)
    panel(d, 720, 420, 640, "Gotcha",
          ["LocalQueue lives in the process memory.",
           "The cron tick exits right after it runs, so anything",
           "queued locally is lost.",
           "Real sending needs the Cloudflare values."],
          col=RED, bg=RED_BG)
    s.save("09-queue.png")


# ------------------------------------------------------------------ 10 status
def status():
    s = Sheet(1440, 700, "Action lifecycle", "scheduled_actions.action_status")
    d = s.d

    chain = [("SCHEDULED", BLUE, BLUE_BG), ("QUEUED", GREEN, GREEN_BG),
             ("PROCESSING", AMBER, AMBER_BG), ("SENT", GREEN, GREY_BG)]
    x = 80
    y = 150
    for i, (name, col, bg) in enumerate(chain):
        node(d, (x, y, x + 250, y + 86), name, None, bg, col, fh=18, mono=True)
        if i < len(chain) - 1:
            arrow(d, (x + 260, y + 43), (x + 325, y + 43), color=col, width=4)
        x += 335

    node(d, (80, 330, 420, 415), "CANCELLED", None, RED_BG, RED, fh=17, mono=True)
    node(d, (500, 330, 860, 415), "RETRY_SCHEDULED", None, AMBER_BG, AMBER, fh=17, mono=True)
    node(d, (940, 330, 1240, 415), "FAILED", None, RED_BG, RED, fh=17, mono=True)

    arrow(d, (205, 246), (205, 320), color=RED)
    d.text((220, 268), "stale or interrupted", font=font(13), fill=RED)
    arrow(d, (680, 246), (680, 320), color=AMBER)
    d.text((695, 268), "transient failure", font=font(13), fill=AMBER)
    arrow(d, (1090, 246), (1090, 320), color=RED)
    d.text((1105, 268), "permanent failure", font=font(13), fill=RED)

    panel(d, 80, 470, 1160, "Two guarantees worth knowing",
          ["1.  Only SCHEDULED rows with execute_at <= now are swept, and the row lock means two runs",
           "    can never process the same action.",
           "2.  A partial unique index stops the same lead / sequence / step being scheduled twice",
           "    while it is still active."],
          col=LINE, bg=GREY_BG)
    s.save("10-status.png")


# ------------------------------------------------------------------ 11 er
def er():
    s = Sheet(1620, 980, "Data model", "packages/db/migrations/0001_init.ts")
    d = s.d

    def table(x, y, w, name, rows, col=SLATE, bg=GREY_BG):
        h = 32
        rowh = 24
        if name:
            d.rounded_rectangle((x, y, x + w, y + h), radius=8, fill=bg, outline=col, width=2)
            tw = d.textlength(name, font=font(15, bold=True, mono=True))
            d.text((x + (w - tw) / 2, y + 8), name, font=font(15, bold=True, mono=True), fill=INK)
            yy = y + h
        else:
            yy = y
        for r in rows:
            d.rectangle((x, yy, x + w, yy + rowh), fill=BG, outline=LINE, width=1)
            d.text((x + 12, yy + 5), r, font=font(12, mono=True), fill=MUTED)
            yy += rowh
        return yy

    # row 1
    table(60, 120, 300, "datasets", ["id · name · external_key"])
    table(420, 120, 300, "campaigns", ["id · status · config"])
    table(780, 120, 320, "templates", ["subject · html · text"])
    table(1160, 120, 330, "domains", ["domain · daily_limit"])

    # row 2
    table(60, 300, 300, "leads", ["email · engagement_state"])
    table(420, 300, 300, "sequences", ["sequence_type"])
    table(780, 300, 320, "mailboxes", ["email · display_name"])

    # row 3
    table(420, 450, 300, "sequence_steps", ["step_code · step_order", "delay_days · template_id"])

    # row 4 — the scheduler tables
    table(60, 640, 350, "scheduled_actions",
          ["execute_at · action_status", "sequence_id · step_id", "template · domain · mailbox"], col=BLUE, bg=BLUE_BG)
    table(490, 640, 330, "send_attempts",
          ["attempt_no · provider", "provider_message_id", "status"], col=GREEN, bg=GREEN_BG)
    table(890, 640, 330, "email_events",
          ["provider_event_id", "event_type · raw"], col=AMBER, bg=AMBER_BG)
    table(1290, 640, 300, "job_transitions",
          ["from_state · to_state", "event · reason"], col=PURPLE, bg=PURPLE_BG)

    def poly(pts, col=LINE, wd=2):
        d.line(pts, fill=col, width=wd)

    # row 1 chain
    poly([(360, 136), (412, 136)])
    poly([(720, 136), (772, 136)])
    # campaigns -> sequences -> sequence_steps
    poly([(570, 156), (570, 292)])
    poly([(570, 356), (570, 442)])
    # sequence_steps -> templates (routes through the gap right of sequences)
    poly([(720, 470), (755, 470), (755, 170), (772, 170)])
    # domains -> mailboxes
    poly([(1160, 152), (1130, 152), (1130, 296), (1108, 296)])
    # leads -> scheduled_actions
    poly([(210, 348), (210, 632)])
    # sequence_steps -> scheduled_actions
    poly([(570, 522), (570, 600), (280, 600), (280, 632)])
    # scheduled_actions -> send_attempts -> email_events
    poly([(410, 660), (482, 660)])
    poly([(820, 660), (882, 660)])
    # leads -> email_events along the clear channel
    poly([(230, 348), (230, 570), (1055, 570), (1055, 632)])
    # send_attempts -> job_transitions
    poly([(655, 736), (655, 770), (1440, 770), (1440, 632)])

    panel(d, 1160, 300, 420, "Not written yet",
          ["$ email_events", "$ job_transitions", "$ suppression_list",
           "", "These tables exist in the schema", "but no code writes them yet —",
           "they belong to the pending webhook", "work."],
          col=AMBER, bg=AMBER_BG)
    panel(d, 60, 830, 700, "The two tables that matter most",
          ["$ scheduled_actions   — the unit of work: one lead, one step, one send time",
           "$ leads              — engagement_state is the position in the state machine"],
          col=BLUE, bg=BLUE_BG)
    s.save("11-er.png")


if __name__ == "__main__":
    overview()
    architecture()
    story()
    flow()
    engagement()
    compound()
    actors()
    transaction()
    queue()
    status()
    er()
    print("rendered:", len(os.listdir(OUT)), "diagrams")