"""Typed request bodies for the HTTP layer. Response shapes stay as plain dicts
(via dto()/serialize()) so the {"data": ...} envelope contract is unaffected."""
from typing import Literal

from pydantic import BaseModel, Field


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    name: str | None = None
    role: Literal["farmer", "buyer", "dealer"] = "farmer"
    preferredLanguage: str = "hi"


class RefreshRequest(BaseModel):
    refreshToken: str


class LogoutRequest(BaseModel):
    refreshToken: str | None = None


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    role: Literal["farmer", "buyer", "dealer"] | None = None
    preferredLanguage: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    location: str | None = None


class LanguageUpdateRequest(BaseModel):
    language: str


class ProduceCreateRequest(BaseModel):
    cropType: str
    quantity: float = Field(gt=0)
    unit: str
    pricePerUnit: float = Field(gt=0)
    description: str | None = None
    photoUrl: str | None = None
    state: str | None = None
    district: str | None = None


class ProduceUpdateRequest(BaseModel):
    cropType: str | None = None
    quantity: float | None = Field(default=None, gt=0)
    unit: str | None = None
    pricePerUnit: float | None = Field(default=None, gt=0)
    description: str | None = None
    photoUrl: str | None = None
    state: str | None = None
    district: str | None = None
    status: str | None = None


class InterestRequest(BaseModel):
    quantity: float | None = Field(default=None, gt=0)
    offeredPrice: float | None = Field(default=None, gt=0)
    deliveryAddress: str | None = None
    paymentMethod: str | None = None
    notes: str | None = None


class BarterParseRequest(BaseModel):
    text: str


class BarterRequestCreate(BaseModel):
    itemWanted: str
    itemOffered: str
    qtyWanted: float | None = None
    qtyOffered: float | None = None
    rawQueryText: str | None = None


class BarterConnectRequest(BaseModel):
    dealerId: str


class BarterConfirmRequest(BaseModel):
    dealerId: str


class ReviewCreateRequest(BaseModel):
    toUserId: str
    orderId: str | None = None
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ChatAskRequest(BaseModel):
    text: str | None = None
    transcript: str | None = None
    language: str | None = None


class VoiceToTextRequest(BaseModel):
    transcript: str
    language: str | None = None


class TextToVoiceRequest(BaseModel):
    text: str
    language: str | None = None


class NotificationSubscribeRequest(BaseModel):
    endpoint: str
