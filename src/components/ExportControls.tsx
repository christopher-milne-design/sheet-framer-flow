import { FileSpreadsheet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ExportControlsProps {
  imageCount: number;
  onExportToSheets: () => void;
  onClearAll: () => void;
  isExporting: boolean;
}

export const ExportControls = ({
  imageCount,
  onExportToSheets,
  onClearAll,
  isExporting,
}: ExportControlsProps) => {
  return (
    <Card className="p-6 bg-gradient-subtle border-border shadow-soft">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Ready to Export
          </h3>
          <p className="text-sm text-muted-foreground">
            {imageCount} {imageCount === 1 ? "image" : "images"} prepared for Google Sheets
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClearAll}
            disabled={imageCount === 0 || isExporting}
            className="min-w-[120px]"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button
            onClick={onExportToSheets}
            disabled={imageCount === 0 || isExporting}
            className="min-w-[180px] bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export to Sheets"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
