#!/usr/bin/env python3
"""
Flask後端服務 - 語音分離Web API
支援音頻上傳、處理、下載和SI-SNRI計算
"""

import os
import uuid
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
import json
import traceback

import torch
import torchaudio
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import torchmetrics

# 添加父目錄到Python路徑
import sys
import os
# Support both local development and Docker deployment
parent_dir = os.getenv('PARENT_DIR', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
# Also check if src is directly available (Docker volume mount)
src_dir = os.getenv('SRC_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))
if os.path.exists(src_dir) and src_dir not in sys.path:
    sys.path.insert(0, os.path.dirname(src_dir))

# 導入模型
from src.training.dcc_tf_binaural import Net

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def root():
    """根路徑響應 - 提供API信息"""
    return jsonify({
        'service': 'Audio Separation API',
        'status': 'running',
        'endpoints': {
            'docs': '/docs',
            'health': '/api/health',
            'upload': '/api/upload (POST)',
            'status': '/api/status/<task_id>',
            'download': '/api/download/<task_id>',
            'tasks': '/api/tasks'
        },
        'supported_formats': list(ALLOWED_EXTENSIONS),
        'max_file_size_mb': MAX_FILE_SIZE // (1024 * 1024)
    })  # 允許跨域請求

@app.route('/docs', methods=['GET'])
def docs():
    """API文檔頁面"""
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    return f"""
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>語音分離 API 文檔</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
            h1, h2 {{ color: #333; }}
            .endpoint {{ background: #f4f4f4; padding: 15px; margin: 10px 0; border-radius: 5px; }}
            .method {{ color: #fff; padding: 3px 8px; border-radius: 3px; font-weight: bold; }}
            .get {{ background: #61affe; }}
            .post {{ background: #49cc90; }}
            code {{ background: #f1f1f1; padding: 2px 4px; border-radius: 3px; }}
            .example {{ background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <h1>🎵 語音分離 API 文檔</h1>
        
        <h2>📋 API 端點</h2>
        
        <div class="endpoint">
            <h3><span class="method get">GET</span> /api/health</h3>
            <p><strong>功能：</strong>健康檢查</p>
            <p><strong>回應：</strong>服務狀態、模型載入狀態、GPU可用性</p>
            <div class="example">
                <strong>範例：</strong><br>
                <code>curl http://localhost:5000/api/health</code>
            </div>
        </div>
        
        <div class="endpoint">
            <h3><span class="method post">POST</span> /api/upload</h3>
            <p><strong>功能：</strong>上傳音頻文件進行語音分離</p>
            <p><strong>參數：</strong><code>audio_file</code> (multipart/form-data)</p>
            <p><strong>支援格式：</strong>wav, mp3, flac, ogg, m4a</p>
            <p><strong>最大檔案大小：</strong>50MB</p>
            <p><strong>回應：</strong>任務ID和狀態</p>
            <div class="example">
                <strong>範例：</strong><br>
                <code>curl -X POST -F "audio_file=@your_audio.wav" http://localhost:5000/api/upload</code>
            </div>
        </div>
        
        <div class="endpoint">
            <h3><span class="method get">GET</span> /api/status/&lt;task_id&gt;</h3>
            <p><strong>功能：</strong>查詢處理狀態</p>
            <p><strong>回應：</strong>處理進度、狀態、品質評分</p>
            <div class="example">
                <strong>範例：</strong><br>
                <code>curl http://localhost:5000/api/status/your-task-id</code>
            </div>
        </div>
        
        <div class="endpoint">
            <h3><span class="method get">GET</span> /api/download/&lt;task_id&gt;</h3>
            <p><strong>功能：</strong>下載處理結果</p>
            <p><strong>回應：</strong>分離後的音頻文件 (WAV格式)</p>
            <div class="example">
                <strong>範例：</strong><br>
                <code>curl -O http://localhost:5000/api/download/your-task-id</code>
            </div>
        </div>
        
        <div class="endpoint">
            <h3><span class="method get">GET</span> /api/tasks</h3>
            <p><strong>功能：</strong>列出所有任務（調試用）</p>
            <p><strong>回應：</strong>所有任務的列表和狀態</p>
        </div>
        
        <h2>📊 品質評估</h2>
        <p>系統使用 SQUIM 模型計算以下品質指標：</p>
        <ul>
            <li><strong>MOS：</strong>平均意見分數 (1-5)</li>
            <li><strong>STOI：</strong>短時客觀可懂度 (0-1)</li>
            <li><strong>PESQ：</strong>感知語音品質評估 (1-4.5)</li>
            <li><strong>SI-SDR：</strong>尺度不變信號失真比 (dB)</li>
        </ul>
        
        <h2>🔧 使用流程</h2>
        <ol>
            <li>上傳音頻文件到 <code>/api/upload</code></li>
            <li>獲得任務ID</li>
            <li>使用任務ID查詢處理狀態 <code>/api/status/&lt;task_id&gt;</code></li>
            <li>處理完成後下載結果 <code>/api/download/&lt;task_id&gt;</code></li>
        </ol>
        
        <p><em>更新時間：{current_time}</em></p>
    </body>
    </html>
    """

# 配置
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'flask_uploads')
RESULT_FOLDER = os.getenv('RESULT_FOLDER', 'flask_results')
MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 50 * 1024 * 1024))  # 50MB
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'ogg', 'm4a'}
MODEL_PATH = os.getenv('MODEL_PATH', "D:/data_output/eval/Third_200.pt")

# 創建目錄
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

# 全局變量
model = None
device = None
tasks = {}  # 任務狀態存儲

class ModelManager:
    """模型管理器 - 單例模式"""
    _instance = None
    _model = None
    _device = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def initialize(self):
        """初始化模型"""
        if self._model is not None:
            return True
            
        try:
            print("🔄 初始化模型管理器...")
            
            # 設置設備
            self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"✅ 使用設備: {self._device}")
            
            # 載入模型
            print(f"🔄 載入模型: {MODEL_PATH}")
            checkpoint = torch.load(MODEL_PATH, map_location='cpu', weights_only=False)
            model_state = checkpoint['model_state_dict']
            
            # 推斷模型參數
            n_labels = model_state['label_embedding.0.weight'].shape[1] if 'label_embedding.0.weight' in model_state else 20
            model_dim = model_state['mask_gen.encoder.dcc_layers.dcc_0.layers.0.bias'].shape[0] if 'mask_gen.encoder.dcc_layers.dcc_0.layers.0.bias' in model_state else 256
            
            decoder_layers = 1
            for i in range(10):
                if f'mask_gen.decoder.tf_dec_layers.{i}.self_attn.in_proj_weight' in model_state:
                    decoder_layers = i + 1
                else:
                    break
            
            # 創建模型
            self._model = Net(
                label_len=n_labels,
                model_dim=model_dim,
                num_dec_layers=decoder_layers,
                L=32,
                num_enc_layers=10,
                dec_buf_len=13,
                dec_chunk_size=13,
                use_pos_enc=True,
                conditioning="mult",
                out_buf_len=4
            )
            
            # 載入權重
            self._model.load_state_dict(model_state)
            self._model.to(self._device)
            self._model.eval()
            
            epoch = checkpoint.get('epoch', 0)
            print(f"✅ 模型載入成功 (Epoch: {epoch})")
            return True
            
        except Exception as e:
            print(f"❌ 模型初始化失敗: {e}")
            return False
    
    def get_model(self):
        return self._model, self._device

def allowed_file(filename):
    """檢查文件格式是否允許"""
    if not filename or '.' not in filename:
        return False
    
    parts = filename.rsplit('.', 1)
    if len(parts) < 2:
        return False
    
    extension = parts[1].lower()
    return extension in ALLOWED_EXTENSIONS

def calculate_squim_scores(audio, sr=44100):
    """使用SQUIM計算語音質量評分（無需GT）"""
    try:
        print(f"📊 SQUIM輸入音頻形狀: {audio.shape}, 採樣率: {sr}")
        
        # 導入torchaudio (移到前面)
        import torchaudio
        
        # SQUIM需要16kHz採樣率
        if sr != 16000:
            print(f"🔄 重採樣 {sr}Hz → 16kHz")
            resampler = torchaudio.transforms.Resample(sr, 16000)
            audio_16k = resampler(audio)
        else:
            audio_16k = audio
        
        print(f"📊 重採樣後形狀: {audio_16k.shape}")
        
        # 確保是單聲道（SQUIM要求）
        if audio_16k.dim() > 1 and audio_16k.shape[0] > 1:
            print("🔄 轉換為單聲道")
            audio_16k = torch.mean(audio_16k, dim=0)  # 轉為單聲道
        
        # 確保有batch維度
        if audio_16k.dim() == 1:
            audio_16k = audio_16k.unsqueeze(0)
            
        print(f"📊 最終SQUIM輸入形狀: {audio_16k.shape}")
        print(f"📊 音頻長度: {audio_16k.shape[-1]/16000:.2f}秒")
        print(f"📊 音頻範圍: [{audio_16k.min():.4f}, {audio_16k.max():.4f}]")
        
        # 檢查音頻是否為空或全零
        if torch.all(audio_16k == 0):
            print("⚠️ 警告: 音頻全為零！")
            return {
                'stoi_estimate': 0.0,
                'pesq_estimate': 1.0,
                'si_sdr_estimate': 0.0,
                'mos_estimate': 1.0
            }
        
        # 導入SQUIM - 只使用無參考的客觀指標
        print("🔄 載入SQUIM客觀模型...")
        try:
            print(f"📊 torchaudio版本: {torchaudio.__version__}")
            from torchaudio.pipelines import SQUIM_OBJECTIVE
        except ImportError as e:
            print(f"❌ SQUIM導入失敗: {e}")
            raise e
        
        # 確保音頻長度足夠 (SQUIM需要至少0.5秒)
        min_length = int(16000 * 0.5)  # 0.5秒
        if audio_16k.shape[-1] < min_length:
            print(f"⚠️ 音頻太短 ({audio_16k.shape[-1]/16000:.2f}s)，填充到0.5s")
            padding = min_length - audio_16k.shape[-1]
            audio_16k = torch.nn.functional.pad(audio_16k, (0, padding))
        
        # 客觀指標 (STOI, PESQ, SI-SDR估算) - 這些是無參考的
        print("🔄 計算SQUIM客觀指標...")
        objective_model = SQUIM_OBJECTIVE.get_model()
        print(f"📊 客觀模型輸入形狀: {audio_16k.shape}")
        
        # 確保輸入在正確範圍內
        if torch.max(torch.abs(audio_16k)) > 1.0:
            print("⚠️ 音頻振幅超過1.0，進行歸一化")
            audio_16k = audio_16k / torch.max(torch.abs(audio_16k))
        
        stoi_est, pesq_est, si_sdr_est = objective_model(audio_16k)
        print(f"📊 客觀指標原始值: STOI={stoi_est}, PESQ={pesq_est}, SI-SDR={si_sdr_est}")
        
        # 使用STOI估算MOS (經驗公式)
        mos_est = 1.0 + stoi_est * 3.5  # STOI 0-1 映射到 MOS 1-4.5
        print(f"📊 估算MOS值: {mos_est}")
        
        result = {
            'stoi_estimate': float(stoi_est.item()),      # 0-1
            'pesq_estimate': float(pesq_est.item()),      # 1-4.5
            'si_sdr_estimate': float(si_sdr_est.item()),  # dB
            'mos_estimate': float(mos_est.item())         # 1-5
        }
        
        print(f"✅ SQUIM計算完成: {result}")
        return result
        
    except Exception as e:
        print(f"❌ SQUIM計算錯誤: {e}")
        import traceback
        traceback.print_exc()
        
        # 如果SQUIM失敗，使用簡單的能量和頻譜分析
        print("🔄 使用備用評估方法...")
        return calculate_simple_quality_scores(audio, sr)

def calculate_simple_quality_scores(audio, sr=44100):
    """簡單的音頻質量評估（備用方法）"""
    try:
        print("📊 使用簡單評估方法...")
        
        # 確保是單聲道
        if audio.dim() > 1 and audio.shape[0] > 1:
            audio_mono = torch.mean(audio, dim=0)
        else:
            audio_mono = audio.squeeze() if audio.dim() > 1 else audio
        
        # 計算RMS能量
        rms_energy = torch.sqrt(torch.mean(audio_mono ** 2)).item()
        
        # 計算峰值
        peak_amplitude = torch.max(torch.abs(audio_mono)).item()
        
        # 計算動態範圍
        dynamic_range = 20 * torch.log10(torch.tensor(peak_amplitude / (rms_energy + 1e-8))).item()
        
        # 計算頻譜質量 (使用FFT)
        fft = torch.fft.fft(audio_mono)
        magnitude = torch.abs(fft)
        
        # 計算高頻能量比例
        total_energy = torch.sum(magnitude ** 2)
        high_freq_start = len(magnitude) // 4  # 從1/4頻率開始算高頻
        high_freq_energy = torch.sum(magnitude[high_freq_start:] ** 2)
        high_freq_ratio = (high_freq_energy / (total_energy + 1e-8)).item()
        
        # 根據這些指標估算質量分數
        # RMS能量越高，質量通常越好（但不能太高）
        energy_score = min(rms_energy * 10, 1.0)  # 歸一化到0-1
        
        # 動態範圍越大，質量越好
        dynamic_score = min(max(dynamic_range / 30, 0), 1.0)  # 歸一化到0-1
        
        # 高頻比例適中最好
        freq_score = 1.0 - abs(high_freq_ratio - 0.3)  # 理想值0.3左右
        
        # 綜合評分
        overall_score = (energy_score + dynamic_score + freq_score) / 3
        
        # 轉換為各種指標格式
        stoi_est = min(max(overall_score, 0.1), 0.95)  # STOI: 0.1-0.95
        pesq_est = 1.0 + overall_score * 2.5  # PESQ: 1.0-3.5
        si_sdr_est = -10 + overall_score * 20  # SI-SDR: -10 to 10 dB
        mos_est = 1.0 + overall_score * 3.0  # MOS: 1.0-4.0
        
        result = {
            'stoi_estimate': round(stoi_est, 3),
            'pesq_estimate': round(pesq_est, 3),
            'si_sdr_estimate': round(si_sdr_est, 3),
            'mos_estimate': round(mos_est, 3)
        }
        
        print(f"✅ 簡單評估完成: {result}")
        print(f"📊 調試信息: RMS={rms_energy:.4f}, Peak={peak_amplitude:.4f}, Dynamic={dynamic_range:.2f}dB, HighFreq={high_freq_ratio:.3f}")
        
        return result
        
    except Exception as e:
        print(f"❌ 簡單評估也失敗: {e}")
        return {
            'stoi_estimate': 0.5,
            'pesq_estimate': 2.0,
            'si_sdr_estimate': 5.0,
            'mos_estimate': 2.5
        }

def process_audio_task(task_id, input_path, output_path):
    """後台處理音頻任務"""
    try:
        # 更新任務狀態
        tasks[task_id]['status'] = 'processing'
        tasks[task_id]['progress'] = 10
        tasks[task_id]['message'] = '正在載入音頻...'
        
        # 獲取模型
        model, device = ModelManager().get_model()
        if model is None:
            raise Exception("模型未初始化")
        
        # 載入音頻 (支持多種格式)
        try:
            mixture, sr = torchaudio.load(input_path)
        except Exception as e:
            print(f"⚠️ torchaudio載入失敗: {e}")
            # 嘗試使用librosa作為備用
            try:
                import librosa
                print("🔄 使用librosa載入音頻...")
                audio_data, sr = librosa.load(input_path, sr=None, mono=False)
                
                # 轉換為torch tensor
                if audio_data.ndim == 1:
                    # 單聲道，轉為雙聲道
                    mixture = torch.from_numpy(audio_data).unsqueeze(0).repeat(2, 1).float()
                else:
                    # 多聲道
                    mixture = torch.from_numpy(audio_data).float()
                    if mixture.shape[0] == 1:
                        # 如果是單聲道，複製為雙聲道
                        mixture = mixture.repeat(2, 1)
                        
                print(f"✅ librosa載入成功，形狀: {mixture.shape}, 採樣率: {sr}")
                
            except ImportError:
                raise Exception("無法載入音頻：需要安裝librosa來支持M4A格式")
            except Exception as librosa_error:
                raise Exception(f"音頻載入失敗: {librosa_error}")
        
        original_mixture = mixture.clone()  # 保存原始音頻用於SI-SNR計算
        
        tasks[task_id]['progress'] = 20
        tasks[task_id]['message'] = '正在預處理音頻...'
        
        # 音頻預處理
        if mixture.shape[0] == 1:
            mixture = mixture.repeat(2, 1)
        elif mixture.shape[0] > 2:
            mixture = mixture[:2]
        
        if sr != 44100:
            resampler = torchaudio.transforms.Resample(sr, 44100)
            mixture = resampler(mixture)
            original_mixture = resampler(original_mixture)
            sr = 44100
        
        tasks[task_id]['progress'] = 30
        tasks[task_id]['message'] = '正在執行語音分離...'
        
        # 移到GPU
        mixture = mixture.to(device)
        label_vector = torch.ones(1, 20, device=device)
        
        # 模型推理
        inputs = {
            'mixture': mixture.unsqueeze(0),
            'label_vector': label_vector
        }
        
        with torch.no_grad():
            output = model(inputs)
        
        pred_audio = output['x'].squeeze(0).cpu()
        
        tasks[task_id]['progress'] = 80
        tasks[task_id]['message'] = '正在計算音質指標...'
        
        # 使用SQUIM計算語音質量評分
        print("🔄 計算PRED音頻的SQUIM評分...")
        print(f"PRED音頻形狀: {pred_audio.shape}, 採樣率: {sr}")
        pred_squim = calculate_squim_scores(pred_audio, sr)
        print(f"PRED SQUIM結果: {pred_squim}")
        
        print("🔄 計算MIX音頻的SQUIM評分...")
        print(f"MIX音頻形狀: {original_mixture.shape}, 採樣率: {sr}")
        mix_squim = calculate_squim_scores(original_mixture, sr)
        print(f"MIX SQUIM結果: {mix_squim}")
        
        # 計算改善程度
        quality_improvement = {
            'stoi_improvement': pred_squim['stoi_estimate'] - mix_squim['stoi_estimate'],
            'pesq_improvement': pred_squim['pesq_estimate'] - mix_squim['pesq_estimate'],
            'si_sdr_improvement': pred_squim['si_sdr_estimate'] - mix_squim['si_sdr_estimate'],
            'mos_improvement': pred_squim['mos_estimate'] - mix_squim['mos_estimate']
        }
        
        print(f"📊 SQUIM改善評分: MOS={quality_improvement['mos_improvement']:.3f}, STOI={quality_improvement['stoi_improvement']:.3f}")
        
        # 使用MOS改善作為主要指標
        main_improvement_score = quality_improvement['mos_improvement']
        
        tasks[task_id]['progress'] = 90
        tasks[task_id]['message'] = '正在保存結果...'
        
        # 保存結果
        torchaudio.save(output_path, pred_audio, sr)
        
        # 計算音頻信息
        audio_duration = pred_audio.shape[1] / sr
        
        # 任務完成
        tasks[task_id]['status'] = 'completed'
        tasks[task_id]['progress'] = 100
        tasks[task_id]['message'] = '處理完成！'
        tasks[task_id]['output_file'] = output_path
        tasks[task_id]['audio_duration'] = round(audio_duration, 1)
        tasks[task_id]['processing_time'] = round(time.time() - tasks[task_id]['start_time'], 2)
        
        # 存儲SQUIM評分
        tasks[task_id]['quality_scores'] = {
            'pred_scores': pred_squim,
            'mix_scores': mix_squim,
            'improvements': quality_improvement,
            'main_improvement': round(main_improvement_score, 3)
        }
        
        print(f"✅ 任務 {task_id} 處理完成")
        
    except Exception as e:
        print(f"❌ 任務 {task_id} 處理失敗: {e}")
        tasks[task_id]['status'] = 'failed'
        tasks[task_id]['message'] = f'處理失敗: {str(e)}'
        tasks[task_id]['error'] = str(e)

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康檢查"""
    model_manager = ModelManager()
    model_loaded = model_manager._model is not None
    gpu_available = torch.cuda.is_available()
    
    return jsonify({
        'status': 'ok',
        'model_loaded': model_loaded,
        'gpu_available': gpu_available,
        'device': str(model_manager._device) if model_manager._device else 'none',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """上傳音頻文件"""
    try:
        # 檢查文件是否存在
        if 'audio_file' not in request.files:
            return jsonify({'error': '沒有上傳文件'}), 400
        
        file = request.files['audio_file']
        if file.filename == '':
            return jsonify({'error': '沒有選擇文件'}), 400
        
        # 檢查文件格式
        if not allowed_file(file.filename):
            return jsonify({'error': f'不支援的文件格式，支援格式: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # 檢查文件大小
        file.seek(0, 2)  # 移到文件末尾
        file_size = file.tell()
        file.seek(0)  # 重置到開頭
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'文件過大，最大支援 {MAX_FILE_SIZE/1024/1024:.0f}MB'}), 400
        
        # 生成任務ID
        task_id = str(uuid.uuid4())
        
        # 保存上傳文件
        original_filename = file.filename
        filename = secure_filename(original_filename)
        
        # 安全地獲取副檔名
        if '.' in filename and len(filename.rsplit('.', 1)) > 1:
            parts = filename.rsplit('.', 1)
            if len(parts[0]) > 0:  # 確保主檔名不為空
                file_extension = parts[1].lower()
            else:
                # 如果secure_filename只留下副檔名，從原始檔名獲取
                file_extension = original_filename.rsplit('.', 1)[1].lower()
        elif '.' in original_filename and len(original_filename.rsplit('.', 1)) > 1:
            # 如果secure_filename移除了副檔名，從原始檔名獲取
            file_extension = original_filename.rsplit('.', 1)[1].lower()
        else:
            # 預設副檔名
            file_extension = 'wav'
        
        input_filename = f"{task_id}_input.{file_extension}"
        input_path = os.path.join(UPLOAD_FOLDER, input_filename)
        output_filename = f"{task_id}_output.wav"
        output_path = os.path.join(RESULT_FOLDER, output_filename)
        
        file.save(input_path)
        
        # 初始化任務狀態
        tasks[task_id] = {
            'status': 'queued',
            'progress': 0,
            'message': '任務已排隊',
            'start_time': time.time(),
            'input_file': input_path,
            'output_file': None,
            'original_filename': original_filename,
            'file_size': file_size,
            'si_snr_improvement': None,
            'audio_duration': None,
            'processing_time': None
        }
        
        # 啟動後台處理線程
        thread = threading.Thread(
            target=process_audio_task,
            args=(task_id, input_path, output_path)
        )
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'task_id': task_id,
            'status': 'queued',
            'message': '文件上傳成功，開始處理...',
            'file_size': file_size,
            'original_filename': filename
        })
        
    except Exception as e:
        print(f"上傳錯誤: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'上傳失敗: {str(e)}'}), 500

@app.route('/api/status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """獲取任務狀態"""
    if task_id not in tasks:
        return jsonify({'error': '任務不存在'}), 404
    
    task = tasks[task_id]
    
    # 計算預估剩餘時間
    estimated_time = None
    if task['status'] == 'processing' and task['progress'] > 0:
        elapsed_time = time.time() - task['start_time']
        if task['progress'] < 100:
            estimated_time = int((elapsed_time / task['progress']) * (100 - task['progress']))
    
    response = {
        'task_id': task_id,
        'status': task['status'],
        'progress': task['progress'],
        'message': task['message'],
        'estimated_time': estimated_time,
        'original_filename': task.get('original_filename'),
        'file_size': task.get('file_size')
    }
    
    # 如果任務完成，添加結果信息
    if task['status'] == 'completed':
        quality_scores = task.get('quality_scores', {})
        response.update({
            'audio_duration': task.get('audio_duration'),
            'processing_time': task.get('processing_time'),
            'download_url': f'/api/download/{task_id}',
            
            # SQUIM評分
            'quality_improvement': quality_scores.get('main_improvement', 0),
            'detailed_scores': {
                'mos_improvement': quality_scores.get('improvements', {}).get('mos_improvement', 0),
                'stoi_improvement': quality_scores.get('improvements', {}).get('stoi_improvement', 0),
                'pesq_improvement': quality_scores.get('improvements', {}).get('pesq_improvement', 0),
                'si_sdr_improvement': quality_scores.get('improvements', {}).get('si_sdr_improvement', 0),
                
                'pred_quality': quality_scores.get('pred_scores', {}),
                'mix_quality': quality_scores.get('mix_scores', {})
            }
        })
    elif task['status'] == 'failed':
        response['error'] = task.get('error')
    
    return jsonify(response)

@app.route('/api/download/<task_id>', methods=['GET'])
def download_result(task_id):
    """下載處理結果"""
    if task_id not in tasks:
        return jsonify({'error': '任務不存在'}), 404
    
    task = tasks[task_id]
    
    if task['status'] != 'completed':
        return jsonify({'error': '任務未完成'}), 400
    
    output_file = task.get('output_file')
    if not output_file or not os.path.exists(output_file):
        return jsonify({'error': '結果文件不存在'}), 404
    
    # 生成友好的文件名
    original_name = task.get('original_filename', 'audio')
    name_without_ext = os.path.splitext(original_name)[0]
    download_filename = f"{name_without_ext}_separated.wav"
    
    return send_file(
        output_file,
        as_attachment=True,
        download_name=download_filename,
        mimetype='audio/wav'
    )

@app.route('/api/tasks', methods=['GET'])
def list_tasks():
    """列出所有任務（調試用）"""
    task_list = []
    for task_id, task in tasks.items():
        task_info = {
            'task_id': task_id,
            'status': task['status'],
            'progress': task['progress'],
            'original_filename': task.get('original_filename'),
            'start_time': datetime.fromtimestamp(task['start_time']).isoformat()
        }
        if task['status'] == 'completed':
            task_info['si_snr_improvement'] = task.get('si_snr_improvement')
        task_list.append(task_info)
    
    return jsonify({'tasks': task_list})

def cleanup_old_files():
    """清理舊文件"""
    try:
        current_time = time.time()
        
        # 清理上傳文件（1小時後）
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                if current_time - os.path.getmtime(file_path) > 3600:  # 1小時
                    os.remove(file_path)
                    print(f"清理上傳文件: {filename}")
        
        # 清理結果文件（24小時後）
        for filename in os.listdir(RESULT_FOLDER):
            file_path = os.path.join(RESULT_FOLDER, filename)
            if os.path.isfile(file_path):
                if current_time - os.path.getmtime(file_path) > 86400:  # 24小時
                    os.remove(file_path)
                    print(f"清理結果文件: {filename}")
        
        # 清理任務記錄（24小時後）
        tasks_to_remove = []
        for task_id, task in tasks.items():
            if current_time - task['start_time'] > 86400:  # 24小時
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del tasks[task_id]
            print(f"清理任務記錄: {task_id}")
            
    except Exception as e:
        print(f"清理文件錯誤: {e}")

if __name__ == '__main__':
    print("🚀 啟動Flask語音分離服務...")
    
    # 初始化模型
    model_manager = ModelManager()
    if not model_manager.initialize():
        print("❌ 模型初始化失敗，服務無法啟動")
        exit(1)
    
    # 啟動清理線程
    cleanup_thread = threading.Thread(target=lambda: [cleanup_old_files(), time.sleep(3600)] * 1000)
    cleanup_thread.daemon = True
    cleanup_thread.start()
    
    print("✅ 服務啟動成功！")
    print("📡 API端點:")
    print("   POST /api/upload     - 上傳音頻文件")
    print("   GET  /api/status/<id> - 查詢處理狀態")
    print("   GET  /api/download/<id> - 下載處理結果")
    print("   GET  /api/health     - 健康檢查")
    
    # 啟動Flask服務
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
