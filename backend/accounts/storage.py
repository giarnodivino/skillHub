from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateMediaStorage(FileSystemStorage):
    @property
    def base_location(self):
        return self._value_or_setting(self._location, settings.PRIVATE_MEDIA_ROOT)

    @property
    def base_url(self):
        return None
