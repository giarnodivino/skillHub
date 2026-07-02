from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ContractorListView,
    ContractorReviewView,
    MeView,
    PendingContractorListView,
    RegisterView,
)


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("contractors/", ContractorListView.as_view(), name="contractor-list"),
    path(
        "admin/contractors/",
        PendingContractorListView.as_view(),
        name="admin-pending-contractors",
    ),
    path(
        "admin/contractors/<int:pk>/",
        ContractorReviewView.as_view(),
        name="admin-review-contractor",
    ),
]
