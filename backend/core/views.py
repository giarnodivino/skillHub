from django.http import JsonResponse
from django.shortcuts import render

# Create your views here.
def test_api(request):
    return JsonResponse({"message": "Backend Connected"})