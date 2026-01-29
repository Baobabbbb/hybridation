"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Wand2,
  ArrowLeft,
  Loader2,
  ShoppingCart,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ImageCropper } from "@/components/image-cropper";
import { ProductSheet } from "@/components/product-sheet";
import dynamic from "next/dynamic";
import Image from "next/image";
import { generateFurnishedRoom, searchProducts, type Product } from "@/lib/api";

// Dynamic import for Scene360 (Three.js needs client-side only)
const Scene360 = dynamic(() => import("@/components/scene-360"), {
  ssr: false,
  loading: () => (
      <div className="w-full h-[500px] md:h-[600px] rounded-xl bg-white/20 flex items-center justify-center">
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
  "Contemporain épuré",
  "Campagne française",
  "Côtier méditerranéen",
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

  // Handle test image download and load
  const handleTestImage = useCallback(async (imageName: string, displayName: string) => {
    try {
      const response = await fetch(`/${imageName}`);
      const blob = await response.blob();
      const file = new File([blob], imageName, { type: blob.type });
      setSelectedFile(file);
      toast.success(`${displayName} chargé avec succès !`);
    } catch (error) {
      console.error("Failed to load test image:", error);
      toast.error("Erreur lors du chargement de l'image de test");
    }
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
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header - Transparent */}
      <header className="sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-1 sm:py-2">
          <div className="flex items-center justify-between gap-2">
            <div
              className="flex items-center cursor-pointer min-w-0 flex-1 group"
              onClick={handleReset}
            >
              <Image
                src="/logo-8.png"
                alt="Aedis - Design d'intérieur IA"
                width={250}
                height={75}
                className="h-16 sm:h-20 md:h-24 w-auto object-contain transition-opacity group-hover:opacity-90"
                priority
              />
            </div>

            {appState === "result" && (
              <div className="flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  className="liquid-ios26-button transition-spring text-xs sm:text-sm px-2 sm:px-3"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Nouveau design</span>
                  <span className="sm:hidden">Nouveau</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 pt-2 sm:pt-3 pb-8 sm:pb-12 md:pb-20 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {/* Upload State */}
          {appState === "upload" && (
            <div
              key="upload"
              className="max-w-2xl mx-auto"
            >
              {/* Hero Text */}
              <div className="text-center mb-12 sm:mb-16 md:mb-20">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full liquid-ios26 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="whitespace-nowrap">Design d'intérieur propulsé par l'IA</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4 px-2 liquid-text">
                  Transformez vos
                  <br />
                  <span className="text-primary inline-block">
                    plans architecturaux
                  </span>
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto px-2">
                  Téléchargez votre plan architectural et regardez l'IA le transformer en
                  une pièce meublée photoréaliste
                </p>
              </div>

              {/* Upload Card - Responsive avec plus d'espacement */}
              <Card className="liquid-ios26 liquid-ios26-no-animation liquid-ios26-no-hover shadow-2xl">
                <CardContent className="p-5 sm:p-6 md:p-8 lg:p-10 space-y-5 sm:space-y-6 md:space-y-8">
                  {/* Dropzone */}
                  <UploadDropzone
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile}
                    onClear={handleFileClear}
                  />

                  {/* Test Images Section */}
                  {!selectedFile && (
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground text-center block">
                        Ou essayez avec une image de test :
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                          onClick={() => handleTestImage("plan-test.jpg", "Plan de test")}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl liquid-ios26-button text-sm sm:text-base font-medium"
                        >
                          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Plan de test</span>
                        </button>
                        <button
                          onClick={() => handleTestImage("chambre.jpg", "Chambre de test")}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl liquid-ios26-button text-sm sm:text-base font-medium"
                        >
                          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Chambre de test</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Style Input - Responsive */}
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-foreground">
                      Style de design
                    </label>
                    <Input
                      placeholder="Décrivez le style souhaité..."
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="h-10 sm:h-12 text-sm sm:text-base liquid-ios26-input transition-spring"
                    />
                    {/* Style suggestions */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {STYLE_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setStyle(suggestion)}
                          className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full liquid-ios26 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!selectedFile || !style.trim()}
                  >
                    <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                    <span>Générer</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Features */}
              <div className="mt-16 sm:mt-20 md:mt-24 grid grid-cols-3 gap-4 sm:gap-6 text-center">
                {[
                  { icon: "✨", label: "Propulsé par l'IA" },
                  { icon: "🎨", label: "Tous les styles" },
                  { icon: "🛒", label: "Acheter" },
                ].map((feature) => (
                  <div 
                    key={feature.label}
                    className="p-4 sm:p-5 md:p-6 liquid-ios26 liquid-ios26-no-hover rounded-xl animate-breathing"
                  >
                    <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">
                      {feature.icon}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {feature.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generating State */}
          {appState === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ 
                duration: 0.6,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="max-w-lg mx-auto text-center py-24"
            >
              <motion.div
                className="relative w-20 h-20 mx-auto mb-8"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full bg-primary/10"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl sm:text-3xl font-bold mb-3 liquid-text"
              >
                Création de votre pièce
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground mb-10 text-sm sm:text-base"
              >
                L'IA transforme votre plan en un design photoréaliste...
              </motion.p>

              {/* Progress steps - Amélioré */}
              <div className="space-y-4 text-left max-w-xs mx-auto">
                {[
                  "Analyse de la structure du plan",
                  "Amélioration du prompt de style",
                  "Génération de la pièce photoréaliste",
                ].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      delay: 0.4 + i * 0.3,
                      duration: 0.5,
                      ease: [0.23, 1, 0.32, 1]
                    }}
                    className="flex items-center gap-3 text-sm group"
                  >
                    <motion.div
                      className="relative"
                      animate={{ 
                        scale: [1, 1.3, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="w-3 h-3 rounded-full bg-primary relative z-10" />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/30"
                        animate={{ 
                          scale: [1, 2, 1],
                          opacity: [0.5, 0, 0.5]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.4,
                        }}
                      />
                    </motion.div>
                    <motion.span
                      className="text-muted-foreground group-hover:text-foreground transition-colors"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                    >
                      {step}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Result State - Avec animations améliorées */}
          {appState === "result" && generatedImage && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ 
                duration: 0.6,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="max-w-5xl mx-auto"
            >
              {/* Result Header - Responsive avec plus d'espacement et animations améliorées */}
              <div className="text-center mb-8 sm:mb-12 md:mb-16 px-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ 
                    delay: 0.1,
                    duration: 0.5,
                    ease: [0.34, 1.56, 0.64, 1]
                  }}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full liquid-ios26 text-green-500 text-xs sm:text-sm font-medium mb-3 sm:mb-4"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </motion.div>
                  Génération terminée
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 0.2,
                    duration: 0.6,
                    ease: [0.23, 1, 0.32, 1]
                  }}
                  className="text-2xl sm:text-3xl font-bold mb-2 liquid-text"
                >
                  Votre pièce meublée
                </motion.h2>
                {enhancedStyle && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: 0.3,
                      duration: 0.5
                    }}
                    className="text-muted-foreground text-xs sm:text-sm max-w-xl mx-auto px-2"
                  >
                    Style : {enhancedStyle}
                  </motion.p>
                )}
              </div>

              {/* Interactive Image - 360° View or Standard Cropper - Responsive avec plus d'espacement */}
              <Card className="liquid-ios26 overflow-hidden shadow-2xl">
                <CardContent className="p-3 sm:p-5 md:p-6 lg:p-8">
                  {is360Format ? (
                    <>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 text-xs sm:text-sm text-muted-foreground px-1">
                        <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Vue 360° • Glissez pour explorer • Cliquez sur un meuble pour le rechercher</span>
                        <span className="sm:hidden">Vue 360° • Glissez pour explorer</span>
                      </div>
                      <Scene360
                        imageUrl={generatedImage}
                        onSelectProduct={handleCropComplete}
                      />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 text-xs sm:text-sm text-muted-foreground px-1">
                        <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Cliquez et glissez pour sélectionner un meuble à acheter</span>
                        <span className="sm:hidden">Cliquez et glissez pour sélectionner</span>
                      </div>
                      <ImageCropper
                        imageSrc={generatedImage}
                        onCropComplete={handleCropComplete}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons - Responsive avec plus d'espacement et animations améliorées */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.4,
                  duration: 0.5,
                  ease: [0.23, 1, 0.32, 1]
                }}
                className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-8 sm:mt-10 md:mt-12 px-2"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                    className="liquid-ios26-button w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10 group relative overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 relative z-10" />
                    <span className="relative z-10">Recommencer</span>
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
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
                    className="liquid-ios26-button w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10 group relative overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 group-hover:opacity-100"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                    <span className="relative z-10 hidden sm:inline">Télécharger l'image</span>
                    <span className="relative z-10 sm:hidden">Télécharger</span>
                  </Button>
                </motion.div>
              </motion.div>
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

      {/* Footer - Transparent */}
      <footer className="py-6 sm:py-8 md:py-10 mt-auto mb-4 sm:mb-6 md:mb-8">
        <div className="container mx-auto px-3 sm:px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>
            Aedis — Transformez vos plans en pièces photoréalistes
          </p>
        </div>
      </footer>
    </main>
  );
}
