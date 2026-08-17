from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

def utcnow(): return datetime.now(timezone.utc)
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__='users'
    id: Mapped[str]=mapped_column(String,primary_key=True); phone: Mapped[str]=mapped_column(String,unique=True,index=True)
    name: Mapped[str|None]=mapped_column(String); role: Mapped[str]=mapped_column(String,default='farmer'); preferred_language: Mapped[str]=mapped_column(String,default='hi')
    location: Mapped[str|None]=mapped_column(String); latitude: Mapped[float|None]=mapped_column(Float); longitude: Mapped[float|None]=mapped_column(Float)
    verification_status: Mapped[str]=mapped_column(String,default='phone_verified'); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class OtpCode(Base):
    __tablename__='otp_codes'; phone: Mapped[str]=mapped_column(String,primary_key=True); code_hash: Mapped[str]=mapped_column(String); expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True)); attempts: Mapped[int]=mapped_column(Integer,default=0)
class RefreshToken(Base):
    __tablename__='refresh_tokens'; id: Mapped[str]=mapped_column(String,primary_key=True); user_id: Mapped[str]=mapped_column(ForeignKey('users.id'),index=True); token_hash: Mapped[str]=mapped_column(String,unique=True); expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True)); revoked_at: Mapped[datetime|None]=mapped_column(DateTime(timezone=True)); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class ProduceListing(Base):
    __tablename__='produce_listings'; id: Mapped[str]=mapped_column(String,primary_key=True); farmer_id: Mapped[str]=mapped_column(ForeignKey('users.id'),index=True); crop_type: Mapped[str]=mapped_column(String,index=True); quantity: Mapped[float]=mapped_column(Float); unit: Mapped[str]=mapped_column(String); price_per_unit: Mapped[float]=mapped_column(Float); description: Mapped[str|None]=mapped_column(Text); photo_url: Mapped[str|None]=mapped_column(String); state: Mapped[str|None]=mapped_column(String); district: Mapped[str|None]=mapped_column(String); status: Mapped[str]=mapped_column(String,default='active'); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class Order(Base):
    __tablename__='orders'; id: Mapped[str]=mapped_column(String,primary_key=True); listing_id: Mapped[str]=mapped_column(ForeignKey('produce_listings.id')); buyer_id: Mapped[str]=mapped_column(ForeignKey('users.id')); farmer_id: Mapped[str]=mapped_column(ForeignKey('users.id')); agreed_price: Mapped[float]=mapped_column(Float); quantity: Mapped[float|None]=mapped_column(Float,nullable=True); total_price: Mapped[float|None]=mapped_column(Float,nullable=True); delivery_address: Mapped[str|None]=mapped_column(String,nullable=True); payment_method: Mapped[str|None]=mapped_column(String,nullable=True); notes: Mapped[str|None]=mapped_column(Text,nullable=True); status: Mapped[str]=mapped_column(String,default='pending'); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class MarketPrice(Base):
    __tablename__='market_prices'; id: Mapped[str]=mapped_column(String,primary_key=True); commodity: Mapped[str]=mapped_column(String,index=True); state: Mapped[str]=mapped_column(String); district: Mapped[str]=mapped_column(String); mandi_name: Mapped[str]=mapped_column(String); modal_price: Mapped[float]=mapped_column(Float); min_price: Mapped[float|None]=mapped_column(Float); max_price: Mapped[float|None]=mapped_column(Float); latitude: Mapped[float|None]=mapped_column(Float); longitude: Mapped[float|None]=mapped_column(Float); recorded_on: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class Dealer(Base):
    __tablename__='dealers'; id: Mapped[str]=mapped_column(String,primary_key=True); user_id: Mapped[str|None]=mapped_column(ForeignKey('users.id')); name: Mapped[str]=mapped_column(String); phone: Mapped[str|None]=mapped_column(String); location: Mapped[str|None]=mapped_column(String); items_available: Mapped[dict]=mapped_column(JSON,default=dict); verification_status: Mapped[str]=mapped_column(String,default='verified')
class BarterRequest(Base):
    __tablename__='barter_requests'; id: Mapped[str]=mapped_column(String,primary_key=True); farmer_id: Mapped[str]=mapped_column(ForeignKey('users.id')); item_wanted: Mapped[str]=mapped_column(String); qty_wanted: Mapped[float|None]=mapped_column(Float); item_offered: Mapped[str]=mapped_column(String); qty_offered: Mapped[float|None]=mapped_column(Float); raw_query_text: Mapped[str|None]=mapped_column(Text); status: Mapped[str]=mapped_column(String,default='open'); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class BarterMatch(Base):
    __tablename__='barter_matches'; id: Mapped[str]=mapped_column(String,primary_key=True); request_id: Mapped[str]=mapped_column(ForeignKey('barter_requests.id')); dealer_id: Mapped[str]=mapped_column(ForeignKey('dealers.id')); match_score: Mapped[float]=mapped_column(Float); status: Mapped[str]=mapped_column(String,default='suggested')
class ChatLog(Base):
    __tablename__='chat_logs'; id: Mapped[str]=mapped_column(String,primary_key=True); user_id: Mapped[str]=mapped_column(ForeignKey('users.id')); query: Mapped[str]=mapped_column(Text); response: Mapped[str]=mapped_column(Text); language: Mapped[str]=mapped_column(String); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class Review(Base):
    __tablename__='reviews'; id: Mapped[str]=mapped_column(String,primary_key=True); from_user_id: Mapped[str]=mapped_column(ForeignKey('users.id')); to_user_id: Mapped[str]=mapped_column(ForeignKey('users.id')); order_id: Mapped[str|None]=mapped_column(ForeignKey('orders.id')); rating: Mapped[int]=mapped_column(Integer); comment: Mapped[str|None]=mapped_column(Text); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class Notification(Base):
    __tablename__='notifications'; id: Mapped[str]=mapped_column(String,primary_key=True); user_id: Mapped[str]=mapped_column(ForeignKey('users.id')); type: Mapped[str]=mapped_column(String); title: Mapped[str]=mapped_column(String); body: Mapped[str]=mapped_column(Text); is_read: Mapped[bool]=mapped_column(Boolean,default=False); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
class PushSubscription(Base):
    __tablename__='push_subscriptions'; id: Mapped[str]=mapped_column(String,primary_key=True); user_id: Mapped[str]=mapped_column(ForeignKey('users.id'),index=True); endpoint: Mapped[str]=mapped_column(String,unique=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=utcnow)
