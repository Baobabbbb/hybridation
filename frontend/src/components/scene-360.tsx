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
    <div className="absolute inset-0 bg-white/98 flex flex-col" style={{ zIndex: 40 }}>
      {/* Header with close button - larger touch target */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-black/10">
        <div className="flex items-center gap-2 text-foreground min-w-0 flex-1">
          <MousePointer2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="text-sm sm:text-base font-medium truncate">Dessinez un rectangle autour du meuble</span>
        </div>
        {/* Close button - much larger touch target */}
        <button
          type="button"
          onClick={onClose}
          className="p-3 sm:p-3 rounded-xl bg-black/10 hover:bg-black/20 active:bg-black/30 text-foreground transition-colors flex-shrink-0 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Fermer et retourner à la navigation"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Crop area */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center">
        <div className="relative max-w-full max-h-full w-full">
          {isSelecting && (
            <div className="absolute top-2 right-2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
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
            className="rounded-lg overflow-hidden w-full"
          >
            <img
              ref={imgRef}
              src={capturedImage}
              alt="Vue 360° capturée"
              className="max-w-full max-h-[50vh] sm:max-h-[60vh] object-contain w-full h-auto"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
      </div>

      {/* Instructions + Back button */}
      <div className="p-3 sm:p-4 border-t border-black/10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/10 hover:bg-black/20 active:bg-black/30 text-foreground transition-colors text-sm font-medium min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>
        <p className="text-muted-foreground text-xs sm:text-sm text-right flex-1">
          Dessinez un rectangle pour sélectionner
        </p>
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
  const [showSelectionOverlay, setShowSelectionOverlay] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedImage(dataUrl);
    setShowSelectionOverlay(true);
  }, []);

  const handleCaptureComplete = useCallback(() => {
    setCaptureRequested(false);
  }, []);

  const handleSelectMode = useCallback(() => {
    setMode("select");
    setCaptureRequested(true);
  }, []);

  const handleCropComplete = useCallback(
    (croppedImageBase64: string) => {
      onSelectProduct(croppedImageBase64);
    },
    [onSelectProduct]
  );

  const handleCloseOverlay = useCallback(() => {
    setShowSelectionOverlay(false);
    setCapturedImage(null);
    setMode("navigate");
  }, []);

  const canvasStyle = useMemo(() => ({ 
    background: "#f5f5f5",
    cursor: "grab"
  }), []);

  return (
    <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-xl overflow-hidden bg-white/20">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-foreground text-center px-4">
            <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Chargement de la vue 360°...</p>
          </div>
        </div>
      )}

      {/* Three.js Canvas - z-0 so buttons can be on top */}
      <Canvas
        camera={{
          fov: 75,
          position: [0, 0, 0.1],
          near: 0.1,
          far: 1000,
        }}
        style={{ ...canvasStyle, position: 'absolute', inset: 0, zIndex: 0 }}
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
          enabled={!showSelectionOverlay}
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

      {/* Mode toggle buttons - z-50 to be above Canvas */}
      <div 
        className="absolute top-3 left-3 sm:top-4 sm:left-4"
        style={{ zIndex: 50, pointerEvents: 'auto' }}
      >
        <div 
          className="flex rounded-xl overflow-hidden bg-white/95 backdrop-blur-md border border-black/10 shadow-xl"
          style={{ pointerEvents: 'auto' }}
        >
          <button
            type="button"
            onClick={handleCloseOverlay}
            style={{ pointerEvents: 'auto' }}
            className={`flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base font-medium transition-all min-h-[48px] ${
              mode === "navigate" && !showSelectionOverlay
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-black/5 active:bg-black/10"
            }`}
          >
            <Move3D className="w-5 h-5" />
            <span>Navigation</span>
          </button>
          <button
            type="button"
            onClick={handleSelectMode}
            style={{ pointerEvents: 'auto' }}
            className={`flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base font-medium transition-all min-h-[48px] ${
              showSelectionOverlay
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-black/5 active:bg-black/10"
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Sélectionner</span>
          </button>
        </div>
      </div>

      {/* Mode instructions */}
      {!showSelectionOverlay && (
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 pointer-events-none">
          <div className="text-center px-4 py-2.5 rounded-xl backdrop-blur-sm text-sm bg-white/90 text-foreground shadow-lg">
            🖱️ Glissez pour explorer la vue 360° • Cliquez sur "Sélectionner" pour choisir un meuble
          </div>
        </div>
      )}

      {/* Selection Overlay - z-20 so buttons can still be above */}
      {showSelectionOverlay && capturedImage && (
        <SelectionOverlay
          capturedImage={capturedImage}
          onCropComplete={handleCropComplete}
          onClose={handleCloseOverlay}
        />
      )}
    </div>
  );
}

export default Scene360;
