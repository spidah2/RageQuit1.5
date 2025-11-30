# Deployment Guide - RageQuit 1.5

## Quick Links
- **Repository**: https://github.com/spidah2/RageQuit1.5
- **Issues**: https://github.com/spidah2/RageQuit1.5/issues
- **Releases**: https://github.com/spidah2/RageQuit1.5/releases

---

## Local Development Setup

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 8+
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

### Installation
```bash
# Clone repository
git clone https://github.com/spidah2/RageQuit1.5.git
cd RageQuit1.5

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start development server
npm start
```

**Access**: http://localhost:3000

---

## Production Deployment

### Option 1: Traditional VPS (Recommended)

#### 1. Server Setup
```bash
# SSH into your VPS
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Deploy RageQuit
```bash
# Clone repository
git clone https://github.com/spidah2/RageQuit1.5.git
cd RageQuit1.5

# Install production dependencies
npm ci --production

# Configure environment
cp .env.example .env
# Edit .env with your settings:
# - NODE_ENV=production
# - PORT=3000
# - ALLOWED_ORIGINS=https://yourdomain.com
```

#### 3. Setup PM2
```bash
# Start with PM2
pm2 start server.js --name "ragequit"

# Auto-restart on reboot
pm2 startup
pm2 save
```

#### 4. Nginx Reverse Proxy
```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/ragequit
```

**Config content:**
```nginx
upstream ragequit_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificate
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    location / {
        proxy_pass http://ragequit_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ragequit /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 5. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

### Option 2: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy files
COPY package*.json ./
COPY server.js ./
COPY public ./public

# Install dependencies
RUN npm ci --production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  ragequit:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      ALLOWED_ORIGINS: "https://yourdomain.com"
    restart: unless-stopped
    networks:
      - ragequit-net
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - ragequit
    restart: unless-stopped
    networks:
      - ragequit-net

networks:
  ragequit-net:
    driver: bridge
```

#### Deploy
```bash
docker-compose up -d
```

---

### Option 3: Vercel/Netlify (Not Recommended for WebSocket)

WebSocket games non sono ideali per Vercel/Netlify perché:
- Timeout limitati
- Connessioni persistenti non supportate
- Cost structure non adatto per sempre-online

**Usa una VPS o Docker invece.**

---

## Monitoring & Maintenance

### Logs
```bash
# PM2 logs
pm2 logs ragequit

# System logs
journalctl -u pm2-user -f

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Performance Monitoring
```bash
# Monitor with PM2
pm2 monit

# Check server resource usage
top
htop

# Check port
lsof -i :3000
```

### Database Backups (Future)
```bash
# If using database
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql
```

---

## Scaling Considerations

### Current Capacity
- **Players**: 4-8 simultaneously (tested)
- **CPU**: Low usage on modern hardware
- **Memory**: ~100MB baseline + ~5MB per player
- **Bandwidth**: ~50KB/s per player (varies by activity)

### Horizontal Scaling (Future)
1. Use Redis for session storage
2. Implement load balancer (HAProxy/Nginx)
3. Run multiple server instances
4. Use message queue (RabbitMQ) for inter-server communication

### Vertical Scaling (Current)
- Increase server RAM
- Use faster CPU
- Optimize database queries

---

## Security Checklist

- [ ] Update Node.js to latest LTS
- [ ] Set NODE_ENV=production
- [ ] Use strong CORS configuration
- [ ] Enable HTTPS/SSL
- [ ] Use firewall rules
- [ ] Implement rate limiting
- [ ] Add DDoS protection (Cloudflare)
- [ ] Monitor error logs
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Regular security backups

---

## Troubleshooting

### Game crashes on load
- Check browser console (F12)
- Verify THREE.js loaded (should be r170 or r128)
- Check server logs

### WebSocket connection fails
- Verify firewall allows port 3000
- Check Nginx proxy configuration
- Test with `curl http://localhost:3000`

### High latency
- Check server CPU/memory usage
- Monitor network bandwidth
- Check client FPS (should be 60)
- Enable debug logging

### Players can't connect
- Verify ALLOWED_ORIGINS in .env
- Check server is running (`pm2 status`)
- Check firewall rules
- Verify DNS resolution

---

## Update Strategy

### Development
```bash
git pull origin main
npm install
pm2 restart ragequit
```

### Production (Zero-Downtime)
```bash
# Clone new version to separate directory
git clone --branch main https://github.com/spidah2/RageQuit1.5.git new-version
cd new-version
npm ci --production

# Test new version
npm start

# Switch: update Nginx upstream, reload
# Old server continues, new traffic goes to new version
# Graceful shutdown of old server after all clients disconnect
```

---

## Support & Contributing

- **Report bugs**: GitHub Issues
- **Feature requests**: GitHub Discussions
- **Pull requests**: Welcome!
- **Code style**: Follow existing patterns

---

## Cost Estimates

### VPS Hosting
- **Entry Level**: $5-10/month (DigitalOcean, Linode)
  - 1GB RAM, 1 CPU - supports 4-8 players
- **Mid Level**: $20-30/month
  - 4GB RAM, 2 CPU - supports 20-30 players
- **Enterprise**: $50+/month
  - Scaling, redundancy, monitoring

### SSL Certificate
- **Free**: Let's Encrypt (recommended)
- **Paid**: $10-100/year (wildcard, EV, etc)

### Domain
- **Cheap**: $1-5/year (.xyz, .club, etc)
- **Premium**: $10-50/year (.com, .io, etc)

### Total Monthly Cost
- **Minimum**: ~$10/month (VPS only)
- **Recommended**: ~$20/month (VPS + monitoring)
- **Enterprise**: $100+/month (multiple regions, CDN, etc)

---

## License
See LICENSE file in repository

## Version
Current: 1.2.0 (November 30, 2025)

