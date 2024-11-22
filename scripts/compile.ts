import { mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";

const DIST_DIR = "./dist";
const platforms = [
    { name: "linux", variants: ["base", "modern"] },
    { name: "darwin", variants: ["base", "modern"] },
    { name: "windows", variants: ["base", "modern"] }
];

async function copyDir(src: string, dest: string) {
    const entries = await readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await mkdir(destPath, { recursive: true });
            await copyDir(srcPath, destPath);
        } else {
            await copyFile(srcPath, destPath);
        }
    }
}

async function main() {
    console.log("Building all executables...");
    const buildResult = Bun.spawnSync(["bun", "run", "b.all"]);
    if (buildResult.exitCode !== 0) {
        console.error("Build failed");
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
            
            console.log(`Setting up ${dirName}...`);
            
            // Create platform directory
            await mkdir(platformDir, { recursive: true });
            
            // Copy src and public directories to root for all platforms
            await copyDir("./src", join(platformDir, "src"));
            await copyDir("./public", join(platformDir, "public"));
            
            // Copy executable to root with appropriate name
            const execName = platform.name === "windows" ? "windows" : 
                           platform.name === "darwin" ? "darwin" : "linux";
            const execExt = platform.name === "windows" ? ".exe" : "";
            const execPath = `./exec/${execName}-x64-${variantType}${execExt}`;
            const destExecPath = join(platformDir, `chatter${execExt}`);
            await copyFile(execPath, destExecPath);
        }
    }
    
    console.log("Build and distribution complete!");
}

main().catch(console.error);