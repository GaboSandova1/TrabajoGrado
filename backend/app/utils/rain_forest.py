import logging

import httpx

from app.config import settings
from app.utils.amazon import extract_asin, extract_amazon_domain
from app.utils.rainforest_keys import is_quota_exhausted, key_rotator, should_try_next_key

logger = logging.getLogger(__name__)


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


def _parse_product_payload(payload: dict, product_url: str, asin: str, max_reviews: int) -> dict:
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
        "amazon_domain": extract_amazon_domain(product_url),
    }


def _fetch_with_key(
    product_url: str,
    max_reviews: int,
    asin: str,
    amazon_domain: str,
    api_key: str,
) -> dict:
    params = {
        "api_key": api_key,
        "type": "product",
        "amazon_domain": amazon_domain,
        "asin": asin,
    }

    response = httpx.get(settings.RAINFOREST_ENDPOINT, params=params, timeout=60.0)
    response.raise_for_status()
    payload = response.json()
    return _parse_product_payload(payload, product_url, asin, max_reviews)


def fetch_product_payload(product_url: str, max_reviews: int = 10) -> dict:
    keys_to_try = key_rotator.keys_for_attempt()
    if not keys_to_try:
        raise ValueError(
            "No hay API keys de Rainforest configuradas. "
            "Agrega RAINFOREST_API_KEY (y opcionalmente _2, _3) en el .env."
        )

    asin = extract_asin(product_url)
    if not asin:
        raise ValueError("No se pudo extraer el ASIN de la URL")

    amazon_domain = extract_amazon_domain(product_url)
    max_reviews = max(1, min(int(max_reviews), 50))

    last_error: Exception | None = None

    for index, api_key in enumerate(keys_to_try):
        try:
            logger.info(
                "Rainforest request con clave …%s (%s/%s)",
                api_key[-4:],
                index + 1,
                len(keys_to_try),
            )
            return _fetch_with_key(product_url, max_reviews, asin, amazon_domain, api_key)
        except httpx.HTTPStatusError as exc:
            last_error = exc
            response = exc.response

            if should_try_next_key(response) and index < len(keys_to_try) - 1:
                if is_quota_exhausted(response):
                    key_rotator.mark_exhausted(api_key)
                else:
                    logger.warning(
                        "Rainforest clave …%s respondió %s, probando siguiente clave.",
                        api_key[-4:],
                        response.status_code,
                    )
                continue

            response.raise_for_status()
        except Exception as exc:
            last_error = exc
            raise

    raise ValueError(
        "Todas las API keys de Rainforest están agotadas o fallaron. "
        "Configura claves adicionales (RAINFOREST_API_KEY_2, RAINFOREST_API_KEY_3) "
        "o espera la renovación del plan."
    ) from last_error
