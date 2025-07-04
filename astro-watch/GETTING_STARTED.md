# AstroWatch - Getting Started

Welcome to AstroWatch! This guide will help you get the application running in just a few minutes.

## 🚀 Quick Start

1. **Get your NASA API key** (free) - see [NASA_API_SETUP.md](./NASA_API_SETUP.md)
2. **Add it to your environment file**
3. **Start the application**

## 📋 Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up NASA API Key

Follow the detailed instructions in [NASA_API_SETUP.md](./NASA_API_SETUP.md)

**Quick version:**
1. Go to [https://api.nasa.gov/](https://api.nasa.gov/) and get a free API key
2. Open `.env.local` file
3. Replace `your_nasa_api_key_here` with your actual API key

### 3. Start the Application

**Using the custom start script (recommended):**
```bash
npm run astro:start
```

**Or using standard npm:**
```bash
npm run dev
```

### 4. Open Your Browser

Go to [http://localhost:3000](http://localhost:3000) to see AstroWatch in action!

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `npm run astro:start` | Start AstroWatch with validation checks |
| `npm run astro:stop` | Stop all running AstroWatch processes |
| `npm run astro:setup` | Show setup instructions |
| `npm run dev` | Start development server (standard Next.js) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## 🔧 Direct Script Usage

You can also run the scripts directly:

```bash
# Start the application
./scripts/start.sh

# Stop the application
./scripts/stop.sh
```

## 🎯 What You'll See

Once running, AstroWatch provides:

- **Real-time asteroid tracking** from NASA's Near Earth Object API
- **Interactive 3D visualization** of asteroids orbiting Earth
- **Risk assessment** using machine learning models
- **Multiple view modes**: 3D visualization, dashboard charts, and impact maps
- **Filtering and controls** to explore different asteroid populations

## 🆘 Need Help?

- **API Key Issues**: See [NASA_API_SETUP.md](./NASA_API_SETUP.md)
- **Application won't start**: Check that you have Node.js installed and dependencies are installed
- **No data showing**: Verify your NASA API key is set correctly

## 📚 Project Structure

```
astro-watch/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   └── ...
├── components/         # React components
│   └── visualization/  # 3D and chart components
├── lib/               # Core libraries
│   ├── nasa-api.ts    # NASA API client
│   ├── store.ts       # State management
│   └── advanced-ml.ts # ML models
├── scripts/           # Start/stop scripts
├── .env.local         # Environment variables (create this)
├── NASA_API_SETUP.md  # API key setup guide
└── GETTING_STARTED.md # This file
```

## 🌟 Features

- **3D Solar System View**: Interactive Earth and asteroid visualization
- **Risk Dashboard**: Charts showing asteroid risk over time
- **Smart Filtering**: Filter by risk level, time range, and more
- **Real-time Updates**: Data refreshes automatically
- **Mobile Responsive**: Works on desktop and mobile devices

---

**Ready to explore the cosmos? Start with `npm run astro:start`! 🌌**