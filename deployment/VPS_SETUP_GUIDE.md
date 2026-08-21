# StockEX Philippines — VPS Deployment Guide (Fixed)

> **VPS:** Webyne Gold Linux VPS 2 (4 CPU, 8GB RAM, 100GB SSD)
> **IP:** 103.211.56.127
> **Credentials:** get these from the Webyne client area (client.webyne.com)
> or your password manager — never hardcode them here. A previous version of
> this file had the root password in plaintext; that value was committed to
> this repo's public git history for 19 days and must be treated as
> permanently compromised. If you haven't rotated it since, do that first.

---

## Quick Start (If VPS is Offline)

If `ssh root@103.211.56.127` doesn't work, the VPS needs initial provisioning:

### Via Webyne Console (VNC/NoVNC)

1. **Log into** [Webyne Client Area](https://client.webyne.com)
2. Navigate to **Services → Your VPS**
3. Click **Console** (or VNC/NoVNC) to open the browser-based terminal
4. Log in with the current root credentials from the Webyne client area
5. **Run the first-boot script** — it now generates a fresh root/ubuntu
   password on each run and prints it once at the end (see
   `deployment/vps-first-boot.sh`); copy it from the console output, it is
   not stored anywhere:

```bash
# Option A: If the deployment files exist
bash /opt/stockex/deployment/vps-first-boot.sh

# Option B: If nothing exists yet — paste this entire block:
apt-get update && apt-get install -y curl wget git
cd /opt && git clone https://github.com/samvidh75s/prediction-engine.git stockex
bash /opt/stockex/deployment/vps-first-boot.sh
```

6. **After completion** (takes 2-3 minutes), SSH should work:
```bash
ssh root@103.211.56.127
```

---

## Full VPS Setup (Run After SSH Works)

### Step 1: Run the main setup script

```bash
ssh root@103.211.56.127 "bash /opt/stockex/deployment/vps-setup.sh"
```

Or SSH in and run manually:
```bash
ssh root@103.211.56.127
cd /opt/stockex
bash deployment/vps-setup.sh
```

### Step 2: Configure environment variables

```bash
ssh root@103.211.56.127
cd /opt/stockex
cp .env.production .env
nano .env   # Set DATABASE_URL, REDIS_URL, EODHD_KEY, etc.
```

### Step 3: Setup domain DNS & SSL

```bash
ssh root@103.211.56.127
bash /opt/stockex/deployment/setup-dns.sh
```

### Step 4: Verify everything

```bash
# From your local machine
curl http://103.211.56.127              # Should get HTML
curl http://103.211.56.127:4001/api/health  # Should get JSON
ssh root@103.211.56.127 "systemctl status stockex-api stockex-llm nginx"
```

---

## Local Deployment (Push Code to VPS)

After initial setup, use the deploy script to push updates:

```bash
# From your local machine (project root)
bash deployment/deploy.sh main
```

This script:
1. Tests SSH connectivity
2. Syncs code via rsync (or git)
3. Installs npm dependencies
4. Builds frontend & backend
5. Creates/updates systemd services
6. Configures Nginx
7. Restarts all services
8. Installs health monitoring (5-min checks)

---

## VPS Management Commands

```bash
# SSH access
ssh root@103.211.56.127

# Check services
systemctl status stockex-api     # API server (port 4001)
systemctl status stockex-llm     # LLM server (port 8000)
systemctl status nginx           # Web server (port 80/443)
systemctl status redis-server    # Cache

# View logs
journalctl -u stockex-api -f     # API logs (live)
journalctl -u stockex-llm -f     # LLM logs (live)
tail -f /var/log/stockex-health.log  # Health monitor logs

# Firewall management
ufw status verbose               # Check firewall rules
ufw allow 22/tcp                 # Open port

# Health check
bash /usr/local/bin/stockex-health.sh  # Manual health check
```

---

## Architecture

```
                         ┌─────────────────────────┐
                         │    Nginx (Port 80/443)   │
                         │  SSL termination        │
                         │  Reverse proxy          │
                         └────────┬────────────────┘
                                  │
                   ┌──────────────┼──────────────┐
                   │              │              │
          ┌────────▼───┐  ┌──────▼──────┐  ┌────▼──────┐
          │  Fastify    │  │  LLM Server  │  │  Static    │
          │  API (4001) │  │  (Port 8000) │  │  SPA       │
          └──────┬──────┘  └──────┬──────┘  └───────────┘
                 │                │
          ┌──────▼──────┐  ┌─────▼──────┐
          │  PostgreSQL  │  │    Redis    │
          └─────────────┘  └────────────┘
```

## Data Sources

| Source | Type | API Key Required |
|--------|------|------------------|
| PHISIX | PSE Stock Prices | No (Free) |
| Yahoo Finance | Historical Data | No |
| EODHD | Fundamentals | Yes (`6a3a65ae5b7f82.76515094`) |
| Twelve Data | Real-time Prices | Yes |

## PSE Trading Hours (Asia/Manila UTC+8)

| Session | Time |
|---------|------|
| Pre-open | 9:00 AM - 9:15 AM |
| Morning | 9:30 AM - 12:00 PM |
| Lunch Break | 12:00 PM - 1:00 PM |
| Afternoon | 1:00 PM - 3:30 PM |

---

## Troubleshooting

### "Connection refused" on all ports

**Cause:** VPS firewall is blocking everything, SSH not enabled, or VPS is stopped.

**Fix:** Use Webyne console → run `bash /opt/stockex/deployment/vps-first-boot.sh`

### "Host key verification failed"

```bash
ssh-keygen -R 103.211.56.127
```

### Deployment script fails at "Cannot reach VPS"

```bash
# Run diagnostic
bash deployment/vps-diagnose.sh

# Or manually check
ping -c 3 103.211.56.127
nc -zv 103.211.56.127 22
```

### Disk space low

```bash
ssh root@103.211.56.127
journalctl --vacuum-size=100M
apt-get clean
docker system prune -af  # if Docker is used
```

### Services keep crashing

The health monitor auto-recovers after 3 consecutive failures (restarts all services).
Check logs: `tail -50 /var/log/stockex-health.log`

### VPS is completely broken

Run the emergency recovery script from Webyne console:
```bash
bash /opt/stockex/deployment/vps-recovery.sh
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `deployment/vps-setup.sh` | Full automated setup (Node.js, Docker, Nginx, SSL, Redis, Firewall) |
| `deployment/vps-first-boot.sh` | **PASTE INTO CONSOLE** — enables SSH, fixes firewall, creates user |
| `deployment/vps-diagnose.sh` | Run locally — tests connectivity and gives fix instructions |
| `deployment/vps-health-monitor.sh` | Runs every 5 min — detects outages, auto-recovers |
| `deployment/vps-recovery.sh` | **PASTE INTO CONSOLE** — emergency reset of all services |
| `deployment/deploy.sh` | Run locally — pushes code to VPS and restarts services |
| `deployment/setup-dns.sh` | Run on VPS — configures domain DNS and SSL certificate |
| `deployment/ssh-config` | SSH config for easy access (`ssh stockex`) |
| `deployment/llm_server.py` | LLM inference server (FastAPI + Qwen2.5-0.5B + LoRA) |
| `deployment/systemd/` | Systemd service files for all components |