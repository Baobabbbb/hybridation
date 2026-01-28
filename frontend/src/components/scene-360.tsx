"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ==================== TYPES ====================

interface Scene360Props {
  imageUrl: string;
  onSelectProduct: (croppedImageBase64: string) => void;
}

interface MarkerData {
  position: THREE.Vector3;
  id: string;
}

interface SphereViewerProps {
  imageUrl: string;
  onSelectProduct: (croppedImageBase64: string) => void;
  markers: MarkerData[];
  setMarkers: React.Dispatch<React.SetStateAction<MarkerData[]>>;
}

// ==================== UTILITY: Crop Image from UV ====================

/**
 * Crop a region from the panoramic image based on UV coordinates.
 * @param imageUrl - The 360° equirectangular image URL (data URL or http)
 * @param uv - The UV coordinates from Three.js raycasting
 * @param cropSize - Size of the crop in pixels (default 500x500)
 * @returns Promise<string> - Base64 encoded cropped image
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
      // Create off-screen canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Set canvas size to crop size
      canvas.width = cropSize;
      canvas.height = cropSize;

      // Calculate center pixel coordinates from UV
      // Note: Three.js UV has Y going up, but image has Y going down
      // So we use (1 - uv.y) to flip the Y coordinate
      const centerX = uv.x * img.width;
      const centerY = (1 - uv.y) * img.height;

      // Calculate source position (top-left of crop area)
      const sourceX = centerX - cropSize / 2;
      const sourceY = centerY - cropSize / 2;

      // Handle edge cases (wrap around for 360° images)
      // For simplicity, we'll clamp to image bounds
      const clampedSourceX = Math.max(0, Math.min(sourceX, img.width - cropSize));
      const clampedSourceY = Math.max(0, Math.min(sourceY, img.height - cropSize));

      // Draw the cropped region
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

      // Export as base64
      const base64 = canvas.toDataURL("image/png");
      resolve(base64);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for cropping"));
    };

    img.src = imageUrl;
  });
}

// ==================== MARKER COMPONENT ====================

function ClickMarker({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      {/* Outer ring for visibility */}
      <mesh>
        <ringGeometry args={[0.03, 0.05, 32]} />
        <meshBasicMaterial color="#ff4444" side={THREE.DoubleSide} />
      </mesh>
      {/* Inner dot */}
      <mesh>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Animated pulse effect */}
      <mesh scale={[1, 1, 1]}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial 
          color="#ff4444" 
          transparent 
          opacity={0.5} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
}

// ==================== SPHERE VIEWER COMPONENT ====================

function SphereViewer({ imageUrl, onSelectProduct, markers, setMarkers }: SphereViewerProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [isProcessing, setIsProcessing] = useState(false);

  // Load texture
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  // Configure texture for equirectangular mapping
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }, [texture]);

  // Handle click on sphere
  const handleClick = useCallback(
    async (event: THREE.Event & { uv?: THREE.Vector2; point?: THREE.Vector3 }) => {
      // Prevent multiple clicks while processing
      if (isProcessing) return;

      // Get UV coordinates from the click event
      const uv = event.uv;
      const point = event.point;

      if (!uv || !point) {
        console.warn("Click event missing UV or point data");
        return;
      }

      console.log("[Scene360] Click detected at UV:", uv, "Point:", point);

      // Add visual marker at click position
      const markerId = `marker-${Date.now()}`;
      const markerPosition = point.clone().normalize().multiplyScalar(4.9); // Slightly inside sphere
      setMarkers((prev) => [...prev.slice(-4), { position: markerPosition, id: markerId }]); // Keep last 5 markers

      setIsProcessing(true);

      try {
        // Crop the image based on UV coordinates
        const croppedImage = await cropImageFromUV(imageUrl, uv, 500);
        console.log("[Scene360] Image cropped successfully");

        // Call the callback with cropped image
        onSelectProduct(croppedImage);
      } catch (error) {
        console.error("[Scene360] Failed to crop image:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [imageUrl, onSelectProduct, isProcessing, setMarkers]
  );

  return (
    <>
      {/* The 360° sphere - inverted so we view from inside */}
      <mesh ref={sphereRef} onClick={handleClick} scale={[-1, 1, 1]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} />
      </mesh>

      {/* Render markers */}
      {markers.map((marker) => (
        <ClickMarker key={marker.id} position={marker.position} />
      ))}
    </>
  );
}

// ==================== MAIN SCENE360 COMPONENT ====================

export function Scene360({ imageUrl, onSelectProduct }: Scene360Props) {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Preload image to check if it's valid
  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

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

      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs">
          <span>🖱️</span>
          <span>Glissez pour explorer • Cliquez sur un meuble pour le rechercher</span>
        </div>
      </div>

      {/* Three.js Canvas */}
      <Canvas
        camera={{
          fov: 75,
          position: [0, 0, 0.1],
          near: 0.1,
          far: 1000,
        }}
        style={{ background: "#000" }}
      >
        {/* Ambient light for basic visibility */}
        <ambientLight intensity={1} />

        {/* The 360° panorama viewer */}
        <SphereViewer
          imageUrl={imageUrl}
          onSelectProduct={onSelectProduct}
          markers={markers}
          setMarkers={setMarkers}
        />

        {/* Orbit controls for navigation */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          rotateSpeed={-0.3}
          zoomSpeed={0.5}
          minDistance={0.1}
          maxDistance={4}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Click indicator */}
      {markers.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10">
          <div className="px-3 py-1.5 rounded-full bg-green-500/80 backdrop-blur-sm text-white text-xs">
            ✓ Sélection envoyée
          </div>
        </div>
      )}
    </div>
  );
}

export default Scene360;
