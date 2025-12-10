"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { db, storage } from "@/lib/firebase/config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ArrowLeft, Camera, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function AddPersonPage() {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [useEsp32, setUseEsp32] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (showCamera) {
      if (!useEsp32) {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera, useEsp32]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please allow camera permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, []);

  const startAutoCapture = () => {
    setIsAutoCapturing(true);
    captureIntervalRef.current = setInterval(() => {
      capturePhoto();
    }, 500); // Capture every 500ms
  };

  const stopAutoCapture = () => {
    setIsAutoCapturing(false);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (useEsp32 && imgRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // CORS might be an issue if not handled by ESP32 headers
        ctx.drawImage(imgRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setImages((prev) => [...prev, file]);
            setPreviews((prev) => [...prev, URL.createObjectURL(blob)]);
          }
        }, "image/jpeg");
      }
    } else if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setImages((prev) => [...prev, file]);
            setPreviews((prev) => [...prev, URL.createObjectURL(blob)]);
          }
        }, "image/jpeg");
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages((prev) => [...prev, ...files]);

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || images.length === 0) {
      alert("Please provide name and at least one image");
      return;
    }

    setLoading(true);
    try {
      // Upload images to Firebase Storage
      const imageUrls = await Promise.all(
        images.map(async (image, index) => {
          const imageName = `${Date.now()}_${index}_${image.name}`;
          const imageRef = ref(storage, `persons/${imageName}`);
          await uploadBytes(imageRef, image);
          return getDownloadURL(imageRef);
        })
      );

      // Add person to Firestore
      await addDoc(collection(db, "known_users"), {
        name,
        relation,
        trainingImages: imageUrls,
        embedding: [], // Will be generated by Cloud Function
        createdAt: serverTimestamp(),
        detectionCount: 0,
        lastSeen: null,
      });

      // Register with Python AI Backend
      try {
        await Promise.all(
          images.map(async (image) => {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("image", image);

            const res = await fetch("http://localhost:5001/register", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              console.error(
                `Failed to register image with AI backend: ${res.statusText}`
              );
            }
          })
        );
      } catch (error) {
        console.error("Error registering with AI backend:", error);
        alert(
          "Saved to database, but AI registration failed. Ensure backend is running."
        );
      }

      router.push("/dashboard/known-persons");
    } catch (error) {
      console.error("Error adding person:", error);
      alert("Failed to add person. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/known-persons">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Add New Person</h1>
          <p className="text-slate-400 mt-1">
            Register a new person for recognition
          </p>
        </div>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Relation
            </label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select relation</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="son">Son</option>
              <option value="daughter">Daughter</option>
              <option value="sibling">Sibling</option>
              <option value="spouse">Spouse</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Training Images{" "}
              <span className="text-slate-500">
                (Multiple images improve accuracy)
              </span>
            </label>

            <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-slate-500 mb-4">PNG, JPG up to 10MB</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <div className="flex justify-center gap-4">
                <label htmlFor="image-upload">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                  >
                    Select Files
                  </Button>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCamera(!showCamera)}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {showCamera ? "Close Camera" : "Use Camera"}
                </Button>
              </div>

              {showCamera && (
                <div className="flex justify-center mt-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={useEsp32}
                      onChange={(e) => setUseEsp32(e.target.checked)}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-300">
                      Use ESP32 Camera
                    </span>
                  </label>
                </div>
              )}
            </div>

            {showCamera && (
              <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  {useEsp32 ? (
                    <img
                      ref={imgRef}
                      src="http://192.168.43.223/stream"
                      crossOrigin="anonymous"
                      alt="ESP32 Stream"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex justify-center gap-4">
                  {!isAutoCapturing ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={startAutoCapture}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start Auto Capture
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={stopAutoCapture}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Stop Auto Capture
                    </Button>
                  )}
                </div>
              </div>
            )}

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="relative h-32 rounded-lg overflow-hidden">
                      <Image
                        src={preview}
                        alt={`Preview ${index}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Link href="/dashboard/known-persons" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={loading}
            >
              Add Person
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
