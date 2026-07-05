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


class PublicS3MediaStorage:
    def __new__(cls, *args, **kwargs):
        from storages.backends.s3boto3 import S3Boto3Storage

        class Storage(S3Boto3Storage):
            location = "media"
            file_overwrite = False
            default_acl = None
            querystring_auth = True

        return Storage(*args, **kwargs)


@deconstructible
class PrivateS3MediaStorage:
    def __new__(cls, *args, **kwargs):
        from storages.backends.s3boto3 import S3Boto3Storage

        class Storage(S3Boto3Storage):
            location = "private"
            file_overwrite = False
            default_acl = None
            querystring_auth = True

        return Storage(*args, **kwargs)
