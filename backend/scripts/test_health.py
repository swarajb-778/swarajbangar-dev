"""Sanity check: hit /health and /ready, print both responses.

Usage:
    python scripts/test_health.py                # against localhost:8000
    BACKEND_URL=https://api.example.com python scripts/test_health.py
"""

from __future__ import annotations

import json
import os
import sys

import httpx


def main() -> int:
    base = os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")

    ok = True
    with httpx.Client(timeout=10.0) as client:
        for path in ("/health", "/ready"):
            url = f"{base}{path}"
            print(f"\nGET {url}")
            try:
                resp = client.get(url)
            except httpx.HTTPError as exc:
                print(f"  ERROR: {exc}")
                ok = False
                continue
            print(f"  status: {resp.status_code}")
            try:
                payload = resp.json()
                print(f"  body:   {json.dumps(payload, indent=2, default=str)}")
            except ValueError:
                print(f"  body:   {resp.text[:200]}")
            if resp.status_code >= 400:
                ok = False

    print("\n" + ("OK" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
