from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_user_optional
from app.db.session import get_db
from app.models.user import User
from app.schemas.advertising import (
    AdCampaignCreate,
    AdCampaignReportResponse,
    AdCampaignResponse,
    AdClickRequest,
    AdClickResponse,
    AdCreativeResponse,
    AdImpressionRequest,
    AdServeResponse,
)
from app.services.advertising_service import (
    create_campaign,
    get_campaign_report,
    list_campaigns,
    record_click,
    record_impression,
    serve_ad,
)

router = APIRouter(prefix="/ads", tags=["Advertising"])


@router.get(
    "/serve",
    response_model=AdServeResponse | None,
    status_code=status.HTTP_200_OK,
    summary="Serve an ad creative",
    description="Selects an active ad creative matching placement rules, issues a signed event token, and logs serve event.",
)
def serve_ad_endpoint(
    request: Request,
    placement: str = Query("banner_overlay", description="Target placement: banner_overlay, sidebar_card, feed_card"),
    video_id: int | None = Query(None, description="Optional target video ID context"),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> AdServeResponse | None:
    """
    Public ad serving endpoint. Returns creative metadata and tamper-evident event token.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_id = current_user.id if current_user else None

    ad_data = serve_ad(
        db=db,
        placement_type=placement,
        video_id=video_id,
        client_ip=client_ip,
        user_id=user_id,
    )
    if not ad_data:
        return None

    return AdServeResponse(**ad_data)


@router.post(
    "/impression",
    status_code=status.HTTP_200_OK,
    summary="Record verified ad impression",
    description="Verifies signed event token and records a server-validated impression when viewport criteria is satisfied.",
)
def record_impression_endpoint(
    request: Request,
    payload: AdImpressionRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> dict[str, bool]:
    """
    Records a verified impression. Prevents duplicate logging for the same event token.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_id = current_user.id if current_user else None

    try:
        result = record_impression(
            db=db,
            event_token=payload.event_token,
            client_ip=client_ip,
            user_id=user_id,
            viewport_duration_ms=payload.viewport_duration_ms,
        )
        return result
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )


@router.post(
    "/click",
    response_model=AdClickResponse,
    status_code=status.HTTP_200_OK,
    summary="Record ad click and retrieve destination URL",
    description="Validates that a prior impression occurred, checks rate limits, logs click event, and returns destination URL.",
)
def record_click_endpoint(
    request: Request,
    payload: AdClickRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> AdClickResponse:
    """
    Records a verified click event.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_id = current_user.id if current_user else None

    try:
        result = record_click(
            db=db,
            event_token=payload.event_token,
            client_ip=client_ip,
            user_id=user_id,
        )
        return AdClickResponse(**result)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )


@router.get(
    "/campaigns",
    response_model=list[AdCampaignResponse],
    status_code=status.HTTP_200_OK,
    summary="List advertiser campaigns",
    description="Lists prototype campaigns with creatives for authenticated user or admin.",
)
def list_campaigns_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[AdCampaignResponse]:
    """
    Lists campaigns with their creatives.
    """
    advertiser_id = None if current_user.is_admin else current_user.id
    campaigns = list_campaigns(db=db, advertiser_id=advertiser_id)

    response = []
    for c in campaigns:
        creatives_resp = [
            AdCreativeResponse(
                id=cr.id,
                campaign_id=cr.campaign_id,
                title=cr.title,
                headline=cr.headline,
                body_text=cr.body_text,
                media_url=cr.media_url,
                destination_url=cr.destination_url,
                placement_type=cr.placement_type,
                is_active=cr.is_active,
                created_at=cr.created_at,
            )
            for cr in c.creatives
        ]
        response.append(
            AdCampaignResponse(
                id=c.id,
                advertiser_id=c.advertiser_id,
                title=c.title,
                status=c.status,
                budget_algo=c.budget_algo,
                spent_algo=c.spent_algo,
                start_date=c.start_date,
                end_date=c.end_date,
                created_at=c.created_at,
                creatives=creatives_resp,
            )
        )
    return response


@router.post(
    "/campaigns",
    response_model=AdCampaignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a prototype advertising campaign",
    description="Registers an advertiser campaign with budget ceiling and associated creatives.",
)
def create_campaign_endpoint(
    payload: AdCampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AdCampaignResponse:
    """
    Creates an advertising campaign.
    """
    campaign = create_campaign(db=db, advertiser_id=current_user.id, payload=payload)
    creatives_resp = [
        AdCreativeResponse(
            id=cr.id,
            campaign_id=cr.campaign_id,
            title=cr.title,
            headline=cr.headline,
            body_text=cr.body_text,
            media_url=cr.media_url,
            destination_url=cr.destination_url,
            placement_type=cr.placement_type,
            is_active=cr.is_active,
            created_at=cr.created_at,
        )
        for cr in campaign.creatives
    ]
    return AdCampaignResponse(
        id=campaign.id,
        advertiser_id=campaign.advertiser_id,
        title=campaign.title,
        status=campaign.status,
        budget_algo=campaign.budget_algo,
        spent_algo=campaign.spent_algo,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        created_at=campaign.created_at,
        creatives=creatives_resp,
    )


@router.get(
    "/campaigns/{campaign_id}/report",
    response_model=AdCampaignReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get campaign performance report",
    description="Aggregates serves, verified impressions, clicks, click-through rate (CTR%), and calculated spend.",
)
def get_campaign_report_endpoint(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AdCampaignReportResponse:
    """
    Returns analytics report for a campaign.
    """
    try:
        report = get_campaign_report(db=db, campaign_id=campaign_id)
        return AdCampaignReportResponse(**report)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err),
        )
