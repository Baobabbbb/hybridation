"use client";

import { useState, useCallback } from "react";
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
import { generateFurnishedRoom, searchProducts, type Product } from "@/lib/api";

type AppState = "upload" | "generating" | "result";

// Predefined style suggestions
const STYLE_SUGGESTIONS = [
  "Modern minimalist",
  "Scandinavian cozy",
  "Industrial loft",
  "Bohemian eclectic",
  "Japanese zen",
  "Art deco luxury",
];

export default function HomePage() {
  // State management
  const [appState, setAppState] = useState<AppState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [style, setStyle] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [enhancedStyle, setEnhancedStyle] = useState<string | null>(null);

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
      toast.error("Please upload a floor plan and enter a style");
      return;
    }

    setAppState("generating");

    try {
      const response = await generateFurnishedRoom(selectedFile, style);
      setGeneratedImage(response.image);
      setEnhancedStyle(response.enhanced_style);
      setAppState("result");
      toast.success("Room generated successfully!");
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate room"
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
        error instanceof Error ? error.message : "Failed to search products"
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
    setProducts([]);
    setCroppedImage(null);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Gradient background effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent rotate-12" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/5 via-transparent to-transparent -rotate-12" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-3 cursor-pointer"
              onClick={handleReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="p-2 rounded-xl bg-primary/10">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Plan2Shop</h1>
                <p className="text-xs text-muted-foreground">AI Interior Design</p>
              </div>
            </motion.div>

            {appState === "result" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  New Design
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        <AnimatePresence mode="wait">
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
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
                >
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Interior Design
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                >
                  Transform Your
                  <br />
                  <span className="text-primary">Floor Plans</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-muted-foreground max-w-md mx-auto"
                >
                  Upload your architectural plan and watch AI transform it into
                  a photorealistic furnished room
                </motion.p>
              </div>

              {/* Upload Card */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
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
                      Design Style
                    </label>
                    <Input
                      placeholder="Describe your desired style... (e.g., Modern minimalist with warm tones)"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="h-12"
                    />
                    {/* Style suggestions */}
                    <div className="flex flex-wrap gap-2">
                      {STYLE_SUGGESTIONS.map((suggestion) => (
                        <motion.button
                          key={suggestion}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setStyle(suggestion)}
                          className="px-3 py-1 text-xs rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {suggestion}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    className="w-full h-12 text-base font-medium"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!selectedFile || !style.trim()}
                  >
                    <Wand2 className="w-5 h-5 mr-2" />
                    Magic Generate
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
                  { icon: "✨", label: "AI-Powered" },
                  { icon: "🎨", label: "Any Style" },
                  { icon: "🛒", label: "Shop Items" },
                ].map((feature) => (
                  <div key={feature.label} className="p-4">
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <p className="text-sm text-muted-foreground">
                      {feature.label}
                    </p>
                  </div>
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
              <h3 className="text-2xl font-bold mb-2">Creating Your Room</h3>
              <p className="text-muted-foreground mb-8">
                AI is transforming your floor plan into a photorealistic design...
              </p>

              {/* Progress steps */}
              <div className="space-y-3 text-left max-w-xs mx-auto">
                {[
                  "Analyzing floor plan structure",
                  "Enhancing style prompt",
                  "Generating photorealistic room",
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto"
            >
              {/* Result Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium mb-4"
                >
                  <Sparkles className="w-4 h-4" />
                  Generation Complete
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">Your Furnished Room</h2>
                {enhancedStyle && (
                  <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                    Style: {enhancedStyle}
                  </p>
                )}
              </div>

              {/* Interactive Image */}
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <ShoppingCart className="w-4 h-4" />
                    <span>Click and drag to select a furniture piece to shop</span>
                  </div>
                  <ImageCropper
                    imageSrc={generatedImage}
                    onCropComplete={handleCropComplete}
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center gap-4 mt-6"
              >
                <Button variant="outline" onClick={handleReset}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    if (generatedImage) {
                      const link = document.createElement("a");
                      link.href = generatedImage;
                      link.download = "plan2shop-design.png";
                      link.click();
                    }
                  }}
                >
                  Download Image
                </Button>
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

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Plan2Shop AI — Transform floor plans into photorealistic rooms
          </p>
        </div>
      </footer>
    </main>
  );
}
