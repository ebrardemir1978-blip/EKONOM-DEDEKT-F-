# Ekonomi Dedektifi 🕵️‍♂️📈

Ekonomi Dedektifi, makroekonomik verileri analiz ederek ekonominin durumunu (Normal, Durgunluk, Kriz, Hiperenflasyon) tahmin etmeye çalıştığınız eğitim odaklı, oyunlaştırılmış bir web uygulamasıdır.

## 🚀 Başlatma

Uygulamayı başlatmak için masaüstündeki **Ekonomi_Dedektifi_Baslat.bat** dosyasını çalıştırabilirsiniz. Bu dosya otomatik olarak:
1. Gerekli kütüphaneleri kontrol eder.
2. Flask sunucusunu başlatır.
3. Tarayıcınızda oyunu açar.

## 🛠️ Teknik Özellikler

- **Backend:** Python Flask
- **Veritabanı:** SQLite (SQLAlchemy)
- **Frontend:** HTML5, CSS3 (Glassmorphism), JavaScript (Vanilla)
- **Grafikler:** Chart.js

## 📦 Kurulum (Manuel)

Eğer manuel olarak kurmak isterseniz:
1. Python'ın yüklü olduğundan emin olun.
2. Gerekli paketleri şu komutla yükleyin:
   ```bash
   pip install -r requirements.txt
   ```
3. Uygulamayı başlatın:
   ```bash
   python app.py
   ```

## 🐞 Son Çözülen Sorunlar

- **Oturum Çökmeleri:** Veritabanı sıfırlansa veya oturum süresi dolsa bile uygulamanın 500 hatası vermesi engellendi.
- **Seviye Mantığı:** 3. seviyeden sonraki oyun sonu geçişleri ve dashboard görselleri stabilize edildi.
- **Başlatma Betiği:** Windows ortamlarındaki farklı Python kurulumlarına karşı betik daha dirençli hale getirildi.
