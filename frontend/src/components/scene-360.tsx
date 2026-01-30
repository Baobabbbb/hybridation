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
  triggerCapture: number;
}

// ==================== CANVAS CAPTURE ====================

function CanvasCapture({ onCapture, triggerCapture }: CanvasCaptureProps) {
  const { gl, scene, camera } = useThree();
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (triggerCapture > 0 && triggerCapture !== lastTrigger.current) {
      lastTrigger.current = triggerCapture;
      setTimeout(() => {
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL("image/png");
        onCapture(dataUrl);
      }, 150);
    }
  }, [triggerCapture, gl, scene, camera, onCapture]);

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
  const [showSelection, setShowSelection] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureCounter, setCaptureCounter] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Crop state
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();

  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoading(false);
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedImage(dataUrl);
    setIsCapturing(false);
    setShowSelection(true);
  }, []);

  const handleNavigationClick = useCallback(() => {
    console.log("Navigation clicked");
    setShowSelection(false);
  }, []);

  const handleSelectionClick = useCallback(() => {
    console.log("Selection clicked");
    setIsCapturing(true);
    setCaptureCounter(prev => prev + 1);
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

  return (
    <div>
      {/* BUTTONS - Simple HTML buttons with inline styles */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          display: 'flex', 
          borderRadius: '12px', 
          overflow: 'hidden',
          border: '1px solid #e5e5e5',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <button
            type="button"
            onClick={handleNavigationClick}
            disabled={isCapturing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: isCapturing ? 'not-allowed' : 'pointer',
              backgroundColor: !showSelection ? '#0f172a' : '#ffffff',
              color: !showSelection ? '#ffffff' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            <Move3D style={{ width: '20px', height: '20px' }} />
            Navigation
          </button>
          <button
            type="button"
            onClick={handleSelectionClick}
            disabled={isCapturing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: isCapturing ? 'not-allowed' : 'pointer',
              backgroundColor: showSelection ? '#0f172a' : '#ffffff',
              color: showSelection ? '#ffffff' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            <Camera style={{ width: '20px', height: '20px' }} />
            {isCapturing ? "Capture..." : "Sélectionner"}
          </button>
        </div>
        <span style={{ fontSize: '14px', color: '#64748b' }}>
          {!showSelection 
            ? "🖱️ Glissez pour explorer, puis cliquez sur Sélectionner" 
            : "✏️ Dessinez un rectangle sur le meuble"}
        </span>
      </div>

      {/* VIEW AREA */}
      <div style={{ 
        height: '500px', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: '1px solid #e5e5e5',
        backgroundColor: '#f5f5f5',
        position: 'relative'
      }}>
        {/* 360° VIEW */}
        {!showSelection && (
          <>
            {isLoading && (
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.9)',
                zIndex: 10
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: '2px solid #0f172a',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 8px'
                  }} />
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Chargement...</p>
                </div>
              </div>
            )}

            {isCapturing && (
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
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: '2px solid #3b82f6',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 8px'
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
                <CanvasCapture onCapture={handleCapture} triggerCapture={captureCounter} />
              </Suspense>
              <OrbitControls
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
          </>
        )}

        {/* SELECTION VIEW */}
        {showSelection && capturedImage && (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid #e5e5e5',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fafafa'
            }}>
              <MousePointer2 style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                Dessinez un rectangle autour du meuble
              </span>
            </div>
            <div style={{ 
              flex: 1, 
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto'
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
                  style={{ maxHeight: '420px', maxWidth: '100%', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Scene360;
