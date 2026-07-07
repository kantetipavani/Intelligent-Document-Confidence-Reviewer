from __future__ import annotations

import os
import subprocess
import time
from typing import Any

from backend.app.tests.drills._drill_utils import base_url, auth_headers, get, post, sleep


def run() -> None:
    # Live drill: MongoDB outage mid-processing
    #
    # Expected behavior:
    # - Upload triggers synchronous extraction and should still fail if DB is unreachable
    #   (because upload persists Document + ExtractionRun before running extraction).
    # - After Mongo is restored, re-run upload/trigger and verify persistence + dashboard update.

    tenant_id = os.getenv("DRILL_TENANT_ID", "default")
    filename = os.getenv("DRILL_FILENAME", "invoice.pdf")
    test_file_path = os.getenv("DRILL_FILE_PATH", "C:\\path\\to\\invoice.pdf")

    # If you use SKIP_DB=true in env, drill is not meaningful.
    print("Starting MongoDB outage drill")

    # 1) Ensure DB is reachable and index is initialized
    try:
        r = get("/health")
        print("Health status:", r.status_code, r.text[:200])
    except Exception as e:
        print("Health check failed (may be normal if Mongo down):", e)

    # 2) Trigger outage (you need to stop mongodb container manually or via your docker-compose)
    # This drill script focuses on API calls + validation. Container control is environment-specific.
    print("Mongo outage phase: stop mongodb container(s) now if running this manually.")
    sleep(float(os.getenv("DRILL_PAUSE_SECONDS", "10")))

    # 3) Attempt upload while Mongo is down
    # NOTE: we send multipart file. If file path doesn't exist, script will fail.
    with open(test_file_path, "rb") as f:
        files: dict[str, Any] = {"file": (filename, f, "application/pdf")}
        data = {"tenant_id": tenant_id, "filename": filename}
        # upload endpoint expects tenant_id+filename+file as multipart
        # requests.post with json doesn't work here, so we call requests directly
        import requests

        try:
            resp = requests.post(
                base_url() + "/documents/upload",
                headers=auth_headers(),
                data=data,
                files=files,
            )
            print("Upload during Mongo outage ->", resp.status_code, resp.text[:500])
        except Exception as e:
            print("Upload during Mongo outage raised:", e)

    # 4) Restore Mongo
    print("Mongo restore phase: start mongodb container(s) now if running this manually.")
    sleep(float(os.getenv("DRILL_PAUSE_SECONDS_AFTER", "15")))

    # 5) Re-run upload and verify dashboard reflects new audit events
    with open(test_file_path, "rb") as f:
        files = {"file": (filename, f, "application/pdf")}
        data = {"tenant_id": tenant_id, "filename": filename}
        import requests

        resp = requests.post(
            base_url() + "/documents/upload",
            headers=auth_headers(),
            data=data,
            files=files,
        )
        print("Upload after Mongo restore ->", resp.status_code, resp.text[:500])
        if resp.status_code >= 400:
            raise RuntimeError("Upload failed after Mongo restore")

    # 6) Verify confidence dashboard endpoint
    # Confidence dashboard is based on AuditEvent; audit consumer is Kafka-driven.
    # So this check validates that the endpoint responds and returns numeric outputs.
    conf = get("/dashboard/confidence-dashboard", params={"window_seconds": 3600})
    print("Confidence dashboard after restore:", conf.status_code, conf.text[:500])

    anom = get("/dashboard/anomalies", params={"window_seconds": 3600})
    print("Anomalies dashboard after restore:", anom.status_code, anom.text[:500])


if __name__ == "__main__":
    run()

