import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
  onBack: () => void;
}

export function ErrorDisplay({ error, onRetry, onBack }: ErrorDisplayProps) {
  return (
    <Card className="border-destructive/20" data-testid="error-section">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-destructive"></i>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-destructive">處理失敗</h3>
            <p className="text-sm text-muted-foreground">抱歉，處理過程中發生了錯誤</p>
          </div>
        </div>
        
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-destructive font-mono" data-testid="error-message">
            {error}
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={onRetry}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-retry"
          >
            <i className="fas fa-redo mr-2"></i>
            重新嘗試
          </Button>
          <Button
            onClick={onBack}
            variant="outline"
            data-testid="button-back-to-upload"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            返回上傳
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
