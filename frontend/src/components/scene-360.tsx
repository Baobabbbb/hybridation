"use client";

import { useCallback, useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MousePointer2, Move3D } from "lucide-react";

// ==================== TYPES ====================

type ViewMode = "navigate" | "select";

interface Scene360Props {
  imageUrl: string;
  onSelectProduct: (croppedImageBase64: string) => void;
}

interface SphereViewerProps {
  imageUrl: string;
  onSelectProduct: (croppedImageBase64: string) => void;
  mode: ViewMode;
}

// ==================== UTILITY: Crop Image from UV ====================

/**
 * Crop a region from the panoramic image based on UV coordinates.
 */
async function cropImageFromUV(
  imageUrl: string,
  uv: THREE.Vector2,
  cropSize: number = 500
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      canvas.width = cropSize;
      canvas.height = cropSize;

      const centerX = uv.x * img.width;
      const centerY = (1 - uv.y) * img.height;

      const sourceX = centerX - cropSize / 2;
      const sourceY = centerY - cropSize / 2;

      const clampedSourceX = Math.max(0, Math.min(sourceX, img.width - cropSize));
      const clampedSourceY = Math.max(0, Math.min(sourceY, img.height - cropSize));

      ctx.drawImage(
        img,
        clampedSourceX,
        clampedSourceY,
        cropSize,
        cropSize,
        0,
        0,
        cropSize,
        cropSize
      );

      const base64 = canvas.toDataURL("image/png");
      resolve(base64);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for cropping"));
    };

    img.src = imageUrl;
  });
}

// ==================== SPHERE VIEWER COMPONENT ====================

function SphereViewer({ imageUrl, onSelectProduct, mode }: SphereViewerProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load texture with memoization
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  // Configure texture for equirectangular mapping with high quality settings
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      // High quality filters for better image quality
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = 16; // Maximum anisotropic filtering for sharper textures
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Handle click on sphere - only in select mode
  const handleClick = useCallback(
    async (event: THREE.Event & { uv?: THREE.Vector2; point?: THREE.Vector3 }) => {
      if (mode !== "select") return;
      if (isProcessing) return;

      const uv = event.uv;
      if (!uv) {
        console.warn("Click event missing UV data");
        return;
      }

      console.log("[Scene360] Click detected at UV:", uv);
      setIsProcessing(true);

      try {
        const croppedImage = await cropImageFromUV(imageUrl, uv, 500);
        console.log("[Scene360] Image cropped successfully");
        onSelectProduct(croppedImage);
      } catch (error) {
        console.error("[Scene360] Failed to crop image:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [imageUrl, onSelectProduct, isProcessing, mode]
  );

  // Memoize geometry with high resolution for better quality
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(5, 128, 128), []);

  return (
    <mesh ref={sphereRef} onClick={handleClick} scale={[-1, 1, 1]} geometry={sphereGeometry}>
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

// ==================== MAIN SCENE360 COMPONENT ====================

export function Scene360({ imageUrl, onSelectProduct }: Scene360Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("navigate");
  const [hasSelected, setHasSelected] = useState(false);

  // Preload image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle product selection with temporary indicator
  const handleSelectProduct = useCallback(
    (croppedImageBase64: string) => {
      setHasSelected(true);
      onSelectProduct(croppedImageBase64);
      // Reset indicator after 2 seconds
      const timer = setTimeout(() => setHasSelected(false), 2000);
      return () => clearTimeout(timer);
    },
    [onSelectProduct]
  );

  // Memoize canvas style to prevent re-renders
  const canvasStyle = useMemo(() => ({ 
    background: "#0a0a0f",
    cursor: mode === "select" ? "crosshair" : "grab"
  }), [mode]);

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
            onClick={() => setMode("navigate")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "navigate"
                ? "bg-white/20 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Move3D className="w-4 h-4" />
            <span>Navigation</span>
          </button>
          <button
            onClick={() => setMode("select")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "select"
                ? "bg-primary/80 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <MousePointer2 className="w-4 h-4" />
            <span>Sélection</span>
          </button>
        </div>
      </div>

      {/* Mode instructions */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none">
        <div className={`px-3 py-1.5 rounded-full backdrop-blur-sm text-xs transition-colors ${
          mode === "navigate" 
            ? "bg-black/60 text-white" 
            : "bg-primary/80 text-white"
        }`}>
          {mode === "navigate" 
            ? "🖱️ Glissez pour explorer la vue 360°" 
            : "👆 Cliquez sur un meuble pour le rechercher"}
        </div>
      </div>

      {/* Three.js Canvas with quality settings */}
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
          <SphereViewer
            imageUrl={imageUrl}
            onSelectProduct={handleSelectProduct}
            mode={mode}
          />
        </Suspense>

        {/* Orbit controls for navigation */}
        <OrbitControls
          enabled={mode === "navigate"}
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

      {/* Selection feedback indicator */}
      {hasSelected && (
        <div className="absolute bottom-4 right-4 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-3 py-1.5 rounded-full bg-green-500/80 backdrop-blur-sm text-white text-xs">
            ✓ Sélection envoyée
          </div>
        </div>
      )}
    </div>
  );
}

export default Scene360;
