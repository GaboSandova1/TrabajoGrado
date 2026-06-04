import httpx

from app.config import settings
from app.utils.amazon import extract_asin, extract_amazon_domain


def _clean_review_text(text: str) -> str:
    return " ".join((text or "").split())


def _normalize_review(review: dict) -> dict:
    profile = review.get("profile") or {}
    date_info = review.get("date") or {}
    rating = review.get("rating")
    if rating is not None:
        try:
            rating = str(float(rating))
        except (TypeError, ValueError):
            rating = str(rating)
    return {
        "author": profile.get("name") or "",
        "rating": rating or "",
        "title": review.get("title") or "",
        "date": date_info.get("raw") or date_info.get("utc") or "",
        "body": _clean_review_text(review.get("body") or ""),
        "verified_purchase": bool(review.get("verified_purchase")),
    }


def _normalize_rating(value) -> float | None:
    if value is None:
        return None
    try:
        rating = float(value)
    except (TypeError, ValueError):
        return None
    if rating > 5:
        rating = rating / 2
    return round(max(0.0, min(5.0, rating)), 1)


def fetch_product_payload(product_url: str, max_reviews: int = 10) -> dict:
    if not settings.RAINFOREST_API_KEY:
        raise ValueError("Rainforest API key missing")

    asin = extract_asin(product_url)
    if not asin:
        raise ValueError("No se pudo extraer el ASIN de la URL")

    amazon_domain = extract_amazon_domain(product_url)
    max_reviews = max(1, min(int(max_reviews), 50))

    params = {
        "api_key": settings.RAINFOREST_API_KEY,
        "type": "product",
        "amazon_domain": amazon_domain,
        "asin": asin,
    }

    response = httpx.get(settings.RAINFOREST_ENDPOINT, params=params, timeout=60.0)
    response.raise_for_status()
    payload = response.json()

    product = payload.get("product") or {}
    raw_reviews = product.get("top_reviews") or payload.get("top_reviews") or []
    reviews = [
        _normalize_review(review)
        for review in raw_reviews[:max_reviews]
        if isinstance(review, dict)
    ]

    feature_bullets = product.get("feature_bullets") or []
    if isinstance(feature_bullets, list):
        description = " ".join(str(item).strip() for item in feature_bullets if str(item).strip())
    else:
        description = str(feature_bullets or "")

    if not description:
        description = product.get("description") or product.get("customers_say") or ""

    image_url = ""
    main_image = product.get("main_image") or {}
    if isinstance(main_image, dict):
        image_url = main_image.get("link") or ""

    price = ""
    buybox = product.get("buybox_winner") or {}
    if isinstance(buybox, dict):
        price_info = buybox.get("price") or {}
        if isinstance(price_info, dict):
            price = price_info.get("raw") or str(price_info.get("value") or "")

    return {
        "asin": asin,
        "product_url": product.get("link") or product_url,
        "product_title": product.get("title") or "Producto sin título",
        "price": price,
        "image_url": image_url,
        "description": description,
        "reviews": reviews,
        "count": len(reviews),
        "rating": _normalize_rating(product.get("rating")),
        "amazon_domain": amazon_domain,
    }
