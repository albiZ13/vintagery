from __future__ import annotations
"""
Periodic scheduler for the Vintagerie event scraper.
Runs automatically on configurable intervals.

Schedules:
  - Every 1st of the month at 05:00 → full scrape (next month)
  - Every Monday at 07:00          → quick scrape (current month, fast sources only)
  - Every 6 hours                  → Telegram + Subito only (fresh real-time posts)

Usage:
  python -m scraper.scheduler           # starts blocking scheduler
  python -m scraper.scheduler --once    # run once immediately and exit
"""
import os
import argparse
import logging
from datetime import datetime

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
log = logging.getLogger('scraper.scheduler')


# ── Source groups by freshness need ───────────────────────────────────────

FAST_SOURCES = ['recurring_fairs', 'vinokilo', 'aggregators', 'neventum']
MEDIUM_SOURCES = ['cosedicasa', 'eventbrite', 'comuni', 'websearch', 'brand_sales']
SLOW_SOURCES = ['subito', 'bakeca', 'kijiji', 'reddit', 'facebook', 'telegram']
ALL_SOURCES = FAST_SOURCES + MEDIUM_SOURCES + SLOW_SOURCES


def _run(month: int, year: int, source_filter: list[str] | None = None) -> dict:
    from .main import run_scrape
    log.info(f'Starting scrape month={month:02d}/{year} sources={source_filter or "all"}')
    results = run_scrape(month, year, source_filter=source_filter)
    total = sum(r['inserted'] for r in results.values())
    log.info(f'Scrape complete — {total} events inserted')
    return results


def job_monthly_full() -> None:
    """1st of the month — scrape next month from all sources."""
    now = datetime.now()
    if now.month == 12:
        month, year = 1, now.year + 1
    else:
        month, year = now.month + 1, now.year
    _run(month, year)


def job_weekly_refresh() -> None:
    """Every Monday — refresh current month + next month with medium+fast sources."""
    now = datetime.now()
    sources = FAST_SOURCES + MEDIUM_SOURCES
    _run(now.month, now.year, source_filter=sources)
    if now.month == 12:
        _run(1, now.year + 1, source_filter=sources)
    else:
        _run(now.month + 1, now.year, source_filter=sources)


def job_realtime_check() -> None:
    """Every 6 hours — check social/classified sources for new posts."""
    now = datetime.now()
    _run(now.month, now.year, source_filter=SLOW_SOURCES)


def run_once(month: int | None = None, year: int | None = None) -> None:
    now = datetime.now()
    _run(month or now.month, year or now.year)


def start() -> None:
    scheduler = BlockingScheduler(timezone='Europe/Rome')

    # Full scrape: 1st of each month at 05:00
    scheduler.add_job(
        job_monthly_full,
        CronTrigger(day=1, hour=5, minute=0, timezone='Europe/Rome'),
        id='monthly_full',
        name='Monthly full scrape (all sources, next month)',
        replace_existing=True,
    )

    # Weekly refresh: every Monday at 07:00
    scheduler.add_job(
        job_weekly_refresh,
        CronTrigger(day_of_week='mon', hour=7, minute=0, timezone='Europe/Rome'),
        id='weekly_refresh',
        name='Weekly refresh (fast+medium sources)',
        replace_existing=True,
    )

    # Real-time check: every 6 hours (Telegram, Subito, Facebook)
    scheduler.add_job(
        job_realtime_check,
        CronTrigger(hour='0,6,12,18', minute=30, timezone='Europe/Rome'),
        id='realtime_check',
        name='Real-time check (social + classified)',
        replace_existing=True,
    )

    log.info('Scheduler started. Jobs:')
    for job in scheduler.get_jobs():
        log.info(f'  • {job.name} → next run: {job.next_run_time}')

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info('Scheduler stopped.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true', help='Run once and exit')
    parser.add_argument('--month', type=int, default=None)
    parser.add_argument('--year',  type=int, default=None)
    parser.add_argument('--sources', nargs='+', default=None,
                        choices=ALL_SOURCES, help='Limit to specific sources')
    args = parser.parse_args()

    if args.once:
        now = datetime.now()
        _run(
            args.month or now.month,
            args.year  or now.year,
            source_filter=args.sources,
        )
    else:
        start()
