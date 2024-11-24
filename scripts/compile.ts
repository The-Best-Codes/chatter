import { mkdir, readdir, copyFile, access, stat } from "fs/promises";
import { join } from "path";

const DIST_DIR = "./dist";
const platforms = [
  { name: "linux", variants: ["base", "modern"] },
  { name: "darwin", variants: ["base", "modern"] },
  { name: "windows", variants: ["base", "modern"] },
];
const REQUIRED_DIRS = ["src", "public", "exec"];

async function copyDir(src: string, dest: string) {
  try {
    console.log(`Copying directory from ${src} to ${dest}`);

    // Create the destination directory if it doesn't exist
    await mkdir(dest, { recursive: true });

    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      try {
        if (entry.isDirectory()) {
          console.log(`Creating directory: ${destPath}`);
          await mkdir(destPath, { recursive: true });
          await copyDir(srcPath, destPath);
        } else {
          console.log(`Copying file: ${srcPath} -> ${destPath}`);
          await copyFile(srcPath, destPath);
        }
      } catch (error) {
        console.error(`Error processing ${srcPath}:`, error);
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error in copyDir: ${src} -> ${dest}:`, error);
    throw error;
  }
}

async function ensureDirectoryExists(dir: string) {
  try {
    await access(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

async function directoryExists(path: string) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(path: string) {
  try {
    const file = Bun.file(path);
    return await file.exists();
  } catch {
    return false;
  }
}

async function main() {
  console.log("Building all executables...");

  // Ensure required directories exist
  for (const dir of REQUIRED_DIRS) {
    console.log(`Ensuring directory exists: ${dir}`);
    await ensureDirectoryExists(dir);
  }

  const buildResult = Bun.spawnSync(["bun", "run", "b.all"]);
  if (buildResult.exitCode !== 0) {
    console.error("Build failed:", buildResult.stderr.toString());
    process.exit(1);
  }

  // Create dist directory
  await mkdir(DIST_DIR, { recursive: true });

  // Create platform directories and copy files
  for (const platform of platforms) {
    for (const variant of platform.variants) {
      const variantType = variant === "base" ? "baseline" : "modern";
      const dirName = `${platform.name}-${variant}`;
      const platformDir = join(DIST_DIR, dirName);

      console.log(`\nSetting up ${dirName}...`);

      try {
        // Create platform directory
        await mkdir(platformDir, { recursive: true });

        // Copy src and public directories to root for all platforms
        if (await directoryExists("./src")) {
          console.log("Copying src directory...");
          await copyDir("./src", join(platformDir, "src"));
        } else {
          console.warn("./src directory not found");
        }

        if (await directoryExists("./public")) {
          console.log("Copying public directory...");
          await copyDir("./public", join(platformDir, "public"));
        } else {
          console.warn("./public directory not found");
        }

        // Copy the executable
        const execName = `${platform.name}-x64-${variantType}${
          platform.name === "windows" ? ".exe" : ""
        }`;
        const execPath = join("./exec", execName);
        const destPath = join(
          platformDir,
          platform.name === "windows" ? "chatter.exe" : "chatter"
        );

        console.log(`Copying executable from ${execPath} to ${destPath}`);

        if (await fileExists(execPath)) {
          await copyFile(execPath, destPath);
        } else {
          console.error(`Executable not found: ${execPath}`);
          throw new Error(`Executable not found: ${execPath}`);
        }
      } catch (error) {
        console.error(`Error setting up ${dirName}:`, error);
        if (error instanceof Error) {
          console.error("Stack trace:", error.stack);
        }
      }
    }
  }

  console.log("\nBuild and distribution complete!");
}

main().catch(console.error);
