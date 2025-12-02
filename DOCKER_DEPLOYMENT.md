# Docker 部署指南

本指南說明如何將語音分離應用部署到 Docker 環境。

## 📋 前置需求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 模型文件 (`Third_200.pt`)
- SSL 證書（用於 labs224.org，可選）

## 🚀 快速開始

### 1. 準備模型文件

將模型文件放置到 `models/` 目錄：

```bash
mkdir -p models
cp /path/to/Third_200.pt models/
```

### 2. 配置環境變數（可選）

複製並編輯環境變數文件：

```bash
cp .env.example .env
# 編輯 .env 文件以符合你的需求
```

### 3. 準備 SSL 證書（用於 labs224.org）

將 SSL 證書放置到 `nginx/ssl/` 目錄：

```bash
mkdir -p nginx/ssl
cp /path/to/labs224.org.crt nginx/ssl/
cp /path/to/labs224.org.key nginx/ssl/
```

**注意**：如果沒有 SSL 證書，可以：
- 使用 Let's Encrypt 自動獲取
- 暫時使用自簽名證書進行測試
- 僅使用 HTTP（不推薦生產環境）

### 4. 構建並啟動服務

```bash
# 構建所有服務
docker-compose build

# 啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

### 5. 驗證部署

- **後端健康檢查**：`http://localhost:5000/api/health`
- **前端服務**：`http://localhost:3000`
- **Nginx 代理**：`http://labs224.org`（如果已配置 DNS）

## 📁 目錄結構

```
web_model_apply/
├── Dockerfile.backend          # 後端 Dockerfile
├── Dockerfile.frontend         # 前端 Dockerfile
├── docker-compose.yml          # Docker Compose 配置
├── .env.example               # 環境變數範例
├── models/                    # 模型文件目錄（需手動創建）
│   └── Third_200.pt
├── flask_uploads/             # 上傳文件目錄（自動創建）
├── flask_results/             # 處理結果目錄（自動創建）
└── nginx/                     # Nginx 配置
    ├── nginx.conf
    ├── conf.d/
    │   └── labs224.conf
    ├── ssl/                   # SSL 證書（需手動添加）
    └── logs/                  # Nginx 日誌
```

## 🔧 配置說明

### 後端配置

環境變數（可在 `docker-compose.yml` 或 `.env` 中設置）：

- `MODEL_PATH`: 模型文件路徑（容器內路徑）
- `UPLOAD_FOLDER`: 上傳文件目錄
- `RESULT_FOLDER`: 結果文件目錄
- `MAX_FILE_SIZE`: 最大文件大小（字節）

### 前端配置

環境變數：

- `VITE_BACKEND_URL`: 後端 API URL（Docker 網路中使用 `http://backend:5000`）
- `PORT`: 前端服務端口（默認 3000）
- `NODE_ENV`: 運行環境（production/development）

### Nginx 配置

編輯 `nginx/conf.d/labs224.conf` 以：
- 修改域名
- 調整 SSL 配置
- 配置反向代理規則

## 🌐 網路架構

```
Internet
  ↓
labs224.org (HTTPS)
  ↓
Nginx (80/443)
  ↓
Frontend Container (3000)
  ↓ (Docker Network)
Backend Container (5000)
```

## 📊 服務管理

### 查看服務狀態

```bash
docker-compose ps
```

### 查看日誌

```bash
# 所有服務
docker-compose logs -f

# 特定服務
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### 重啟服務

```bash
# 重啟所有服務
docker-compose restart

# 重啟特定服務
docker-compose restart backend
```

### 停止服務

```bash
docker-compose down
```

### 停止並刪除卷（清理數據）

```bash
docker-compose down -v
```

## 🔍 故障排除

### 後端無法啟動

1. **檢查模型文件**：
   ```bash
   ls -la models/Third_200.pt
   ```

2. **檢查日誌**：
   ```bash
   docker-compose logs backend
   ```

3. **檢查模型路徑**：
   確認 `MODEL_PATH` 環境變數指向正確位置

### 前端無法連接後端

1. **檢查網路連接**：
   ```bash
   docker-compose exec frontend ping backend
   ```

2. **檢查環境變數**：
   ```bash
   docker-compose exec frontend env | grep BACKEND_URL
   ```

3. **檢查後端健康狀態**：
   ```bash
   curl http://localhost:5000/api/health
   ```

### Nginx 無法啟動

1. **檢查 SSL 證書**：
   ```bash
   ls -la nginx/ssl/
   ```

2. **檢查配置語法**：
   ```bash
   docker-compose exec nginx nginx -t
   ```

3. **查看錯誤日誌**：
   ```bash
   docker-compose logs nginx
   ```

### GPU 支援（可選）

如果需要 GPU 加速，需要：

1. **安裝 NVIDIA Docker**：
   ```bash
   # 參考：https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
   ```

2. **修改 docker-compose.yml**：
   ```yaml
   backend:
     deploy:
       resources:
         reservations:
           devices:
             - driver: nvidia
               count: 1
               capabilities: [gpu]
   ```

3. **使用 GPU 基礎映像**：
   修改 `Dockerfile.backend` 使用 `pytorch/pytorch:2.1.0-cuda11.8-cudnn8-devel`

## 🔐 安全建議

1. **使用 HTTPS**：生產環境必須使用 SSL/TLS
2. **限制文件大小**：通過 `MAX_FILE_SIZE` 環境變數
3. **定期清理**：舊的上傳和結果文件會自動清理
4. **防火牆規則**：僅暴露必要的端口（80, 443）
5. **環境變數**：敏感信息使用環境變數，不要硬編碼

## 📈 性能優化

1. **資源限制**：在 `docker-compose.yml` 中設置資源限制
2. **緩存策略**：使用 Docker 層緩存加速構建
3. **並發處理**：後端已支持多線程處理
4. **文件存儲**：考慮使用外部存儲（如 S3）存儲大文件

## 🔄 更新部署

1. **拉取最新代碼**
2. **重新構建**：
   ```bash
   docker-compose build --no-cache
   ```
3. **重啟服務**：
   ```bash
   docker-compose up -d
   ```

## 📝 注意事項

- 模型文件較大，首次構建可能需要較長時間
- 上傳和結果文件會持久化在本地目錄
- 確保有足夠的磁盤空間存儲處理結果
- 生產環境建議使用外部數據庫存儲任務狀態

## 🆘 獲取幫助

如遇問題，請檢查：
1. Docker 日誌：`docker-compose logs`
2. 服務健康狀態：訪問 `/api/health` 端點
3. 網路連接：確認容器間網路正常

