import type { ApiConfig, UpdateApiConfigRequest } from "@shared/schema";

class ApiConfigService {
  private cachedConfig: ApiConfig | null = null;
  private configPromise: Promise<ApiConfig> | null = null;

  // 獲取API配置（帶緩存）
  async getConfig(): Promise<ApiConfig> {
    // 如果有緩存且較新（5分鐘內），直接返回
    if (this.cachedConfig) {
      const cacheAge = Date.now() - new Date(this.cachedConfig.updatedAt).getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5分鐘緩存
        return this.cachedConfig;
      }
    }

    // 如果已經在請求中，返回同一個Promise
    if (this.configPromise) {
      return this.configPromise;
    }

    // 發起新的請求
    this.configPromise = this.fetchConfig();
    
    try {
      const config = await this.configPromise;
      this.cachedConfig = config;
      return config;
    } finally {
      this.configPromise = null;
    }
  }

  // 從服務器獲取配置
  private async fetchConfig(): Promise<ApiConfig> {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const config = await response.json();
      return config;
    } catch (error) {
      console.error('獲取API配置失敗:', error);
      // 返回默認配置（使用環境變數或Docker網路地址）
      return {
        apiUrl: process.env.VITE_BACKEND_URL || 'http://backend:5000',
        isActive: false,
        description: '無法連接到配置服務器，使用默認配置',
        updatedAt: new Date().toISOString()
      } as ApiConfig;
    }
  }

  // 更新API配置（管理員功能）
  async updateConfig(request: UpdateApiConfigRequest): Promise<ApiConfig> {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || '配置更新失敗');
      }

      const result = await response.json();
      this.cachedConfig = result.config; // 更新緩存
      return result.config;
    } catch (error) {
      console.error('更新API配置失敗:', error);
      throw error;
    }
  }

  // 清除緩存（強制重新獲取）
  clearCache(): void {
    this.cachedConfig = null;
    this.configPromise = null;
  }

  // 獲取當前緩存的API URL（同步方法）
  getCachedApiUrl(): string | null {
    return this.cachedConfig?.apiUrl || null;
  }
}

export const apiConfigService = new ApiConfigService();