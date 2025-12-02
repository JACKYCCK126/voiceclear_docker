import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface WaveformDisplayProps {
  originalAudioBlob: Blob | null;
  processedAudioBlob: Blob | null;
  title?: string;
}

export function WaveformDisplay({ originalAudioBlob, processedAudioBlob, title = "音頻波形對比" }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeAudio = async (audioBlob: Blob): Promise<Float32Array> => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 獲取單聲道數據（如果是立體聲，取平均值）
      const channelData = audioBuffer.getChannelData(0);
      const length = channelData.length;
      
      // 降採樣到合適的點數以便顯示（例如1000個點）
      const sampleSize = Math.min(1000, length);
      const blockSize = Math.floor(length / sampleSize);
      const waveformData = new Float32Array(sampleSize);
      
      for (let i = 0; i < sampleSize; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j] || 0);
        }
        waveformData[i] = sum / blockSize;
      }
      
      audioContext.close();
      return waveformData;
    } catch (err) {
      console.error('Audio analysis error:', err);
      throw new Error('音頻分析失敗');
    }
  };

  const drawWaveform = (
    canvas: HTMLCanvasElement,
    originalData: Float32Array | null,
    processedData: Float32Array | null
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Cannot get canvas context');
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    
    console.log('Canvas dimensions:', width, 'x', height);
    
    // 清空畫布
    ctx.clearRect(0, 0, width, height);
    
    // 背景
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);
    
    // 網格線
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    // 水平中線
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    // 垂直參考線
    for (let i = 1; i < 10; i++) {
      const x = (width / 10) * i;
      ctx.moveTo(x, 10);
      ctx.lineTo(x, height - 10);
    }
    ctx.stroke();

    const drawData = (data: Float32Array, color: string, lineWidth: number = 2, alpha: number = 1) => {
      if (!data || data.length === 0) {
        console.log('No data to draw');
        return;
      }
      
      console.log(`Drawing ${color} waveform with ${data.length} points`);
      
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      
      let maxAmplitude = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] > maxAmplitude) {
          maxAmplitude = data[i];
        }
      }
      
      console.log(`Max amplitude: ${maxAmplitude}`);
      const scale = maxAmplitude > 0 ? (height / 4) / maxAmplitude : 1; // 使用1/4高度作為縮放
      
      // 繪製上半部分
      let hasMovedTo = false;
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * width;
        const y = height / 2 - (data[i] * scale);
        
        if (!hasMovedTo) {
          ctx.moveTo(x, y);
          hasMovedTo = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // 繪製下半部分（鏡像）
      ctx.beginPath();
      hasMovedTo = false;
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * width;
        const y = height / 2 + (data[i] * scale);
        
        if (!hasMovedTo) {
          ctx.moveTo(x, y);
          hasMovedTo = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };
    
    // 繪製原始音頻波形（藍色，較淡）
    if (originalData) {
      drawData(originalData, '#3b82f6', 1.5, 0.6);
    }
    
    // 繪製處理後音頻波形（綠色，較亮）
    if (processedData) {
      drawData(processedData, '#10b981', 2, 0.9);
    }
    
    // 如果沒有數據，繪製示例波形
    if (!originalData && !processedData) {
      console.log('No data available, drawing sample waveform');
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        const y = height / 2 + Math.sin((i / width) * Math.PI * 8) * 20;
        if (i === 0) {
          ctx.moveTo(i, y);
        } else {
          ctx.lineTo(i, y);
        }
      }
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
  };

  useEffect(() => {
    const generateWaveforms = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // 先設定Canvas尺寸
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 128;
        
        canvas.width = width;
        canvas.height = height;
        
        let originalData: Float32Array | null = null;
        let processedData: Float32Array | null = null;
        
        if (originalAudioBlob) {
          console.log('Analyzing original audio...');
          originalData = await analyzeAudio(originalAudioBlob);
          console.log('Original data length:', originalData.length);
        }
        
        if (processedAudioBlob) {
          console.log('Analyzing processed audio...');
          processedData = await analyzeAudio(processedAudioBlob);
          console.log('Processed data length:', processedData.length);
        }
        
        console.log('Drawing waveform...');
        drawWaveform(canvas, originalData, processedData);
        
      } catch (err) {
        console.error('Waveform generation error:', err);
        setError(err instanceof Error ? err.message : '生成波形失敗');
      } finally {
        setIsLoading(false);
      }
    };

    // 延遲執行，確保DOM元素已經渲染
    const timer = setTimeout(() => {
      if (originalAudioBlob || processedAudioBlob) {
        generateWaveforms();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [originalAudioBlob, processedAudioBlob]);

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="mb-3">
          <h4 className="font-semibold text-foreground flex items-center">
            <i className="fas fa-chart-line text-primary mr-2"></i>
            {title}
          </h4>
          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-blue-500 opacity-70"></div>
              <span>原始音頻</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span>處理後音頻</span>
            </div>
          </div>
        </div>
        
        <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
              <div className="flex items-center space-x-2">
                <i className="fas fa-spinner fa-spin text-primary"></i>
                <span className="text-sm text-muted-foreground">分析音頻中...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50">
              <div className="flex items-center space-x-2 text-red-600">
                <i className="fas fa-exclamation-triangle"></i>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: isLoading || error ? 'none' : 'block' }}
          />
          
          {!isLoading && !error && !originalAudioBlob && !processedAudioBlob && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <i className="fas fa-volume-mute text-2xl mb-2 block"></i>
                <span className="text-sm">等待音頻載入...</span>
              </div>
            </div>
          )}
        </div>
        
        {!isLoading && !error && (originalAudioBlob || processedAudioBlob) && (
          <div className="mt-3 text-xs text-muted-foreground">
            <i className="fas fa-info-circle mr-1"></i>
            波形圖顯示音頻信號的振幅變化，綠色線條代表AI處理後的增強效果
          </div>
        )}
      </CardContent>
    </Card>
  );
}