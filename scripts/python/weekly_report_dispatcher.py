"""
StockStory Weekly Report Dispatcher
=====================================
Generates the weekly market intelligence digest and emails it
to all active premium subscribers via free Gmail SMTP relay.

Flow:
  1. Generate report via cron_weekly_reporter.py (or use latest existing)
  2. Build an HTML email with structured report sections
  3. Query customer_subscriptions for active email subscribers
  4. Send via Gmail SMTP (App Password)
  5. Log deliveries to email_delivery_log
  6. Record digest in daily_digests table

Usage:
    python weekly_report_dispatcher.py
    python weekly_report_dispatcher.py --dry-run
    python weekly_report_dispatcher.py --cron
    python weekly_report_dispatcher.py --skip-report
"""

import argparse
import os
import sqlite3
import smtplib
import subprocess
import sys
import json
from datetime import datetime
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

BASE_DIR = str(Path(__file__).resolve().parent.parent.parent)
DB_PATH = os.getenv("DB_PATH", os.path.join(BASE_DIR, "data", "stockstory.db"))
BILLING_DB_PATH = os.getenv("BILLING_DB_PATH", os.path.join(BASE_DIR, "market_master.db"))
REPORTS_DIR = os.getenv("REPORTS_DIR", os.path.join(BASE_DIR, "data", "reports"))
GMAIL_USER = os.getenv("FREE_EMAIL_USER")
GMAIL_PASS = os.getenv("FREE_EMAIL_PASS")
SCRIPT_DIR = os.path.join(BASE_DIR, "scripts", "python")

WEEKLY_HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #e0e0e0; }}
    .container {{ max-width: 600px; margin: 0 auto; padding: 24px 16px; }}
    .header {{ text-align: center; padding: 32px 0 24px; border-bottom: 1px solid #1A1A1A; }}
    .header h1 {{ font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin: 0; }}
    .header p {{ font-size: 12px; color: #707070; margin: 4px 0 0; }}
    .section {{ margin: 24px 0; }}
    .section h2 {{ font-size: 13px; font-weight: 700; color: #57c1ff; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }}
    .card {{ background: #0D0D0D; border: 1px solid #1A1A1A; border-radius: 8px; padding: 16px; margin: 8px 0; }}
    .card h3 {{ font-size: 14px; font-weight: 700; color: #ffffff; margin: 0 0 4px; }}
    .card p {{ font-size: 12px; color: #a0a0a0; margin: 2px 0; line-height: 1.5; }}
    .metric {{ display: inline-block; margin: 4px 12px 4px 0; font-size: 11px; color: #707070; }}
    .metric strong {{ color: #ffffff; }}
    .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }}
    .badge-green {{ background: rgba(52,199,89,0.15); color: #34C759; }}
    .badge-red {{ background: rgba(255,59,48,0.15); color: #FF3B30; }}
    .badge-blue {{ background: rgba(87,193,255,0.15); color: #57c1ff; }}
    .footer {{ text-align: center; padding: 24px 0; border-top: 1px solid #1A1A1A; margin-top: 32px; }}
    .footer p {{ font-size: 10px; color: #585858; margin: 2px 0; }}
    .footer a {{ color: #57c1ff; text-decoration: none; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Equity Lens Weekly Digest</h1>
      <p>{date}</p>
    </div>
    {content}
    <div class="footer">
      <p>Equity Lens &mdash; AI-Powered Stock Research &amp; Analysis</p>
      <p><a href="https://stockstory.in">stockstory.in</a> &middot; <a href="https://stockstory.in/settings">Manage preferences</a></p>
      <p>Past performance does not guarantee future results. Data from NSE/BSE, Screener.in.</p>
    </div>
  </div>
</body>
</html>"""


def ensure_dirs():
    os.makedirs(REPORTS_DIR, exist_ok=True)


def generate_report(dry_run: bool = False) -> str | None:
    reporter_script = os.path.join(SCRIPT_DIR, "cron_weekly_reporter.py")
    if not os.path.exists(reporter_script):
        print("  cron_weekly_reporter.py not found — skipping generation")
        return None

    print("  Generating weekly report...")
    if dry_run:
        print("  [DRY] Would run: python cron_weekly_reporter.py --report")
        return None

    try:
        result = subprocess.run(
            [sys.executable, reporter_script, "--report"],
            capture_output=True, text=True, timeout=120,
            cwd=BASE_DIR, env={**os.environ, "REPORT_DIR": REPORTS_DIR},
        )
        if result.returncode != 0:
            print(f"  Report generation stderr: {result.stderr[:200]}")
            return None
        print(f"  Report generation stdout: {result.stdout.strip()[-150:]}")
    except subprocess.TimeoutExpired:
        print("  Report generation timed out after 120s")
        return None
    except Exception as e:
        print(f"  Report generation failed: {e}")
        return None

    md_files = sorted(
        [f for f in Path(REPORTS_DIR).glob("*.md")],
        key=lambda f: f.stat().st_mtime,
    )
    if not md_files:
        print("  No .md report files found after generation")
        return None

    latest = md_files[-1]
    print(f"  Latest report: {latest.name}")
    return str(latest)


def find_latest_report() -> str | None:
    md_files = sorted(
        [f for f in Path(REPORTS_DIR).glob("*.md")],
        key=lambda f: f.stat().st_mtime,
    )
    if not md_files:
        return None
    return str(md_files[-1])


def build_html_body(report_md: str) -> str:
    lines = report_md.split("\n")
    sections = []
    current = []

    for line in lines:
        if line.startswith("# ") and current:
            sections.append("\n".join(current))
            current = [line]
        elif line.startswith("## "):
            if current:
                sections.append("\n".join(current))
            current = [line]
        else:
            current.append(line)
    if current:
        sections.append("\n".join(current))

    html_parts = []
    for section in sections:
        lines = section.split("\n")
        heading = lines[0] if lines else ""
        rest = "\n".join(lines[1:]) if len(lines) > 1 else ""

        if heading.startswith("# "):
            title = heading.lstrip("# ").strip()
            html_parts.append(
                f'<div class="section"><h2>{title}</h2>'
                f'<div class="card"><p>{_md_to_html(rest)}</p></div></div>'
            )
        elif heading.startswith("## "):
            title = heading.lstrip("## ").strip()
            html_parts.append(
                f'<div class="card"><h3>{title}</h3>'
                f'<p>{_md_to_html(rest)}</p></div>'
            )
        else:
            html_parts.append(
                f'<div class="card"><p>{_md_to_html(section)}</p></div>'
            )

    return "\n".join(html_parts)


def _md_to_html(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = text.replace("\n", "<br>")
    text = text.replace("**", "<strong>", 1)
    if "**" in text:
        parts = text.split("**")
        for i in range(1, len(parts), 2):
            parts[i] = f"<strong>{parts[i]}</strong>"
        text = "".join(parts)
    text = text.replace("`", "<code>", 1)
    if "`" in text:
        parts = text.split("`")
        for i in range(1, len(parts), 2):
            parts[i] = f"<code>{parts[i]}</code>"
        text = "".join(parts)
    text = text.replace("&gt;", ">")
    return text


def get_subscribers(dry_run: bool = False) -> list[dict]:
    conn = sqlite3.connect(BILLING_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, user_email FROM customer_subscriptions "
        "WHERE billing_status = 'ACTIVE' AND user_email IS NOT NULL"
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def ensure_billing_schema():
    conn = sqlite3.connect(BILLING_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='email_delivery_log'"
    )
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            CREATE TABLE email_delivery_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                recipient_email TEXT NOT NULL,
                subject TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'sent',
                sent_at TEXT NOT NULL DEFAULT (datetime('now')),
                error TEXT
            )
        """)
    cursor.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='daily_digests'"
    )
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            CREATE TABLE daily_digests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                digest_date TEXT NOT NULL,
                content TEXT NOT NULL,
                email_sent INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(user_id, digest_date)
            )
        """)
    conn.commit()
    conn.close()


def log_delivery(user_id: str, email: str, subject: str, status: str = "sent", error: Optional[str] = None):
    conn = sqlite3.connect(BILLING_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO email_delivery_log (user_id, recipient_email, subject, status, error) "
        "VALUES (?, ?, ?, ?, ?)",
        (user_id, email, subject, status, error),
    )
    conn.commit()
    conn.close()


def record_digest(user_id: str, summary: str):
    today = datetime.now().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO daily_digests (user_id, digest_date, content, email_sent) "
        "VALUES (?, ?, ?, 1)",
        (user_id, today, json.dumps({"summary": summary[:500], "generated_at": datetime.now().isoformat()})),
    )
    conn.commit()
    conn.close()


def dispatch_emails(report_path: str, dry_run: bool = False) -> int:
    if not GMAIL_USER or not GMAIL_PASS:
        print("  GMAIL_USER/GMAIL_PASS not configured — skipping dispatch")
        return 0

    with open(report_path, "r", encoding="utf-8") as f:
        report_content = f.read()

    report_date = datetime.now().strftime("%d %B %Y")
    subject = f"Equity Lens Weekly Digest — {report_date}"
    html_content = WEEKLY_HTML_TEMPLATE.format(
        date=report_date,
        content=build_html_body(report_content),
    )
    plain_text = f"Equity Lens Weekly Digest — {report_date}\n\n{report_content}"

    subscribers = get_subscribers(dry_run=dry_run)
    if not subscribers:
        print("  No active subscribers with email addresses")
        return 0

    print(f"  Subscribers to deliver: {len(subscribers)}")

    if dry_run:
        print(f"  [DRY] Would email {len(subscribers)} subscribers via {GMAIL_USER}")
        print(f"  [DRY] Subject: {subject}")
        print(f"  [DRY] First recipient: {subscribers[0]['user_email']}")
        return len(subscribers)

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_PASS)

        sent_count = 0
        for sub in subscribers:
            try:
                msg = MIMEMultipart("alternative")
                msg["From"] = f"Equity Lens <{GMAIL_USER}>"
                msg["To"] = sub["user_email"]
                msg["Subject"] = subject
                msg.attach(MIMEText(plain_text, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                server.sendmail(GMAIL_USER, sub["user_email"], msg.as_string())
                log_delivery(sub["user_id"], sub["user_email"], subject, "sent")
                record_digest(sub["user_id"], report_content[:200])
                sent_count += 1
                if sent_count % 50 == 0:
                    print(f"    Progress: {sent_count}/{len(subscribers)}")

            except smtplib.SMTPRecipientsRefused as e:
                log_delivery(sub["user_id"], sub["user_email"], subject, "bounced", str(e))
                print(f"    Bounced: {sub['user_email']}")
            except smtplib.SMTPSenderRefused as e:
                log_delivery(sub["user_id"], sub["user_email"], subject, "failed", str(e))
                print(f"    Failed: {sub['user_email']}")

        server.quit()
        print(f"  Delivered {sent_count}/{len(subscribers)} emails")
        return sent_count

    except smtplib.SMTPAuthenticationError:
        print("  Gmail auth failed. Use an App Password (not your normal password).")
        print("  Generate at: https://myaccount.google.com/apppasswords")
        return 0
    except Exception as e:
        print(f"  SMTP error: {e}")
        return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="StockStory weekly report dispatcher — generates and emails the market digest."
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without sending emails")
    parser.add_argument("--cron", action="store_true",
                        help="Suppress banner output for cron logging")
    parser.add_argument("--skip-report", action="store_true",
                        help="Use latest existing report instead of generating new one")
    parser.add_argument("--force", action="store_true",
                        help="Force re-send even if same-date digest exists")
    args = parser.parse_args()

    if not args.cron:
        cols = 70
        print("=" * cols)
        print("  EQUITY LENS WEEKLY REPORT DISPATCHER")
        print("=" * cols)
        print(f"  Mode:  {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"  Time:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Skip:  {'yes (use existing)' if args.skip_report else 'no (generate new)'}")
        print("=" * cols)

    ensure_dirs()
    ensure_billing_schema()

    report_path = None

    if args.skip_report:
        report_path = find_latest_report()
        if not report_path:
            print("  No existing report found — run without --skip-report to generate one")
            sys.exit(1)
        print(f"  Using existing report: {Path(report_path).name}")
    else:
        generated = generate_report(dry_run=args.dry_run)
        if generated:
            report_path = str(generated)
        else:
            report_path = find_latest_report()
            if report_path:
                print(f"  Falling back to latest existing: {Path(report_path).name}")

    if not report_path:
        print("  No report available — cannot dispatch")
        sys.exit(1)

    sent = dispatch_emails(report_path, dry_run=args.dry_run)

    print(f"Weekly dispatch {'(dry-run)' if args.dry_run else ''} — "
          f"{'would send ' if args.dry_run else 'sent '}"
          f"{sent} email(s)")

    if args.cron:
        sys.stdout.flush()
