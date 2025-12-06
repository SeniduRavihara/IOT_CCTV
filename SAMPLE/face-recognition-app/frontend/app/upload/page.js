"use client";

import UploadForm from "../../components/UploadForm";

export default function UploadPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Register Face</h1>
      <UploadForm />
    </main>
  );
}
