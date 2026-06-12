import React from "react";

type UploadButtonProps = {
  selectedFile: File | null;
  isExtracted: boolean;
  loading: boolean;
  onFileSelect: (file: File | null) => void;
  onExtract: () => void;
};

export default function UploadButton({
  selectedFile,
  loading,
  onFileSelect,
  onExtract,
}: UploadButtonProps) {
  return (
    <div className="upload-card">
      <h2>Upload Invoice</h2>

      <div className="upload-box">
        <label>
          Upload file
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) =>
              onFileSelect(e.target.files?.[0] ?? null)
            }
          />
        </label>

        {selectedFile && (
          <div className="file-preview">
            📄 {selectedFile.name}
          </div>
        )}
      </div>

      <button className="extract-btn" onClick={onExtract}>
        {loading ? "Processing..." : "Extract Invoice Data"}
      </button>
    </div>
  );
}

