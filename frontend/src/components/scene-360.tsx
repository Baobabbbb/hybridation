"use client";

import { useCallback, useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MousePointer2, Move3D, Camera, X, ArrowLeft } from "lucide-react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
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
      gl.render(scene, camera);
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
  const texture = useLoader(THREE.TextureLoader, imageUrl);

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

// ==================== SELECTION VIEW COMPONENT ====================

interface SelectionViewProps {
  capturedImage: string;
  onCropComplete: (croppedImageBase64: string) => void;
}

function SelectionView({ capturedImage, onCropComplete }: SelectionViewProps) {
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
    <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-xl overflow-hidden bg-white border border-black/10 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-black/10 bg-muted/30">
        <MousePointer2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-primary" />
        <span className="text-sm sm:text-base font-medium">Dessinez un rectangle autour du meuble à rechercher</span>
      </div>

      {/* Crop area */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center bg-muted/10">
        <div className="relative max-w-full max-h-full">
          {isSelecting && (
            <div className="absolute top-2 right-2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              <span>Sélection...</span>
            </div>
          )}

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
              className="max-w-full max-h-[calc(100vh-350px)] object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN SCENE360 COMPONENT ====================

export function Scene360({ imageUrl, onSelectProduct }: Scene360Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("navigate");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureRequested, setCaptureRequested] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedImage(dataUrl);
  }, []);

  const handleCaptureComplete = useCallback(() => {
    setCaptureRequested(false);
  }, []);

  const handleSelectMode = useCallback(() => {
    setMode("select");
    setCaptureRequested(true);
  }, []);

  const handleNavigateMode = useCallback(() => {
    setMode("navigate");
    setCapturedImage(null);
  }, []);

  const handleCropComplete = useCallback(
    (croppedImageBase64: string) => {
      onSelectProduct(croppedImageBase64);
    },
    [onSelectProduct]
  );

  const canvasStyle = useMemo(() => ({ 
    background: "#f5f5f5",
    cursor: "grab"
  }), []);

  return (
    <div className="space-y-4">
      {/* Buttons OUTSIDE the 360 view - always accessible */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex rounded-xl overflow-hidden bg-white border border-black/10 shadow-md">
          <button
            type="button"
            onClick={handleNavigateMode}
            className={`flex items-center justify-center gap-2 px-5 py-3 text-sm sm:text-base font-medium transition-colors ${
              mode === "navigate"
                ? "bg-primary text-primary-foreground"
                : "bg-white text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Move3D className="w-5 h-5" />
            <span>Navigation</span>
          </button>
          <button
            type="button"
            onClick={handleSelectMode}
            className={`flex items-center justify-center gap-2 px-5 py-3 text-sm sm:text-base font-medium transition-colors ${
              mode === "select"
                ? "bg-primary text-primary-foreground"
                : "bg-white text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Sélectionner</span>
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground">
          {mode === "navigate" 
            ? "🖱️ Glissez pour explorer la vue 360°" 
            : "✏️ Dessinez un rectangle sur le meuble"}
        </p>
      </div>

      {/* Content area */}
      {mode === "navigate" ? (
        /* 360° View */
        <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-xl overflow-hidden bg-white/20 border border-black/10">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="text-foreground text-center px-4">
                <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Chargement de la vue 360°...</p>
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

            <OrbitControls
              enableZoom={true}
              enablePan={false}
              rotateSpeed={-0.4}
              zoomSpeed={0.6}
              minDistance={0.1}
              maxDistance={4}
              target={[0, 0, 0]}
              enableDamping={true}
              dampingFactor={0.08}
            />
          </Canvas>
        </div>
      ) : (
        /* Selection View */
        capturedImage && (
          <SelectionView
            capturedImage={capturedImage}
            onCropComplete={handleCropComplete}
          />
        )
      )}
    </div>
  );
}

export default Scene360;
