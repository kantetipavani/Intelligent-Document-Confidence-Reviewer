# Kafka Verification (indcr.*)

## 1) Start the stack

```bash
docker compose up -d --build
```

## 2) Open Kafka UI
- URL: http://localhost:8080
- Verify connected cluster:
  - Topics exist:
    - `indcr.document.events`
    - `indcr.audit.events`
    - `indcr.review.events`

### Screenshot: Topics list
- Capture the topics page showing the 3 topic names.

---

## 3) Upload an invoice
- Use the frontend upload or call API endpoint:
  - `POST /documents/upload`

### Verify in Kafka UI
- Topic: `indcr.document.events`
- Message should appear with:
  - `event_type`: `DOCUMENT_UPLOADED`
  - `tenant_id`
  - `payload.document_id`
  - `payload.extraction_run_id`
  - `payload.user_email`

### Screenshot: Message payload
- Capture one sample message JSON from `indcr.document.events`.

---

## 4) Replay guarantee test (kill consumer mid-processing)

### Steps
1. Start an invoice extraction job.
2. While the MongoDB extraction run is `running` (or just right after upload), stop the extraction consumer:

```bash
docker stop indcr-kafka-extraction-consumer
```

3. Confirm in Kafka UI:
   - consumer group lag > 0

4. Restart the consumer:

```bash
docker start indcr-kafka-extraction-consumer
```

### Verify
- Extraction completes in MongoDB (`ExtractionRun.status` becomes `completed`)
- Kafka UI shows lag returning to ~0 after processing
- If you inspect message processing count, the job should be processed again (replay), but your idempotency guard should prevent duplicate completion side-effects.

### Screenshot: Consumer group lag
- Capture the consumer group page showing lag and that it returns to 0.

---

## 5) Store final artifacts
- Add screenshots for:
  1. Topics list
  2. Sample payload from `indcr.document.events`
  3. Consumer group lag = 0 after processing

---

## Notes / Known assumptions
- This repo uses at-least-once processing; replay may produce duplicates.
- `backend/app/services/extraction_service.py` includes an idempotency guard for `ExtractionRun` completion to avoid double side-effects.

