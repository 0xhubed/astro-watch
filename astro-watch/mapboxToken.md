  🗺️ Getting Your Mapbox Token

  Step 1: Sign Up for Mapbox

  1. Go to Mapbox website: https://www.mapbox.com/
  2. Click "Sign up" (usually in the top right corner)
  3. Create your account:
    - Enter your email address
    - Create a password
    - Choose a username
    - Click "Get started"

  Step 2: Verify Your Email

  1. Check your email for a verification message from Mapbox
  2. Click the verification link in the email
  3. Complete any additional setup if prompted

  Step 3: Get Your Access Token

  1. Log into your Mapbox account
  2. Go to your Account page:
    - Click your profile/avatar in the top right
    - Select "Account" from the dropdown
  3. Find your Access Tokens:
    - Look for the "Access tokens" section
    - You'll see a "Default public token" already created
    - It looks like: pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsaXlz...
  4. Copy the token:
    - Click the copy button next to your default token
    - Or create a new token if you prefer

  Step 4: Add Token to Your Environment

  1. Open your .env.local file:
  cd /home/hubed/projects/astro-watch/astro-watch
  nano .env.local
  2. Replace the placeholder:
  # Before:
  NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

  # After (with your actual token):
  NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsaXlz...
  3. Save the file

  💰 Pricing Information

  Free Tier Includes:
  - 50,000 map loads per month
  - All basic map styles
  - Geocoding API requests
  - Perfect for development and small projects

  You won't be charged unless you exceed the free limits.

  🔗 Quick Links

  - Mapbox Homepage: https://www.mapbox.com/
  - Sign Up: https://account.mapbox.com/auth/signup/
  - Account Dashboard: https://account.mapbox.com/ (after signup)

  ⚡ Alternative: Skip for Now

  If you want to start using AstroWatch immediately without Mapbox:

  1. Leave the token as is (placeholder value)
  2. Start the application: npm run astro:start
  3. Add Mapbox token later when you want enhanced maps

  The application will work great with just your NASA API key! You can always add the Mapbox token later for
  enhanced mapping features.