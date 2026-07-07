# TODO - DR MongoDB+Kafka live drills + dashboard threshold alerting

## Step 1 — DR MongoDB outage live drill
- [x] Add `backend/app/tests/drills/drill_mongodb_outage.py`
- [ ] Update `DISASTER_RECOVERY_RUNBOOK.md` with Mongo drill commands + expected validation

## Step 2 — DR Kafka outage live drill
- [x] Add `backend/app/tests/drills/drill_kafka_outage.py`
- [ ] Update `DISASTER_RECOVERY_RUNBOOK.md` with Kafka drill commands + expected validation

## Step 3 — Threshold-based anomaly alerting backend
- [x] Add backend endpoint `/dashboard/anomalies` using Mongo `AuditEvent`
- [x] Define thresholds and return a structured anomaly payload
- [x] Register route in `backend/app/main.py`

## Step 4 — Wire dashboard + anomalies in frontend
- [x] Update `frontend/pages/dashboard.tsx` to render real confidence dashboard component
- [x] Extend `frontend/components/ConfidenceDashboard.tsx` to render anomaly banners

## Step 5 — Verification
- [ ] Run existing pytest smoke tests
- [ ] Run drill scripts in a dockerized environment
- [ ] Manually verify anomaly banners in UI


