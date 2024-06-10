# call/routing.py
from django.urls import re_path
from .consumers import ChatConsumer
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/call/', consumers.CallConsumer.as_asgi()),
    re_path(r'ws/chat/', ChatConsumer.as_asgi()),
]