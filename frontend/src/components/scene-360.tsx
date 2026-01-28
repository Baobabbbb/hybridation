"use client";

import { useCallback, useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MousePointer2, Move3D, Camera, X } from "lucide-react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import { motion, AnimatePresence } from "framer-motion";
import "react-image-crop/dist/ReactCrop.css";

// ==================== TYPES ====================

type ViewMode = "navigate" | "select";

interface Scene360Props {
  imageUrl: string;
  onSelectProduct: (croppedImageBase64: string) => void;
}

interface SphereViewerProps {
  imageUrl: string;
}

interface CanvasCaptureProps {
  onCapture: (dataUrl: string) => void;
  captureRequested: boolean;
  onCaptureComplete: () => void;
}

// ==================== CANVAS CAPTURE COMPONENT ====================

function CanvasCapture({ onCapture, captureRequested, onCaptureComplete }: CanvasCaptureProps) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (captureRequested) {
      // Render the scene
      gl.render(scene, camera);
      // Capture the canvas
      const dataUrl = gl.domElement.toDataURL("image/png");
      onCapture(dataUrl);
      onCaptureComplete();
    }
  }, [captureRequested, gl, scene, camera, onCapture, onCaptureComplete]);

  return null;
}

// ==================== SPHERE VIEWER COMPONENT ====================

function SphereViewer({ imageUrl }: SphereViewerProps) {
  const sphereRef = useRef<THREE.Mesh>(null);

  // Load texture with memoization
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  // Configure texture for equirectangular mapping with high quality settings
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = 16;
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Memoize geometry with high resolution for better quality
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(5, 128, 128), []);

  return (
    <mesh ref={sphereRef} scale={[-1, 1, 1]} geometry={sphereGeometry}>
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

// ==================== LOADING FALLBACK ====================

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[5, 32, 32]} />
      <meshBasicMaterial color="#1a1a2e" side={THREE.BackSide} />
    </mesh>
  );
}

// ==================== SELECTION OVERLAY COMPONENT ====================

interface SelectionOverlayProps {
  capturedImage: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onClose: () => void;
}

function SelectionOverlay({ capturedImage, onCropComplete, onClose }: SelectionOverlayProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleCropComplete = useCallback(
    (c: PixelCrop) => {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-black/90 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-white">
          <MousePointer2 className="w-4 h-4" />
          <span className="text-sm font-medium">Dessinez un rectangle autour du meuble</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Crop area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <div className="relative max-w-full max-h-full">
          {/* Selecting indicator */}
          <AnimatePresence>
            {isSelecting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-2 right-2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-white text-xs font-medium"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-white"
                />
                <span>Sélection en cours...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={handleCropComplete}
            onDragStart={() => setIsSelecting(true)}
            onDragEnd={() => setIsSelecting(false)}
            className="rounded-lg overflow-hidden"
          >
            <img
              ref={imgRef}
              src={capturedImage}
              alt="Vue 360° capturée"
              className="max-w-full max-h-[60vh] object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 border-t border-white/10 text-center">
        <p className="text-white/60 text-sm">
          Cliquez et glissez pour sélectionner le meuble que vous souhaitez rechercher
        </p>
      </div>
    </motion.div>
  );
}

// ==================== MAIN SCENE360 COMPONENT ====================

export function Scene360({ imageUrl, onSelectProduct }: Scene360Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("navigate");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureRequested, setCaptureRequested] = useState(false);
  const [showSelectionOverlay, setShowSelectionOverlay] = useState(false);

  // Preload image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle capture from Three.js canvas
  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedImage(dataUrl);
    setShowSelectionOverlay(true);
  }, []);

  // Handle capture complete
  const handleCaptureComplete = useCallback(() => {
    setCaptureRequested(false);
  }, []);

  // Handle mode change to select - trigger capture
  const handleSelectMode = useCallback(() => {
    setMode("select");
    setCaptureRequested(true);
  }, []);

  // Handle selection complete
  const handleCropComplete = useCallback(
    (croppedImageBase64: string) => {
      onSelectProduct(croppedImageBase64);
      // Keep overlay open so user can see feedback
    },
    [onSelectProduct]
  );

  // Close selection overlay and return to navigate mode
  const handleCloseOverlay = useCallback(() => {
    setShowSelectionOverlay(false);
    setCapturedImage(null);
    setMode("navigate");
  }, []);

  // Memoize canvas style to prevent re-renders
  const canvasStyle = useMemo(() => ({ 
    background: "#0a0a0f",
    cursor: "grab"
  }), []);

  return (
    <div className="relative w-full h-[500px] md:h-[600px] rounded-xl overflow-hidden bg-black/20">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Chargement de la vue 360°...</p>
          </div>
        </div>
      )}

      {/* Mode toggle buttons */}
      <div className="absolute top-4 left-4 z-20">
        <div className="flex rounded-xl overflow-hidden bg-black/60 backdrop-blur-md border border-white/10">
          <button
            onClick={() => {
              setMode("navigate");
              setShowSelectionOverlay(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "navigate" && !showSelectionOverlay
                ? "bg-white/20 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Move3D className="w-4 h-4" />
            <span>Navigation</span>
          </button>
          <button
            onClick={handleSelectMode}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
              showSelectionOverlay
                ? "bg-primary/80 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Sélectionner</span>
          </button>
        </div>
      </div>

      {/* Mode instructions */}
      {!showSelectionOverlay && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full backdrop-blur-sm text-xs bg-black/60 text-white">
            🖱️ Glissez pour explorer • Cliquez sur "Sélectionner" pour choisir un meuble
          </div>
        </div>
      )}

      {/* Three.js Canvas */}
      <Canvas
        camera={{
          fov: 75,
          position: [0, 0, 0.1],
          near: 0.1,
          far: 1000,
        }}
        style={canvasStyle}
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SphereViewer imageUrl={imageUrl} />
          <CanvasCapture
            onCapture={handleCapture}
            captureRequested={captureRequested}
            onCaptureComplete={handleCaptureComplete}
          />
        </Suspense>

        {/* Orbit controls for navigation - always enabled */}
        <OrbitControls
          enabled={!showSelectionOverlay}
          enableZoom={true}
          enablePan={false}
          rotateSpeed={-0.3}
          zoomSpeed={0.5}
          minDistance={0.1}
          maxDistance={4}
          target={[0, 0, 0]}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Selection Overlay */}
      <AnimatePresence>
        {showSelectionOverlay && capturedImage && (
          <SelectionOverlay
            capturedImage={capturedImage}
            onCropComplete={handleCropComplete}
            onClose={handleCloseOverlay}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Scene360;
