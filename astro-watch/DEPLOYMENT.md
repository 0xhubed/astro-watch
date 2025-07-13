# 🚀 AstroWatch Deployment Guide

This guide covers deploying AstroWatch to Vercel and other cloud platforms.

## 🌐 Vercel Deployment (Recommended)

### Prerequisites
- [Vercel account](https://vercel.com/signup)
- [NASA API key](https://api.nasa.gov/) (free)
- Git repository (GitHub, GitLab, or Bitbucket)

### Quick Deploy with Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```
   This script will:
   - Clean previous builds
   - Install dependencies
   - Run type checking and linting
   - Build the application
   - Provide deployment instructions

4. **Production Deployment**
   ```bash
   vercel --prod
   ```

### Deploy via Vercel Dashboard

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm ci`

3. **Set Environment Variables**
   ```env
   NASA_API_KEY=your_nasa_api_key_here
   NEXT_PUBLIC_NASA_API_BASE=https://api.nasa.gov/neo/rest/v1
   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

### Vercel Configuration

The project includes a `vercel.json` configuration file that sets up:

- **Function Timeouts**: Extended timeouts for API routes
- **Headers**: CORS configuration and caching headers
- **Rewrites**: NASA API proxy configuration
- **Static Asset Caching**: Optimized caching for models and textures

## 🔧 Environment Variables

### Required Variables
```env
NASA_API_KEY=your_nasa_api_key_here
```

### Optional Variables
```env
NEXT_PUBLIC_NASA_API_BASE=https://api.nasa.gov/neo/rest/v1
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_ML_MODEL_CACHE_TIMEOUT=86400000
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_VERCEL_SPEED_INSIGHTS_ID=your_insights_id
```

## 🏗️ Build Process

### Local Build
```bash
npm run build
```

### Production Build (Vercel)
The build process includes:
1. Dependency installation with frozen lockfile
2. TypeScript compilation check
3. Next.js build with optimizations
4. Static asset generation
5. Model directory setup

### Build Optimization
- **Tree Shaking**: Unused code elimination
- **Code Splitting**: Route-based chunking
- **Asset Optimization**: Image and static file compression
- **Bundle Analysis**: Automated bundle size monitoring

## 🚀 Alternative Deployment Platforms

### Netlify
1. **Build Settings**
   - **Build Command**: `npm run build`
   - **Publish Directory**: `.next`

2. **Environment Variables**
   - Set the same variables as Vercel

3. **Redirects** (netlify.toml)
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

### Railway
1. **Deploy from GitHub**
   ```bash
   railway login
   railway link
   railway up
   ```

2. **Environment Variables**
   ```bash
   railway variables set NASA_API_KEY=your_key
   ```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance Monitoring

### Vercel Analytics
Enable in your Vercel dashboard:
- **Web Analytics**: User behavior tracking
- **Speed Insights**: Core Web Vitals monitoring
- **Function Metrics**: API performance tracking

### Custom Monitoring
The application includes built-in performance monitoring:
- ML model performance tracking
- API response time monitoring
- Client-side error reporting

## 🔍 Post-Deployment Checklist

- [ ] Verify NASA API key is working
- [ ] Test asteroid data loading
- [ ] Confirm ML models are training/loading
- [ ] Check 3D visualizations render correctly
- [ ] Validate responsive design on mobile
- [ ] Test API endpoints functionality
- [ ] Monitor performance metrics
- [ ] Verify error handling

## 🚨 Troubleshooting

### Common Issues

**Build Failures**
- Check Node.js version (18.x+ required)
- Verify all dependencies are installed
- Check TypeScript compilation errors

**API Issues**
- Validate NASA API key
- Check CORS configuration
- Verify environment variables

**ML Model Issues**
- Ensure TensorFlow.js is loading in browser
- Check model file paths
- Verify feature normalization

**Performance Issues**
- Monitor bundle size
- Check for memory leaks in 3D rendering
- Optimize image and asset loading

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Project GitHub Issues](https://github.com/your-username/astro-watch/issues)

---

🌌 **Ready to deploy AstroWatch and monitor the cosmos in production!**