import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  onSampleTest: (sampleType: 'simple' | 'complex') => void;
  selectedFile: File | null;
  onClearFile: () => void;
  disabled?: boolean;
}

export function AudioUploader({ onFileSelect, onSampleTest, selectedFile, onClearFile, disabled }: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedExtensions = ['.wav', '.mp3', '.flac', '.ogg', '.m4a'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (file.size > maxSize) {
      alert('文件過大，請選擇小於50MB的文件');
      return;
    }

    if (!allowedExtensions.includes(fileExtension)) {
      alert('不支援的文件格式，請使用WAV/MP3/FLAC/OGG/M4A格式');
      return;
    }

    // M4A格式兼容性提示
    if (fileExtension === '.m4a') {
      const shouldContinue = confirm(
        'M4A格式可能存在兼容性問題。\n\n如果遇到處理失敗，建議轉換為WAV格式以獲得最佳兼容性。\n\n是否要繼續使用M4A格式？'
      );
      if (!shouldContinue) {
        return;
      }
    }

    onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
        handleFileSelect({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [handleFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <i className="fas fa-upload text-primary"></i>
          <h2 className="text-xl font-semibold text-foreground">音頻文件上傳</h2>
        </div>
        
        <div 
          className={`drop-zone border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-8 text-center cursor-pointer transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="audio-upload-area"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <i className="fas fa-cloud-upload-alt text-2xl text-muted-foreground"></i>
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">點擊選擇音頻文件</p>
              <p className="text-sm text-muted-foreground">或直接拖拽文件到此區域</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {['WAV', 'MP3', 'FLAC', 'OGG', 'M4A'].map(format => (
                <span key={format} className="px-2 py-1 bg-muted rounded-full text-xs font-mono text-muted-foreground">
                  {format}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">最大文件大小: 50MB</p>
            
            {/* 範例測試按鈕 */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSampleTest('simple');
                  }}
                  variant="outline" 
                  className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 w-full"
                  disabled={disabled}
                  data-testid="button-sample-test-simple"
                >
                  <i className="fas fa-play-circle mr-2 text-blue-600"></i>
                  🎵 CASE1:一般環境例子
                </Button>
                
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSampleTest('complex');
                  }}
                  variant="outline" 
                  className="bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border-orange-200 w-full"
                  disabled={disabled}
                  data-testid="button-sample-test-complex"
                >
                  <i className="fas fa-play-circle mr-2 text-orange-600"></i>
                  🎵 CASE2:複雜環境例子
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                沒有音頻檔案？試試我們的範例混合音頻
              </p>
            </div>
          </div>
        </div>
        
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".wav,.mp3,.flac,.ogg,.m4a" 
          className="hidden"
          onChange={handleFileSelect}
          data-testid="audio-file-input"
        />
        
        {selectedFile && (
          <div className="mt-4 p-4 bg-muted rounded-lg" data-testid="selected-file-info">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <i className="fas fa-file-audio text-secondary"></i>
                <div>
                  <p className="font-medium text-foreground" data-testid="file-name">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground" data-testid="file-size">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFile}
                className="text-destructive hover:bg-destructive/10 p-2 rounded-full"
                data-testid="button-remove-file"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
