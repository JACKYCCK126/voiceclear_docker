import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ProcessingProgressProps {
  progress: number;
  status: string;
  startTime: number;
  estimatedTime?: number;
}

export function ProcessingProgress({ progress, status, startTime, estimatedTime }: ProcessingProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const processingSpeed = progress > 0 && elapsedTime > 0 ? Math.round(progress / elapsedTime) : 0;

  return (
    <Card data-testid="processing-section">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            <i className="fas fa-cogs text-secondary mr-2"></i>
            處理進度
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-muted-foreground" data-testid="processing-status">
              處理中...
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">處理進度</span>
            <span className="text-sm font-bold text-primary" data-testid="progress-percentage">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className="progress-fill h-full bg-gradient-to-r from-primary to-secondary rounded-full" 
              style={{ width: `${progress}%` }}
              data-testid="progress-bar"
            ></div>
          </div>
        </div>
        
        {/* Processing Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl text-primary mb-1">
              <i className="fas fa-clock"></i>
            </div>
            <p className="text-xs text-muted-foreground">已處理時間</p>
            <p className="text-lg font-bold text-foreground" data-testid="elapsed-time">
              {elapsedTime}s
            </p>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl text-secondary mb-1">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <p className="text-xs text-muted-foreground">預估剩餘</p>
            <p className="text-lg font-bold text-foreground" data-testid="estimated-time">
              {estimatedTime ? `${estimatedTime}s` : '--'}
            </p>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl text-emerald-600 mb-1">
              <i className="fas fa-tachometer-alt"></i>
            </div>
            <p className="text-xs text-muted-foreground">處理速度</p>
            <p className="text-lg font-bold text-foreground" data-testid="processing-speed">
              {processingSpeed > 0 ? `${processingSpeed}%/s` : '--'}
            </p>
          </div>
        </div>
        
        {/* Current Status Message */}
        <div className="mt-4 p-4 bg-accent rounded-lg">
          <p className="text-sm text-accent-foreground" data-testid="status-message">
            <i className="fas fa-info-circle mr-2"></i>
            {status}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
