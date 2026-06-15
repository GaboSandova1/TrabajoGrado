import logging
import re
import httpx
from app.config import settings
from app.utils.amazon import extract_asin, extract_amazon_domain

logger = logging.getLogger(__name__)


def _clean_text(text: str) -> str:
    return " ".join((text or "").split())


def _normalize_rating(value) -> float | None:
    if value is None:
        return None
    try:
        # Maneja "4,5 von 5" y "4.5 out of 5"
        clean = str(value).replace(",", ".").strip()
        rating = float(re.search(r"[\d.]+", clean).group())
    except (TypeError, ValueError, AttributeError):
        return None
    if rating > 5:
        rating = rating / 2
    return round(max(0.0, min(5.0, rating)), 1)


def _build_amazon_reviews_url(asin: str, amazon_domain: str) -> str:
    return (
        f"https://www.{amazon_domain}/product-reviews/{asin}"
        f"?reviewerType=all_reviews&sortBy=recent&pageSize=50"
    )


def _build_amazon_product_url(asin: str, amazon_domain: str) -> str:
    return f"https://www.{amazon_domain}/dp/{asin}"


def _fetch_html(url: str, country_code: str = "us") -> str:
    if not settings.SCRAPERAPI_KEY:
        raise ValueError(
            "No hay API key de ScraperAPI configurada. "
            "Agrega SCRAPERAPI_KEY en el .env."
        )
    params = {
        "api_key": settings.SCRAPERAPI_KEY,
        "url": url,
        "render": "false",
        "country_code": country_code,
    }
    response = httpx.get(
        "https://api.scraperapi.com/",
        params=params,
        timeout=90.0,
    )
    if response.status_code != 200:
        raise ValueError(f"ScraperAPI error: {response.status_code}")
    return response.text


def _domain_to_country(amazon_domain: str) -> str:
    mapping = {
        "amazon.es": "es",
        "amazon.co.uk": "uk",
        "amazon.de": "de",
        "amazon.fr": "fr",
        "amazon.it": "it",
        "amazon.com.mx": "mx",
        "amazon.ca": "ca",
        "amazon.com": "us",
    }
    return mapping.get(amazon_domain, "us")


def _parse_product_html(html: str, product_url: str, asin: str) -> dict:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")

    # Título
    title_tag = soup.find(id="productTitle")
    title = _clean_text(title_tag.get_text()) if title_tag else "Producto sin título"

    # Rating global
    rating_tag = soup.find("span", {"data-hook": "rating-out-of-text"})
    if not rating_tag:
        rating_tag = soup.find("span", class_="a-icon-alt")
    rating_raw = rating_tag.get_text() if rating_tag else None
    rating = _normalize_rating(rating_raw)

    # Imagen
    img_tag = soup.find("img", id="landingImage")
    if not img_tag:
        img_tag = soup.find("img", id="imgBlkFront")
    image_url = ""
    if img_tag:
        image_url = img_tag.get("src") or img_tag.get("data-src") or ""
        # Intentar obtener imagen de mayor resolución
        data_dynamic = img_tag.get("data-a-dynamic-image", "")
        if data_dynamic:
            urls = re.findall(r'"(https://[^"]+\.jpg)"', data_dynamic)
            if urls:
                image_url = urls[0]

    # Precio
    price_tag = soup.find("span", class_="a-price-whole")
    price = _clean_text(price_tag.get_text()) if price_tag else ""

    # Descripción: feature bullets
    bullets_div = soup.find(id="feature-bullets")
    description = ""
    if bullets_div:
        items = bullets_div.find_all("span", class_="a-list-item")
        description = " ".join(
            _clean_text(i.get_text())
            for i in items
            if _clean_text(i.get_text())
        )

    return {
        "asin": asin,
        "product_url": product_url,
        "product_title": title,
        "price": price,
        "image_url": image_url,
        "description": description,
        "rating": rating,
        "amazon_domain": extract_amazon_domain(product_url),
    }


def _parse_reviews_html(html: str, max_reviews: int) -> list:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    reviews = []

    # Cada review tiene data-hook="review"
    review_tags = soup.find_all("div", {"data-hook": "review"})
    logger.info("Reviews encontradas en HTML: %d", len(review_tags))

    for tag in review_tags[:max_reviews]:
        # Rating
        rating_tag = tag.find("span", class_="a-icon-alt")
        rating_raw = rating_tag.get_text() if rating_tag else ""
        rating = _normalize_rating(rating_raw) or ""

        # Título
        title_tag = tag.find("a", {"data-hook": "review-title"})
        if not title_tag:
            title_tag = tag.find("span", {"data-hook": "review-title"})
        title = _clean_text(title_tag.get_text()) if title_tag else ""

        # Cuerpo
        body_tag = tag.find("span", {"data-hook": "review-body"})
        body = _clean_text(body_tag.get_text()) if body_tag else ""

        # Fecha
        date_tag = tag.find("span", {"data-hook": "review-date"})
        date = _clean_text(date_tag.get_text()) if date_tag else ""

        # Autor
        author_tag = tag.find("span", class_="a-profile-name")
        author = _clean_text(author_tag.get_text()) if author_tag else ""

        # Compra verificada
        verified_tag = tag.find("span", {"data-hook": "avp-badge"})
        verified = verified_tag is not None

        if body:
            reviews.append({
                "author": author,
                "rating": str(rating),
                "title": title,
                "date": date,
                "body": body,
                "verified_purchase": verified,
            })

    return reviews


def fetch_product_payload(product_url: str, max_reviews: int = 10) -> dict:
    asin = extract_asin(product_url)
    if not asin:
        raise ValueError("No se pudo extraer el ASIN de la URL")

    amazon_domain = extract_amazon_domain(product_url)
    country_code = _domain_to_country(amazon_domain)
    max_reviews = max(1, min(int(max_reviews), 50))

    # 1. Datos del producto
    product_page_url = _build_amazon_product_url(asin, amazon_domain)
    logger.info("Obteniendo producto: %s", product_page_url)
    product_html = _fetch_html(product_page_url, country_code)
    product_data = _parse_product_html(product_html, product_url, asin)

    # 2. Reviews — con paginación si se necesitan más de 10
    reviews_page_url = _build_amazon_reviews_url(asin, amazon_domain)
    logger.info("Obteniendo reviews: %s", reviews_page_url)
    try:
        reviews_html = _fetch_html(reviews_page_url, country_code)
        reviews = _parse_reviews_html(reviews_html, max_reviews)
        logger.info("Reviews extraídas: %d", len(reviews))
    except Exception as e:
        logger.warning("No se pudieron obtener reviews: %s", e)
        reviews = []

    product_data["reviews"] = reviews
    product_data["count"] = len(reviews)

    return product_data