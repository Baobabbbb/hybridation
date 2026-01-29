"use client";

import { useCallback, useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MousePointer2, Move3D, Camera, X } from "lucide-react";
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
  const [isVisible, setIsVisible] = useState(false);

  // Trigger fade-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

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
    <div
      className={`absolute inset-0 z-30 bg-white/95 flex flex-col transition-opacity duration-150 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header - Responsive */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-black/10">
        <div className="flex items-center gap-1.5 sm:gap-2 text-foreground min-w-0 flex-1">
          <MousePointer2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium truncate">Dessinez un rectangle autour du meuble</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 sm:p-2 rounded-lg bg-black/10 hover:bg-black/20 text-foreground transition-colors flex-shrink-0 ml-2"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Crop area - Responsive */}
      <div className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center">
        <div className="relative max-w-full max-h-full w-full">
          {/* Selecting indicator - Simple CSS transition */}
          {isSelecting && (
            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] sm:text-xs font-medium">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-foreground" />
              <span className="whitespace-nowrap">Sélection...</span>
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

      {/* Instructions - Responsive */}
      <div className="p-2 sm:p-4 border-t border-black/10 text-center">
        <p className="text-muted-foreground text-xs sm:text-sm px-2">
          Cliquez et glissez pour sélectionner le meuble que vous souhaitez rechercher
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
            <p className="text-xs sm:text-sm">Chargement de la vue 360°...</p>
          </div>
        </div>
      )}

      {/* Three.js Canvas - wrapped to not capture all events */}
      <div className="absolute inset-0 z-0">
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

          {/* Orbit controls for navigation - optimized for fluidity */}
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
      </div>

      {/* UI Layer - completely separate from Canvas */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Mode toggle buttons - Responsive */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 pointer-events-auto">
          <div className="flex flex-col sm:flex-row rounded-lg sm:rounded-xl overflow-hidden bg-white/90 sm:bg-white/85 backdrop-blur-md border border-black/10 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMode("navigate");
                setShowSelectionOverlay(false);
              }}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all ${
                mode === "navigate" && !showSelectionOverlay
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              }`}
            >
              <Move3D className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Navigation</span>
            </button>
            <button
              type="button"
              onClick={handleSelectMode}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all ${
                showSelectionOverlay
                  ? "bg-primary/80 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              }`}
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Sélectionner</span>
            </button>
          </div>
        </div>

        {/* Mode instructions - Responsive */}
        {!showSelectionOverlay && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 max-w-[calc(100%-120px)] sm:max-w-none">
            <div className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full backdrop-blur-sm text-[10px] sm:text-xs bg-white/90 sm:bg-white/85 text-foreground">
              <span className="hidden sm:inline">🖱️ Glissez pour explorer • Cliquez sur "Sélectionner" pour choisir un meuble</span>
              <span className="sm:hidden">🖱️ Glissez • "Sélectionner" pour choisir</span>
            </div>
          </div>
        )}
      </div>

      {/* Selection Overlay */}
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
