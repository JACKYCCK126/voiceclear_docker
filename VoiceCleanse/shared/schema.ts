import { z } from "zod";

// SQUIM quality scores schema
export const qualityScoresSchema = z.object({
  mos_estimate: z.number().optional(),     // Mean Opinion Score (1-5)
  stoi_estimate: z.number().optional(),    // Short-Time Objective Intelligibility (0-1)
  pesq_estimate: z.number().optional(),    // Perceptual Evaluation of Speech Quality (1-4.5)
  si_sdr_estimate: z.number().optional()   // Signal-to-Interference-plus-Noise Ratio (dB)
});

// SQUIM detailed scores schema
export const detailedScoresSchema = z.object({
  // Improvement metrics
  mos_improvement: z.number().optional(),    // MOS improvement (main indicator)
  stoi_improvement: z.number().optional(),   // STOI improvement
  pesq_improvement: z.number().optional(),   // PESQ improvement
  si_sdr_improvement: z.number().optional(), // SI-SDR improvement (dB)
  
  // Processed audio quality
  pred_quality: qualityScoresSchema.optional(),
  
  // Original mixed audio quality
  mix_quality: qualityScoresSchema.optional()
});

// Audio processing task schema (matching backend API format)
export const audioTaskSchema = z.object({
  task_id: z.string(),
  status: z.enum(["queued", "processing", "completed", "failed"]),
  progress: z.number().min(0).max(100),
  message: z.string(),
  original_filename: z.string().optional(),
  file_size: z.number().optional(),
  audio_duration: z.number().optional(),
  processing_time: z.number().optional(),
  estimated_time: z.number().optional(),
  download_url: z.string().optional(),
  error: z.string().optional(),
  
  // SQUIM quality metrics (replacing SI-SNR)
  quality_improvement: z.number().optional(), // Main improvement indicator (MOS)
  detailed_scores: detailedScoresSchema.optional()
});

export type AudioTask = z.infer<typeof audioTaskSchema>;

// Upload response schema
export const uploadResponseSchema = z.object({
  task_id: z.string(),
  status: z.literal("queued"),
  message: z.string(),
  file_size: z.number(),
  original_filename: z.string()
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

// Health check response schema
export const healthResponseSchema = z.object({
  status: z.string(),
  model_loaded: z.boolean(),
  gpu_available: z.boolean(),
  device: z.string(),
  timestamp: z.string()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// API配置schema
export const apiConfigSchema = z.object({
  id: z.string(),
  apiUrl: z.string().url(),
  isActive: z.boolean(),
  description: z.string().optional(),
  updatedAt: z.string(),
  updatedBy: z.string().optional()
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;

// API配置更新請求schema
export const updateApiConfigSchema = z.object({
  apiUrl: z.string().url(),
  description: z.string().optional(),
  adminPassword: z.string().min(1)
});

export type UpdateApiConfigRequest = z.infer<typeof updateApiConfigSchema>;
