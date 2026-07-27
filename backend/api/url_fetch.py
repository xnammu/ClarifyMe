from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse
from urllib.request import Request, urlopen

MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
ALLOWED_SCHEMES = {"http", "https"}
TIMEOUT_SECONDS = 10


class UrlFetchError(ValueError):
    """Raised for any invalid/unsafe URL - callers should turn this into a 400, not a 500."""


def _resolves_to_private_address(hostname: str) -> bool:
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return True  # can't resolve - refuse rather than risk it
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return True
    return False


def fetch_image_bytes(url: str) -> tuple[bytes, str]:
    """Downloads an image URL server-side - avoids the browser CORS failures a
    client-side fetch() hits for most third-party image hosts - with basic
    SSRF/size guards. Returns (bytes, content_type).

    NOTE: this checks the initial host, but urlopen follows redirects automatically
    without re-validating each hop. That's an acceptable gap for a local dev tool;
    if you deploy this publicly, disable auto-redirect and re-validate per hop, or
    route through a vetted image-proxy service instead.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES or not parsed.hostname:
        raise UrlFetchError("URL must be a valid http:// or https:// address.")
    if _resolves_to_private_address(parsed.hostname):
        raise UrlFetchError("That host can't be fetched (resolves to a private/internal address).")

    request = Request(url, headers={"User-Agent": "ClarifyMe/1.0"})
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            content_type = response.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                raise UrlFetchError(f"That URL didn't return an image (got '{content_type or 'unknown'}').")
            data = response.read(MAX_DOWNLOAD_BYTES + 1)
    except UrlFetchError:
        raise
    except Exception as exc:  # noqa: BLE001 - any network failure becomes a clean 400
        raise UrlFetchError(f"Couldn't fetch that URL: {exc}") from exc

    if len(data) > MAX_DOWNLOAD_BYTES:
        raise UrlFetchError("Image is larger than the 20MB limit.")

    return data, content_type
