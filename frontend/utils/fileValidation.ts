export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"] as const;

export type FileValidationErrorType =
  | "empty"
  | "malformed"
  | "oversized"
  | "unsupported";

export type FileValidationResult = {
  isValid: boolean;
  errorType?: FileValidationErrorType;
  title?: string;
  message?: string;
};

export const validateFileAsync = async (
  file: File
): Promise<FileValidationResult> => {
  if (!file) {
    return {
      isValid: false,
      errorType: "empty",
      title: "empty file not processing",
      message:
        "No file was selected. Processing has been stopped. Please select an invoice file.",
    };
  }

  const fileName = file.name.trim().toLowerCase();

  if (file.size === 0) {
    return {
      isValid: false,
      errorType: "empty",
      title: "empty file not processing",
      message:
        "The uploaded file is empty (0 bytes). Processing has been stopped. Please upload a file containing invoice data.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      errorType: "oversized",
      title: "oversized file not processing",
      message:
        `The uploaded file is ${sizeMB} MB, which exceeds the maximum 10 MB limit. Processing has been stopped.`,
    };
  }

  const extension = ALLOWED_EXTENSIONS.find((ext) =>
    fileName.endsWith(ext)
  );

  if (!extension) {
    return {
      isValid: false,
      errorType: "unsupported",
      title: "unsupported file type not processing",
      message:
        "Invalid file format. Only PDF, DOC, DOCX, and TXT files are supported. Processing has been stopped.",
    };
  }

  try {
    const readBytes = async (
      start: number,
      end: number
    ): Promise<Uint8Array> => {
      const buffer = await file.slice(start, end).arrayBuffer();
      return new Uint8Array(buffer);
    };

    const startsWith = (
      bytes: Uint8Array,
      signature: number[]
    ): boolean =>
      signature.every(
        (value, index) => bytes[index] === value
      );

    const bytesToAscii = (bytes: Uint8Array): string =>
      String.fromCharCode(...bytes);

    if (extension === ".pdf") {
      if (file.size < 32) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The PDF file is too small or truncated. Processing has been stopped.",
        };
      }

      const header = bytesToAscii(
        await readBytes(0, Math.min(file.size, 1024))
      );

      if (!header.startsWith("%PDF-")) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The selected file has a .pdf extension but does not contain a valid PDF header. Processing has been stopped.",
        };
      }

      const tail = bytesToAscii(
        await readBytes(
          Math.max(0, file.size - 4096),
          file.size
        )
      );

      if (!tail.includes("%%EOF")) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The PDF appears incomplete or corrupted because the PDF end marker was not found. Processing has been stopped.",
        };
      }
    }

    if (extension === ".doc") {
      if (file.size < 512) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The DOC file is too small to be a valid Microsoft Word document. Processing has been stopped.",
        };
      }

      const header = await readBytes(0, 8);

      if (
        !startsWith(header, [
          0xd0, 0xcf, 0x11, 0xe0,
          0xa1, 0xb1, 0x1a, 0xe1,
        ])
      ) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The selected file has a .doc extension but does not contain a valid Microsoft Word document signature. Processing has been stopped.",
        };
      }
    }

    if (extension === ".docx") {
      if (file.size < 100) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The DOCX file is too small or truncated. Processing has been stopped.",
        };
      }

      const firstBytes = await readBytes(
        0,
        Math.min(4, file.size)
      );

      const validZipHeader =
        startsWith(firstBytes, [0x50, 0x4b, 0x03, 0x04]) ||
        startsWith(firstBytes, [0x50, 0x4b, 0x05, 0x06]) ||
        startsWith(firstBytes, [0x50, 0x4b, 0x07, 0x08]);

      if (!validZipHeader) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The selected file has a .docx extension but is not a valid DOCX/ZIP package. Processing has been stopped.",
        };
      }

      const tailBytes = await readBytes(
        Math.max(0, file.size - 65557),
        file.size
      );

      let hasZipEndMarker = false;

      for (
        let i = 0;
        i <= tailBytes.length - 4;
        i++
      ) {
        if (
          tailBytes[i] === 0x50 &&
          tailBytes[i + 1] === 0x4b &&
          tailBytes[i + 2] === 0x05 &&
          tailBytes[i + 3] === 0x06
        ) {
          hasZipEndMarker = true;
          break;
        }
      }

      if (!hasZipEndMarker) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The DOCX archive appears incomplete or corrupted. Processing has been stopped.",
        };
      }
    }

    if (extension === ".txt") {
      const textBytes = await readBytes(
        0,
        Math.min(file.size, 4096)
      );

      if (textBytes.some((byte) => byte === 0)) {
        return {
          isValid: false,
          errorType: "malformed",
          title: "malformed file not processing",
          message:
            "The TXT file contains binary data and does not appear to be a valid text document. Processing has been stopped.",
        };
      }

      const textSample = new TextDecoder(
        "utf-8",
        { fatal: false }
      ).decode(textBytes);

      if (textSample.trim().length === 0) {
        return {
          isValid: false,
          errorType: "empty",
          title: "empty file not processing",
          message:
            "The uploaded text file contains no usable content. Processing has been stopped. Please upload a file containing invoice data.",
        };
      }
    }
  } catch (error) {
    console.error("File validation error:", error);

    return {
      isValid: false,
      errorType: "malformed",
      title: "malformed file not processing",
      message:
        "The file could not be read or its structure could not be validated. Processing has been stopped.",
    };
  }

  return { isValid: true };
};
