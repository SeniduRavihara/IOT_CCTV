"use client";

import { useState } from "react";

export default function UploadForm() {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!name || !file) return alert("Enter name and select file!");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "face_recognition"); // from Step 3

    const response = await fetch(`https://api.cloudinary.com/v1_1/drq8ovu6m/image/upload`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    const imageUrl = data.secure_url;

    alert(`Uploaded! Name: ${name}, Image URL: ${imageUrl}`);
    setName("");
    setFile(null);
  };

  return (
    <div className="bg-black p-6 rounded shadow-md w-96">
      <input
        type="text"
        placeholder="Enter Name"
        className="border p-2 w-full mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="file"
        className="mb-4"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        onClick={handleUpload}
      >
        Upload
      </button>
    </div>
  );
}
