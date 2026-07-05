from decimal import Decimal, InvalidOperation
from math import asin, cos, radians, sin, sqrt


EARTH_RADIUS_KM = 6371


def parse_coordinate(value, minimum, maximum):
    if value in (None, ""):
        return None

    try:
        coordinate = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None

    if coordinate < Decimal(str(minimum)) or coordinate > Decimal(str(maximum)):
        return None

    return coordinate


def parse_positive_decimal(value):
    if value in (None, ""):
        return None

    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None

    return number if number > 0 else None


def haversine_distance_km(origin_latitude, origin_longitude, target_latitude, target_longitude):
    origin_latitude = float(origin_latitude)
    origin_longitude = float(origin_longitude)
    target_latitude = float(target_latitude)
    target_longitude = float(target_longitude)

    lat_delta = radians(target_latitude - origin_latitude)
    lng_delta = radians(target_longitude - origin_longitude)
    origin_latitude = radians(origin_latitude)
    target_latitude = radians(target_latitude)

    angle = (
        sin(lat_delta / 2) ** 2
        + cos(origin_latitude) * cos(target_latitude) * sin(lng_delta / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * asin(sqrt(angle))
