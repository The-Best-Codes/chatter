import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const MEDIA_DIR = path.join(process.cwd(), "media");
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

interface ProcessedImage {
  path: string;
  url: string;
  hash: string;
}

export class MediaManager {
  private static instance: MediaManager;
  private hashToPath: Map<string, string> = new Map();

  private constructor() {
    // Ensure media directory exists
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }

    // Load existing images into hash map
    this.loadExistingImages();
  }

  static getInstance(): MediaManager {
    if (!MediaManager.instance) {
      MediaManager.instance = new MediaManager();
    }
    return MediaManager.instance;
  }

  private async loadExistingImages() {
    const files = fs.readdirSync(MEDIA_DIR);
    for (const file of files) {
      if (file === ".gitkeep") continue;
      const filePath = path.join(MEDIA_DIR, file);
      const fileContent = await Bun.file(filePath).arrayBuffer();
      const hash = crypto
        .createHash("sha256")
        .update(new Uint8Array(fileContent))
        .digest("hex");
      this.hashToPath.set(hash, file);
    }
  }

  private async calculateImageHash(buffer: Buffer): Promise<string> {
    return crypto
      .createHash("sha256")
      .update(new Uint8Array(buffer))
      .digest("hex");
  }

  async processAndSaveImage(
    imageBuffer: Buffer,
    originalName: string
  ): Promise<ProcessedImage> {
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      throw new Error("Image size exceeds maximum allowed size");
    }

    try {
      // Process image with sharp
      const processed = await sharp(imageBuffer)
        .resize(1200, 1200, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 80,
          progressive: true,
        })
        .toBuffer();

      // Calculate hash of processed image
      const hash = await this.calculateImageHash(processed);

      // Check if we already have this image
      if (this.hashToPath.has(hash)) {
        const existingPath = this.hashToPath.get(hash)!;
        return {
          path: path.join(MEDIA_DIR, existingPath),
          url: `/media/${existingPath}`,
          hash,
        };
      }

      // Generate unique filename
      const ext = ".jpg";
      const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
      const filepath = path.join(MEDIA_DIR, filename);

      // Save the file using Bun
      await Bun.write(filepath, new Uint8Array(processed));
      this.hashToPath.set(hash, filename);

      return {
        path: filepath,
        url: `/media/${filename}`,
        hash,
      };
    } catch (error) {
      console.error("Error processing image:", error);
      throw new Error("Failed to process image");
    }
  }
}
