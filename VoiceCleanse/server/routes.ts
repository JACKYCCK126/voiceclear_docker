import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, ADMIN_PASSWORD } from "./storage";
import { emailService } from "./emailService";
import { apiMonitor } from "./apiMonitor";
import { updateApiConfigSchema } from "@shared/schema";
import * as path from "path";
import * as fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // API配置管理路由
  
  // 獲取當前API配置
  app.get('/api/config', async (req, res) => {
    try {
      const config = await storage.getApiConfig();
      if (!config) {
        return res.status(404).json({ error: 'API配置未找到' });
      }
      // 不返回敏感信息，只返回必要的配置
      res.json({
        apiUrl: config.apiUrl,
        isActive: config.isActive,
        description: config.description,
        updatedAt: config.updatedAt
      });
    } catch (error) {
      console.error('獲取API配置失敗:', error);
      res.status(500).json({ error: '伺服器錯誤' });
    }
  });
  
  // 更新API配置（需要管理員密碼）
  app.post('/api/config', async (req, res) => {
    try {
      const validatedData = updateApiConfigSchema.parse(req.body);
      
      // 驗證管理員密碼
      if (validatedData.adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: '管理員密碼錯誤' });
      }
      
      // 更新API配置
      const updatedConfig = await storage.setApiConfig({
        apiUrl: validatedData.apiUrl,
        isActive: true,
        description: validatedData.description || 'API配置已更新',
        updatedBy: 'admin'
      });
      
      console.log(`API配置已更新: ${validatedData.apiUrl}`);
      
      // 停止所有現有監控，然後開始監控新的API URL
      apiMonitor.cleanup(); // 清理所有舊的監控
      apiMonitor.startMonitoring(validatedData.apiUrl);
      
      // 返回更新後的配置（不包含敏感信息）
      res.json({
        success: true,
        message: 'API配置更新成功',
        config: {
          apiUrl: updatedConfig.apiUrl,
          isActive: updatedConfig.isActive,
          description: updatedConfig.description,
          updatedAt: updatedConfig.updatedAt
        }
      });
    } catch (error) {
      console.error('更新API配置失敗:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ error: '請求數據格式錯誤' });
      } else {
        res.status(500).json({ error: '伺服器錯誤' });
      }
    }
  });
  
  // API監控相關路由
  
  // 記錄API連線錯誤
  app.post('/api/monitor/connection-error', async (req, res) => {
    const { apiUrl, error } = req.body;
    
    if (!apiUrl || !error) {
      return res.status(400).json({ error: 'Missing apiUrl or error' });
    }

    try {
      // 開始監控這個API
      apiMonitor.startMonitoring(apiUrl);
      
      console.log(`API連線錯誤記錄: ${apiUrl} - ${error}`);
      res.json({ success: true, message: '已記錄連線錯誤並開始監控' });
    } catch (err) {
      console.error('處理連線錯誤記錄失敗:', err);
      res.status(500).json({ error: '伺服器錯誤' });
    }
  });

  // 獲取API監控狀態
  app.get('/api/monitor/status', async (req, res) => {
    try {
      const allStatus = apiMonitor.getAllHealthStatus();
      res.json(allStatus);
    } catch (error) {
      console.error('獲取監控狀態失敗:', error);
      res.status(500).json({ error: '伺服器錯誤' });
    }
  });

  // 手動觸發API健康檢查
  app.post('/api/monitor/check/:encodedUrl', async (req, res) => {
    try {
      const apiUrl = decodeURIComponent(req.params.encodedUrl);
      const status = await apiMonitor.checkNow(apiUrl);
      res.json(status);
    } catch (error) {
      console.error('手動健康檢查失敗:', error);
      res.status(500).json({ error: '伺服器錯誤' });
    }
  });

  // 測試郵件發送
  app.post('/api/test-email', async (req, res) => {
    try {
      const success = await emailService.testEmail();
      if (success) {
        res.json({ success: true, message: '測試郵件發送成功' });
      } else {
        res.json({ success: false, message: '郵件服務未配置或發送失敗' });
      }
    } catch (error) {
      console.error('測試郵件發送失敗:', error);
      res.status(500).json({ error: '伺服器錯誤' });
    }
  });

  // 提供範例音頻檔案 - 環境一般例子
  app.get('/api/sample-audio', async (req, res) => {
    try {
      const samplePath = path.resolve(process.cwd(), 'attached_assets/sample_445_mixture_1757012787040.wav');
      
      // 檢查檔案是否存在
      if (!fs.existsSync(samplePath)) {
        console.log('範例音頻檔案未找到:', samplePath);
        return res.status(404).json({ error: '範例音頻檔案未找到' });
      }
      
      // 設置正確的 headers
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // 直接發送檔案流
      const fileStream = fs.createReadStream(samplePath);
      
      fileStream.on('error', (err: Error) => {
        console.error('發送範例音頻失敗:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '檔案讀取失敗' });
        }
      });
      
      fileStream.on('open', () => {
        console.log('成功開始提供範例音頻檔案 - 環境一般例子');
      });
      
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('處理範例音頻請求失敗:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '伺服器錯誤' });
      }
    }
  });

  // 提供範例音頻檔案 - 環境複雜例子
  app.get('/api/sample-audio-complex', async (req, res) => {
    try {
      const samplePath = path.resolve(process.cwd(), 'attached_assets/sample_023_mixture_1757084671345.wav');
      
      // 檢查檔案是否存在
      if (!fs.existsSync(samplePath)) {
        console.log('複雜範例音頻檔案未找到:', samplePath);
        return res.status(404).json({ error: '複雜範例音頻檔案未找到' });
      }
      
      // 設置正確的 headers
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // 直接發送檔案流
      const fileStream = fs.createReadStream(samplePath);
      
      fileStream.on('error', (err: Error) => {
        console.error('發送複雜範例音頻失敗:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '檔案讀取失敗' });
        }
      });
      
      fileStream.on('open', () => {
        console.log('成功開始提供範例音頻檔案 - 環境複雜例子');
      });
      
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('處理複雜範例音頻請求失敗:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '伺服器錯誤' });
      }
    }
  });

  const httpServer = createServer(app);

  // 應用關閉時清理監控器
  process.on('SIGINT', () => {
    console.log('正在關閉API監控器...');
    apiMonitor.cleanup();
    process.exit();
  });

  process.on('SIGTERM', () => {
    console.log('正在關閉API監控器...');
    apiMonitor.cleanup();
    process.exit();
  });

  return httpServer;
}
