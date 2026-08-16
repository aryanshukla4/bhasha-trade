from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db import get_session
from app.models import BarterRequest, ChatLog, Notification, Order, ProduceListing, User
from app.schemas import (
    BarterConfirmRequest,
    BarterConnectRequest,
    BarterParseRequest,
    BarterRequestCreate,
    ChatAskRequest,
    CropDetectRequest,
    InterestRequest,
    LanguageUpdateRequest,
    NotificationSubscribeRequest,
    ProduceCreateRequest,
    ProduceUpdateRequest,
    ReviewCreateRequest,
    TextToVoiceRequest,
    VoiceToTextRequest,
)
from app.services.domain_service import DomainService, dto, ident, own

router = APIRouter(tags=['business'])
service = DomainService()


def user(claims=Depends(decode_token), s: Session = Depends(get_session)):
    value = s.get(User, claims['sub'])
    if not value:
        raise HTTPException(401, 'User no longer exists')
    return value


def data(x):
    return {'data': x}


@router.get('/health')
def health():
    return data({'status': 'ok', 'service': 'bhasha-trade-fastapi'})


@router.get('/api/languages')
def languages():
    return data([
        {'code': 'hi', 'name': 'Hindi'},
        {'code': 'en', 'name': 'English'},
        {'code': 'mr', 'name': 'Marathi'},
        {'code': 'ta', 'name': 'Tamil'},
        {'code': 'te', 'name': 'Telugu'},
    ])


@router.put('/api/user/language')
def language(body: LanguageUpdateRequest, u=Depends(user), s: Session = Depends(get_session)):
    u.preferred_language = body.language
    s.commit()
    return data({'preferredLanguage': u.preferred_language})


@router.get('/api/market/prices')
def prices(commodity: str | None = None, state: str | None = None, district: str | None = None, s: Session = Depends(get_session)):
    return data(service.prices(s, commodity, state, district))


@router.get('/api/market/trends/{commodity}')
def trends(commodity: str, s: Session = Depends(get_session)):
    return data(service.prices(s, commodity))


@router.get('/api/market/nearby-mandis')
def nearby(lat: float, lon: float, s: Session = Depends(get_session)):
    return data(service.prices(s)[:3])


@router.post('/api/produce', status_code=201)
def create_produce(body: ProduceCreateRequest, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.create_listing(s, u, body.model_dump(exclude_none=True)))


@router.get('/api/produce')
def produce(cropType: str | None = None, state: str | None = None, s: Session = Depends(get_session)):
    q = select(ProduceListing).where(ProduceListing.status == 'active')
    if cropType:
        q = q.where(ProduceListing.crop_type.ilike(cropType))
    if state:
        q = q.where(ProduceListing.state.ilike(state))
    return data([dto(x) for x in s.scalars(q)])


@router.get('/api/produce/{item_id}')
def get_produce(item_id: str, s: Session = Depends(get_session)):
    return data(dto(service.listing(s, item_id)))


@router.put('/api/produce/{item_id}')
def update_produce(item_id: str, body: ProduceUpdateRequest, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.update_listing(s, u, item_id, body.model_dump(exclude_none=True)))


@router.delete('/api/produce/{item_id}', status_code=204)
def delete_produce(item_id: str, u=Depends(user), s: Session = Depends(get_session)):
    item = service.listing(s, item_id)
    own(u, item.farmer_id)
    item.status = 'cancelled'
    for order in s.scalars(select(Order).where(Order.listing_id == item_id, Order.status.in_(['pending', 'accepted']))):
        order.status = 'cancelled'
    s.commit()


@router.post('/api/produce/{item_id}/interest', status_code=201)
def interest(item_id: str, body: InterestRequest, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.interest(s, u, item_id, body.model_dump(exclude_none=True)))


@router.get('/api/orders')
def orders(u=Depends(user), s: Session = Depends(get_session)):
    return data(service.orders(s, u))


@router.get('/api/orders/{item_id}')
def order(item_id: str, u=Depends(user), s: Session = Depends(get_session)):
    x = s.get(Order, item_id)
    if not x:
        raise HTTPException(404, 'Order not found')
    if u.id not in (x.buyer_id, x.farmer_id) and u.role != 'admin':
        raise HTTPException(403, 'Not permitted')
    return data(dto(x))


@router.post('/api/orders/{item_id}/accept')
def accept(item_id: str, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.order_action(s, u, item_id, 'accept'))


@router.post('/api/orders/{item_id}/complete')
def complete(item_id: str, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.order_action(s, u, item_id, 'complete'))


@router.post('/api/orders/{item_id}/reject')
def reject(item_id: str, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.order_action(s, u, item_id, 'reject'))


@router.post('/api/orders/{item_id}/cancel')
def cancel(item_id: str, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.order_action(s, u, item_id, 'cancel'))


@router.post('/api/barter/parse-request')
def parse_barter(body: BarterParseRequest, u=Depends(user)):
    return data(service.parse_barter(body.text))


@router.post('/api/barter/request', status_code=201)
def barter_request(body: BarterRequestCreate, u=Depends(user), s: Session = Depends(get_session)):
    x = BarterRequest(
        id=ident('barter'),
        farmer_id=u.id,
        item_wanted=body.itemWanted,
        qty_wanted=body.qtyWanted,
        item_offered=body.itemOffered,
        qty_offered=body.qtyOffered,
        raw_query_text=body.rawQueryText,
    )
    s.add(x)
    s.commit()
    return data(dto(x))


@router.get('/api/barter/history')
def barter_history(u=Depends(user), s: Session = Depends(get_session)):
    return data([dto(x) for x in s.scalars(select(BarterRequest).where(BarterRequest.farmer_id == u.id))])


@router.get('/api/barter/dealers')
def barter_dealers(item: str | None = None, location: str | None = None, s: Session = Depends(get_session)):
    return data(service.dealers(s, item, location))


@router.get('/api/barter/matches/{request_id}')
def barter_matches(request_id: str, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.barter_matches(s, u, request_id))


@router.post('/api/barter/{request_id}/connect')
def barter_connect(request_id: str, body: BarterConnectRequest, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.barter_connect(s, u, request_id, body.dealerId))


@router.post('/api/barter/{request_id}/confirm')
def barter_confirm(request_id: str, body: BarterConfirmRequest, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.barter_confirm(s, u, request_id, body.dealerId))


@router.post('/api/chat/ask')
def ask(body: ChatAskRequest, u=Depends(user), s: Session = Depends(get_session)):
    text = body.text or body.transcript
    if not text:
        raise HTTPException(422, 'text or transcript is required')
    payload = {'text': text, 'language': body.language} if body.language else {'text': text}
    return data(service.ask(s, u, payload))


@router.get('/api/chat/history')
def chat_history(u=Depends(user), s: Session = Depends(get_session)):
    return data([dto(x) for x in s.scalars(select(ChatLog).where(ChatLog.user_id == u.id))])


@router.post('/api/chat/voice-to-text')
def voice(body: VoiceToTextRequest, u=Depends(user)):
    return data({'text': body.transcript, 'language': body.language or u.preferred_language})


@router.post('/api/chat/text-to-voice')
def tts(body: TextToVoiceRequest, u=Depends(user)):
    return data({'text': body.text, 'language': body.language or u.preferred_language, 'audioUrl': None})


@router.post('/api/crop/detect-disease', status_code=202)
def crop(body: CropDetectRequest, u=Depends(user)):
    return data({'photoUrl': body.photoUrl, 'diagnosis': 'Analysis provider not configured', 'confidence': None})


@router.get('/api/crop/advisory/{crop_type}')
def crop_advisory(crop_type: str, u=Depends(user)):
    return data({'cropType': crop_type, 'advisory': 'Maintain field hygiene and inspect leaves weekly.', 'source': 'ICAR / local KVK'})


@router.get('/api/weather')
def weather(lat: float, lon: float):
    return data({'location': {'lat': lat, 'lon': lon}, 'provider': 'demo', 'alerts': []})


@router.get('/api/schemes')
def schemes():
    return data([{'id': 'pm-kisan', 'name': 'PM-KISAN'}, {'id': 'pmfby', 'name': 'PM Fasal Bima Yojana'}])


@router.get('/api/schemes/{scheme_id}')
def scheme(scheme_id: str):
    return data({'id': scheme_id, 'description': 'Verify eligibility against the official government portal.'})


@router.post('/api/schemes/{scheme_id}/check-eligibility')
def eligibility(scheme_id: str, u=Depends(user)):
    return data({'schemeId': scheme_id, 'eligible': None, 'requiresReview': True})


@router.get('/api/reviews/{user_id}')
def reviews(user_id: str, s: Session = Depends(get_session)):
    return data(service.reviews_for(s, user_id))


@router.post('/api/reviews', status_code=201)
def create_review(body: ReviewCreateRequest, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.create_review(s, u, body.model_dump(exclude_none=True)))


@router.get('/api/users/{user_id}/verification-status')
def verification_status(user_id: str, s: Session = Depends(get_session)):
    return data(service.verification_status(s, user_id))


@router.get('/api/notifications')
def notifications(u=Depends(user), s: Session = Depends(get_session)):
    return data([dto(x) for x in s.scalars(select(Notification).where(Notification.user_id == u.id))])


@router.post('/api/notifications/subscribe', status_code=201)
def subscribe(body: NotificationSubscribeRequest, u=Depends(user), s: Session = Depends(get_session)):
    return data(service.subscribe(s, u, body.endpoint))
