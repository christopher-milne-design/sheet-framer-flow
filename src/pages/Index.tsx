import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageGrid, ImageData } from "@/components/ImageGrid";
import { ExportControls } from "@/components/ExportControls";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet } from "lucide-react";

const Index = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleImagesSelected = async (files: File[]) => {
    const newImages: ImageData[] = [];

    for (const file of files) {
      const id = `${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);

      // Get image dimensions
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.src = preview;
      });

      newImages.push({
        id,
        file,
        preview,
        name: file.name,
        size: file.size,
        dimensions,
      });
    }

    setImages((prev) => [...prev, ...newImages]);
    toast({
      title: "Images uploaded",
      description: `${newImages.length} image${newImages.length > 1 ? "s" : ""} added successfully`,
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleClearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    toast({
      title: "Images cleared",
      description: "All images have been removed",
    });
  };

  const handleExportToSheets = async () => {
    setIsExporting(true);
    
    // TODO: Implement Google Sheets API integration
    // For now, just simulate the export
    setTimeout(() => {
      setIsExporting(false);
      toast({
        title: "Export functionality",
        description: "Google Sheets integration will be set up next. For now, image data is prepared for export.",
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-12 text-center animate-in fade-in duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-medium">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Image to Sheets Exporter
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload images, organize them, and export metadata to Google Sheets for easy import into Framer CMS
          </p>
        </header>

        {/* Upload Area */}
        <div className="mb-8 animate-in slide-in-from-bottom-4 duration-700 delay-100">
          <ImageUploader onImagesSelected={handleImagesSelected} />
        </div>

        {/* Export Controls */}
        {images.length > 0 && (
          <div className="mb-8 animate-in slide-in-from-bottom-4 duration-700 delay-200">
            <ExportControls
              imageCount={images.length}
              onExportToSheets={handleExportToSheets}
              onClearAll={handleClearAll}
              isExporting={isExporting}
            />
          </div>
        )}

        {/* Image Grid */}
        <div className="animate-in slide-in-from-bottom-4 duration-700 delay-300">
          <ImageGrid images={images} onRemoveImage={handleRemoveImage} />
        </div>
      </div>
    </div>
  );
};

export default Index;
