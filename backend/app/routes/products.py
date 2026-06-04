from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app import auth, models
from app.db import get_session
from app.utils import groq, rain_forest

router = APIRouter()


class AnalyzeRequest(BaseModel):
    product_url: str
    review_count: int = 10


class CompareRequest(BaseModel):
    product_url_1: str
    product_url_2: str
    review_count: int = 10


def _save_analysis_history(
    session: Session,
    user: models.User,
    *,
    action_type: str,
    product_name: str,
    product_url: str,
    rating: float | None = None,
    review_count: int = 10,
    product_name_2: str | None = None,
    product_url_2: str | None = None,
    rating_1: float | None = None,
    rating_2: float | None = None,
    recommendation: str | None = None,
) -> None:
    session.add(
        models.ProductHistory(
            user_id=user.id,
            action_type=action_type,
            product_name=product_name,
            product_url=product_url,
            product_name_2=product_name_2,
            product_url_2=product_url_2,
            rating=rating,
            rating_1=rating_1,
            rating_2=rating_2,
            review_count_requested=review_count,
            recommendation=recommendation,
        )
    )
    session.commit()


@router.post("/analyze")
def analyze_product(
    payload: AnalyzeRequest,
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    product_url = payload.product_url.strip()
    if not product_url:
        raise HTTPException(status_code=400, detail="product_url is required")

    review_count = max(1, min(int(payload.review_count or 10), 50))

    try:
        scraped = rain_forest.fetch_product_payload(product_url, review_count)
        result = groq.analyze_product(scraped, review_count)
        _save_analysis_history(
            session,
            user,
            action_type="analysis",
            product_name=result["productName"],
            product_url=result["productUrl"],
            rating=result.get("rating"),
            review_count=review_count,
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/compare")
def compare_products(
    payload: CompareRequest,
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    url_1 = payload.product_url_1.strip()
    url_2 = payload.product_url_2.strip()
    if not url_1 or not url_2:
        raise HTTPException(status_code=400, detail="product_url_1 and product_url_2 are required")
    if url_1 == url_2:
        raise HTTPException(status_code=400, detail="URLs must be different")

    review_count = max(1, min(int(payload.review_count or 10), 50))

    try:
        product_a = rain_forest.fetch_product_payload(url_1, review_count)
        product_b = rain_forest.fetch_product_payload(url_2, review_count)
        analysis_a = groq.analyze_product(product_a, review_count)
        analysis_b = groq.analyze_product(product_b, review_count)
        comparison = groq.compare_products(product_a, product_b, analysis_a, analysis_b)

        _save_analysis_history(
            session,
            user,
            action_type="comparison",
            product_name=comparison["product1"]["name"],
            product_url=url_1,
            product_name_2=comparison["product2"]["name"],
            product_url_2=url_2,
            rating_1=comparison["product1"].get("rating"),
            rating_2=comparison["product2"].get("rating"),
            review_count=review_count,
            recommendation=comparison.get("recommendation"),
        )
        return comparison
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
