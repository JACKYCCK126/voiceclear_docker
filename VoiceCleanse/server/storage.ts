// import { type User, type InsertUser } from "@shared/schema"; // Not used in this audio app
import { randomUUID } from "crypto";
import { type ApiConfig } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Audio app doesn't need user management for now
  // getUser(id: string): Promise<User | undefined>;
  // getUserByUsername(username: string): Promise<User | undefined>;
  // createUser(user: InsertUser): Promise<User>;
  
  // API配置管理
  getApiConfig(): Promise<ApiConfig | null>;
  setApiConfig(config: Omit<ApiConfig, 'id' | 'updatedAt'>): Promise<ApiConfig>;
}

export class MemStorage implements IStorage {
  private apiConfig: ApiConfig | null = null;
  
  constructor() {
    // 初始化默認API配置
    this.apiConfig = {
      id: randomUUID(),
      apiUrl: 'https://047d79d2429a.ngrok-free.app', // 默認API URL
      isActive: true,
      description: '預設音頻處理API服務',
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };
  }
  
  async getApiConfig(): Promise<ApiConfig | null> {
    return this.apiConfig;
  }
  
  async setApiConfig(config: Omit<ApiConfig, 'id' | 'updatedAt'>): Promise<ApiConfig> {
    this.apiConfig = {
      ...config,
      id: this.apiConfig?.id || randomUUID(),
      updatedAt: new Date().toISOString()
    };
    return this.apiConfig;
  }
}

export const storage = new MemStorage();

// 管理員密碼（實際部署時應該使用環境變數）
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fculab224';
