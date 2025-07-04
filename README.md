# 🌍 AstroWatch - Real-time Asteroid Tracking & Visualization

A stunning 3D web application for tracking and visualizing near-Earth asteroids with realistic space environments and NASA satellite imagery.

## ✨ Features

- **Real-time asteroid tracking** with NASA API integration
- **Photorealistic 3D Earth** with satellite imagery textures
- **Interactive solar system view** with orbital mechanics
- **Earth impact analysis** with approach trajectories
- **Risk-based filtering** (High/Medium/Low risk asteroids)
- **Particle effects** and realistic space lighting
- **Responsive design** with modern UI

## 🚀 Getting Started

### Installation
```bash
npm install
# or
yarn install
```

### Development Server
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌍 Adding Realistic Earth Textures

For photorealistic Earth visuals, download NASA satellite imagery:

### Quick Setup
```bash
# Run the automated texture downloader
./scripts/download-textures.sh
```

### Manual Setup
```bash
# Create textures directory
mkdir -p public/textures

# Download NASA Blue Marble texture (5400x2700 resolution)
curl -o public/textures/earth_day.jpg "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg"
```

**Result**: Transform basic Earth visualization into stunning photorealistic satellite imagery! 

📝 See `EARTH_TEXTURES_SETUP.md` for detailed instructions and alternative sources.

## 🎮 Usage

1. **3D View**: Explore the solar system with Earth, asteroids, and orbital paths
2. **Interactive Globe**: Earth-focused view showing asteroid approach trajectories  
3. **Risk Filtering**: Filter asteroids by impact risk level
4. **Time Ranges**: View asteroids approaching in the next day/week/month
5. **Camera Controls**: Multiple preset views (Solar System, Earth Close-up, etc.)

## 🛠 Technology Stack

- **Next.js 14** - React framework
- **Three.js + React Three Fiber** - 3D graphics and WebGL
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **NASA API** - Real asteroid data
- **Zustand** - State management
- **Framer Motion** - Animations

## 📊 Data Sources

- **NASA CNEOS** - Near-Earth Object data
- **NASA Blue Marble** - Earth satellite imagery
- **Real-time updates** - Live asteroid tracking