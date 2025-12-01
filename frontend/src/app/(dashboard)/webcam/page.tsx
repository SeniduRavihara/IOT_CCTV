"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { storage } from "@/lib/firebase/config";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Webcam from "react-webcam";
import { v4 as uuidv4 } from "uuid";

export default function WebcamPage() {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
  };

  const uploadImage = async () => {
    if (!imgSrc) return;

    try {
      setIsUploading(true);
      
      // Convert base64 to blob
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      
      // Create a unique filename
      const filename = `captures/${uuidv4()}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload
      await uploadBytes(storageRef, blob);
      
      // Get URL (optional, but good for verification)
      const url = await getDownloadURL(storageRef);
      console.log("Uploaded image URL:", url);
      
      toast.success("Image uploaded successfully!");
      setImgSrc(null); // Reset after upload
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Webcam Capture</h1>
        <p className="text-gray-400">Take a snapshot and upload it to the cloud.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 space-y-4">
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center border border-gray-700">
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgSrc} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 1280,
                  height: 720,
                  facingMode: "user",
                }}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex gap-4 justify-center">
            {imgSrc ? (
              <>
                <Button variant="outline" onClick={retake} disabled={isUploading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                <Button onClick={uploadImage} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={capture}>
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-100 mb-2">Instructions</h3>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>Ensure your camera permissions are enabled.</li>
            <li>Position yourself or the object in the frame.</li>
            <li>Click "Capture" to take a snapshot.</li>
            <li>Review the image and click "Upload" to save it to the cloud.</li>
            <li>The system will process the image for face detection.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
