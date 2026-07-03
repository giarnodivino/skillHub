from django.urls import path

from .views import ConversationListCreateView, MessageListCreateView


urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation-list"),
    path(
        "conversations/<int:conversation_pk>/messages/",
        MessageListCreateView.as_view(),
        name="conversation-messages",
    ),
]
