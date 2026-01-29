"use client";

import { useRef, useState, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, MousePointerClick } from "lucide-react";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
}

export function ImageCropper({ imageSrc, onCropComplete }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleCropComplete = useCallback(
    (c: PixelCrop) => {
      setCompletedCrop(c);

      if (c.width > 20 && c.height > 20 && imgRef.current) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        const image = imgRef.current;
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = c.width * scaleX;
        canvas.height = c.height * scaleY;

        ctx.drawImage(
          image,
          c.x * scaleX,
          c.y * scaleY,
          c.width * scaleX,
          c.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const base64 = canvas.toDataURL("image/png");
        onCropComplete(base64);
      }
    },
    [onCropComplete]
  );

  return (
    <div className="relative w-full">
      {/* Instruction overlay */}
      <AnimatePresence>
        {!isSelecting && !completedCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm text-foreground text-sm"
            >
              <MousePointerClick className="w-4 h-4" />
              <span>Draw a box around a furniture to find it</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning animation when selecting */}
      <AnimatePresence>
        {isSelecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Scan className="w-3 h-3" />
            </motion.div>
            <span>Selecting...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ReactCrop
        crop={crop}
        onChange={(c) => setCrop(c)}
        onComplete={handleCropComplete}
        onDragStart={() => setIsSelecting(true)}
        onDragEnd={() => setIsSelecting(false)}
        className="rounded-xl overflow-hidden"
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Generated room"
          className="w-full h-auto max-h-[70vh] object-contain"
          crossOrigin="anonymous"
        />
      </ReactCrop>

      {/* Visual feedback for completed selection */}
      <AnimatePresence>
        {completedCrop && completedCrop.width > 20 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span>Selection captured - searching for products...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
