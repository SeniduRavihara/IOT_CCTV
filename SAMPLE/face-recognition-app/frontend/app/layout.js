import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Face Recognition - AI-Powered Face Detection & Recognition",
  description: "Advanced face recognition system with real-time detection and person identification using AI technology.",
  keywords: "face recognition, AI, machine learning, face detection, biometrics",
  authors: [{ name: "Face Recognition System" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
