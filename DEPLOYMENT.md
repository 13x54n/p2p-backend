# Deployment Guide

This guide covers deploying the P2P Backend to cloud platforms, with a focus on AWS EC2.

## 🚀 Quick Deployment Checklist

### 1. Server Configuration ✅
- [x] **Fixed**: Server now listens on `0.0.0.0` instead of `localhost`
- [x] **Fixed**: Port configuration updated to 4000
- [x] **Fixed**: Environment variables properly configured

### 2. AWS EC2 Configuration

#### Security Groups
Ensure your EC2 security group allows inbound traffic on port 4000:

```
Type: Custom TCP
Protocol: TCP
Port Range: 4000
Source: 0.0.0.0/0 (or your specific IP range)
Description: Node.js API
```

#### Network ACLs (if used)
Allow inbound and outbound traffic on port 4000.

### 3. Environment Variables for Production

Create a `.env` file on your EC2 instance:

```env
PORT=4000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=your_frontend_domain
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 4. Process Management

#### Using PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start src/server.js --name "p2p-backend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Using systemd
Create `/etc/systemd/system/p2p-backend.service`:

```ini
[Unit]
Description=P2P Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=4000

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl enable p2p-backend
sudo systemctl start p2p-backend
```

### 5. Reverse Proxy (Optional but Recommended)

#### Using Nginx
Install and configure Nginx:

```bash
sudo apt update
sudo apt install nginx
```

Create `/etc/nginx/sites-available/p2p-backend`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/p2p-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL/HTTPS (Recommended)

#### Using Let's Encrypt with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 7. Monitoring and Logs

#### View Application Logs
```bash
# PM2 logs
pm2 logs p2p-backend

# Application logs
tail -f logs/routes/access/$(date +%Y-%m-%d).log
tail -f logs/routes/errors/$(date +%Y-%m-%d).log
```

#### Monitor Application
```bash
# PM2 status
pm2 status

# System resources
htop
df -h
```

### 8. Common Issues and Solutions

#### Issue: "Cannot connect to server"
**Solution**: Check if server is listening on `0.0.0.0:4000`
```bash
netstat -tlnp | grep :4000
```

#### Issue: "Connection refused"
**Solution**: Check security groups and firewall
```bash
sudo ufw status
```

#### Issue: "Port already in use"
**Solution**: Find and kill the process
```bash
sudo lsof -i :4000
sudo kill -9 <PID>
```

#### Issue: "Permission denied"
**Solution**: Check file permissions
```bash
sudo chown -R ubuntu:ubuntu /path/to/your/app
chmod +x start.sh
```

### 9. Health Checks

Test your deployment:

```bash
# Health check
curl http://your-ec2-ip:4000/api/health

# Test API endpoints
curl http://your-ec2-ip:4000/api/users
curl http://your-ec2-ip:4000/api/logs/stats
```

### 10. Backup and Recovery

#### Database Backup
```bash
# MongoDB backup (if using local MongoDB)
mongodump --db p2p-backend --out /backup/$(date +%Y-%m-%d)
```

#### Application Backup
```bash
# Backup application files
tar -czf p2p-backend-$(date +%Y-%m-%d).tar.gz /path/to/your/app
```

### 11. Performance Optimization

#### Node.js Optimization
```bash
# Use Node.js production mode
export NODE_ENV=production

# Increase memory limit if needed
node --max-old-space-size=2048 src/server.js
```

#### Database Optimization
- Ensure MongoDB indexes are created
- Monitor database performance
- Consider connection pooling

### 12. Security Best Practices

- [ ] Use HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## 🎯 Quick Start Commands

```bash
# 1. Clone and setup
git clone <your-repo>
cd p2p-backend
npm install

# 2. Configure environment
cp env.example .env
# Edit .env with your production values

# 3. Start with PM2
npm install -g pm2
pm2 start src/server.js --name "p2p-backend"
pm2 save
pm2 startup

# 4. Test deployment
curl http://localhost:4000/api/health
```

## 📞 Troubleshooting

If you're still having issues:

1. **Check server logs**: `pm2 logs p2p-backend`
2. **Check system logs**: `sudo journalctl -u p2p-backend`
3. **Verify network**: `netstat -tlnp | grep :4000`
4. **Test locally**: `curl http://localhost:4000/api/health`
5. **Check security groups**: Ensure port 4000 is open in AWS console

## 🔗 Useful Commands

```bash
# Restart application
pm2 restart p2p-backend

# View real-time logs
pm2 logs p2p-backend --lines 100

# Monitor resources
pm2 monit

# Update application
git pull
npm install
pm2 restart p2p-backend
``` 