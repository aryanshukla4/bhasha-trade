from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session
from app.models import BarterMatch, BarterRequest, ChatLog, Dealer, MarketPrice, Notification, Order, ProduceListing, PushSubscription, Review, User
from app.services import chat_ai

def ident(prefix): return f'{prefix}_{uuid4().hex}'

def dto(row):
    if row is None:
        return None
    try:
        mapper = inspect(type(row))
        return {attr.key: getattr(row, attr.key) for attr in mapper.column_attrs}
    except Exception:
        return {key: value for key, value in row.__dict__.items() if not key.startswith('_')}

def own(user, owner_id):
    if user.id != owner_id and user.role != 'admin': raise HTTPException(403,'Not permitted')

class DomainService:
    def prices(self,s,commodity=None,state=None,district=None):
        q=select(MarketPrice)
        if commodity:q=q.where(MarketPrice.commodity.ilike(commodity))
        if state:q=q.where(MarketPrice.state.ilike(state))
        if district:q=q.where(MarketPrice.district.ilike(district))
        return [dto(x) for x in s.scalars(q)]
    def listing(self,s,item_id):
        item=s.get(ProduceListing,item_id)
        if not item: raise HTTPException(404,'Listing not found')
        return item
    def create_listing(self,s,user,b):
        if user.role!='farmer': raise HTTPException(403,'Only farmers can create produce listings')
        fields={'crop_type':b.get('cropType'),'quantity':b.get('quantity'),'unit':b.get('unit'),'price_per_unit':b.get('pricePerUnit')}
        if not all(fields.values()): raise HTTPException(422,'cropType, quantity, unit and pricePerUnit are required')
        item=ProduceListing(id=ident('listing'),farmer_id=user.id,description=b.get('description'),photo_url=b.get('photoUrl'),state=b.get('state'),district=b.get('district'),**fields);s.add(item);s.commit();return dto(item)
    def update_listing(self,s,user,item_id,b):
        item=self.listing(s,item_id);own(user,item.farmer_id)
        mapping={'cropType':'crop_type','pricePerUnit':'price_per_unit','photoUrl':'photo_url'}
        for key,value in b.items():
            if value is not None and hasattr(item,mapping.get(key,key)):setattr(item,mapping.get(key,key),value)
        s.commit();return dto(item)
    def orders(self,s,user): return [dto(x) for x in s.scalars(select(Order).where((Order.buyer_id==user.id)|(Order.farmer_id==user.id)))]
    def interest(self,s,user,item_id,b):
        item=self.listing(s,item_id)
        if item.status!='active':raise HTTPException(409,'Listing is unavailable')
        if item.farmer_id==user.id:raise HTTPException(422,'Cannot express interest in your own listing')
        order=Order(id=ident('order'),listing_id=item.id,buyer_id=user.id,farmer_id=item.farmer_id,agreed_price=float(b.get('offeredPrice',item.price_per_unit)),status='pending');s.add(order);s.add(Notification(id=ident('notification'),user_id=item.farmer_id,type='order',title='New buyer interest',body='A buyer is interested in your listing.'));s.commit();return dto(order)
    def order_action(self,s,user,order_id,action):
        if action not in ('accept','complete','reject','cancel'):
            raise HTTPException(422,'Invalid order action')
        order=s.get(Order,order_id)
        if not order:raise HTTPException(404,'Order not found')
        if action=='accept':
            own(user,order.farmer_id)
            if order.status!='pending':raise HTTPException(409,'Only pending orders can be accepted')
            order.status='accepted'
            item=s.get(ProduceListing,order.listing_id)
            if item:item.status='reserved'
        elif action=='complete':
            if user.id not in (order.buyer_id,order.farmer_id) and user.role!='admin':raise HTTPException(403,'Not permitted')
            if order.status!='accepted':raise HTTPException(409,'Only accepted orders can be completed')
            order.status='completed'
            item=s.get(ProduceListing,order.listing_id)
            if item:item.status='sold'
        elif action in ('reject','cancel'):
            if user.id not in (order.buyer_id,order.farmer_id) and user.role!='admin':raise HTTPException(403,'Not permitted')
            order.status='cancelled'
            item=s.get(ProduceListing,order.listing_id)
            if item and item.status=='reserved':item.status='active'
        s.commit();return dto(order)
    def parse_barter(self,text):
        t=text.lower()
        wanted=None
        if any(w in t for w in ('fertilizer','fertiliser','khad','खाद')):wanted='fertilizer'
        elif any(w in t for w in ('seed','seeds','beej','बीज')):wanted='seeds'
        elif any(w in t for w in ('pesticide','keetnashak','कीटनाशक')):wanted='pesticide'

        offered=None
        if any(w in t for w in ('wheat','gehu','gehun','गेहूं','गेहू')):offered='wheat'
        elif any(w in t for w in ('rice','paddy','chawal','dhan','चावल','धान')):offered='rice'

        return {'intent':'barter_request','itemWanted':wanted,'itemOffered':offered,'needsClarification':not(wanted and offered)}
    def barter_request_for(self,s,request_id):
        req=s.get(BarterRequest,request_id)
        if not req:raise HTTPException(404,'Barter request not found')
        return req
    def dealers(self,s,item=None,location=None):
        rows=s.scalars(select(Dealer)).all();result=[]
        for d in rows:
            if item and item.lower() not in {k.lower() for k in (d.items_available or {})}:continue
            if location and location.lower() not in (d.location or '').lower():continue
            result.append(dto(d))
        return result
    def barter_matches(self,s,user,request_id):
        req=self.barter_request_for(s,request_id);own(user,req.farmer_id)
        existing={m.dealer_id:m for m in s.scalars(select(BarterMatch).where(BarterMatch.request_id==request_id))}
        wanted=(req.item_wanted or "").lower()
        for d in s.scalars(select(Dealer)):
            if d.id in existing:continue
            available_items=[k.lower() for k in (d.items_available or {})]
            if wanted and any(wanted in item or item in wanted for item in available_items):
                match=BarterMatch(id=ident('match'),request_id=request_id,dealer_id=d.id,match_score=1.0,status='suggested')
                s.add(match);existing[d.id]=match
        s.commit()
        return [{**dto(m),'dealer':dto(s.get(Dealer,m.dealer_id))} for m in existing.values()]
    def barter_connect(self,s,user,request_id,dealer_id):
        req=self.barter_request_for(s,request_id);own(user,req.farmer_id)
        match=s.scalar(select(BarterMatch).where(BarterMatch.request_id==request_id,BarterMatch.dealer_id==dealer_id))
        if not match:raise HTTPException(404,'No match between this request and dealer')
        match.status='connected'
        dealer=s.get(Dealer,dealer_id)
        if dealer and dealer.user_id:
            s.add(Notification(id=ident('notification'),user_id=dealer.user_id,type='barter',title='New barter connection',body=f'{user.name or "A farmer"} wants to swap {req.item_offered} for {req.item_wanted}.'))
        s.commit();return dto(match)
    def barter_confirm(self,s,user,request_id,dealer_id):
        req=self.barter_request_for(s,request_id);own(user,req.farmer_id)
        match=s.scalar(select(BarterMatch).where(BarterMatch.request_id==request_id,BarterMatch.dealer_id==dealer_id))
        if not match or match.status!='connected':raise HTTPException(409,'Match must be connected before it can be confirmed')
        match.status='confirmed';req.status='completed';s.commit();return dto(match)
    def reviews_for(self,s,user_id):
        return [dto(x) for x in s.scalars(select(Review).where(Review.to_user_id==user_id))]
    def create_review(self,s,user,b):
        if b.get('toUserId')==user.id:raise HTTPException(422,'Cannot review yourself')
        target=s.get(User,b.get('toUserId'))
        if not target:raise HTTPException(404,'User not found')
        if b.get('orderId'):
            order=s.get(Order,b['orderId'])
            if not order or user.id not in (order.buyer_id,order.farmer_id):raise HTTPException(422,'Review must reference your own order')
        review=Review(id=ident('review'),from_user_id=user.id,to_user_id=b['toUserId'],order_id=b.get('orderId'),rating=b['rating'],comment=b.get('comment'))
        s.add(review);s.commit();return dto(review)
    def verification_status(self,s,user_id):
        target=s.get(User,user_id)
        if not target:raise HTTPException(404,'User not found')
        return {'userId':target.id,'verificationStatus':target.verification_status}
    def subscribe(self,s,user,endpoint):
        existing=s.scalar(select(PushSubscription).where(PushSubscription.endpoint==endpoint))
        if existing:existing.user_id=user.id
        else:s.add(PushSubscription(id=ident('push'),user_id=user.id,endpoint=endpoint))
        s.commit();return {'subscribed':True}
    def ask(self,s,user,b):
        q=b.get('text') or b.get('transcript')
        if not q:raise HTTPException(422,'text or transcript is required')
        lang=b.get('language') or user.preferred_language or 'hi'
        answer,sources=chat_ai.ask_groq(s,q,lang)
        log=ChatLog(id=ident('chat'),user_id=user.id,query=q,response=answer,language=lang);s.add(log);s.commit();return {**dto(log),'sources':sources}

