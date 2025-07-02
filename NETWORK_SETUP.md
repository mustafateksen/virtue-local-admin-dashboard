# Network Setup Guide

Bu proje herhangi bir bilgisayarda otomatik olarak network'te çalışacak şekilde ayarlanmıştır.

## Kurulum Seçenekleri

### Option 1: Docker ile Kurulum (Önerilen)

```bash
# Docker build
./build-docker.sh

# Development mode (Frontend + Backend ayrı portlarda)
docker-compose up virtue-admin

# Production mode (Tek port, Nginx proxy)
docker-compose --profile production up virtue-admin-prod
```

**Network Erişimi:**
- Development: `http://YOUR_IP:5173` (Frontend) + `http://YOUR_IP:8001` (Backend)
- Production: `http://YOUR_IP` (Tek port, Nginx proxy)

### Option 2: Yerel Kurulum

#### 1. Backend Kurulumu
```bash
cd backend
pip install -r requirements.txt
python app.py
```

#### 2. Frontend Kurulumu
```bash
npm install
npm run dev
```

## Network Erişimi

Vite başladığında şu çıktıyı göreceksiniz:
```
➜ Local:   http://localhost:5173/
➜ Network: http://192.168.1.xxx:5173/
```

**Network adresini kullanarak aynı ağdaki diğer cihazlardan erişebilirsiniz.**

## Docker Avantajları

1. **Tek Komut Kurulum**: Tüm dependencies otomatik
2. **Network Uyumluluğu**: Host network modunda çalışır
3. **AI System Erişimi**: Aynı ağdaki AI sistemlere erişim
4. **Production Ready**: Nginx proxy ile optimize edilmiş

## Önemli Notlar

1. **Firewall**: Eğer network'ten erişemiyorsanız, firewall ayarlarınızı kontrol edin:
   - Windows: Windows Firewall'da portları açın
   - macOS: System Preferences > Security & Privacy > Firewall'da portları açın
   - Linux: `ufw allow <port>` komutlarını çalıştırın

2. **Docker Network**: Docker kullanırken container host network'ü kullanır
3. **AI System Access**: Container içinden host ağındaki AI sistemlere erişim var

## Port Bilgileri

### Development Mode
- Frontend: 5173
- Backend: 8001

### Production Mode  
- All-in-one: 80 (Nginx proxy)

## Sorun Giderme

### Docker'da Network Erişemi Yok
```bash
# Host network modunu kontrol edin
docker-compose ps

# Container loglarını kontrol edin
docker-compose logs virtue-admin
```

### AI System'a Bağlanamıyor
Docker container'ı host network'ü kullandığı için AI sistemlere normal şekilde erişebilmelidir. Eğer sorun varsa:
1. AI system'in aynı ağda olduğunu kontrol edin
2. AI system'in 8000 portunda çalıştığını kontrol edin
3. Firewall'ın AI system portunu bloke etmediğini kontrol edin
