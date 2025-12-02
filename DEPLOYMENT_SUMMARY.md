# Docker 部署完成總結

## ✅ 已完成的工作

### 1. Docker 配置文件

- ✅ **Dockerfile.backend**: 後端 Flask + PyTorch 容器配置
- ✅ **Dockerfile.frontend**: 前端 React + Vite + Express 容器配置
- ✅ **docker-compose.yml**: 完整的服務編排配置（後端、前端、Nginx）
- ✅ **.dockerignore**: Docker 構建忽略文件

### 2. 後端配置更新

- ✅ **flask_backend.py**: 
  - 模型路徑改為環境變數 `MODEL_PATH`
  - 支援 Docker 環境的 src 模組路徑
  - 上傳和結果目錄可配置

### 3. 前端配置更新

- ✅ **audioSeparationAPI.ts**: 
  - 移除所有 ngrok header
  - 使用環境變數 `VITE_BACKEND_URL`
  - 默認使用 Docker 網路地址 `http://backend:5000`

- ✅ **apiConfigService.ts**: 
  - 更新默認 API URL 為 Docker 網路地址

- ✅ **useAudioSeparation.ts**: 
  - 更新 fallback URL 為 Docker 網路地址

### 4. Nginx 配置

- ✅ **nginx/nginx.conf**: Nginx 主配置文件
- ✅ **nginx/conf.d/labs224.conf**: labs224.org 反向代理配置
  - HTTP 到 HTTPS 重定向
  - SSL/TLS 配置
  - 前端和後端代理規則

### 5. 文檔

- ✅ **DOCKER_DEPLOYMENT.md**: 詳細部署指南
- ✅ **README_DOCKER.md**: 快速開始指南
- ✅ **env.example**: 環境變數配置範例

## 📋 部署前準備清單

### 必須準備

1. **模型文件**
   ```bash
   mkdir -p models
   # 將 Third_200.pt 複製到 models/ 目錄
   ```

2. **src 模組**
   - 確保父目錄有 `src/` 目錄
   - 或修改 `docker-compose.yml` 中的 volume mount 路徑

### 可選準備

3. **SSL 證書**（用於 labs224.org）
   ```bash
   mkdir -p nginx/ssl
   # 將證書複製到 nginx/ssl/
   # - labs224.org.crt
   # - labs224.org.key
   ```

## 🚀 快速部署步驟

```bash
# 1. 準備模型文件
mkdir -p models
# 複製 Third_200.pt 到 models/

# 2. 創建必要目錄
mkdir -p nginx/conf.d nginx/ssl nginx/logs

# 3. 構建並啟動
docker-compose up -d --build

# 4. 查看日誌
docker-compose logs -f
```

## 🌐 服務訪問

- **後端 API**: http://localhost:5000
- **前端應用**: http://localhost:3000
- **通過域名**: https://labs224.org (需配置 DNS 和 SSL)

## 🔄 從 ngrok 遷移到 Docker

### 主要變更

1. **移除 ngrok 依賴**
   - 前端不再需要 ngrok URL
   - 移除所有 `ngrok-skip-browser-warning` header

2. **使用 Docker 網路**
   - 前端通過 `http://backend:5000` 連接後端
   - 所有服務在同一 Docker 網路中

3. **本地互連**
   - 不再需要公網隧道
   - 所有通信在本地 Docker 網路中進行

### 配置對比

**之前 (ngrok)**:
```javascript
const api = new AudioSeparationAPI('https://xxx.ngrok-free.app');
// 需要 ngrok header
headers: { 'ngrok-skip-browser-warning': 'true' }
```

**現在 (Docker)**:
```javascript
const api = new AudioSeparationAPI('http://backend:5000');
// 不需要特殊 header
```

## 📝 注意事項

1. **模型路徑**: 確保 `models/Third_200.pt` 存在
2. **src 模組**: 確保 `../src` 目錄存在或調整 volume mount
3. **端口衝突**: 確保 5000、3000、80、443 未被占用
4. **SSL 證書**: 生產環境建議使用有效證書

## 🔧 環境變數

主要環境變數（可在 `docker-compose.yml` 或 `.env` 中設置）：

- `MODEL_PATH`: 模型文件路徑
- `VITE_BACKEND_URL`: 後端 API URL（前端使用）
- `BACKEND_URL`: 後端 URL（Docker 網路）

## 🆘 故障排除

### 後端無法啟動
- 檢查模型文件: `ls -la models/Third_200.pt`
- 檢查 src 模組: 確認 volume mount 路徑正確
- 查看日誌: `docker-compose logs backend`

### 前端無法連接後端
- 檢查網路: `docker-compose exec frontend ping backend`
- 檢查環境變數: `docker-compose exec frontend env | grep BACKEND`
- 查看日誌: `docker-compose logs frontend`

### Nginx 無法啟動
- 檢查 SSL 證書: `ls -la nginx/ssl/`
- 檢查配置: `docker-compose exec nginx nginx -t`
- 查看日誌: `docker-compose logs nginx`

## 📚 相關文檔

- `DOCKER_DEPLOYMENT.md`: 詳細部署指南
- `README_DOCKER.md`: 快速開始指南
- `env.example`: 環境變數範例

## ✨ 優勢

1. ✅ **無需 ngrok**: 本地互連，更穩定可靠
2. ✅ **統一管理**: Docker Compose 管理所有服務
3. ✅ **易於擴展**: 可輕鬆添加其他服務
4. ✅ **生產就緒**: 適合正式環境部署
5. ✅ **域名對外**: 使用 labs224.org，更專業

