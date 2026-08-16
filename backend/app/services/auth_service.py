from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import hash_secret, issue_token, random_secret
from app.models import OtpCode, RefreshToken, User
from uuid import uuid4

def _aware(value: datetime) -> datetime:
    """SQLite drops tzinfo on round-trip even for DateTime(timezone=True) columns; Postgres keeps it."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

class AuthService:
    def send_otp(self, session: Session, phone: str) -> dict:
        code = '123456' if settings.app_env != 'production' else f'{__import__("secrets").randbelow(900000)+100000}'
        record = session.get(OtpCode, phone) or OtpCode(phone=phone, code_hash='', expires_at=datetime.now(timezone.utc))
        record.code_hash=hash_secret(code); record.expires_at=datetime.now(timezone.utc)+timedelta(minutes=10); record.attempts=0; session.add(record); session.commit()
        data={'message':'OTP sent','expiresInMinutes':10}
        if settings.app_env!='production': data['devOtp']=code
        return data
    def verify_otp(self, session: Session, body: dict) -> dict:
        record=session.get(OtpCode,body['phone'])
        now=datetime.now(timezone.utc)
        if not record or record.attempts>=5 or _aware(record.expires_at)<now or record.code_hash != hash_secret(body['otp']):
            if record: record.attempts+=1; session.commit()
            raise HTTPException(401,'Invalid or expired OTP')
        session.delete(record); user=session.scalar(select(User).where(User.phone==body['phone']))
        if not user:
            user=User(id=f'user_{uuid4().hex}',phone=body['phone'],name=body.get('name'),role=body.get('role','farmer'),preferred_language=body.get('preferredLanguage','hi')); session.add(user); session.flush()
        tokens=self._tokens(session,user); session.commit(); return {'user':self.serialize(user),**tokens}
    def refresh(self, session: Session, token: str) -> dict:
        record=session.scalar(select(RefreshToken).where(RefreshToken.token_hash==hash_secret(token),RefreshToken.revoked_at.is_(None)))
        if not record or _aware(record.expires_at)<datetime.now(timezone.utc): raise HTTPException(401,'Invalid refresh token')
        user=session.get(User,record.user_id); record.revoked_at=datetime.now(timezone.utc); tokens=self._tokens(session,user); session.commit(); return {'user':self.serialize(user),**tokens}
    def logout(self,session:Session,token:str):
        record=session.scalar(select(RefreshToken).where(RefreshToken.token_hash==hash_secret(token),RefreshToken.revoked_at.is_(None)))
        if record: record.revoked_at=datetime.now(timezone.utc); session.commit()
    def _tokens(self,session,user):
        refresh=random_secret(); session.add(RefreshToken(id=f'rt_{uuid4().hex}',user_id=user.id,token_hash=hash_secret(refresh),expires_at=datetime.now(timezone.utc)+timedelta(days=settings.refresh_token_days)))
        return {'accessToken':issue_token(user.id,user.role),'refreshToken':refresh,'tokenType':'bearer'}
    def serialize(self,user): return {'id':user.id,'phone':user.phone,'name':user.name,'role':user.role,'preferredLanguage':user.preferred_language,'verificationStatus':user.verification_status}
