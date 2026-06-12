from __future__ import annotations

import sys
from pathlib import Path

# Ensure tests can import the backend package as `app.*`.
# Repo layout:
#   backend/app/<...>
# Pytest may run with a working directory where `backend/` is not on sys.path.

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

