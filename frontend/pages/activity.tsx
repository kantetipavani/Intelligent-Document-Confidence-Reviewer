import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import api from "../services/api";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";


function formatDateForApi(d: Date | null) {
  if (!d) return undefined;
  // Backend might accept ISO date. Keep only date portion if possible.
  // If backend expects full timestamp, this is still ISO-compatible.
  return d.toISOString();
}

function safeString(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

type ActivityEvent = {
  event_type: string;
  user_email?: string;
  tenant?: string;
  created_at?: string;
  payload?: any;
};

export default function ActivityPage() {
  const [eventTypeFilter, setEventTypeFilter] =
    useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const query = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await api.get("/activity");
      return (res.data || []) as ActivityEvent[];
    },
  });

  const data = query.data || [];

  const filtered = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return data.filter((ev) => {
      if (eventTypeFilter !== "all") {
        if (ev.event_type !== eventTypeFilter) return false;
      }

      const ts = ev.created_at ? new Date(ev.created_at) : null;
      if (from && ts && ts < from) return false;
      if (to && ts && ts > new Date(to.getTime() + 24 * 60 * 60 * 1000))
        return false;

      return true;
    });
  }, [data, eventTypeFilter, fromDate, toDate]);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    data.forEach((ev) => {
      if (ev?.event_type) set.add(ev.event_type);
    });
    return Array.from(set).sort();
  }, [data]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 items-end">
            <div className="md:col-span-1">
              <label className="text-sm font-medium">Event Type</label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                {eventTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>


            <div className="">
              <label className="text-sm font-medium">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="">
              <label className="text-sm font-medium">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-1 flex justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEventTypeFilter("all");
                  setFromDate("");
                  setToDate("");
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          {query.isLoading ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Loading audit log...
              </div>
              <Progress value={33} />
            </div>
          ) : query.isError ? (
            <div className="text-red-600 font-medium">
              Failed to load audit log.
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ev, idx) => (
                    <ActivityRow key={idx} event={ev} />
                  ))}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No activity found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityRow({
  event,
}: {
  event: ActivityEvent;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>{safeString(event.event_type)}</TableCell>
        <TableCell>{safeString(event.user_email)}</TableCell>
        <TableCell>{safeString(event.tenant)}</TableCell>
        <TableCell>
          {event.created_at
            ? new Date(event.created_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : ""}
        </TableCell>
        <TableCell>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "Expand"}
          </Button>
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/20">
            <pre className="text-xs whitespace-pre-wrap break-words p-3">
              {JSON.stringify(event.payload ?? {}, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

