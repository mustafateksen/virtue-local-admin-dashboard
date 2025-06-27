# Network Setup Guide

Bu proje herhangi bir bilgisayarda otomatik olarak network'te çalışacak şekilde ayarlanmıştır.

## Kurulum Adımları

### 1. Backend Kurulumu
```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend `0.0.0.0:8001` adresinde çalışacaktır.

### 2. Frontend Kurulumu
```bash
npm install
npm run dev
```

Frontend `0.0.0.0:5173` adresinde çalışacaktır.

## Network Erişimi

Vite başladığında şu çıktıyı göreceksiniz:
```
➜ Local:   http://localhost:5173/
➜ Network: http://192.168.1.xxx:5173/
```

**Network adresini kullanarak aynı ağdaki diğer cihazlardan erişebilirsiniz.**

## Önemli Notlar

1. **Firewall**: Eğer network'ten erişemiyorsanız, firewall ayarlarınızı kontrol edin:
   - Windows: Windows Firewall'da 5173 ve 8001 portlarını açın
   - macOS: System Preferences > Security & Privacy > Firewall'da portları açın
   - Linux: `ufw allow 5173` ve `ufw allow 8001` komutlarını çalıştırın

2. **Otomatik IP Tespiti**: Kod otomatik olarak makinenizin IP adresini tespit eder ve API çağrılarını ona göre yapar.

3. **Farklı Ağlarda**: Her ağda farklı IP aralıkları olabilir (192.168.1.x, 192.168.0.x, 10.0.0.x vs). Kod bunları otomatik handle eder.

## Sorun Giderme

### Network'ten Erişemiyorum
1. Firewall kontrol edin
2. Backend ve frontend'in aynı makinede çalıştığından emin olun
3. VPN bağlantısı varsa kapatın
4. Antivirus yazılımının portları bloke etmediğini kontrol edin

### API Çağrıları Çalışmıyor
Kod otomatik olarak frontend'in çalıştığı IP'yi tespit edip backend için kullanır. Manuel olarak .env dosyasında da ayarlayabilirsiniz:

```bash
# .env dosyasında
VITE_API_BASE_URL=http://192.168.1.100:8001
```

## Port Bilgileri
- Frontend: 5173
- Backend: 8001
- Her ikisi de `0.0.0.0` (tüm network interfaces) üzerinde çalışır
