from django.contrib import admin

from .models import Booking, JobRequest, Quote, Review


class QuoteInline(admin.TabularInline):
    model = Quote
    extra = 0


@admin.register(JobRequest)
class JobRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "customer", "contractor", "status", "updated_at")
    list_filter = ("status", "category")
    search_fields = ("title", "description", "customer__email", "contractor__email")
    inlines = [QuoteInline]


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "customer", "contractor", "status", "scheduled_for")
    list_filter = ("status",)
    search_fields = ("job__title", "customer__email", "contractor__email")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "customer", "contractor", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("customer__email", "contractor__email", "comment")
