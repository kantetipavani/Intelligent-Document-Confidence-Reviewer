# Deployment Guide

Complete guide for deploying INDCR to production environments.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Database Deployment](#database-deployment)
6. [Docker & Containerization](#docker--containerization)
7. [Monitoring & Logging](#monitoring--logging)
8. [Scaling](#scaling)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests pass (`pytest`, `npm test`)
- [ ] No console errors or warnings
- [ ] TypeScript strict mode enabled
- [ ] Code reviewed by team member
- [ ] No hardcoded secrets in code
- [ ] API endpoints documented

### Performance
- [ ] Frontend build size < 200KB (gzipped)
- [ ] Backend responds in < 500ms (avg)
- [ ] Database queries optimized (indexes created)
- [ ] CDN configured for static assets
- [ ] Caching strategies in place

### Security
- [ ] All dependencies updated and audited
- [ ] API rate limiting enabled
- [ ] CORS configured correctly
- [ ] HTTPS enabled
- [ ] JWT secrets configured
- [ ] Database credentials not exposed

### Infrastructure
- [ ] Staging environment tested
- [ ] Backup strategy documented
- [ ] Logging aggregation configured
- [ ] Monitoring alerts set up
- [ ] Error tracking enabled (Sentry)
- [ ] DNS configured

### Documentation
- [ ] Deployment runbook created
- [ ] Rollback plan documented
- [ ] Team trained on deployment
- [ ] Change log updated
- [ ] README updated

---

## Environment Setup

### Production .env (Backend)

```env
# Application
DEBUG=false
LOG_LEVEL=INFO
ENVIRONMENT=production

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/idc_prod?retryWrites=true&w=majority
MONGODB_DB=idc_prod
SKIP_DB=false

# LLM Configuration
ANTHROPIC_API_KEY=sk-ant-xxx-your-production-key
ANTHROPIC_MODEL=claude-3-5-haiku-latest

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGINS=https://app.indcr.com,https://www.indcr.com

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/yyy
```

### Production Environment (Frontend)

```env
NEXT_PUBLIC_API_URL=https://api.indcr.com
NEXT_PUBLIC_APP_NAME=INDCR
NEXT_PUBLIC_LOG_LEVEL=error
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy
```

---

## Backend Deployment

### Option 1: Traditional Server (AWS EC2 / DigitalOcean)

#### 1. Prepare Server

```bash
# SSH into server
ssh root@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11+
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Install Node.js (for frontend if co-hosted)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB client tools
sudo apt install -y mongodb-tools

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Supervisor (process manager)
sudo apt install -y supervisor
```

#### 2. Clone & Setup Backend

```bash
# Clone repository
cd /home/app
git clone https://github.com/your-org/indcr.git
cd indcr/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit with production values
nano .env
```

#### 3. Setup Supervisor (Process Manager)

Create `/etc/supervisor/conf.d/indcr-backend.conf`:

```ini
[program:indcr-backend]
directory=/home/app/indcr/backend
command=/home/app/indcr/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/indcr-backend.log
environment=PATH="/home/app/indcr/backend/venv/bin"
```

Start service:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start indcr-backend
```

#### 4. Configure Nginx (Reverse Proxy)

Create `/etc/nginx/sites-available/indcr-api`:

```nginx
server {
    listen 80;
    server_name api.indcr.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.indcr.com;
    
    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.indcr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.indcr.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Gzip compression
    gzip on;
    gzip_types application/json;
    
    # Proxy to backend
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API documentation
    location /docs {
        proxy_pass http://localhost:8000/docs;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/indcr-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Setup SSL Certificates (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d api.indcr.com -d www.api.indcr.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

### Option 2: Docker & Kubernetes

#### Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY . .

# Run app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

EXPOSE 8000
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017
      - MONGODB_DB=idc_prod
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - mongo
    restart: always
    
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
    restart: always
    
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    restart: always

volumes:
  mongo_data:
```

Deploy with Docker Compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: indcr-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: indcr-backend
  template:
    metadata:
      labels:
        app: indcr-backend
    spec:
      containers:
      - name: backend
        image: your-registry/indcr-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: indcr-secrets
              key: mongodb-uri
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: indcr-secrets
              key: anthropic-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: indcr-backend-service
  namespace: production
spec:
  selector:
    app: indcr-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f kubernetes.yml
```

---

### Option 3: Vercel/Railway/Render (PaaS)

#### Vercel for Backend (Not ideal - use Render/Railway instead)

For FastAPI, better options are:
- **Render**: https://render.com
- **Railway**: https://railway.app
- **PythonAnywhere**: https://www.pythonanywhere.com

#### Railway Deployment

1. Connect GitHub repository
2. Select `backend` directory
3. Set environment variables in dashboard
4. Deploy

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   - Go to vercel.com
   - Connect GitHub account
   - Select repository

2. **Configure Project**
   - Framework: Next.js
   - Root Directory: frontend
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set Environment Variables**
   - `NEXT_PUBLIC_API_URL`: https://api.indcr.com
   - `NEXT_PUBLIC_APP_NAME`: INDCR
   - `NEXT_PUBLIC_SENTRY_DSN`: your-sentry-dsn

4. **Deploy**
   - Automatic deployment on push to main
   - Staging deployments for PR previews

### Option 2: Netlify

1. Connect GitHub
2. Configure build:
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: .next
   ```
3. Set environment variables
4. Deploy

### Option 3: Self-Hosted (Nginx)

```bash
# Build
cd frontend
npm run build

# Copy to server
scp -r .next public/* root@your-server:/var/www/indcr/

# Configure Nginx
sudo nano /etc/nginx/sites-available/indcr-app
```

Nginx config:
```nginx
server {
    listen 443 ssl http2;
    server_name app.indcr.com;
    
    ssl_certificate /etc/letsencrypt/live/app.indcr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.indcr.com/privkey.pem;
    
    root /var/www/indcr;
    
    location / {
        try_files $uri $uri/ /index.html;
        # For Next.js static files
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /_next {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Database Deployment

### MongoDB Atlas (Cloud - Recommended)

1. **Create Account**
   - Go to mongodb.com/cloud
   - Sign up for free tier

2. **Create Cluster**
   - Choose region
   - Configure backup
   - Note connection string

3. **Create Database User**
   - Set username/password
   - Configure IP whitelist

4. **Connect**
   ```
   mongodb+srv://user:password@cluster.mongodb.net/idc_prod?retryWrites=true
   ```

### Self-Hosted MongoDB

```bash
# On Ubuntu
sudo apt install -y mongodb-org

# Enable replication (for backup)
# Edit /etc/mongod.conf
# Add:
# replication:
#   replSetName: rs0

sudo systemctl restart mongod

# Initialize replica set
mongosh
> rs.initiate()

# Create user
> db.createUser({
    user: "admin",
    pwd: "password",
    roles: ["root"]
  })
```

### Backup Strategy

Automated MongoDB backup:
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mongodump --uri="mongodb+srv://user:pwd@cluster/idc_prod" \
  --out="$BACKUP_DIR/backup_$DATE"

# Keep last 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} \;
```

Add to crontab:
```bash
0 2 * * * /usr/local/bin/mongodb-backup.sh
```

---

## Monitoring & Logging

### Error Tracking (Sentry)

1. **Setup Sentry**
   - Go to sentry.io
   - Create project
   - Get DSN

2. **Backend Integration**
   ```python
   import sentry_sdk
   from sentry_sdk.integrations.fastapi import FastApiIntegration
   
   sentry_sdk.init(
       dsn="your-sentry-dsn",
       integrations=[FastApiIntegration()],
       traces_sample_rate=0.1
   )
   ```

3. **Frontend Integration**
   ```typescript
   import * as Sentry from "@sentry/nextjs";
   
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
   });
   ```

### Application Performance Monitoring (DataDog)

```bash
# Install DataDog agent
curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh | bash

# Configure
# /etc/datadog-agent/datadog.yaml
```

### Log Aggregation (ELK Stack)

```yaml
# docker-compose.yml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
  environment:
    - discovery.type=single-node

logstash:
  image: docker.elastic.co/logstash/logstash:8.0.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

kibana:
  image: docker.elastic.co/kibana/kibana:8.0.0
  ports:
    - "5601:5601"
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

#### Backend Load Balancing

```nginx
upstream backend {
    server backend1.indcr.com:8000;
    server backend2.indcr.com:8000;
    server backend3.indcr.com:8000;
}

server {
    listen 443 ssl http2;
    server_name api.indcr.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
```

#### Frontend CDN (CloudFlare/AWS CloudFront)

1. Configure CDN distribution
2. Point DNS to CDN
3. Enable caching rules
4. Setup cache invalidation

### Vertical Scaling

Upgrade server specs:
- CPU: 2 → 4 → 8 cores
- RAM: 4GB → 8GB → 16GB
- Storage: Add volumes

### Database Scaling

#### Read Replicas

```javascript
// MongoDB replica set
rs.add({host: "mongo2.example.com:27017"})
rs.add({host: "mongo3.example.com:27017"})
```

#### Sharding (Very Large Scale)

```javascript
// Enable sharding on database
sh.enableSharding("idc_prod")

// Shard documents collection
sh.shardCollection(
  "idc_prod.documents",
  { "tenant_id": 1 }
)
```

---

## Security

### SSL/TLS Certificates

```bash
# Generate with Let's Encrypt
sudo certbot certonly --standalone -d api.indcr.com -d app.indcr.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### API Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/documents/upload")
@limiter.limit("10/minute")
async def upload_document(request: Request):
    pass
```

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.indcr.com",
        "https://www.indcr.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Secrets Management

Use environment variables or vaults:
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **.env files** (never commit)

```bash
# Never commit secrets
echo .env >> .gitignore
```

---

## Rollback Plan

### Database Backup Before Deployment

```bash
# Backup before upgrade
mongodump --uri="mongodb+srv://..." --out="backup_pre_deploy"
```

### Quick Rollback

```bash
# Revert to previous Docker image
docker-compose -f docker-compose.yml up -d indcr-backend:previous-tag

# Or redeploy from previous commit
git revert <commit-hash>
git push main
# Vercel/Railway auto-deploys
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 502 Bad Gateway | Backend down | Check supervisor/docker status |
| Database connection fails | MongoDB URI wrong | Verify connection string |
| High CPU usage | Inefficient queries | Add indexes, optimize queries |
| Out of memory | Too many workers | Reduce workers, upgrade RAM |
| SSL certificate expired | Renewal failed | Manual renewal with certbot |
| Slow response times | No caching | Enable Nginx caching, CDN |

---

## Performance Optimization

### Caching Headers

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Gzip Compression

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
gzip_level 6;
```

### Database Query Optimization

- Create indexes on frequently queried fields
- Use `explain()` to analyze query plans
- Limit fields returned in queries

---

## Cost Optimization

- Use spot instances for non-critical workloads
- Implement auto-scaling
- Compress/optimize media
- Use CDN for static content
- Monitor and kill unused resources

---

## Deployment Timeline

```
T-1 week: Prepare staging environment
T-3 days: Code freeze, final testing
T-1 day: Backups, rollback plan review
T (deployment day):
  - 9:00 AM: Backup production database
  - 9:10 AM: Deploy backend to canary instance
  - 9:20 AM: Run smoke tests
  - 9:30 AM: Deploy frontend
  - 10:00 AM: Monitor metrics
  - 12:00 PM: Scale to full capacity
  - EOD: Post-deployment review
```

