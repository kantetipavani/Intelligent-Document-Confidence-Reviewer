import { useEffect, useState } from "react";

import api from "../services/api";

export interface DocumentData {
  id: number;

  file_name: string;

  status: string;

  file_url: string;

  extraction: any;
}

export default function useDocuments() {
  const [documents, setDocuments] =
    useState<DocumentData[]>([]);

  const [loading, setLoading] =
    useState<boolean>(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const response = await api.get<
        DocumentData[]
      >("/documents");

      setDocuments(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    documents,
    loading,
    fetchDocuments,
  };
}