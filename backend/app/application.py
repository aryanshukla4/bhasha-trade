from contextlib import asynccontextmanager
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.auth_routes import router as auth_router
from app.api.domain_routes import router as domain_router
from app.bootstrap import initialize_database
from app.core.config import settings
from app.core.limiter import limiter

SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
}


def _clean_allowed_hosts(origins: list[str]) -> list[str]:
    hosts = set()
    for origin in origins:
        if "://" in origin:
            parsed = urlparse(origin)
            host = parsed.hostname
        else:
            host = origin.split(":")[0]
        if host:
            hosts.add(host)
    return list(hosts) or ["*"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title='Bhasha Trade API', version='1.0.0', lifespan=lifespan)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    if settings.app_env == 'production':
        allowed_hosts = _clean_allowed_hosts(settings.cors_origin_list)
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    @app.middleware('http')
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.update(SECURITY_HEADERS)
        return response

    app.include_router(auth_router)
    app.include_router(domain_router)
    return app

