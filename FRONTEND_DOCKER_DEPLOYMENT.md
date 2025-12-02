# 前端 Docker 自動部署說明

## ✅ 是的，Docker 會自動部署前端！

當你運行 `docker-compose up -d --build` 時，前端會自動：

1. **構建前端應用**（React + Vite）
2. **構建服務器**（Express）
3. **啟動服務**（端口 3000）

## 📋 部署流程

### 1. 構建階段（Dockerfile.frontend）

```dockerfile
# 階段 1: 構建
FROM node:18-alpine AS builder
- 安裝依賴 (npm ci)
- 複製源代碼
- 執行構建命令: npm run build
  ├── vite build → dist/public/ (前端靜態文件)
  └── esbuild server/index.ts → dist/index.js (服務器文件)
```

### 2. 生產階段

```dockerfile
# 階段 2: 生產運行
FROM node:18-alpine
- 安裝生產依賴
- 複製構建產物 (dist/)
- 啟動服務: node dist/index.js
```

### 3. 構建命令詳解

根據 `package.json`，構建命令執行：

```bash
npm run build
# 等於執行：
# vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

**輸出結構**：
```
dist/
├── public/          # 前端靜態文件（React 應用）
│   ├── index.html
│   ├── assets/
│   └── ...
└── index.js         # Express 服務器文件
```

## 🔧 當前配置檢查

### ✅ 已正確配置

1. **Dockerfile.frontend**：
   - ✅ 複製所有必要文件
   - ✅ 執行構建命令
   - ✅ 複製構建產物到生產階段
   - ✅ 設置正確的啟動命令

2. **docker-compose.yml**：
   - ✅ 配置了 frontend 服務
   - ✅ 設置了正確的端口映射 (3000:3000)
   - ✅ 配置了環境變數
   - ✅ 設置了依賴關係 (depends_on: backend)

3. **環境變數**：
   - ✅ `NODE_ENV=production`
   - ✅ `PORT=3000`
   - ✅ `BACKEND_URL=http://backend:5000`

## 🚀 啟動方式

### 完整部署（後端 + 前端 + Nginx）

```bash
# 構建並啟動所有服務
docker-compose up -d --build

# 查看前端日誌
docker-compose logs -f frontend
```

### 僅構建前端

```bash
# 僅構建前端
docker-compose build frontend

# 僅啟動前端（需要後端已運行）
docker-compose up -d frontend
```

## 📊 服務訪問

啟動後，前端可以通過以下方式訪問：

1. **直接訪問前端容器**：
   - http://localhost:3000

2. **通過 Nginx 反向代理**（如果配置了）：
   - http://labs224.org（如果已配置 DNS 和 SSL）

## 🔍 驗證部署

### 1. 檢查容器狀態

```bash
docker-compose ps
```

應該看到 `semantic_hearing_frontend` 狀態為 `Up`。

### 2. 檢查前端日誌

```bash
docker-compose logs frontend
```

應該看到：
```
serving on port 3000
```

### 3. 訪問健康檢查

```bash
curl http://localhost:3000/api/health
```

### 4. 訪問前端頁面

在瀏覽器中打開：http://localhost:3000

## ⚠️ 注意事項

### 1. 構建輸出路徑

- Vite 構建輸出：`dist/public/`
- 服務器構建輸出：`dist/index.js`
- Dockerfile 複製整個 `dist/` 目錄，這是正確的

### 2. 環境變數

前端需要知道後端 URL，已通過環境變數設置：
```yaml
environment:
  - BACKEND_URL=http://backend:5000
```

### 3. 依賴關係

前端依賴後端，`docker-compose.yml` 中已配置：
```yaml
depends_on:
  - backend
```

這確保後端先啟動。

## 🔄 更新前端

如果需要更新前端代碼：

1. **修改代碼**
2. **重新構建**：
   ```bash
   docker-compose build frontend
   ```
3. **重啟服務**：
   ```bash
   docker-compose up -d frontend
   ```

或者一次性完成：
```bash
docker-compose up -d --build frontend
```

## 🐛 故障排除

### 問題 1：前端構建失敗

**檢查**：
```bash
docker-compose build frontend
```

**常見原因**：
- 缺少依賴文件
- TypeScript 編譯錯誤
- 構建配置錯誤

### 問題 2：前端無法連接後端

**檢查**：
```bash
# 檢查網路連接
docker-compose exec frontend ping backend

# 檢查環境變數
docker-compose exec frontend env | grep BACKEND
```

### 問題 3：端口被占用

**檢查**：
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

**解決**：修改 `docker-compose.yml` 中的端口映射。

## 📝 總結

✅ **Docker 會自動部署前端**，包括：
- 自動安裝依賴
- 自動構建前端和服務器
- 自動啟動服務
- 自動配置網路連接

你只需要運行：
```bash
docker-compose up -d --build
```

前端就會自動部署並運行在 http://localhost:3000！

