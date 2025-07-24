# Implementation Plan: Critical Asteroid Email Notifications

## Overview

This document outlines the implementation plan for adding email notification functionality to AstroWatch, allowing users to receive alerts when critical asteroids are detected.

## Phase 1: Database & Infrastructure Setup

### 1.1 Database Schema Design

```sql
-- Users table for email subscriptions
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  risk_threshold INTEGER DEFAULT 5, -- Torino Scale threshold
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Alert history to prevent duplicate notifications
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asteroid_id VARCHAR(255) NOT NULL,
  asteroid_name VARCHAR(255),
  torino_scale INTEGER,
  risk_level DECIMAL(3,2),
  sent_at TIMESTAMP DEFAULT NOW(),
  recipient_count INTEGER
);

-- User-specific alert log
CREATE TABLE user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  alert_history_id UUID REFERENCES alert_history(id),
  sent_at TIMESTAMP DEFAULT NOW()
);
```

### 1.2 Environment Setup

```env
# Add to .env.local
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@astrowatch.com
CRON_SECRET=your_secure_cron_secret
```

## Phase 2: API Endpoints

### 2.1 Subscription Management

```typescript
// app/api/subscribe/route.ts
export async function POST(request: Request) {
  // Subscribe user to notifications
  // Validate email, store in database
  // Send confirmation email
}

// app/api/unsubscribe/route.ts  
export async function POST(request: Request) {
  // Unsubscribe user by email or token
}

// app/api/preferences/route.ts
export async function PUT(request: Request) {
  // Update user risk threshold preferences
}
```

### 2.2 Background Monitoring API

```typescript
// app/api/cron/monitor-asteroids/route.ts
export async function GET(request: Request) {
  // Verify cron secret for security
  // Fetch latest asteroid data
  // Compare against alert history
  // Send notifications for new critical asteroids
  // Update alert history
}
```

## Phase 3: Background Monitoring Service

### 3.1 Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/monitor-asteroids",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### 3.2 Monitoring Logic

```typescript
// lib/alert-monitor.ts
export async function checkForCriticalAsteroids() {
  // 1. Fetch current asteroid data from NASA API
  // 2. Filter asteroids above risk threshold
  // 3. Compare with previous alerts (avoid duplicates)
  // 4. Get active subscribers
  // 5. Send batch notifications
  // 6. Log alert history
}
```

## Phase 4: Email Service Integration

### 4.1 Email Templates

```typescript
// lib/email-templates.ts
export const criticalAsteroidTemplate = {
  subject: "🚨 Critical Asteroid Alert - {asteroidName}",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); color: white; padding: 20px; text-align: center;">
        <h1>🚨 Critical Asteroid Alert</h1>
        <h2>{asteroidName}</h2>
      </div>
      
      <div style="padding: 20px; background: #f8fafc;">
        <p style="font-size: 16px; color: #374151;">
          A high-risk asteroid has been detected and classified as potentially threatening.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">Asteroid Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Torino Scale:</strong> {torinoScale}
            </li>
            <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Size:</strong> {size} meters
            </li>
            <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Close Approach:</strong> {approachDate}
            </li>
            <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Miss Distance:</strong> {missDistance} AU
            </li>
            <li style="padding: 8px 0;">
              <strong>Risk Level:</strong> {riskLevel}%
            </li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{asteroidUrl}" 
             style="background: #1e3a8a; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Full Details
          </a>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; 
                    text-align: center; color: #6b7280; font-size: 14px;">
          <p>
            This is an automated alert from AstroWatch. 
            <a href="{unsubscribeUrl}" style="color: #1e3a8a;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </div>
  `
};
```

### 4.2 Email Service

```typescript
// lib/email-service.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCriticalAsteroidAlert(
  recipients: string[],
  asteroid: EnhancedAsteroid
) {
  const batchSize = 50; // Resend batch limit
  const batches = [];
  
  for (let i = 0; i < recipients.length; i += batchSize) {
    batches.push(recipients.slice(i, i + batchSize));
  }
  
  const results = [];
  
  for (const batch of batches) {
    try {
      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL!,
        to: batch,
        subject: criticalAsteroidTemplate.subject.replace('{asteroidName}', asteroid.name),
        html: populateEmailTemplate(asteroid)
      });
      
      results.push(result);
      
      // Rate limiting - wait between batches
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error sending batch:', error);
      results.push({ error });
    }
  }
  
  return results;
}

function populateEmailTemplate(asteroid: EnhancedAsteroid): string {
  return criticalAsteroidTemplate.html
    .replace('{asteroidName}', asteroid.name)
    .replace('{torinoScale}', asteroid.torinoScale.toString())
    .replace('{size}', Math.round(asteroid.size).toString())
    .replace('{approachDate}', new Date(asteroid.close_approach_data[0].close_approach_date).toLocaleDateString())
    .replace('{missDistance}', asteroid.missDistance.toFixed(4))
    .replace('{riskLevel}', (asteroid.risk * 100).toFixed(1))
    .replace('{asteroidUrl}', `${process.env.NEXT_PUBLIC_APP_URL}/asteroids/${asteroid.id}`)
    .replace('{unsubscribeUrl}', `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe`);
}
```

## Phase 5: Frontend Integration

### 5.1 Subscription Component

```typescript
// components/notifications/EmailSubscription.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export function EmailSubscription() {
  const [email, setEmail] = useState('');
  const [riskThreshold, setRiskThreshold] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, riskThreshold })
      });
      
      if (response.ok) {
        setMessage('Successfully subscribed! Check your email for confirmation.');
        setEmail('');
      } else {
        setMessage('Error subscribing. Please try again.');
      }
    } catch (error) {
      setMessage('Error subscribing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 p-6 rounded-lg border border-gray-700"
    >
      <h3 className="text-xl font-bold text-white mb-4">🚨 Critical Asteroid Alerts</h3>
      <p className="text-gray-300 mb-4">
        Get notified when potentially threatening asteroids are detected.
      </p>
      
      <form onSubmit={handleSubscribe} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md 
                       text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                       focus:ring-blue-500"
            placeholder="your.email@example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Risk Threshold (Torino Scale)
          </label>
          <select
            value={riskThreshold}
            onChange={(e) => setRiskThreshold(Number(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md 
                       text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={3}>3+ (Attention)</option>
            <option value={4}>4+ (Threatening)</option>
            <option value={5}>5+ (High Risk)</option>
            <option value={6}>6+ (Certain Impact)</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                     text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Subscribing...' : 'Subscribe to Alerts'}
        </button>
      </form>
      
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-4 text-sm ${
            message.includes('Successfully') ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}
```

### 5.2 Integration Points

- Add subscription component to dashboard page
- Include in mobile controls as a modal
- Add notification settings to user preferences

## Phase 6: Risk Detection Logic

### 6.1 Alert Criteria

```typescript
// lib/risk-detection.ts
import { EnhancedAsteroid } from './nasa-api';

export function shouldTriggerAlert(
  asteroid: EnhancedAsteroid, 
  userThreshold: number = 5
): boolean {
  // Primary criteria: Torino Scale
  if (asteroid.torinoScale >= userThreshold) {
    return true;
  }
  
  // Secondary criteria for edge cases
  const criticalConditions = [
    // Very close approach regardless of size
    asteroid.missDistance < 0.005 && asteroid.torinoScale >= 2,
    
    // Large asteroid with moderate risk
    asteroid.size > 1000 && asteroid.torinoScale >= 3,
    
    // High velocity with close approach
    asteroid.velocity > 25 && asteroid.missDistance < 0.01 && asteroid.torinoScale >= 2,
    
    // Potentially hazardous with elevated risk
    asteroid.is_potentially_hazardous_asteroid && asteroid.torinoScale >= 4
  ];
  
  return criticalConditions.some(condition => condition);
}

export function getAlertPriority(asteroid: EnhancedAsteroid): 'low' | 'medium' | 'high' | 'critical' {
  if (asteroid.torinoScale >= 7) return 'critical';
  if (asteroid.torinoScale >= 5) return 'high';
  if (asteroid.torinoScale >= 3) return 'medium';
  return 'low';
}
```

## Phase 7: Implementation Steps

### Step 1: Setup (Week 1)
1. ✅ Create Supabase project and configure database
2. ✅ Set up Resend account and verify domain
3. ✅ Add environment variables to Vercel
4. ✅ Create database tables and indexes

### Step 2: Backend Development (Week 1-2)
1. ✅ Implement database models and migrations
2. ✅ Create subscription API endpoints (`/api/subscribe`, `/api/unsubscribe`)
3. ✅ Build background monitoring service (`/api/cron/monitor-asteroids`)
4. ✅ Set up email templates and sending logic
5. ✅ Add error handling and logging

### Step 3: Frontend Integration (Week 2)
1. ✅ Build subscription UI components
2. ✅ Integrate with existing dashboard
3. ✅ Add user preference management
4. ✅ Create unsubscribe page

### Step 4: Testing & Deployment (Week 2-3)
1. ✅ Test complete notification flow
2. ✅ Set up Vercel cron job
3. ✅ Monitor for proper functionality
4. ✅ Performance testing with mock data

## Phase 8: Security & Compliance

### 8.1 Security Measures
- ✅ Validate cron requests with secret tokens
- ✅ Sanitize email inputs and validate format
- ✅ Rate limit subscription attempts (max 5 per IP per hour)
- ✅ Secure unsubscribe tokens with JWT
- ✅ SQL injection prevention with parameterized queries

### 8.2 Privacy Compliance
- ✅ Add privacy policy for email collection
- ✅ Implement easy unsubscribe mechanism
- ✅ Data retention policies (auto-delete after 2 years)
- ✅ GDPR compliance considerations
- ✅ Email confirmation for new subscriptions

## Dependencies & Services

### Required Services
- **Supabase**: PostgreSQL database (Free tier: 500MB storage)
- **Resend**: Email delivery service (Free tier: 3,000 emails/month)
- **Vercel**: Hosting and cron jobs (Free tier: 1 cron job)

### Package Dependencies
```json
{
  "resend": "^2.0.0",
  "@supabase/supabase-js": "^2.39.0",
  "jsonwebtoken": "^9.0.2",
  "@types/jsonwebtoken": "^9.0.5"
}
```

## Cost Analysis

### Free Tier Limits
- **Vercel Cron**: 1 job (sufficient for our needs)
- **Supabase**: 500MB storage, 2GB bandwidth
- **Resend**: 3,000 emails/month
- **Estimated usage**: 0-100 alerts/month for typical asteroid activity

### Cost Projection
- **Month 1-12**: $0 (within free tiers)
- **Scale threshold**: 1000+ subscribers or 3000+ emails/month
- **Potential costs**: $20/month for upgraded tiers if needed

## Success Metrics

### Technical Metrics
- ✅ 99%+ uptime for cron monitoring
- ✅ <5 second response time for API endpoints
- ✅ <2% email bounce rate
- ✅ Zero false positives in alert detection

### User Metrics
- 📊 Subscription conversion rate
- 📊 User engagement with alerts
- 📊 Unsubscribe rate (<5% target)
- 📊 Email open rates (>30% target)

## Timeline Summary

**Total Duration**: 2-3 weeks
**Team Size**: 1 developer
**Complexity**: Medium
**Risk Level**: Low (using proven technologies)

---

## Next Steps

1. **Start with Phase 1**: Set up Supabase database and environment
2. **Implement core APIs**: Begin with subscription endpoints
3. **Test thoroughly**: Use mock data for initial testing
4. **Deploy incrementally**: Test each phase before proceeding
5. **Monitor closely**: Watch for edge cases and performance issues

This implementation provides a robust, scalable email notification system that can handle critical asteroid alerts while staying within free tier limits for typical usage.