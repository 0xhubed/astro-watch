# 🌌 AstroWatch - Asteroid Impact Visualization

An advanced, real-time asteroid tracking and impact visualization application built with Next.js, Three.js, and machine learning. Experience near-Earth objects like never before with interactive 3D visualizations, predictive risk analysis, and immersive data exploration.

## ✨ Features

### 🚀 **3D Visualizations**
- **Interactive Solar System**: Real-time 3D visualization of Earth and asteroid orbits
- **Enhanced Earth Model**: Detailed planet with atmospheric effects and rotation
- **Asteroid Field Rendering**: GPU-accelerated instanced rendering for thousands of asteroids
- **Orbital Mechanics**: Accurate trajectory calculations and orbital animations

### 📊 **Data Analytics & Dashboards**
- **Risk Assessment Dashboard**: Real-time charts showing asteroid risk levels over time
- **Timeline Visualization**: Interactive timeline of asteroid close approaches
- **Risk Distribution Analysis**: Pie charts and radar plots for risk factor breakdown
- **Impact Heatmaps**: Geographic visualization of potential impact zones

### 🤖 **Machine Learning Integration**
- **Advanced Risk Prediction**: TensorFlow.js-powered ensemble models
- **Feature Analysis**: Multi-pathway neural networks analyzing size, velocity, distance, and orbital characteristics
- **Confidence Scoring**: Risk predictions with confidence intervals
- **Factor Contribution**: Detailed breakdown of risk factors

### 🌍 **Interactive Globe**
- **3D Earth Globe**: Realistic Earth visualization with impact point mapping
- **Real-time Impact Points**: Dynamic visualization of potential impact locations
- **Geographic Risk Distribution**: Country and region-based risk analysis
- **Atmospheric Effects**: Realistic atmospheric rendering and lighting

### ⚡ **Performance Features**
- **Real-time Updates**: Data refreshes every minute with smooth animations
- **Efficient Rendering**: Optimized for 60fps performance
- **Responsive Design**: Works seamlessly on desktop and mobile devices
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

### **Machine Learning**
- **TensorFlow.js** - Client-side machine learning
- **Simple Statistics** - Statistical analysis and calculations
- **ML Matrix** - Matrix operations for advanced calculations

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

### **Navigation**
- **3D View**: Interactive solar system with asteroid orbits
- **Dashboard**: Charts and analytics for risk assessment
- **Map View**: Global impact visualization (coming soon)

### **Controls**
- **Time Range**: Switch between day, week, and month views
- **Risk Filter**: Filter asteroids by risk level (high, medium, low)
- **Visual Options**: Toggle trajectories and particle effects
- **Interactive Camera**: Zoom, pan, and rotate in 3D views

### **Data Sources**
- **NASA NEO API**: Real-time near-Earth object data
- **Orbital Mechanics**: Physics-based trajectory calculations
- **Risk Assessment**: Multi-factor ML-based risk scoring

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
│   ├── advanced-ml.ts          # Machine learning models
│   └── store.ts                # Zustand state management
├── hooks/                       # Custom React hooks
├── types/                       # TypeScript type definitions
├── public/
│   ├── models/                  # 3D models and assets
│   ├── textures/                # Earth and space textures
│   └── workers/                 # Web workers for calculations
└── shaders/                     # GLSL shaders for effects
```

## 🌟 Key Features in Detail

### **Real-time Asteroid Tracking**
- Live data from NASA's Near Earth Object Web Service
- Automatic updates every minute
- Support for historical and future asteroid approaches

### **Advanced Risk Analysis**
- Multi-factor risk assessment using machine learning
- Considers size, velocity, distance, and orbital characteristics
- Confidence scoring for prediction reliability

### **Interactive 3D Visualizations**
- GPU-accelerated rendering for smooth performance
- Realistic physics-based orbital mechanics
- Dynamic lighting and atmospheric effects

### **Responsive Data Dashboards**
- Real-time charts and graphs
- Interactive timeline visualization
- Risk distribution analysis

## 🚀 Deployment

### **Vercel (Recommended)**
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on every push

### **Manual Deployment**
```bash
npm run build
npm run start
```

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

**Built with ❤️ for space enthusiasts and data visualization lovers**

🌌 *Explore the cosmos, understand the risks, and visualize the future of our planet's safety.*