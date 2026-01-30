"use client";

import { useCallback, useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MousePointer2, Move3D, Camera } from "lucide-react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// ==================== TYPES ====================

interface Scene360Props {
  imageUrl: string;
  onSelectProduct: (croppedImageBase64: string) => void;
}

interface CanvasCaptureProps {
  onCapture: (dataUrl: string) => void;
  shouldCapture: boolean;
}

// ==================== CANVAS CAPTURE ====================

function CanvasCapture({ onCapture, shouldCapture }: CanvasCaptureProps) {
  const { gl, scene, camera } = useThree();
  const hasCaptured = useRef(false);

  useEffect(() => {
    if (shouldCapture && !hasCaptured.current) {
      hasCaptured.current = true;
      // Capture immediately
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL("image/png");
      onCapture(dataUrl);
    }
    if (!shouldCapture) {
      hasCaptured.current = false;
    }
  }, [shouldCapture, gl, scene, camera, onCapture]);

  return null;
}

// ==================== SPHERE VIEWER ====================

function SphereViewer({ imageUrl }: { imageUrl: string }) {
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

  const geometry = useMemo(() => new THREE.SphereGeometry(5, 128, 128), []);

  return (
    <mesh scale={[-1, 1, 1]} geometry={geometry}>
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

// ==================== MAIN COMPONENT ====================

export function Scene360({ imageUrl, onSelectProduct }: Scene360Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"navigate" | "capture" | "select">("navigate");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Crop state
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();

  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle capture result - only called when mode is "capture"
  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedImage(dataUrl);
    setMode("select");
  }, []);

  const handleCropComplete = useCallback((c: PixelCrop) => {
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

      onSelectProduct(canvas.toDataURL("image/png"));
    }
  }, [onSelectProduct]);

  // Button styles
  const buttonBase = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 24px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
  } as const;

  return (
    <div>
      {/* TOOLBAR - Completely isolated from canvas */}
      <div 
        style={{ 
          marginBottom: '16px',
          padding: '4px',
          position: 'relative',
          zIndex: 100,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'inline-flex', 
          borderRadius: '12px', 
          overflow: 'hidden',
          border: '2px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          backgroundColor: '#ffffff',
        }}>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMode("navigate");
              setCapturedImage(null);
            }}
            style={{
              ...buttonBase,
              backgroundColor: mode === "navigate" ? '#0f172a' : '#ffffff',
              color: mode === "navigate" ? '#ffffff' : '#64748b',
            }}
          >
            <Move3D style={{ width: '20px', height: '20px' }} />
            Navigation
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (mode === "navigate") {
                setMode("capture");
              }
            }}
            disabled={mode === "capture"}
            style={{
              ...buttonBase,
              backgroundColor: mode !== "navigate" ? '#0f172a' : '#ffffff',
              color: mode !== "navigate" ? '#ffffff' : '#64748b',
              opacity: mode === "capture" ? 0.7 : 1,
            }}
          >
            <Camera style={{ width: '20px', height: '20px' }} />
            {mode === "capture" ? "Capture..." : "Sélectionner"}
          </button>
        </div>
        
        <p style={{ 
          marginTop: '12px', 
          fontSize: '14px', 
          color: '#64748b',
          marginBottom: 0 
        }}>
          {mode === "navigate" && "🖱️ Glissez pour explorer la vue 360°, puis cliquez sur Sélectionner"}
          {mode === "capture" && "⏳ Capture de la vue en cours..."}
          {mode === "select" && "✏️ Dessinez un rectangle autour du meuble à rechercher"}
        </p>
      </div>

      {/* VIEW CONTAINER */}
      <div style={{ 
        height: '500px', 
        borderRadius: '16px', 
        overflow: 'hidden',
        border: '2px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        position: 'relative'
      }}>
        
        {/* 360° VIEW - Only show when in navigate or capture mode */}
        {(mode === "navigate" || mode === "capture") && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {isLoading && (
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.95)',
                zIndex: 10
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="animate-spin" style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#0f172a',
                    borderRadius: '50%',
                    margin: '0 auto 12px'
                  }} />
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Chargement de la vue 360°...</p>
                </div>
              </div>
            )}

            {mode === "capture" && (
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.95)',
                zIndex: 10
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="animate-spin" style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    margin: '0 auto 12px'
                  }} />
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Capture en cours...</p>
                </div>
              </div>
            )}

            <Canvas
              camera={{ fov: 75, position: [0, 0, 0.1], near: 0.1, far: 1000 }}
              style={{ width: '100%', height: '100%', cursor: 'grab' }}
              dpr={[1, 2]}
              gl={{ antialias: true, preserveDrawingBuffer: true }}
            >
              <Suspense fallback={null}>
                <SphereViewer imageUrl={imageUrl} />
                <CanvasCapture 
                  onCapture={handleCapture} 
                  shouldCapture={mode === "capture"} 
                />
              </Suspense>
              <OrbitControls
                enabled={mode === "navigate"}
                enableZoom={true}
                enablePan={false}
                rotateSpeed={-0.4}
                zoomSpeed={0.6}
                minDistance={0.1}
                maxDistance={4}
                enableDamping={true}
                dampingFactor={0.08}
              />
            </Canvas>
          </div>
        )}

        {/* SELECTION VIEW */}
        {mode === "select" && capturedImage && (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              padding: '14px 20px', 
              borderBottom: '2px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#f8fafc'
            }}>
              <MousePointer2 style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Dessinez un rectangle autour du meuble
              </span>
            </div>
            <div style={{ 
              flex: 1, 
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              backgroundColor: '#f1f5f9'
            }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={handleCropComplete}
              >
                <img
                  ref={imgRef}
                  src={capturedImage}
                  alt="Vue capturée"
                  style={{ 
                    maxHeight: '400px', 
                    maxWidth: '100%', 
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Scene360;
