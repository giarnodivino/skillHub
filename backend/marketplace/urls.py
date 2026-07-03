from django.urls import path

from .views import (
    BookingDetailView,
    BookingListView,
    JobRequestDetailView,
    JobRequestListCreateView,
    QuoteActionView,
    QuoteListCreateView,
    ReviewCreateView,
)


urlpatterns = [
    path("jobs/", JobRequestListCreateView.as_view(), name="job-list"),
    path("jobs/<int:pk>/", JobRequestDetailView.as_view(), name="job-detail"),
    path("jobs/<int:job_pk>/quotes/", QuoteListCreateView.as_view(), name="quote-list"),
    path("quotes/<int:pk>/action/", QuoteActionView.as_view(), name="quote-action"),
    path("bookings/", BookingListView.as_view(), name="booking-list"),
    path("bookings/<int:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("bookings/<int:booking_pk>/reviews/", ReviewCreateView.as_view(), name="review-create"),
]
