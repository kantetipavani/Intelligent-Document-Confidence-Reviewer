import React from "react";
import Head from "next/head";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({
  children,
}: LayoutProps) {
  return (
    <>
      <Head>
        <title>
          Intelligent Document Reviewer
        </title>

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
      </Head>

      <div>
        {children}
      </div>
    </>
  );
}