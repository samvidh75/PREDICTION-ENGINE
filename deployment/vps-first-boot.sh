#!/usr/bin/env bash
# ===========================================================================
# StockEX Philippines — VPS First Boot Setup
# PASTE THIS INTO THE WEBYNE CONSOLE (VNC/NoVNC)
# Target: Webyne Gold Linux VPS 2 — Ubuntu 22.04 LTS
# Fixes: SSH disabled, firewall blocked, no services running
# ===========================================================================
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     StockEX Philippines — VPS First Boot Setup              ║"
echo "║     Webyne Gold Linux VPS 2 — $(hostname)                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 0. Verify we're root ─────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Must run as root. Use: sudo bash $0"
  exit 1
fi

exec > >(tee -a /var/log/stockex-first-boot.log) 2>&1
echo "[$(date)] Starting StockEX first-boot setup..."

# ── 1. Fix SSH — ENABLE IT ───────────────────────────────────────────
echo ""
echo "━━━ [1/10] Fixing SSH ━━━"
apt-get install -y openssh-server 2>/dev/null || true
if [ -f /etc/ssh/sshd_config ]; then
  sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin yes/' /etc/ssh/sshd_config
  sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication yes/' /etc/ssh/sshd_config
  sed -i 's/^#\?PubkeyAuthentication .*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
fi
systemctl enable sshd 2>/dev/null || systemctl enable ssh 2>/dev/null || true
systemctl restart sshd 2>/dev/null || systemctl restart ssh 2>/dev/null || true
echo "✅ SSH enabled on port 22"

# ── 2. Fix root password (set known one) ─────────────────────────────
echo ""
echo "━━━ [2/10] Setting root password ━━━"
echo "root:H0uPCooqdObR705" | chpasswd
echo "✅ Root password set"

# ── 3. Create ubuntu user ────────────────────────────────────────────
echo ""
echo "━━━ [3/10] Creating ubuntu user ━━━"
if ! id "ubuntu" &>/dev/null; then
  useradd -m -s /bin/bash -G sudo ubuntu 2>/dev/null || true
  echo "ubuntu:H0uPCooqdObR705" | chpasswd
  echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu
  echo "✅ ubuntu user created"
else
  echo "✅ ubuntu user already exists"
fi

# ── 4. Fix hostname ──────────────────────────────────────────────────
echo ""
echo "━━━ [4/10] Setting hostname ━━━"
hostnamectl set-hostname stockex-ph 2>/dev/null || hostname stockex-ph
echo "stockex-ph" > /etc/hostname
grep -q "stockex-ph" /etc/hosts 2>/dev/null || \
  echo "127.0.0.1 stockex-ph" >> /etc/hosts
echo "✅ Hostname set to stockex-ph"

# ── 5. Fix firewall — OPEN ALL NEEDED PORTS ──────────────────────────
echo ""
echo "━━━ [5/10] Configuring firewall ━━━"
ufw --force disable 2>/dev/null || true
ufw --force reset 2>/dev/null || true

ufw default deny incoming
ufw default allow outgoing

# Critical ports
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 4001/tcp comment 'StockEX API'
ufw allow 8000/tcp comment 'LLM Server (internal)'
ufw allow 3001/tcp comment 'LoRA Server (internal)'

# Rate limiting on SSH to prevent brute force
ufw limit 22/tcp

ufw --force enable
echo "✅ Firewall configured"

# ── 6. Disable IPv6 if causing issues ────────────────────────────────
echo ""
echo "━━━ [6/10] Network hardening ━━━"
if ! sysctl net.ipv6.conf.all.disable_ipv6 2>/dev/null | grep -q "= 1"; then
  cat >> /etc/sysctl.conf << 'SYSCTL'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
SYSCTL
  sysctl -p 2>/dev/null || true
  echo "✅ IPv6 disabled (avoids Webyne routing issues)"
else
  echo "ℹ️  IPv6 already disabled"
fi

# ── 7. Show IP configuration ─────────────────────────────────────────
echo ""
echo "━━━ [7/10] Network configuration ━━━"
echo "IPv4 Addresses:"
ip -4 addr show | grep inet | awk '{print "  " $2}'
echo ""
echo "Default route:"
ip route show default
echo ""
echo "DNS resolvers:"
cat /etc/resolv.conf 2>/dev/null | grep nameserver || echo "  (checking systemd-resolved)"
resolvectl status 2>/dev/null | grep "DNS Servers" || true

# ── 8. Update system ─────────────────────────────────────────────────
echo ""
echo "━━━ [8/10] System update ━━━"
apt-get update
apt-get upgrade -y
echo "✅ System updated"

# ── 9. Install core packages ─────────────────────────────────────────
echo ""
echo "━━━ [9/10] Installing packages ─━━"
apt-get install -y curl wget git build-essential python3 python3-pip \
  python3-venv nginx certbot python3-certbot-nginx redis-server \
  ufw tmux htop net-tools dnsutils fail2ban unattended-upgrades
echo "✅ Packages installed"

# ── 10. Enable automatic security updates ────────────────────────────
echo ""
echo "━━━ [10/10] Security hardening ─━━"
dpkg-reconfigure --priority=low unattended-upgrades 2>/dev/null || true
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTO'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
AUTO

# Enable fail2ban for SSH
cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = %(sshd_log)s
FAIL2BAN
systemctl enable fail2ban --now 2>/dev/null || true

echo "✅ Security hardening complete"
echo ""

# ── Summary ──────────────────────────────────────────────────────────
IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ StockEX First Boot Complete!                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  SSH:   ssh root@${IP}                                      "
echo "║  Host:  ${IP}                                               "
echo "║  User:  root / ubuntu                                       "
echo "║  Pass:  H0uPCooqdObR705                                     "
echo "║                                                              "
echo "║  NEXT STEPS (from your terminal):                           "
echo "║                                                              "
echo "║  1. Test SSH:                                                "
echo "║     ssh root@${IP}                                          "
echo "║                                                              "
echo "║  2. Run full deploy:                                         "
echo "║     bash /opt/stockex/deployment/vps-setup.sh                "
echo "║                                                              "
echo "║  3. Setup domain DNS:                                        "
echo "║     Point stockex-ph.com A record → ${IP}                   "
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Log saved to: /var/log/stockex-first-boot.log"