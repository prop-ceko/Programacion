import datetime
from typing import NamedTuple

import httpx
from decouple import config

KEY = config("GOOGLE_API_KEY", cast=str, default="<KEY>")
URL = "https://www.googleapis.com/calendar/v3/calendars/es.ar%23holiday%40group.v.calendar.google.com/events?key="


class Holiday(NamedTuple):
    name: str
    start: datetime.date
    end: datetime.date


def iso_date(dt: datetime.datetime):
    # dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.replace(microsecond=0, tzinfo=None).isoformat() + "Z"


def fetch(year: int):
    start_date = datetime.datetime(year, 1, 1)
    end_date = datetime.datetime(year, 12, 31, 23, 59, 59)

    url = URL + KEY + f"&timeMin={iso_date(start_date)}&timeMax={iso_date(end_date)}"
    result = httpx.get(url)
    data = result.json()

    return [Holiday(name=holiday['summary'], start=holiday['start']['date'], end=holiday['end']['date'])
            for holiday in data['items']]
