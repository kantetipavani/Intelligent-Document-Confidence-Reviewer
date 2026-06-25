from __future__ import annotations

import asyncio
import os

from app.grpc.extraction_server import serve_grpc


async def main_async() -> None:
    host = os.getenv("GRPC_HOST", "0.0.0.0").strip() or "0.0.0.0"
    port = int(os.getenv("GRPC_PORT", "50051").strip() or "50051")
    await serve_grpc(host=host, port=port)


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()

