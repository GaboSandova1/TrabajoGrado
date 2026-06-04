import re
from urllib.parse import urlparse

ASIN_PATTERN = re.compile(r"(?:/dp/|/gp/product/|/product-reviews/)([A-Z0-9]{10})", re.I)


def extract_asin(url: str) -> str | None:
    if not url:
        return None
    match = ASIN_PATTERN.search(url)
    return match.group(1).upper() if match else None


def extract_amazon_domain(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    if "amazon.es" in host:
        return "amazon.es"
    if "amazon.co.uk" in host:
        return "amazon.co.uk"
    if "amazon.de" in host:
        return "amazon.de"
    if "amazon.fr" in host:
        return "amazon.fr"
    if "amazon.it" in host:
        return "amazon.it"
    if "amazon.com.mx" in host:
        return "amazon.com.mx"
    if "amazon.ca" in host:
        return "amazon.ca"
    return "amazon.com"
