import json
import re

import httpx

from app.config import settings

ANALYSIS_SYSTEM_PROMPT = (
    "Eres un analista experto de reseñas de Amazon. "
    "Responde ÚNICAMENTE con JSON válido en español, sin markdown. "
    "Campos obligatorios: summary (string), rating (número 1-5), "
    "positiveAspects (array de strings), negativeAspects (array de strings), "
    "keyInsights (array de strings, puede estar vacío)."
)

COMPARE_SYSTEM_PROMPT = (
    "Eres un analista que compara dos productos de Amazon según sus reseñas. "
    "Responde ÚNICAMENTE con JSON válido en español, sin markdown. "
    "Campos: bestChoice (string), recommendation (string), "
    "product1 { name, rating, price, pros[], cons[], imageUrl }, "
    "product2 { name, rating, price, pros[], cons[], imageUrl }."
)


def _extract_json(text: str) -> dict:
    text = (text or "").strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}
    return {}


def _chat_completion(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
    if not settings.GROQ_API_KEY:
        raise ValueError("Groq API key missing")

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    response = httpx.post(settings.GROQ_ENDPOINT, json=payload, headers=headers, timeout=90.0)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


def _build_reviews_context(reviews: list, limit: int = 8) -> str:
    snippets = []
    for index, review in enumerate(reviews[:limit]):
        body = (review.get("body") or "").strip()
        if not body:
            continue
        rating = review.get("rating") or "?"
        snippets.append(f"Reseña {index + 1} (★{rating}): {body[:400]}")
    return "\n".join(snippets)


def analyze_product(product: dict, review_count: int) -> dict:
    reviews = (product.get("reviews") or [])[:review_count]
    user_prompt = (
        f"Producto: {product.get('product_title', '')}\n"
        f"Descripción: {(product.get('description') or '')[:2000]}\n"
        f"Valoración Amazon: {product.get('rating')}\n"
        f"Reseñas ({len(reviews)}):\n{_build_reviews_context(reviews)}\n"
    )
    raw = _chat_completion(ANALYSIS_SYSTEM_PROMPT, user_prompt)
    parsed = _extract_json(raw)

    rating = parsed.get("rating")
    if rating is None:
        rating = product.get("rating") or 0
    try:
        rating = round(float(rating), 1)
    except (TypeError, ValueError):
        rating = product.get("rating") or 0

    positives = parsed.get("positiveAspects") or []
    negatives = parsed.get("negativeAspects") or []
    insights = parsed.get("keyInsights") or []

    return {
        "productName": product.get("product_title") or "",
        "productUrl": product.get("product_url") or "",
        "rating": rating,
        "reviewCount": len(reviews),
        "summary": parsed.get("summary") or "",
        "positiveAspects": [str(item) for item in positives][:6],
        "negativeAspects": [str(item) for item in negatives][:6],
        "keyInsights": [str(item) for item in insights][:6],
        "imageUrl": product.get("image_url") or "",
        "price": product.get("price") or "",
    }


def compare_products(product_a: dict, product_b: dict, analysis_a: dict, analysis_b: dict) -> dict:
    user_prompt = (
        f"Producto 1: {analysis_a.get('productName')}\n"
        f"URL: {analysis_a.get('productUrl')}\n"
        f"Precio: {product_a.get('price')}\n"
        f"Imagen: {product_a.get('image_url')}\n"
        f"Rating: {analysis_a.get('rating')}\n"
        f"Resumen: {analysis_a.get('summary')}\n"
        f"Pros: {analysis_a.get('positiveAspects')}\n"
        f"Contras: {analysis_a.get('negativeAspects')}\n\n"
        f"Producto 2: {analysis_b.get('productName')}\n"
        f"URL: {analysis_b.get('productUrl')}\n"
        f"Precio: {product_b.get('price')}\n"
        f"Imagen: {product_b.get('image_url')}\n"
        f"Rating: {analysis_b.get('rating')}\n"
        f"Resumen: {analysis_b.get('summary')}\n"
        f"Pros: {analysis_b.get('positiveAspects')}\n"
        f"Contras: {analysis_b.get('negativeAspects')}\n"
    )
    raw = _chat_completion(COMPARE_SYSTEM_PROMPT, user_prompt, temperature=0.3)
    parsed = _extract_json(raw)

    def _product_block(key: str, fallback_name: str, fallback: dict, source: dict) -> dict:
        block = parsed.get(key) or {}
        return {
            "name": block.get("name") or fallback.get("productName") or fallback_name,
            "rating": block.get("rating") or fallback.get("rating") or 0,
            "price": block.get("price") or source.get("price") or "",
            "pros": block.get("pros") or fallback.get("positiveAspects") or [],
            "cons": block.get("cons") or fallback.get("negativeAspects") or [],
            "imageUrl": block.get("imageUrl") or source.get("image_url") or "",
        }

    return {
        "bestChoice": parsed.get("bestChoice") or analysis_a.get("productName") or "Producto 1",
        "recommendation": parsed.get("recommendation") or "",
        "product1": _product_block("product1", "Producto 1", analysis_a, product_a),
        "product2": _product_block("product2", "Producto 2", analysis_b, product_b),
    }
