import { Upload } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
}

export const ImageUploader = ({ onImagesSelected }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      
      if (files.length > 0) {
        onImagesSelected(files);
      }
    },
    [onImagesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files).filter((file) =>
          file.type.startsWith("image/")
        );
        if (files.length > 0) {
          onImagesSelected(files);
        }
      }
    },
    [onImagesSelected]
  );

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-xl transition-all duration-300",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <label className="flex flex-col items-center justify-center p-12 cursor-pointer">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300",
          isDragging ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground"
        )}>
          <Upload className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-foreground">
          {isDragging ? "Drop images here" : "Upload Images"}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Drag and drop your images here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supports: JPG, PNG, GIF, WebP
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
      </label>
    </div>
  );
};
