from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Any


def utc_now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


@dataclass
class DrillReport:
    name: str
    started_at_utc: str
    ended_at_utc: str | None = None
    config: dict[str, Any] = field(default_factory=dict)
    steps: list[dict[str, Any]] = field(default_factory=list)
    api_calls: list[dict[str, Any]] = field(default_factory=list)
    http_failures: list[dict[str, Any]] = field(default_factory=list)
    expected_vs_observed: dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "started_at_utc": self.started_at_utc,
            "ended_at_utc": self.ended_at_utc,
            "config": self.config,
            "steps": self.steps,
            "api_calls": self.api_calls,
            "http_failures": self.http_failures,
            "expected_vs_observed": self.expected_vs_observed,
        }


def _results_dir() -> str:
    # Keep drill artifacts under repo-root results/drills
    return os.path.join(os.getcwd(), "results", "drills")


def ensure_results_dir() -> None:
    os.makedirs(_results_dir(), exist_ok=True)


def write_report(report: DrillReport) -> tuple[str, str]:
    ensure_results_dir()

    ts = int(time.time())
    safe_name = report.name.replace("/", "_")
    json_path = os.path.join(_results_dir(), f"drill_{safe_name}_{ts}.json")
    md_path = os.path.join(_results_dir(), f"drill_{safe_name}_{ts}.md")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report.to_json(), f, indent=2, ensure_ascii=False)

    # Lightweight human-readable summary
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(f"# DR Drill Report: {report.name}\n")
        f.write(f"Started (UTC): {report.started_at_utc}\n")
        f.write(f"Ended (UTC): {report.ended_at_utc}\n")
        f.write("\n## Config\n")
        for k, v in report.config.items():
            f.write(f"- {k}: {v}\n")

        f.write("\n## Expected vs Observed\n")
        f.write("```\n")
        f.write(json.dumps(report.expected_vs_observed, indent=2, ensure_ascii=False))
        f.write("\n```\n")

        f.write("\n## Steps\n")
        for s in report.steps:
            f.write(f"\n### {s.get('step','step')}\n")
            if 't' in s:
                f.write(f"- t: {s['t']}\n")
            if 'action' in s:
                f.write(f"- action: {s['action']}\n")
            details = s.get('details')
            if isinstance(details, dict) and details:
                f.write("- details:\n")
                for dk, dv in details.items():
                    f.write(f"  - {dk}: {dv}\n")

        f.write("\n## API Calls\n")
        for call in report.api_calls:
            f.write(
                f"- {call.get('t')} {call.get('method')} {call.get('path')} -> {call.get('response', {}).get('status_code')}\n"
            )

        if report.http_failures:
            f.write("\n## HTTP Failures\n")
            for fail in report.http_failures:
                f.write(
                    f"- {fail.get('t')} {fail.get('method')} {fail.get('path')} error={fail.get('error')}\n"
                )

    return json_path, md_path

