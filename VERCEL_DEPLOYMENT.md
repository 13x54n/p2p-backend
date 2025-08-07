# Vercel Deployment Guide

This guide will help you deploy your P2P Backend to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)
3. **Environment Variables**: Prepare your environment variables

## Environment Variables

Set these environment variables in your Vercel project settings:

### Required Variables
- `MONGODB_URI`: Your MongoDB connection string
- `NODE_ENV`: Set to `production`

### Optional Variables
- `CORS_ORIGIN`: Allowed CORS origins (comma-separated)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

## Deployment Steps

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub**: Ensure your code is pushed to a GitHub repository
2. **Connect to Vercel**: 
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
3. **Configure Project**:
   - Framework Preset: `Node.js`
   - Root Directory: `./` (default)
   - Build Command: `npm run build`
   - Output Directory: `./` (default)
4. **Set Environment Variables**: Add all required environment variables
5. **Deploy**: Click "Deploy"

### Method 2: Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Set environment variables
   - Deploy

## Project Structure

```
p2p-backend/
├── src/
│   ├── server.js          # Main entry point
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
├── vercel.json            # Vercel configuration
├── .vercelignore          # Files to exclude
└── package.json
```

## Configuration Files

### vercel.json
- Specifies the build configuration
- Routes all requests to `src/server.js`
- Sets function timeout to 30 seconds
- Configures environment variables

### .vercelignore
- Excludes unnecessary files from deployment
- Reduces deployment size and time

## API Endpoints

After deployment, your API will be available at:
- `https://your-project.vercel.app/api/health` - Health check
- `https://your-project.vercel.app/api/users` - User endpoints
- `https://your-project.vercel.app/api/orders` - Order endpoints
- `https://your-project.vercel.app/api/logs` - Log endpoints

## Monitoring

- **Vercel Dashboard**: Monitor deployments, logs, and performance
- **Function Logs**: View serverless function execution logs
- **Analytics**: Track API usage and performance metrics

## Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure all required variables are set in Vercel dashboard
2. **MongoDB Connection**: Verify your MongoDB URI is correct and accessible
3. **CORS Issues**: Check your CORS_ORIGIN setting
4. **Function Timeout**: Increase timeout in vercel.json if needed

### Debugging

1. **Check Logs**: Use Vercel dashboard to view function logs
2. **Local Testing**: Test locally with `npm run dev`
3. **Environment**: Ensure NODE_ENV is set to production

## Updates

To update your deployment:
1. Push changes to your Git repository
2. Vercel will automatically redeploy
3. Or use `vercel --prod` to force production deployment

## Cost Considerations

- **Free Tier**: 100GB-hours per month
- **Serverless Functions**: Pay per execution
- **Bandwidth**: Included in free tier
- **Custom Domains**: Free with paid plans

## Security

- **Environment Variables**: Never commit sensitive data
- **CORS**: Configure allowed origins properly
- **Rate Limiting**: Already implemented in the code
- **Helmet**: Security headers are enabled 