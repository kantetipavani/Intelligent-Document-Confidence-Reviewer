import { useRouter } from "next/router";

import {
  useEffect,
  useState,
} from "react";

import api from "../services/api";

import PDFViewer from "../components/PDFViewer";

import ExtractedFields from "../components/ExtractedFields";

import VersionHistory from "../components/VersionHistory";

import DiffViewer from "../components/DiffViewer";

export default function DocumentReviewPage() {
  const router = useRouter();

  const { id } = router.query;

  const [document, setDocument] =
    useState<any>(null);

  const [fields, setFields] =
    useState<any>({});

  const [versions, setVersions] =
    useState<any[]>([]);

  const [diff, setDiff] =
    useState<any>({});

  useEffect(() => {
    if (id) {
      fetchDocument();

      fetchVersions();
    }
  }, [id]);

  const fetchDocument = async () => {
    // Scaffold: tenant_id is required by backend document lookup.
    // If you implement multi-tenant routing later, wire tenant_id from auth/user context.
    const tenantId = "default";

    const response = await api.get(
      `/documents/${tenantId}/${id}`
    );

    setDocument(response.data);

    const extraction = response.data.extraction;

    // `ExtractedFields` expects a flat object like:
    // { invoice_number: {value, confidence}, date: {...}, ... }
    // Backend extraction responses may include:
    //  - extraction.fields (preferred)
    //  - other metadata alongside fields
    // Normalize defensively so the table always has the right shape.
    const normalizedFields =
      extraction && typeof extraction === "object"
        ? extraction.fields && typeof extraction.fields === "object"
          ? extraction.fields
          : extraction
        : {};

    setFields(normalizedFields);
  };

  const fetchVersions = async () => {
    const response = await api.get(
      `/versions/${id}`
    );

    setVersions(response.data);
  };

  const handleUpdate = (
    field: string,
    value: string
  ) => {
    setFields({
      ...fields,

      [field]: {
        ...fields[field],

        value,
      },
    });
  };

  const handleSaveReview =
    async () => {
      try {
        await api.post(
          "/reviews/approve",
          {
            document_id: id,

            extraction: fields,
          }
        );

        alert("Review Saved");
      } catch (error) {
        alert("Save failed");
      }
    };

  return (
    <div
      style={{
        display: "grid",

        gridTemplateColumns:
          "1fr 1fr",

        height: "100vh",
      }}
    >
      <div>
        {document && (
          <PDFViewer
            onExtract={() => {
              /* PDF upload/extract is scaffolded in PDFViewer right now */
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: "20px",

          overflowY: "scroll",
        }}
      >
        <h1>AI Extracted Fields</h1>

        <ExtractedFields
          fields={fields}
          onUpdate={handleUpdate}
        />

        <button
          onClick={handleSaveReview}
        >
          Save Review
        </button>

        <hr />

        <VersionHistory
          versions={versions}
        />

        <hr />

        <DiffViewer diff={diff} />
      </div>
    </div>
  );
}