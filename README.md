# 🌌 AstroWatch - Near Earth Object Visualization Playground

An experimental 3D visualization and machine learning playground for exploring near-Earth asteroids. Built with Next.js, Three.js, and TensorFlow.js, AstroWatch serves as a reference implementation for combining NASA asteroid data with interactive 3D visualizations and client-side ML predictions.

> **⚠️ Disclaimer**: This is an experimental playground and reference implementation, not a production-ready risk assessment tool. All risk predictions are experimental and should not be used for actual asteroid threat evaluation. For authoritative asteroid data and risk assessments, please refer to official sources like NASA/JPL and ESA.

## ✨ Features

### 🚀 **3D Visualizations**
- **Interactive Solar System**: Real-time 3D visualization of Earth and asteroid orbits
- **Enhanced Earth Model**: Detailed planet with atmospheric effects and rotation
- **Asteroid Field Rendering**: GPU-accelerated instanced rendering for thousands of asteroids
- **Orbital Mechanics**: Accurate trajectory calculations and orbital animations

### 📊 **Data Analytics & Dashboards**
- **Risk Assessment Dashboard**: Charts showing asteroid risk levels over time
- **Timeline Visualization**: Interactive timeline of asteroid close approaches
- **Risk Distribution Analysis**: Pie charts and radar plots for risk factor breakdown
- **Impact Visualization**: Geographic visualization of potential impact zones

### 🤖 **Experimental ML Risk Assessment**
- **TensorFlow.js ML Models**: Client-side neural networks for experimental risk prediction
- **Multi-Factor Analysis**: 6-dimensional feature vectors analyzing size, velocity, distance, orbital characteristics, kinetic energy, and proximity factors
- **Browser-Based Training**: Automatic model training when pre-trained models are unavailable
- **Intelligent Fallback**: Rule-based calculations when ML models can't load
- **Batch Processing**: Predictions for multiple asteroids with performance monitoring
- **Visual ML Status**: Indicator showing whether ML model or fallback system is active

### 🌍 **Interactive Globe**
- **3D Earth Globe**: Realistic Earth visualization with impact point mapping
- **Real-time Impact Points**: Dynamic visualization of potential impact locations
- **Geographic Risk Distribution**: Country and region-based risk analysis
- **Atmospheric Effects**: Realistic atmospheric rendering and lighting

### ⚡ **Performance Features**
- **Periodic Updates**: Data refreshes every 15 minutes with smooth animations
- **Efficient Rendering**: Optimized for smooth performance
- **Responsive Design**: Works on desktop and mobile devices
- **Progressive Loading**: Smart loading strategies for optimal user experience

## 🛠 Tech Stack

### **Frontend Framework**
- **Next.js 15** - React framework with App Router
- **TypeScript** - Full type safety and developer experience
- **Tailwind CSS** - Utility-first styling with custom space theme

### **3D Graphics & Visualization**
- **Three.js** - 3D graphics and WebGL rendering
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers and abstractions for 3D scenes
- **React Globe.gl** - Interactive 3D globe visualization

### **Data Visualization**
- **Recharts** - Composable charting library for React
- **D3.js** - Data-driven document manipulation
- **Framer Motion** - Smooth animations and transitions

### **State Management & Data**
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state management with caching
- **NASA NEO API** - Real asteroid data from NASA's Near Earth Object Web Service

### **Machine Learning & AI**
- **TensorFlow.js** - Client-side neural networks and model training
- **Browser ML Training** - In-browser model training with synthetic data generation
- **Feature Engineering** - Advanced asteroid characteristic extraction and normalization
- **Simple Statistics** - Statistical analysis and risk calculations
- **ML Matrix** - Matrix operations for advanced mathematical calculations

### **Development Tools**
- **ESLint** - Code linting and formatting
- **TypeScript Definitions** - Type definitions for all major libraries
- **Vercel** - Deployment and hosting platform

## 🚀 Getting Started

### Prerequisites

- **Node.js 18.x or higher**
- **npm, yarn, or pnpm**
- **NASA API Key** (free from [NASA API Portal](https://api.nasa.gov/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/astro-watch.git
   cd astro-watch
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your NASA API key to `.env.local`:
   ```env
   NASA_API_KEY=your_nasa_api_key_here
   NEXT_PUBLIC_NASA_API_BASE=https://api.nasa.gov/neo/rest/v1
   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 Usage

### **As a Reference Implementation**
This project demonstrates:
- **NASA API Integration**: How to fetch and process NEO data
- **3D Visualization**: Three.js integration with React for space visualizations
- **Client-side ML**: TensorFlow.js for browser-based model training and inference
- **Performance Optimization**: Efficient rendering of large datasets
- **Modern Web Stack**: Next.js, TypeScript, and modern React patterns

### **Navigation**
- **3D View**: Interactive solar system with asteroid orbits
- **Dashboard**: Charts and analytics for experimental risk assessment
- **Map View**: Global impact visualization (experimental)

### **Controls**
- **Time Range**: Switch between day, week, and month views
- **Risk Filter**: Filter asteroids by experimental risk level (high, medium, low)
- **Visual Options**: Toggle trajectories and particle effects
- **Interactive Camera**: Zoom, pan, and rotate in 3D views

### **Data Sources**
- **NASA NEO API**: Near-Earth object data (updated periodically)
- **Orbital Mechanics**: Physics-based trajectory calculations
- **Risk Assessment**: Experimental ML-based and rule-based risk scoring

## 🏗 Project Structure

```
astro-watch/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── asteroids/           # NASA API integration
│   │   └── predictions/         # ML predictions endpoint
│   ├── asteroids/[id]/          # Individual asteroid pages
│   ├── layout.tsx               # Root layout with providers
│   └── page.tsx                 # Main application page
├── components/
│   ├── visualization/
│   │   ├── 3d/                  # Three.js components
│   │   │   ├── EnhancedSolarSystem.tsx
│   │   │   └── InteractiveGlobe.tsx
│   │   ├── charts/              # Data visualization
│   │   │   └── RiskDashboard.tsx
│   │   ├── controls/            # UI controls
│   │   │   └── Controls.tsx
│   │   ├── effects/             # Visual effects
│   │   └── maps/                # Geographic visualizations
│   ├── dashboard/               # Dashboard components
│   └── ui/                      # Reusable UI components
├── lib/
│   ├── nasa-api.ts             # NASA API client
│   ├── ml/                      # Machine Learning modules
│   │   ├── risk-predictor.ts    # Main ML prediction engine
│   │   ├── feature-engineering.ts # Feature extraction & normalization
│   │   ├── browser-trainer.ts   # In-browser model training
│   │   ├── data-generator.ts    # Synthetic training data
│   │   └── model-trainer.ts     # Advanced training pipelines
│   ├── advanced-ml.ts           # Legacy ML utilities
│   └── store.ts                 # Zustand state management
├── hooks/                       # Custom React hooks
│   └── useMLPredictions.ts      # Client-side ML enhancement hook
├── types/                       # TypeScript type definitions
├── public/
│   ├── models/                  # 3D models and assets
│   ├── textures/                # Earth and space textures
│   └── workers/                 # Web workers for calculations
└── shaders/                     # GLSL shaders for effects
```

## 🌟 Key Features in Detail

### **Asteroid Data Visualization**
- Data from NASA's Near Earth Object Web Service
- Periodic updates (15-minute intervals)
- Support for historical and future asteroid approaches

### **Experimental ML Risk Analysis**
- **Dual-Mode Processing**: Server-side rule-based calculations + client-side ML enhancement
- **6-Factor Assessment**: Size (log-normalized), velocity, miss distance, PHA status, kinetic energy, and proximity flags
- **Neural Network Architecture**: Dense layers with dropout regularization for experimental predictions
- **Automatic Training**: Browser-based model training with 5000+ synthetic samples when pre-trained models unavailable
- **Performance Monitoring**: ML processing metrics and model performance tracking
- **Intelligent Fallback**: Seamless transition between ML and rule-based systems

### **Interactive 3D Visualizations**
- GPU-accelerated rendering for smooth performance
- Realistic physics-based orbital mechanics
- Dynamic lighting and atmospheric effects

### **Responsive Data Dashboards**
- Real-time charts and graphs
- Interactive timeline visualization
- Risk distribution analysis

## 🚀 Deployment

### **Quick Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Run deployment preparation script
npm run deploy

# Deploy to production
vercel --prod
```

### **Environment Variables Required**
```env
NASA_API_KEY=your_nasa_api_key_here
NEXT_PUBLIC_NASA_API_BASE=https://api.nasa.gov/neo/rest/v1
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

### **Deployment Features**
- ⚡ **Zero-config deployment** with Vercel
- 🔄 **Automatic builds** on git push
- 🌐 **Global CDN** distribution
- 📊 **Built-in analytics** and monitoring
- 🔧 **Custom build optimizations** for ML models

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NASA** for providing the Near Earth Object Web Service
- **Three.js** community for excellent 3D graphics capabilities
- **Next.js** team for the amazing React framework
- **Vercel** for hosting and deployment platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/astro-watch/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/astro-watch/discussions)
- **Documentation**: [Project Wiki](https://github.com/your-username/astro-watch/wiki)

---

**Built with ❤️ for space enthusiasts, developers, and data visualization explorers**

🌌 *An experimental platform for learning about near-Earth objects through interactive 3D visualization and machine learning techniques.*