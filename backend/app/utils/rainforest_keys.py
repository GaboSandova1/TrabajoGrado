import logging
import threading
from itertools import cycle

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class RainforestKeyRotator:
    """Round-robin entre API keys de Rainforest con failover si una falla."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._exhausted: set[str] = set()
        self._cycle = None
        self._refresh_cycle()

    def _all_keys(self) -> list[str]:
        return settings.rainforest_api_keys

    def _refresh_cycle(self) -> None:
        available = [key for key in self._all_keys() if key not in self._exhausted]
        self._cycle = cycle(available) if available else None

    def keys_for_attempt(self) -> list[str]:
        with self._lock:
            available = [key for key in self._all_keys() if key not in self._exhausted]
            if not available:
                return []

            if self._cycle is None:
                self._refresh_cycle()

            start_key = next(self._cycle)
            return [start_key] + [key for key in available if key != start_key]

    def mark_exhausted(self, api_key: str) -> None:
        with self._lock:
            if api_key in self._exhausted:
                return
            self._exhausted.add(api_key)
            self._refresh_cycle()
            logger.warning(
                "Rainforest API key terminada (…%s). Quedan %s clave(s) activa(s).",
                api_key[-4:],
                len(self._all_keys()) - len(self._exhausted),
            )


key_rotator = RainforestKeyRotator()


def is_quota_exhausted(response: httpx.Response) -> bool:
    if response.status_code == 402:
        return True

    text = response.text.lower()
    quota_keywords = (
        "payment required",
        "out of credits",
        "credit limit",
        "no credits",
        "billing",
        "plan limit",
        "quota",
    )
    if any(keyword in text for keyword in quota_keywords):
        return True

    try:
        payload = response.json()
    except ValueError:
        return False

    message = str(
        payload.get("message")
        or payload.get("error")
        or (payload.get("request_info") or {}).get("message")
        or ""
    ).lower()
    return any(keyword in message for keyword in quota_keywords)


def should_try_next_key(response: httpx.Response) -> bool:
    if is_quota_exhausted(response):
        return True
    if response.status_code in {401, 429}:
        return True
    return False
