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
        clean = str(value).replace(",", ".").strip()
        rating = float(re.search(r"[\d.]+", clean).group())
    except (TypeError, ValueError, AttributeError):
        return None
    if rating > 5:
        rating = rating / 2
    return round(max(0.0, min(5.0, rating)), 1)


def _build_amazon_product_url(asin: str, amazon_domain: str) -> str:
    return f"https://www.{amazon_domain}/dp/{asin}"


def _build_amazon_reviews_url(asin: str, amazon_domain: str) -> str:
    return (
        f"https://www.{amazon_domain}/product-reviews/{asin}"
        f"?reviewerType=all_reviews&sortBy=recent"
    )


def _domain_to_country(amazon_domain: str) -> str:
    mapping = {
        "amazon.es": "es",
        "amazon.co.uk": "gb",
        "amazon.de": "de",
        "amazon.fr": "fr",
        "amazon.it": "it",
        "amazon.com.mx": "mx",
        "amazon.ca": "ca",
        "amazon.com": "us",
    }
    return mapping.get(amazon_domain, "us")


def _domain_to_locale(amazon_domain: str) -> str:
    mapping = {
        "amazon.es": "es_ES",
        "amazon.co.uk": "en_GB",
        "amazon.de": "de_DE",
        "amazon.fr": "fr_FR",
        "amazon.it": "it_IT",
        "amazon.com.mx": "es_MX",
        "amazon.ca": "en_CA",
        "amazon.com": "en_US",
    }
    return mapping.get(amazon_domain, "en_US")


def _get_decodo_auth() -> tuple[str, str] | None:
    token = getattr(settings, "DECODO_API_KEY", "").strip()
    if not token:
        return None
    if ":" in token:
        parts = token.split(":", 1)
        return parts[0], parts[1]
    return token, ""


def _fetch_decodo_product(asin: str, amazon_domain: str) -> dict:

    auth = _get_decodo_auth()
    if not auth:
        raise ValueError("DECODO_API_KEY no configurada")

    payload = {
        "target": "amazon_product",
        "query": asin,
        "country": _domain_to_country(amazon_domain),
        "locale": _domain_to_locale(amazon_domain),
        "parse": True,
    }

    response = httpx.post(
        "https://scraper-api.decodo.com/v2/scrape",
        json=payload,
        auth=auth,
        timeout=90.0,
    )

    response.raise_for_status()

    data = response.json()

    results = data.get("results", [])

    if not results:
        return {}

    return (
        results[0]
        .get("content", {})
        .get("results", {})
    )


def _extract_reviews_from_content(content: dict, max_reviews: int) -> list:
    """
    Extrae las reseñas del JSON que devuelve Decodo amazon_product.
    Estructura confirmada:
    {
      "reviews": [
        {
          "author": "...",
          "content": "...",   <-- texto de la reseña
          "rating": 5,
          "title": "...",
          "timestamp": "Reviewed in the United States March 2, 2021",
          "is_verified": true,
          "id": "..."
        },
        ...
      ]
    }
    """
    raw = content.get("reviews") or []
    reviews = []

    for r in raw[:max_reviews]:
        if not isinstance(r, dict):
            continue

        # El campo de texto es "content" en la respuesta de Decodo
        body = _clean_text(
            r.get("content") or r.get("body") or r.get("text") or ""
        )
        if not body:
            continue

        rating = _normalize_rating(r.get("rating")) or ""

        reviews.append({
            "author": r.get("author") or "",
            "rating": str(rating),
            "title": _clean_text(r.get("title") or ""),
            "date": r.get("timestamp") or r.get("date") or "",
            "body": body,
            "verified_purchase": bool(r.get("is_verified") or False),
        })

    return reviews


def _fetch_decodo_reviews_page(asin: str, amazon_domain: str, page: int = 1) -> dict:
    """
    Llama al target amazon_reviews de Decodo para obtener más reseñas.
    Puede devolver 410 si el plan no lo soporta — se maneja en el caller.
    """
    auth = _get_decodo_auth()
    if not auth:
        return {}

    payload = {
        "target": "amazon_reviews",
        "query": asin,
        "country": _domain_to_country(amazon_domain),
        "locale": _domain_to_locale(amazon_domain),
        "parse": True,
        "page": page,
    }

    response = httpx.post(
        "https://scraper-api.decodo.com/v2/scrape",
        json=payload,
        auth=auth,
        timeout=90.0,
    )
    logger.info("Decodo amazon_reviews page %d status: %d", page, response.status_code)

    if response.status_code not in (200,):
        logger.warning(
            "Decodo amazon_reviews no disponible (status %d) — usando solo reseñas del producto",
            response.status_code,
        )
        return {}

    data = response.json()
    results = data.get("results", {})
    if isinstance(results, list):
        results = results[0].get("content", {}) if results else {}
    return results if isinstance(results, dict) else {}


def _fetch_decodo_universal_reviews(asin: str, amazon_domain: str, max_reviews: int) -> list:
    """
    Fallback: pide el HTML de /product-reviews/ via target=universal
    y lo parsea con BeautifulSoup.
    """
    auth = _get_decodo_auth()
    if not auth:
        return []

    country = _domain_to_country(amazon_domain)
    reviews_url = _build_amazon_reviews_url(asin, amazon_domain)
    all_reviews = []
    pages_needed = max(1, (max_reviews + 9) // 10)

    for page in range(1, min(pages_needed + 1, 4)):
        if len(all_reviews) >= max_reviews:
            break

        page_url = reviews_url if page == 1 else f"{reviews_url}&pageNumber={page}"

        payload = {
            "target": "amazon",  # Cambia "universal" por "amazon"                          AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
            "url": page_url,
            "country": country,
            "parse": False,      # Esto asegura que Decodo devuelva el HTML crudo
        }

        try:
            response = httpx.post(
                "https://scraper-api.decodo.com/v2/scrape",
                json=payload,
                auth=auth,
                timeout=90.0,
            )
            logger.info(
                "Decodo universal reviews page %d status: %d", page, response.status_code
            )

            if response.status_code != 200:
                logger.warning(
                    "Decodo universal error: %d — %s",
                    response.status_code,
                    response.text[:200],
                )
                break

            data = response.json()
            results = data.get("results", {})
            if isinstance(results, list):
                html = results[0].get("content", "") if results else ""
            else:
                html = results.get("content", "")

            if not html or not isinstance(html, str):
                logger.warning("Decodo universal: content vacío en página %d", page)
                break

            logger.info("Decodo universal HTML size: %d chars", len(html))
            page_reviews = _parse_reviews_html(html, max_reviews - len(all_reviews))
            logger.info("Reviews parseadas de página %d: %d", page, len(page_reviews))

            if not page_reviews:
                break

            all_reviews.extend(page_reviews)

        except httpx.HTTPError as e:
            logger.warning("Error de red Decodo universal page %d: %s", page, e)
            break

    return all_reviews


def _parse_product_from_decodo(content: dict, product_url: str, asin: str) -> dict:
    """
    Mapea el JSON de Decodo amazon_product al formato interno.
    Estructura confirmada por el JSON real devuelto.
    """
    # Título: puede estar en "title" o "product_name"
    title = (
        content.get("title") or
        content.get("product_name") or
        "Producto sin título"
    )

    # Rating: viene como número directo (ej. 4)
    rating = _normalize_rating(content.get("rating"))

    # Imagen: viene como lista en "images"
    images = content.get("images") or []
    image_url = images[0] if images else ""

    # Precio: viene en "price" (puede ser 0 o -1 si no disponible)
    price_val = content.get("price") or content.get("price_buybox") or 0
    price = str(price_val) if price_val and price_val > 0 else ""

    # Descripción: viene en "description" (string) y "bullet_points" (string con \n)
    description_parts = []
    desc = content.get("description") or ""
    bullets = content.get("bullet_points") or ""
    if bullets:
        description_parts = [
            _clean_text(b) for b in bullets.split("\n") if _clean_text(b)
        ]
    elif desc:
        description_parts = [_clean_text(desc)]
    description = " ".join(description_parts[:5])  # primeros 5 bullets

    amazon_domain = extract_amazon_domain(product_url)

    return {
        "asin": asin,
        "product_url": product_url,
        "product_title": _clean_text(str(title)),
        "price": price,
        "image_url": image_url,
        "description": description,
        "rating": rating,
        "amazon_domain": amazon_domain,
    }


def _parse_reviews_html(html: str, max_reviews: int) -> list:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    reviews = []

    review_tags = soup.find_all("div", {"data-hook": "review"})
    logger.info("data-hook=review encontrados: %d", len(review_tags))

    if not review_tags:
        review_tags = soup.find_all("div", {"id": re.compile(r"^customer_review")})
        logger.info("customer_review divs encontrados: %d", len(review_tags))

    for tag in review_tags[:max_reviews]:
        rating_tag = tag.find("span", class_="a-icon-alt")
        rating_raw = rating_tag.get_text() if rating_tag else ""
        rating = _normalize_rating(rating_raw) or ""

        title_tag = tag.find("a", {"data-hook": "review-title"})
        if not title_tag:
            title_tag = tag.find("span", {"data-hook": "review-title"})
        title = _clean_text(title_tag.get_text()) if title_tag else ""

        body_tag = tag.find("span", {"data-hook": "review-body"})
        body = _clean_text(body_tag.get_text()) if body_tag else ""

        date_tag = tag.find("span", {"data-hook": "review-date"})
        date = _clean_text(date_tag.get_text()) if date_tag else ""

        author_tag = tag.find("span", class_="a-profile-name")
        author = _clean_text(author_tag.get_text()) if author_tag else ""

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
    max_reviews = max(1, min(int(max_reviews), 50))

    # 1. Datos del producto + reseñas embebidas via amazon_product
    logger.info("Obteniendo producto con Decodo: ASIN=%s", asin)
    content = _fetch_decodo_product(asin, amazon_domain)
    product_data = _parse_product_from_decodo(content, product_url, asin)
    logger.info(
        "Producto: %s | Rating: %s",
        product_data.get("product_title"),
        product_data.get("rating"),
    )

    # 2. Extraer reseñas embebidas en el JSON del producto
    reviews = _extract_reviews_from_content(content, max_reviews)
    logger.info("Reviews embebidas en amazon_product: %d", len(reviews))

    # 3. Si necesitamos más reseñas, intentar amazon_reviews (puede dar 410 en free)
    if len(reviews) < max_reviews:
        try:
            extra_content = _fetch_decodo_reviews_page(asin, amazon_domain, page=1)
            if extra_content:
                extra = _extract_reviews_from_content(extra_content, max_reviews - len(reviews))
                logger.info("Reviews adicionales de amazon_reviews: %d", len(extra))
                # Evitar duplicados por id
                existing_ids = {r.get("title") + r.get("author") for r in reviews}
                for r in extra:
                    if r.get("title") + r.get("author") not in existing_ids:
                        reviews.append(r)
        except Exception as e:
            logger.warning("amazon_reviews falló, continuando: %s", e)

    # 4. Si aún no hay suficientes, fallback HTML via universal
    if len(reviews) < min(3, max_reviews):                              
        logger.info("Fallback: obteniendo HTML de /product-reviews/...")
        html_reviews = _fetch_decodo_universal_reviews(asin, amazon_domain, max_reviews)
        if html_reviews:
            reviews = html_reviews
            logger.info("Reviews del fallback HTML: %d", len(reviews))

    logger.info("Total reviews finales: %d", len(reviews))
    product_data["reviews"] = reviews[:max_reviews]
    product_data["count"] = len(reviews[:max_reviews])

    return product_data