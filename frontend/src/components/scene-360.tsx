"use client";

import { useCallback, useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MousePointer2, Move3D, Camera } from "lucide-react";
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
  triggerCapture: number; // increment to trigger capture
}

// ==================== CANVAS CAPTURE COMPONENT ====================

function CanvasCapture({ onCapture, triggerCapture }: CanvasCaptureProps) {
  const { gl, scene, camera } = useThree();
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (triggerCapture > 0 && triggerCapture !== lastTrigger.current) {
      lastTrigger.current = triggerCapture;
      // Small delay to ensure the scene is fully rendered
      setTimeout(() => {
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL("image/png");
        onCapture(dataUrl);
      }, 100);
    }
  }, [triggerCapture, gl, scene, camera, onCapture]);

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
    <div className="w-full rounded-xl overflow-hidden bg-white border border-black/10">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-black/10 bg-muted/30">
        <MousePointer2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Dessinez un rectangle autour du meuble</span>
      </div>

      {/* Crop area */}
      <div className="p-4 flex items-center justify-center bg-muted/10" style={{ minHeight: '400px', maxHeight: '500px' }}>
        <div className="relative">
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
              style={{ maxHeight: '450px', maxWidth: '100%', objectFit: 'contain' }}
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
  const [captureCounter, setCaptureCounter] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle capture result
  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedImage(dataUrl);
    setIsCapturing(false);
    setMode("select");
  }, []);

  // Handle click on "Sélectionner" - always trigger a new capture
  const handleSelectClick = useCallback(() => {
    setIsCapturing(true);
    setCaptureCounter(prev => prev + 1);
  }, []);

  // Handle click on "Navigation"
  const handleNavigateClick = useCallback(() => {
    setMode("navigate");
  }, []);

  const handleCropComplete = useCallback(
    (croppedImageBase64: string) => {
      onSelectProduct(croppedImageBase64);
    },
    [onSelectProduct]
  );

  const canvasStyle = useMemo(() => ({ 
    background: "#f5f5f5",
    cursor: "grab",
    width: '100%',
    height: '100%'
  }), []);

  return (
    <div className="flex flex-col gap-4">
      {/* Buttons - COMPLETELY SEPARATE from the view */}
      <div className="flex items-center gap-4 flex-wrap p-1">
        <div className="flex rounded-xl overflow-hidden border border-black/10 shadow-sm bg-white">
          <button
            type="button"
            onClick={handleNavigateClick}
            disabled={isCapturing}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              mode === "navigate"
                ? "bg-primary text-primary-foreground"
                : "bg-white text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Move3D className="w-5 h-5" />
            <span>Navigation</span>
          </button>
          <button
            type="button"
            onClick={handleSelectClick}
            disabled={isCapturing}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              mode === "select"
                ? "bg-primary text-primary-foreground"
                : "bg-white text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>{isCapturing ? "Capture..." : "Sélectionner"}</span>
          </button>
        </div>

        <p className="text-sm text-muted-foreground flex-1">
          {mode === "navigate" 
            ? "🖱️ Glissez pour explorer, puis cliquez sur Sélectionner" 
            : "✏️ Dessinez un rectangle sur le meuble à rechercher"}
        </p>
      </div>

      {/* View area - fixed height container */}
      <div style={{ height: '500px', position: 'relative' }}>
        {/* 360° View - always rendered but hidden when in select mode */}
        <div 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            display: mode === "navigate" ? 'block' : 'none',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 10 }}>
              <div className="text-foreground text-center px-4">
                <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Chargement de la vue 360°...</p>
              </div>
            </div>
          )}

          {/* Capturing overlay */}
          {isCapturing && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.9)', zIndex: 10 }}>
              <div className="text-foreground text-center px-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Capture en cours...</p>
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
                triggerCapture={captureCounter}
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

        {/* Selection View */}
        {mode === "select" && capturedImage && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <SelectionView
              capturedImage={capturedImage}
              onCropComplete={handleCropComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Scene360;
