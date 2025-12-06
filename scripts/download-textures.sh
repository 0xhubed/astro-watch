#!/bin/bash

# 🌍 NASA Earth Texture Downloader
# Downloads realistic Earth textures for AstroWatch

set -e  # Exit on any error

echo "🌍 Downloading NASA Earth Textures..."
echo "======================================"

# Determine target textures directory (prefer app dir)
TARGET_DIR="astro-watch/public/textures"
if [ ! -d "$TARGET_DIR" ]; then
  # Fallback to repo root public if app dir not present
  TARGET_DIR="public/textures"
fi

echo "Target textures directory: $TARGET_DIR"
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

# Function to download with progress
download_with_progress() {
    local url=$1
    local filename=$2
    local description=$3
    
    echo "📥 Downloading $description..."
    if command -v curl >/dev/null 2>&1; then
        curl -L --progress-bar -o "$filename" "$url"
    elif command -v wget >/dev/null 2>&1; then
        wget --progress=bar -O "$filename" "$url"
    else
        echo "❌ Error: Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    if [ -f "$filename" ]; then
        local size=$(du -h "$filename" | cut -f1)
        echo "✅ Downloaded $filename ($size)"
    else
        echo "❌ Failed to download $filename"
        exit 1
    fi
}

# Download main Earth texture (NASA Blue Marble)
if [ ! -f "earth_day.jpg" ]; then
    download_with_progress \
        "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg" \
        "earth_day.jpg" \
        "NASA Blue Marble Day Texture (5400x2700)"
else
    echo "⏭️  earth_day.jpg already exists, skipping..."
fi

# Download cloud texture (optional)
if [ ! -f "earth_clouds.jpg" ]; then
    download_with_progress \
        "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg" \
        "earth_clouds.jpg" \
        "NASA Cloud Texture (2048x1024)"
else
    echo "⏭️  earth_clouds.jpg already exists, skipping..."
fi

# Download night texture (optional)
if [ ! -f "earth_night.jpg" ]; then
    echo "📥 Downloading NASA Earth Night Texture (optional)..."
    if download_with_progress \
        "https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg" \
        "earth_night.jpg" \
        "NASA Earth Night Lights (3600x1800)" 2>/dev/null; then
        echo "✅ Night texture downloaded successfully"
    else
        echo "⚠️  Night texture download failed (optional, continuing...)"
    fi
else
    echo "⏭️  earth_night.jpg already exists, skipping..."
fi

# Verify downloads
echo ""
echo "🔍 Verifying downloads..."
echo "========================="

for file in earth_day.jpg earth_clouds.jpg; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "✅ $file - $size"
    else
        echo "❌ $file - Missing"
    fi
done

# Optional files
for file in earth_night.jpg; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "✅ $file - $size (optional)"
    else
        echo "ℹ️  $file - Not downloaded (optional)"
    fi
done

echo ""
echo "🎉 Texture download complete!"
echo "============================="
echo "Your Earth visualization will now use realistic NASA satellite imagery."
echo ""
echo "Total downloaded size:"
du -sh . 2>/dev/null || echo "Unable to calculate total size"

echo ""
echo "🚀 Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Open the 3D visualization"
echo "3. Enjoy photorealistic Earth! 🌍✨"
echo ""
echo "📝 Note: If textures don't load, check the console for error messages."
echo "The app will fall back to procedural textures if needed."
