import { useState } from "react";

interface Props {
  onExtract: (data: any[]) => void;
}

export default function PDFViewer({
  onExtract,
}: Props) {

  const [fileName, setFileName] =
    useState("");

  const handleUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      e.target.files?.[0];

    if (!file) return;

    setFileName(file.name);

    const mockData = [
      {
        name: "Invoice Number",
        value: "INV-2026-1001",
        confidence: 95,
      },
      {
        name: "Vendor Name",
        value: "ABC Technologies",
        confidence: 88,
      },
      {
        name: "Total Amount",
        value: "94400",
        confidence: 76,
      },
    ];

    onExtract(mockData);
  };

  return (
    <div className="pdf-box">

      <input
        type="file"
        accept=".pdf"
        onChange={handleUpload}
      />

      {fileName && (
        <div className="file-name">
          Uploaded:
          {" "}
          {fileName}
        </div>
      )}

      <style jsx>{`

        .pdf-box {
          border: 2px dashed #cbd5e1;
          padding: 30px;
          border-radius: 14px;
          text-align: center;
          background: #f8fafc;
        }

        .file-name {
          margin-top: 15px;
          font-weight: 600;
          color: #2563eb;
        }

      `}</style>
    </div>
  );
}