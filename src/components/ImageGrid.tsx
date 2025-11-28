import { X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ImageData {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  dimensions?: { width: number; height: number };
}

interface ImageGridProps {
  images: ImageData[];
  onRemoveImage: (id: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export const ImageGrid = ({ images, onRemoveImage }: ImageGridProps) => {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ImageIcon className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No images uploaded yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload images to get started with organizing and exporting to Google Sheets
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => (
        <Card
          key={image.id}
          className="group relative overflow-hidden transition-all duration-300 hover:shadow-medium"
        >
          <div className="aspect-square relative bg-muted">
            <img
              src={image.preview}
              alt={image.name}
              className="w-full h-full object-cover"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              onClick={() => onRemoveImage(image.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3 space-y-1">
            <p className="text-sm font-medium truncate text-foreground" title={image.name}>
              {image.name}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatFileSize(image.size)}</span>
              {image.dimensions && (
                <span>
                  {image.dimensions.width} × {image.dimensions.height}
                </span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
