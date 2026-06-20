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


def _chat_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2
) -> str:

    if not settings.GROQ_API_KEY:
        raise ValueError("Groq API key missing")

    print("\n==============================")
    print("MODELO:", settings.GROQ_MODEL)
    print("ENDPOINT:", settings.GROQ_ENDPOINT)
    print("==============================\n")

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        "temperature": temperature,
    }

    try:

        response = httpx.post(
            settings.GROQ_ENDPOINT,
            json=payload,
            headers=headers,
            timeout=90.0,
        )

        print("\n==============================")
        print("STATUS CODE:")
        print(response.status_code)
        print("==============================\n")

        print("\n==============================")
        print("RESPONSE TEXT:")
        print(response.text)
        print("==============================\n")

        response.raise_for_status()

        data = response.json()

        print("\n==============================")
        print("JSON RESPONSE:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        print("==============================\n")

        if "choices" not in data:
            raise Exception(
                f"Groq respondió algo inesperado:\n{json.dumps(data, indent=2, ensure_ascii=False)}"
            )

        return data["choices"][0]["message"]["content"]

    except Exception as e:
        print("\n==============================")
        print("EXCEPCION:")
        print(type(e))
        print(e)
        print("==============================\n")
        raise


def _build_reviews_context(reviews: list, limit: int = 6) -> str:
    snippets = []

    for index, review in enumerate(reviews[:limit]):
        body = (review.get("body") or "").strip()

        if not body:
            continue

        rating = review.get("rating") or "?"

        snippets.append(
            f"Reseña {index + 1} (★{rating}): {body[:300]}"
        )

    return "\n".join(snippets)


def analyze_product(product: dict, review_count: int) -> dict:

    reviews = (product.get("reviews") or [])[:review_count]

    user_prompt = (
        f"Producto: {product.get('product_title', '')}\n"
        f"Descripción: {(product.get('description') or '')[:1000]}\n"
        f"Valoración Amazon: {product.get('rating')}\n"
        f"Reseñas ({len(reviews)}):\n"
        f"{_build_reviews_context(reviews)}\n"
    )

    print("\n==============================")
    print("PROMPT ENVIADO A GROQ:")
    print(user_prompt)
    print("==============================\n")

    raw = _chat_completion(
        ANALYSIS_SYSTEM_PROMPT,
        user_prompt
    )

    print("\n==============================")
    print("RESPUESTA CRUDA DE GROQ:")
    print(raw)
    print("==============================\n")

    parsed = _extract_json(raw)

    rating = parsed.get("rating")

    if rating is None:
        rating = product.get("rating") or 0

    try:
        rating = round(float(rating), 1)
    except:
        rating = product.get("rating") or 0

    return {
        "productName": product.get("product_title", ""),
        "productUrl": product.get("product_url", ""),
        "rating": rating,
        "reviewCount": len(reviews),
        "summary": parsed.get("summary", ""),
        "positiveAspects": parsed.get("positiveAspects", []),
        "negativeAspects": parsed.get("negativeAspects", []),
        "keyInsights": parsed.get("keyInsights", []),
        "imageUrl": product.get("image_url", ""),
        "price": product.get("price", ""),
    }

def compare_products(
    product1: dict,
    product2: dict,
    analysis1: dict,
    analysis2: dict,
) -> dict:

    user_prompt = f"""
Producto 1:
Nombre: {analysis1["productName"]}
Precio: {analysis1["price"]}
Rating: {analysis1["rating"]}
Pros: {", ".join(analysis1["positiveAspects"])}
Contras: {", ".join(analysis1["negativeAspects"])}

Producto 2:
Nombre: {analysis2["productName"]}
Precio: {analysis2["price"]}
Rating: {analysis2["rating"]}
Pros: {", ".join(analysis2["positiveAspects"])}
Contras: {", ".join(analysis2["negativeAspects"])}
"""

    raw = _chat_completion(
        COMPARE_SYSTEM_PROMPT,
        user_prompt
    )

    parsed = _extract_json(raw)

    return {
        "bestChoice": parsed.get("bestChoice", ""),
        "recommendation": parsed.get("recommendation", ""),

        "product1": {
            "name": analysis1["productName"],
            "rating": analysis1["rating"],
            "price": analysis1["price"],
            "pros": analysis1["positiveAspects"],
            "cons": analysis1["negativeAspects"],
            "imageUrl": analysis1["imageUrl"],
        },

        "product2": {
            "name": analysis2["productName"],
            "rating": analysis2["rating"],
            "price": analysis2["price"],
            "pros": analysis2["positiveAspects"],
            "cons": analysis2["negativeAspects"],
            "imageUrl": analysis2["imageUrl"],
        },
    }