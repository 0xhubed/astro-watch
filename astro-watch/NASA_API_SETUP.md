# NASA API Key Setup Guide

This guide will help you set up your NASA API key for the AstroWatch application.

## 🚀 Quick Start

1. **Get your NASA API key** (free)
2. **Add it to your environment file**
3. **Start the application**

## 📋 Step-by-Step Instructions

### Step 1: Get Your NASA API Key

1. **Visit the NASA API Portal**: Go to [https://api.nasa.gov/](https://api.nasa.gov/)

2. **Sign up for a free API key**:
   - Click on "Get Started" or "Generate API Key"
   - Fill out the form with your information:
     - First Name
     - Last Name  
     - Email address
   - Click "Signup"

3. **Check your email**:
   - NASA will send you an email with your API key
   - The API key will be a long string of letters and numbers
   - Example format: `abcd1234efgh5678ijkl9012mnop3456qrst7890`

4. **Save your API key**:
   - Copy the API key from the email
   - Keep it safe - you'll need it for the next step

### Step 2: Configure Your Environment

1. **Navigate to your project directory**:
   ```bash
   cd astro-watch
   ```

2. **Open the `.env.local` file** in your favorite text editor:
   ```bash
   # Using nano
   nano .env.local
   
   # Using vim
   vim .env.local
   
   # Using VS Code
   code .env.local
   ```

3. **Replace the placeholder with your actual API key**:
   
   **Find this line:**
   ```bash
   NASA_API_KEY=your_nasa_api_key_here
   ```
   
   **Replace it with your actual key:**
   ```bash
   NASA_API_KEY=abcd1234efgh5678ijkl9012mnop3456qrst7890
   ```

4. **Save the file**:
   - In nano: Press `Ctrl+X`, then `Y`, then `Enter`
   - In vim: Press `Esc`, type `:wq`, then `Enter`
   - In VS Code: Press `Ctrl+S` (or `Cmd+S` on Mac)

### Step 3: Verify Your Setup

1. **Check that your API key is properly set**:
   ```bash
   grep "NASA_API_KEY" .env.local
   ```
   
   You should see your API key (not the placeholder):
   ```bash
   NASA_API_KEY=abcd1234efgh5678ijkl9012mnop3456qrst7890
   ```

2. **Start the application**:
   ```bash
   # Using the start script
   ./scripts/start.sh
   
   # Or using npm directly
   npm run dev
   ```

3. **Open your browser** and go to [http://localhost:3000](http://localhost:3000)

## 🔧 Complete .env.local File Reference

Your `.env.local` file should look like this:

```bash
# NASA API Configuration
NASA_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_NASA_API_BASE=https://api.nasa.gov/neo/rest/v1

# Enhanced features
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
TENSORFLOW_MODEL_URL=/models/asteroid-risk-model.json

# Performance monitoring
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

## 🚨 Important Notes

- **Keep your API key secret**: Never commit your `.env.local` file to version control
- **Rate limits**: NASA API has a rate limit of 1,000 requests per hour
- **Free tier**: The NASA API is completely free for most use cases
- **Demo key**: You can use `DEMO_KEY` for testing, but it has lower rate limits

## 🛠️ Troubleshooting

### Problem: "NASA_API_KEY not found" error
**Solution**: Make sure you've created the `.env.local` file and added your API key

### Problem: "NASA_API_KEY is still set to placeholder value" error
**Solution**: Replace `your_nasa_api_key_here` with your actual NASA API key

### Problem: API requests are failing
**Solutions**:
1. Check that your API key is correct
2. Verify you haven't exceeded the rate limit (1,000 requests/hour)
3. Try using `DEMO_KEY` temporarily to test the connection

### Problem: Application won't start
**Solutions**:
1. Make sure you're in the correct directory (`astro-watch`)
2. Run `npm install` to install dependencies
3. Check that Node.js is installed (`node --version`)

## 📚 Additional Resources

- **NASA API Documentation**: [https://api.nasa.gov/](https://api.nasa.gov/)
- **Near Earth Object Web Service**: [https://cneos.jpl.nasa.gov/about/neo_groups.html](https://cneos.jpl.nasa.gov/about/neo_groups.html)
- **Next.js Environment Variables**: [https://nextjs.org/docs/basic-features/environment-variables](https://nextjs.org/docs/basic-features/environment-variables)

## 🆘 Need Help?

If you're still having issues:

1. **Check the console** for error messages when starting the application
2. **Verify your API key** by testing it directly: `https://api.nasa.gov/neo/rest/v1/feed?api_key=YOUR_KEY`
3. **Make sure all dependencies are installed**: `npm install`
4. **Try the demo key**: Temporarily use `DEMO_KEY` instead of your API key to test

## 🎯 Quick Commands

```bash
# Start the application
./scripts/start.sh

# Stop the application
./scripts/stop.sh

# Check if API key is set
grep "NASA_API_KEY" .env.local

# Test API connection (replace YOUR_KEY with your actual key)
curl "https://api.nasa.gov/neo/rest/v1/feed?api_key=YOUR_KEY"
```

---

**Happy asteroid tracking! 🌌**