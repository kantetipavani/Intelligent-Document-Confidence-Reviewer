from __future__ import annotations

import os
import pathlib
import subprocess
import sys


def main() -> None:
    # Layout:
    #   backend/proto/extraction.proto
    #   backend/app/grpc/generate_stubs.py
    backend_root = pathlib.Path(__file__).resolve().parents[3]  # .../backend
    proto_dir = backend_root / "proto"

    out_dir = pathlib.Path(__file__).resolve().parent / "generated"


    out_dir.mkdir(parents=True, exist_ok=True)

    proto_file = proto_dir / "extraction.proto"
    if not proto_file.exists():
        raise FileNotFoundError(f"Missing proto file: {proto_file}")

    # Ensure packages are importable
    (out_dir / "__init__.py").write_text("", encoding="utf-8")

    cmd = [
        sys.executable,
        "-m",
        "grpc_tools.protoc",
        f"--proto_path={proto_dir}",
        f"--python_out={out_dir}",
        f"--grpc_python_out={out_dir}",
        str(proto_file),
    ]

    print("Generating gRPC stubs:", " ".join(cmd))
    subprocess.check_call(cmd)

    # Ensure relative import for generated gRPC package structure
    grpc_stub = out_dir / "extraction_pb2_grpc.py"
    if grpc_stub.exists():
        content = grpc_stub.read_text(encoding="utf-8")
        if "import extraction_pb2 as" in content:
            content = content.replace("import extraction_pb2 as", "from . import extraction_pb2 as")
            grpc_stub.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()

