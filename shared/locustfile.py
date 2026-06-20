from locust import HttpUser, task, between, events
import os

class INDCRUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Login once per user"""
        response = self.client.post("/auth/login", json={
            "email": "string1@gmail.com",
            "password": "123456"
        })

        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            self.token = None

        self.headers = {
            "Authorization": f"Bearer {self.token}"
        } if self.token else {}

    # 1. login (weight 1)
    @task(1)
    def login(self):
        self.client.post("/auth/login", json={
            "email": "string1@gmail.com",
            "password": "123456"
        })

    # 2. list_documents (weight 4)
    @task(4)
    def list_documents(self):
        self.client.get("/documents", headers=self.headers)

    # 3. get_document (weight 3)
    @task(3)
    def get_document(self):
        self.client.get("/documents/1", headers=self.headers)

    # 4. get_activity (weight 2)
    @task(2)
    def get_activity(self):
        self.client.get("/activity", headers=self.headers)

    # 5. upload_document (weight 1)
    @task(1)
    def upload_document(self):
        files = {
            "file": ("test.txt", b"hello world", "text/plain")
        }
        self.client.post("/documents/upload", files=files, headers=self.headers)


# -----------------------------
# HARD THRESHOLD (Redis test only)
# -----------------------------
@events.request.add_listener
def check_latency(request_type, name, response_time, response_length, response, context, exception, start_time, url, **kwargs):

    # Apply only to Redis test via env flag
    if os.getenv("TEST_MODE") == "with_redis":
        if name == "GET /documents" and response_time > 400:
            print(f"❌ p95 breach detected: {response_time}ms on {name}")
            exit(1)