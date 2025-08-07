# Google Maps API Setup Instructions

The transport calculation is failing with a **403 Forbidden** error. This means there's an issue with your Google Maps API configuration. Follow these steps to fix it:

## 🔧 Step 1: Get Your Google Maps API Key

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select an existing one
3. **Go to "APIs & Services" → "Library"**
4. **Enable these APIs:**
   - ✅ **Maps JavaScript API** (for the interactive map)
   - ✅ **Geocoding API** (to convert addresses to coordinates)
   - ✅ **Distance Matrix API** (to calculate transport times)
   - ✅ **Directions API** (optional, for future route display)

## 🔑 Step 2: Create API Key

1. **Go to "APIs & Services" → "Credentials"**
2. **Click "Create Credentials" → "API Key"**
3. **Copy the API key** (it looks like: `AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q`)

## 🛡️ Step 3: Secure Your API Key (Important!)

1. **Click the pencil icon** next to your API key to edit it
2. **Under "API restrictions"** → Select "Restrict key"
3. **Select these APIs:**
   - Maps JavaScript API
   - Geocoding API
   - Distance Matrix API
   - Directions API
4. **Under "Application restrictions"** → Choose "HTTP referrers"
5. **Add these referrers:**
   - `http://localhost:3000/*` (for development)
   - `http://localhost:3001/*` (for development)
   - `your-production-domain.com/*` (when you deploy)

## 💳 Step 4: Set Up Billing (Required!)

⚠️ **Google Maps APIs require billing to be enabled**, even for free usage:

1. **Go to "Billing"** in Google Cloud Console
2. **Link a credit card** (you get $200 free credits monthly)
3. **The Distance Matrix API costs:**
   - First 40,000 requests/month: **FREE**
   - After that: $5 per 1,000 requests

## 📝 Step 5: Add API Key to Your Project

1. **Create/edit your `.env.local` file** in the project root:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
   GOOGLE_MAPS_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
   ```

2. **Replace `AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q`** with your actual API key

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## 🧪 Step 6: Test Your Setup

1. **Open your browser** and go to: `http://localhost:3001/api/debug`
2. **Check the response** - you should see:
   ```json
   {
     "hasServerApiKey": true,
     "hasPublicApiKey": true,
     "serverApiKeyLength": 39,
     "apiTest": {
       "success": true,
       "statusCode": 200,
       "resultCount": 1
     }
   }
   ```

## 🚨 Common Issues & Solutions

### **403 Forbidden Error**
- ✅ Check billing is enabled
- ✅ Verify all required APIs are enabled
- ✅ Check API key restrictions allow your domain

### **Invalid API Key**
- ✅ Copy the API key correctly (no extra spaces)
- ✅ Restart the development server after adding the key

### **Quota Exceeded**
- ✅ Check your usage in Google Cloud Console
- ✅ Ensure billing is properly set up

### **CORS Errors**
- ✅ Add your domain to API key restrictions
- ✅ Use HTTP referrers restriction, not IP addresses

## 💡 Quick Debug

If it's still not working:

1. **Go to** `http://localhost:3001/api/debug` **in your browser**
2. **Check the console logs** when you click "Calculate Transport Times"
3. **Look for detailed error messages** in the terminal where `npm run dev` is running

The most common issue is **billing not being enabled** - even though it's free for normal usage, Google requires a credit card on file.
