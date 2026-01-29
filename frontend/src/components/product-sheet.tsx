"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ShoppingBag, Package, AlertCircle } from "lucide-react";
import type { Product } from "@/lib/api";

interface ProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  isLoading: boolean;
  error?: string | null;
  croppedImage?: string | null;
}

export function ProductSheet({
  open,
  onOpenChange,
  products,
  isLoading,
  error,
  croppedImage,
}: ProductSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Produits similaires
          </SheetTitle>
          <SheetDescription>
            {isLoading ? "Recherche..." : `${products.length} produit${products.length > 1 ? 's' : ''} correspondant${products.length > 1 ? 's' : ''} trouvé${products.length > 1 ? 's' : ''}`}
          </SheetDescription>
        </SheetHeader>

        {/* Cropped image preview */}
        {croppedImage && (
          <div className="mb-6 p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Recherche de :</p>
            <img
              src={croppedImage}
              alt="Meuble sélectionné"
              className="w-full max-h-32 object-contain rounded-md"
            />
          </div>
        )}

        {/* Loading state - simple, no animations */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Aucun produit correspondant trouvé. Essayez de sélectionner un autre élément.
            </p>
          </div>
        )}

        {/* Products list - no animations */}
        {!isLoading && !error && products.length > 0 && (
          <div className="space-y-4">
            {products.map((product, index) => (
              <Card key={`${product.link}-${index}`} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {(product.image || product.thumbnail) && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={product.image || product.thumbnail}
                          alt={product.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">
                        {product.title}
                      </h4>
                      {product.source && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {product.source}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        {product.price && product.price !== "N/A" && (
                          <span className="font-semibold text-primary">
                            {typeof product.price === "number"
                              ? `${product.currency || "$"}${product.price.toFixed(2)}`
                              : product.price}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto"
                          asChild
                        >
                          <a
                            href={product.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Voir
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
