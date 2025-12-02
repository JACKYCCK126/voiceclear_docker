#!/usr/bin/env python3
"""
Web模型應用工具 - 輸入MIX音頻，生成PRED音頻
基於 test_my_models.py 的簡化版本，專注於單一模型推理
"""

import os
import sys
import torch
import torchaudio
import time
from pathlib import Path

def setup_device():
    """設置計算設備"""
    if torch.cuda.is_available():
        device = torch.device('cuda')
        print(f"✅ 使用GPU: {torch.cuda.get_device_name(0)}")
    else:
        device = torch.device('cpu')
        print("⚠️ 使用CPU (會比較慢)")
    
    return device

def load_model(model_path, device):
    """
    載入模型
    """
    print(f"🔄 載入模型: {os.path.basename(model_path)}")
    
    try:
        # 添加父目錄到Python路徑
        import sys
        import os
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
        
        # 導入模型架構
        from src.training.dcc_tf_binaural import Net
        
        # 載入checkpoint
        checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
        model_state = checkpoint['model_state_dict']
        
        # 從模型state_dict推斷模型參數
        if 'label_embedding.0.weight' in model_state:
            n_labels = model_state['label_embedding.0.weight'].shape[1]
        else:
            n_labels = 20  # 默認值
            
        # 推斷model_dim
        if 'mask_gen.encoder.dcc_layers.dcc_0.layers.0.bias' in model_state:
            model_dim = model_state['mask_gen.encoder.dcc_layers.dcc_0.layers.0.bias'].shape[0]
        else:
            model_dim = 256  # 默認值
            
        # 推斷decoder層數
        decoder_layers = 1  # 默認1層
        for i in range(10):
            if f'mask_gen.decoder.tf_dec_layers.{i}.self_attn.in_proj_weight' in model_state:
                decoder_layers = i + 1
            else:
                break
                
        print(f"🔍 模型參數: 標籤={n_labels}, 維度={model_dim}, Decoder層數={decoder_layers}")
        
        # 創建模型實例
        model = Net(
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
        model.load_state_dict(model_state)
        model.to(device)
        model.eval()
        
        epoch = checkpoint.get('epoch', 0)
        print(f"✅ 模型載入成功 (Epoch: {epoch})")
        return model, epoch
        
    except Exception as e:
        print(f"❌ 模型載入失敗: {str(e)}")
        raise

def process_audio(model, audio_path, output_dir, device):
    """
    處理音頻文件
    """
    print(f"\n🎵 處理音頻: {os.path.basename(audio_path)}")
    
    # 載入音頻
    try:
        mixture, sr = torchaudio.load(audio_path)
        print(f"   原始格式: {mixture.shape}, 採樣率: {sr}")
    except Exception as e:
        print(f"❌ 音頻載入失敗: {e}")
        return None
    
    # 確保是雙聲道
    if mixture.shape[0] == 1:
        mixture = mixture.repeat(2, 1)
        print("   轉換為雙聲道")
    elif mixture.shape[0] > 2:
        mixture = mixture[:2]
        print("   截取前兩個聲道")
    
    # 重採樣到44.1kHz (如果需要)
    if sr != 44100:
        resampler = torchaudio.transforms.Resample(sr, 44100)
        mixture = resampler(mixture)
        sr = 44100
        print(f"   重採樣到44.1kHz")
    
    # 移到GPU
    mixture = mixture.to(device)
    
    # 準備標籤向量 (全1表示處理所有聲音)
    label_vector = torch.ones(1, 20, device=device)
    
    # 準備模型輸入
    inputs = {
        'mixture': mixture.unsqueeze(0),  # 添加batch維度
        'label_vector': label_vector
    }
    
    # 推理
    print("   🔄 執行推理...")
    start_time = time.time()
    
    with torch.no_grad():
        output = model(inputs)
    
    inference_time = time.time() - start_time
    audio_duration = mixture.shape[1] / sr
    
    print(f"   ⚡ 推理完成: {inference_time:.3f}秒 (音頻長度: {audio_duration:.1f}秒)")
    print(f"   📊 實時倍數: {audio_duration/inference_time:.1f}x")
    
    # 獲取輸出音頻
    pred_audio = output['x'].squeeze(0).cpu()  # 移除batch維度並移到CPU
    
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 生成輸出檔名
    input_name = Path(audio_path).stem
    output_path = os.path.join(output_dir, f"{input_name}_pred.wav")
    
    # 保存預測音頻
    torchaudio.save(output_path, pred_audio, sr)
    print(f"   💾 保存預測音頻: {output_path}")
    
    return output_path

def main():
    """主函數"""
    print("🎯 Web模型應用工具")
    print("=" * 50)
    
    # 配置
    model_path = "D:/data_output/eval/Third_200.pt"
    output_dir = "D:/data_output/eval/web_data"
    
    # 這裡設置你的輸入音頻路徑
    # 修改下面這行來指定你要處理的音頻文件
    input_audio_path = "D:/data_output/eval/web_data/sample_847_mixture.wav"
    
    print(f"📁 模型路徑: {model_path}")
    print(f"📁 輸出目錄: {output_dir}")
    print(f"🎵 輸入音頻: {input_audio_path}")
    
    # 檢查文件是否存在
    if not os.path.exists(model_path):
        print(f"❌ 模型文件不存在: {model_path}")
        return
    
    if not os.path.exists(input_audio_path):
        print(f"❌ 輸入音頻文件不存在: {input_audio_path}")
        print("💡 請修改 input_audio_path 變數指向你的音頻文件")
        return
    
    # 設置設備
    device = setup_device()
    
    # 載入模型
    try:
        model, epoch = load_model(model_path, device)
    except Exception as e:
        print(f"❌ 無法載入模型: {e}")
        return
    
    # 處理音頻
    try:
        output_path = process_audio(model, input_audio_path, output_dir, device)
        
        if output_path:
            print(f"\n🎉 處理完成！")
            print(f"📁 輸出文件: {output_path}")
            print(f"💡 你可以播放這個文件來聽取語音分離效果")
        else:
            print(f"\n❌ 處理失敗")
            
    except Exception as e:
        print(f"❌ 音頻處理失敗: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
