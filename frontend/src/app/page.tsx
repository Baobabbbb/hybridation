"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Wand2,
  ArrowLeft,
  Loader2,
  Home,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ImageCropper } from "@/components/image-cropper";
import { ProductSheet } from "@/components/product-sheet";
import dynamic from "next/dynamic";
import { generateFurnishedRoom, searchProducts, type Product } from "@/lib/api";

// Dynamic import for Scene360 (Three.js needs client-side only)
const Scene360 = dynamic(() => import("@/components/scene-360"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] md:h-[600px] rounded-xl bg-black/20 flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">Chargement de la vue 360°...</p>
      </div>
    </div>
  ),
});

type AppState = "upload" | "generating" | "result";

// Suggestions de styles prédéfinis
const STYLE_SUGGESTIONS = [
  "Minimaliste moderne",
  "Scandinave cosy",
  "Loft industriel",
  "Bohème éclectique",
  "Zen japonais",
  "Luxe art déco",
];

export default function HomePage() {
  // State management
  const [appState, setAppState] = useState<AppState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [style, setStyle] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [enhancedStyle, setEnhancedStyle] = useState<string | null>(null);
  const [is360Format, setIs360Format] = useState(false);

  // Shopping state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  // Handle file clear
  const handleFileClear = useCallback(() => {
    setSelectedFile(null);
  }, []);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!selectedFile || !style.trim()) {
      toast.error("Veuillez télécharger un plan et entrer un style");
      return;
    }

    setAppState("generating");

    try {
      const response = await generateFurnishedRoom(selectedFile, style);
      setGeneratedImage(response.image);
      setEnhancedStyle(response.enhanced_style);
      setIs360Format(response.format === "equirectangular_360");
      setAppState("result");
      toast.success("Pièce 360° générée avec succès !");
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Échec de la génération"
      );
      setAppState("upload");
    }
  }, [selectedFile, style]);

  // Handle crop complete - search for products
  const handleCropComplete = useCallback(async (croppedImageBase64: string) => {
    setCroppedImage(croppedImageBase64);
    setSheetOpen(true);
    setIsSearching(true);
    setSearchError(null);
    setProducts([]);

    try {
      const response = await searchProducts(croppedImageBase64);
      setProducts(response.products);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchError(
        error instanceof Error ? error.message : "Échec de la recherche de produits"
      );
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Reset to start
  const handleReset = useCallback(() => {
    setAppState("upload");
    setSelectedFile(null);
    setStyle("");
    setGeneratedImage(null);
    setEnhancedStyle(null);
    setIs360Format(false);
    setProducts([]);
    setCroppedImage(null);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* iOS 26 Liquid Glass background - Simplified for performance */}
      {appState !== "result" && (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Static gradient shapes - no animation for better performance */}
          <div 
            className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{
              background: 'linear-gradient(135deg, oklch(0.6 0.2 240 / 0.4) 0%, oklch(0.5 0.25 250 / 0.3) 100%)',
            }}
          />
          <div 
            className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-25"
            style={{
              background: 'linear-gradient(225deg, oklch(0.55 0.22 250 / 0.35) 0%, oklch(0.45 0.2 260 / 0.25) 100%)',
            }}
          />
          <div 
            className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-30"
            style={{
              background: 'linear-gradient(45deg, oklch(0.65 0.18 230 / 0.4) 0%, oklch(0.5 0.23 250 / 0.3) 100%)',
            }}
          />
          <div 
            className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
            style={{
              background: 'linear-gradient(225deg, oklch(0.6 0.2 250 / 0.3) 0%, transparent 100%)',
            }}
          />
        </div>
      )}
      
      {/* Simple dark background for result state */}
      {appState === "result" && (
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background to-background/95" />
      )}

      {/* Header */}
      <header className="liquid-ios26-strong sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-3 cursor-pointer"
              onClick={handleReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="p-2 rounded-xl liquid-ios26-button">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight liquid-text">Aedis</h1>
                <p className="text-xs liquid-text-muted">Design d'intérieur IA</p>
              </div>
            </motion.div>

            {appState === "result" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  className="liquid-ios26-button transition-spring"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Nouveau design
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        <AnimatePresence mode="wait" initial={false}>
          {/* Upload State */}
          {appState === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              {/* Hero Text */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-ios26 text-primary text-sm font-medium mb-4"
                >
                  <Sparkles className="w-4 h-4" />
                  Design d'intérieur propulsé par l'IA
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                >
                  Transformez vos
                  <br />
                  <span className="text-primary">plans architecturaux</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-muted-foreground max-w-md mx-auto"
                >
                  Téléchargez votre plan architectural et regardez l'IA le transformer en
                  une pièce meublée photoréaliste
                </motion.p>
              </div>

              {/* Upload Card */}
              <Card className="liquid-ios26 shadow-2xl">
                <CardContent className="p-6 md:p-8 space-y-6">
                  {/* Dropzone */}
                  <UploadDropzone
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile}
                    onClear={handleFileClear}
                  />

                  {/* Style Input */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Style de design
                    </label>
                    <Input
                      placeholder="Décrivez le style souhaité... (ex: Minimaliste moderne avec tons chauds)"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="h-12 liquid-ios26-input transition-spring"
                    />
                    {/* Style suggestions */}
                    <div className="flex flex-wrap gap-2">
                      {STYLE_SUGGESTIONS.map((suggestion) => (
                        <motion.button
                          key={suggestion}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setStyle(suggestion)}
                          className="px-3 py-1 text-xs rounded-full liquid-ios26 text-muted-foreground hover:text-foreground transition-spring"
                        >
                          {suggestion}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    className="w-full h-12 text-base font-medium liquid-ios26-button transition-spring"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!selectedFile || !style.trim()}
                  >
                    <Wand2 className="w-5 h-5 mr-2" />
                    Générer
                  </Button>
                </CardContent>
              </Card>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12 grid grid-cols-3 gap-4 text-center"
              >
                {[
                  { icon: "✨", label: "Propulsé par l'IA" },
                  { icon: "🎨", label: "Tous les styles" },
                  { icon: "🛒", label: "Acheter" },
                ].map((feature) => (
                  <motion.div 
                    key={feature.label} 
                    className="p-4 liquid-ios26 rounded-xl transition-spring"
                    whileHover={{ scale: 1.05, y: -4 }}
                  >
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <p className="text-sm text-muted-foreground">
                      {feature.label}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Generating State */}
          {appState === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-lg mx-auto text-center py-24"
            >
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-primary/20 border-t-primary"
              />
              <h3 className="text-2xl font-bold mb-2">Création de votre pièce</h3>
              <p className="text-muted-foreground mb-8">
                L'IA transforme votre plan en un design photoréaliste...
              </p>

              {/* Progress steps */}
              <div className="space-y-3 text-left max-w-xs mx-auto">
                {[
                  "Analyse de la structure du plan",
                  "Amélioration du prompt de style",
                  "Génération de la pièce photoréaliste",
                ].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.5 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                    <span className="text-muted-foreground">{step}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Result State */}
          {appState === "result" && generatedImage && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto"
            >
              {/* Result Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-ios26 text-green-500 text-sm font-medium mb-4">
                  <Sparkles className="w-4 h-4" />
                  Génération terminée
                </div>
                <h2 className="text-3xl font-bold mb-2">Votre pièce meublée</h2>
                {enhancedStyle && (
                  <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                    Style : {enhancedStyle}
                  </p>
                )}
              </div>

              {/* Interactive Image - 360° View or Standard Cropper */}
              <Card className="liquid-ios26 overflow-hidden shadow-2xl">
                <CardContent className="p-4 md:p-6">
                  {is360Format ? (
                    <>
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <ShoppingCart className="w-4 h-4" />
                        <span>Vue 360° • Glissez pour explorer • Cliquez sur un meuble pour le rechercher</span>
                      </div>
                      <Scene360
                        imageUrl={generatedImage}
                        onSelectProduct={handleCropComplete}
                      />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <ShoppingCart className="w-4 h-4" />
                        <span>Cliquez et glissez pour sélectionner un meuble à acheter</span>
                      </div>
                      <ImageCropper
                        imageSrc={generatedImage}
                        onCropComplete={handleCropComplete}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-6">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className="liquid-ios26-button"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Recommencer
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    if (generatedImage) {
                      const link = document.createElement("a");
                      link.href = generatedImage;
                      link.download = "aedis-design.png";
                      link.click();
                    }
                  }}
                  className="liquid-ios26-button"
                >
                  Télécharger l'image
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product Sheet */}
      <ProductSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        products={products}
        isLoading={isSearching}
        error={searchError}
        croppedImage={croppedImage}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 mt-auto liquid-ios26">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Aedis — Transformez vos plans en pièces photoréalistes
          </p>
        </div>
      </footer>
    </main>
  );
}
