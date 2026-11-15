"use client";

export const VIENEU_BASE = "https://8000-agq4avcnnsnmokkqxrqgd55qke.instabox.tech";
export const VIENEU_VOICE = "Trúc Ly";
export const VIENEU_MODEL = "vieneu-v3-nano";

export interface TtsSettings {
  apiKey: string;
  baseUrl: string;
  endpoint: string;
  voice: string;
  model: string;
  speed: number;
}

const STORAGE_KEY = "revita_vieneu_tts_settings";

const DEFAULT_SETTINGS: TtsSettings = {
  apiKey: "",
  baseUrl: VIENEU_BASE,
  endpoint: `${VIENEU_BASE}/v1/audio/speech`,
  voice: VIENEU_VOICE,
  model: VIENEU_MODEL,
  speed: 1.0,
};

/**
 * 11 giọng preset thật của VieNeu v3 Nano (lấy từ GET /web/voices, 13/11/2026).
 * Server trả 400 với tên giọng không có trong danh sách này — đừng tự đặt id
 * kiểu "vi-VN-..." vì server không hiểu.
 */
export const VIENEU_VOICES = [
  { id: "Trúc Ly", name: "Trúc Ly (Mặc định)", gender: "female", region: "Bắc", note: "Phong cách tự nhiên" },
  { id: "Mai Anh", name: "Mai Anh", gender: "female", region: "Bắc", note: "Phong cách tin tức" },
  { id: "Minh Quân", name: "Minh Quân", gender: "male", region: "Bắc", note: "Phong cách tự nhiên" },
  { id: "Ái Hân", name: "Ái Hân", gender: "female", region: "Nam", note: "Phong cách tin tức" },
  { id: "Mỹ Duyên", name: "Mỹ Duyên", gender: "female", region: "Bắc", note: "Phong cách đọc truyện" },
  { id: "Đức Trí", name: "Đức Trí", gender: "male", region: "Bắc", note: "Phong cách đọc truyện" },
  { id: "Hữu Quân", name: "Hữu Quân", gender: "male", region: "Bắc", note: "Phong cách tin tức" },
  { id: "Xuân Tiên", name: "Xuân Tiên", gender: "female", region: "Bắc", note: "Phong cách tin tức" },
  { id: "Anh Khôi", name: "Anh Khôi", gender: "male", region: "Bắc", note: "Phong cách kể chuyện" },
  { id: "Mạnh Dũng", name: "Mạnh Dũng", gender: "male", region: "Bắc", note: "Phong cách tự nhiên" },
  { id: "Adam", name: "Adam", gender: "male", region: "Nam", note: "Giọng đọc tự nhiên" },
];

const VOICE_IDS = new Set(VIENEU_VOICES.map((v) => v.id));

class TtsService {
  private currentAudio: HTMLAudioElement | null = null;

  /** Lấy cấu hình TTS từ localStorage */
  getSettings(): TtsSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Tự động đồng bộ cấu hình VieNeu Cloud mới của người dùng
        const endpoint =
          !parsed.endpoint || parsed.endpoint.includes("api.vieneu.com")
            ? `${VIENEU_BASE}/v1/audio/speech`
            : parsed.endpoint;
        // Giọng đã lưu mà không có trong preset thật thì về Trúc Ly
        // (tránh lỗi 400 "unknown voice" với id cũ kiểu "vi-VN-...")
        const voice =
          !parsed.voice || !VOICE_IDS.has(parsed.voice)
            ? VIENEU_VOICE
            : parsed.voice;
        const model = parsed.model || VIENEU_MODEL;
        const baseUrl = parsed.baseUrl || VIENEU_BASE;

        return { ...DEFAULT_SETTINGS, ...parsed, baseUrl, endpoint, voice, model };
      }
    } catch {
      // Fallback default
    }
    return DEFAULT_SETTINGS;
  }

  /** Lưu cấu hình TTS */
  saveSettings(settings: Partial<TtsSettings>): void {
    if (typeof window === "undefined") return;
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Lỗi lưu cấu hình VieNeu TTS:", e);
    }
  }

  /** Kiểm tra xem đã có API Key VieNeu TTS hợp lệ chưa */
  hasApiKey(): boolean {
    const settings = this.getSettings();
    return Boolean(settings.apiKey && settings.apiKey.trim().length > 3);
  }

  /** Dừng âm thanh đang phát */
  stop(): void {
    if (this.currentAudio) {
      const audio = this.currentAudio;
      this.currentAudio = null;
      audio.pause();
      audio.currentTime = 0;
      if (audio.src.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(audio.src);
        } catch {}
      }
    }
  }

  /**
   * Phát giọng đọc bằng VieNeu TTS API trên Cloud riêng của người dùng.
   * KHÔNG fallback giọng trình duyệt: lỗi thì báo qua onError để giao diện
   * hiện đúng lỗi (chưa có key, sai giọng, server trả 400...) thay vì đọc
   * bằng giọng máy mà người dùng tưởng là giọng VieNeu.
   * onStart chỉ gọi khi âm thanh bắt đầu phát thật.
   */
  async speak(text: string, options?: { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void }): Promise<void> {
    if (!text || !text.trim()) return;
    this.stop();

    const settings = this.getSettings();

    if (!this.hasApiKey()) {
      const err = new Error("Chưa cấu hình API Key VieNeu TTS. Vào Cài đặt để dán key.");
      console.warn(err.message);
      options?.onError?.(err);
      return;
    }

    try {
      const endpoint = settings.endpoint || `${VIENEU_BASE}/v1/audio/speech`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: settings.model || VIENEU_MODEL,
          input: text.trim(),
          voice: settings.voice || VIENEU_VOICE,
          // Server chỉ nhận "pcm" hoặc "wav" — "mp3" trả 400.
          response_format: "wav",
          // Server nhận nhưng bỏ qua speed (trả header X-VieNeu-Ignored).
          speed: settings.speed || 1.0,
        }),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const data = await response.json();
          detail = data?.error?.message || data?.message || "";
        } catch {
          // Thân lỗi không phải JSON thì bỏ qua
        }
        const err = new Error(
          `VieNeu TTS trả về lỗi ${response.status}${detail ? `: ${detail}` : ""}.`
        );
        console.warn(err.message);
        options?.onError?.(err);
        return;
      }

      // Server trả WAV 24 kHz dạng binary (không phải JSON).
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        const err = new Error("VieNeu TTS trả về âm thanh rỗng.");
        console.warn(err.message);
        options?.onError?.(err);
        return;
      }

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      const cleanup = () => {
        if (this.currentAudio === audio) this.currentAudio = null;
        try {
          URL.revokeObjectURL(audioUrl);
        } catch {}
      };
      audio.onended = () => {
        cleanup();
        options?.onEnd?.();
      };
      audio.onerror = () => {
        cleanup();
        const err = new Error("Không phát được âm thanh VieNeu TTS.");
        console.warn(err.message);
        options?.onError?.(err);
      };
      await audio.play();
      options?.onStart?.();
    } catch (err) {
      console.warn("Không kết nối được VieNeu TTS API:", err);
      options?.onError?.(err);
    }
  }

  /** Phát thử một câu chào mẫu để kiểm tra giọng đọc */
  async testVoice(sampleText = "Phòng khám Phục hồi chức năng Bác sĩ Thanh Sang kính chào quý khách."): Promise<void> {
    return this.speak(sampleText);
  }
}

export const ttsService = new TtsService();
