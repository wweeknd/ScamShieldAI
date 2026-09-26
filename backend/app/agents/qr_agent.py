"""QR Agent.

Decodes an uploaded QR-code image and returns the embedded text/URL. Uses
OpenCV (pip-only, no system libraries) rather than pyzbar so it installs
cleanly on Windows. The extracted URL is then handed to the URL Agent —
no separate detection logic lives here.
"""


def decode_qr(image_bytes: bytes) -> str | None:
    """Return the decoded QR payload, or None if nothing could be read."""
    try:
        import cv2  # imported lazily so the app boots even if opencv is missing
        import numpy as np
    except Exception:
        return None

    try:
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        detector = cv2.QRCodeDetector()
        data, _points, _ = detector.detectAndDecode(img)
        return data.strip() or None
    except Exception:
        return None
