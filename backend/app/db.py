from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

_is_sqlite_memory = settings.database_url in ("sqlite://", "sqlite:///:memory:")
_engine_kwargs = {"pool_pre_ping": not _is_sqlite_memory}
if settings.database_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
if _is_sqlite_memory:
    _engine_kwargs["poolclass"] = StaticPool

engine = create_engine(settings.database_url, **_engine_kwargs)
# expire_on_commit=False: services read dto()/serialize() straight off the ORM
# instance right after commit(), via row.__dict__ directly rather than through
# the mapped attributes, so an expired instance would serialize as {}.
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)

def get_session():
    session = SessionLocal()
    try: yield session
    finally: session.close()
