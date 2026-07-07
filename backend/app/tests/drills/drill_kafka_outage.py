from __future__ import annotations

import os
from typing import Any

from backend.app.tests.drills._drill_utils import base_url, auth_headers, get, sleep


def run() -> None:
    # Live drill: Kafka outage mid-processing
    # Expected behavior:
    # - Upload remains available because extraction is synchronous in upload handler.
    # - /extraction/trigger should fall back to in-process execution when Kafka publish fails.
    # - Confidence dashboard (AuditEvent-driven) may lag until Kafka returns and audit consumer catches up.

    tenant_id = os.getenv("DRILL_TENANT_ID", "default")
    filename = os.getenv("DRILL_FILENAME", "invoice.pdf")
    test_file_path = os.getenv("DRILL_FILE_PATH", "C:\\path\\to\\invoice.pdf")

    print("Starting Kafka outage drill")

    # 1) Upload while Kafka is down (or just after you kill it)
    print("Kafka outage phase: stop kafka container(s) now if running this manually.")
    sleep(float(os.getenv("DRILL_PAUSE_SECONDS", "10")))

    import requests

    with open(test_file_path, "rb") as f:
        files: dict[str, Any] = {"file": (filename, f, "application/pdf")}
        data = {"tenant_id": tenant_id, "filename": filename}
        resp = requests.post(
            base_url() + "/documents/upload",
            headers=auth_headers(),
            data=data,
            files=files,
        )
        print("Upload during Kafka outage ->", resp.status_code, resp.text[:500])

    # 2) Trigger extraction
    trig = requests.post(
        base_url() + "/extraction/trigger",
        headers=auth_headers(),
        json={"tenant_id": tenant_id, "document_id": resp.json().get("document_id")},
    )
    print("Trigger during Kafka outage ->", trig.status_code, trig.text[:500])

    # 3) Restore Kafka
    print("Kafka restore phase: start kafka container(s) now if running this manually.")
    sleep(float(os.getenv("DRILL_PAUSE_SECONDS_AFTER", "15")))

    # 4) Verify dashboard endpoints respond (may lag)
    conf = get("/dashboard/confidence-dashboard", params={"window_seconds": 3600})
    print("Confidence dashboard ->", conf.status_code, conf.text[:400])

    anom = get("/dashboard/anomalies", params={"window_seconds": 3600})
    print("Anomalies dashboard ->", anom.status_code, anom.text[:400])


if __name__ == "__main__":
    run()

