"""
ASGI config for videocall project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

import os

# from channels.auth import AuthMiddlewareStack
# from channels.routing import ProtocolTypeRouter, URLRouter
# from django.core.asgi import get_asgi_application
# from django.urls import path
# import call.routing
# from call.consumers import ChatConsumer
# os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videocall.settings")

# # application = get_asgi_application()
# application = ProtocolTypeRouter({
#   "http": get_asgi_application(),
#   "websocket": AuthMiddlewareStack(
#         URLRouter(
#             call.routing.websocket_urlpatterns,
#             path('ws/chat/', ChatConsumer.as_asgi()),
#         )
#     ),
# })
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
import call.routing
from django.urls import path
from call.consumers import ChatConsumer
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videocall.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            call.routing.websocket_urlpatterns,
            # path('ws/chat/', ChatConsumer.as_asgi()),
        )
    ),
})
