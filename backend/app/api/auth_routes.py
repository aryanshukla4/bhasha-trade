from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.core.security import decode_token
from app.db import get_session
from app.models import User
from app.schemas import (
    LogoutRequest,
    ProfileUpdateRequest,
    RefreshRequest,
    SendOtpRequest,
    VerifyOtpRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix='/api/auth', tags=['authentication'])
service = AuthService()


def valid_phone(value):
    if not value or not isinstance(value, str):
        raise HTTPException(422, 'Provide a valid phone number with country code')
    value = value.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    if not value.lstrip('+').isdigit() or not 10 <= len(value.lstrip('+')) <= 15:
        raise HTTPException(422, 'Provide a valid phone number with country code')
    return value


@router.post('/send-otp', status_code=202)
@limiter.limit('5/minute')
def send_otp(request: Request, body: SendOtpRequest, session: Session = Depends(get_session)):
    return {'data': service.send_otp(session, valid_phone(body.phone))}


@router.post('/verify-otp')
@limiter.limit('10/minute')
def verify_otp(request: Request, body: VerifyOtpRequest, session: Session = Depends(get_session)):
    payload = body.model_dump()
    payload['phone'] = valid_phone(payload['phone'])
    return {'data': service.verify_otp(session, payload)}


@router.post('/refresh')
def refresh(body: RefreshRequest, session: Session = Depends(get_session)):
    return {'data': service.refresh(session, body.refreshToken)}


@router.post('/logout', status_code=204)
def logout(body: LogoutRequest, session: Session = Depends(get_session)):
    if body.refreshToken:
        service.logout(session, body.refreshToken)


@router.get('/me')
def me(claims=Depends(decode_token), session: Session = Depends(get_session)):
    user = session.get(User, claims['sub'])
    if not user:
        raise HTTPException(401, 'User no longer exists')
    return {'data': service.serialize(user)}


@router.put('/profile')
def profile(body: ProfileUpdateRequest, claims=Depends(decode_token), session: Session = Depends(get_session)):
    user = session.get(User, claims['sub'])
    if not user:
        raise HTTPException(401, 'User no longer exists')
    mapping = {'preferredLanguage': 'preferred_language'}
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(user, mapping.get(key, key), value)
    session.commit()
    return {'data': service.serialize(user)}
