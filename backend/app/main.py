"""FastAPI composition root. HTTP routes are registered in app.api.routes."""
from app.application import create_app

app = create_app()
