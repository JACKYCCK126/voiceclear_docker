import type { UploadResponse, AudioTask, HealthResponse } from "@shared/schema";

export class AudioSeparationAPI {
  public baseURL: string;
  private currentTaskId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(baseURL?: string) {
    // Use environment variable or default to Docker network backend URL
    this.baseURL = baseURL || process.env.VITE_BACKEND_URL || 'http://backend:5000';
  }

  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // 不再記錄為錯誤，健康檢查失敗是正常的（ngrok失效時）
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('無法連接到API服務，請檢查網址是否正確');
      }
      throw error;
    }
  }

  async uploadAudio(audioFile: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioFile);

      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || '上傳失敗');
      }

      const data = await response.json();
      this.currentTaskId = data.task_id;
      return data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  async getTaskStatus(taskId: string): Promise<AudioTask> {
    try {
      const response = await fetch(`${this.baseURL}/api/status/${taskId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || '查詢失敗');
      }

      return await response.json();
    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  }

  async downloadResult(taskId: string): Promise<{ blob: Blob; filename: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/download/${taskId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || '下載失敗');
      }

      const blob = await response.blob();
      const filename = this.getFilenameFromResponse(response) || 'separated_audio.wav';
      
      return { blob, filename };
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  private getFilenameFromResponse(response: Response): string | null {
    const disposition = response.headers.get('Content-Disposition');
    if (disposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (matches != null && matches[1]) {
        return matches[1].replace(/['"]/g, '');
      }
    }
    return null;
  }

  startPolling(
    taskId: string,
    onUpdate: (status: AudioTask) => void,
    onComplete: (result: AudioTask) => void,
    onError: (error: Error) => void
  ): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const status = await this.getTaskStatus(taskId);
        onUpdate(status);

        if (status.status === 'completed') {
          this.stopPolling();
          onComplete(status);
        } else if (status.status === 'failed') {
          this.stopPolling();
          onError(new Error(status.error || '處理失敗'));
        }
      } catch (error) {
        this.stopPolling();
        onError(error instanceof Error ? error : new Error('Unknown polling error'));
      }
    }, 2000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  createAudioPlayer(blob: Blob): HTMLAudioElement {
    const audioUrl = URL.createObjectURL(blob);
    const audio = document.createElement('audio');
    audio.src = audioUrl;
    audio.controls = true;
    audio.className = 'w-full';
    return audio;
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
