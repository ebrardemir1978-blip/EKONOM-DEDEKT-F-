# Ekonomi Dedektifi

Ekonomi Dedektifi, oyuncuların çeşitli ekonomik göstergeleri (enflasyon, işsizlik, büyüme vb.) okuyarak ekonominin durumunu tahmin etmesini sağlayan eğitici ve rekabetçi bir web tabanlı uygulamadır.

## Kurulum ve Çalıştırma
Uygulamayı başlatmak için masaüstünde bulunan `Ekonomi_Dedektifi_Baslat.bat` dosyasına çift tıklamanız yeterlidir.
Bağlantı linki: http://127.0.0.1:5000 

### Sorun Giderme (Sık Karşılaşılan Hatalar)
- **Uygulama Açılmıyor / Siyah Ekran Kapanıyor:** 
  Başlatma dosyası `Ekonomi_Dedektifi_Baslat.bat` eksik kütüphaneleri otomatik kontrol edecek (`pip install -q Flask Flask-SQLAlchemy werkzeug`) şekilde yapılandırılmıştır. Komut istemcisi (siyah ekran) açık kalır, böylece hata varsa rahatça okunabilir.
- **Veritabanı Bulunamadı Hatası:**
  Uygulamanın çalışması için gereken `ekonomi_v2.db` veritabanı, uygulamanın çalışmasıyla birlikte (`app.py` içerisindeki `db.create_all()` komutuyla) otomatik olarak oluşturulur ve `instance/` klasörüne kaydedilir. Eğer silinirse bir sonraki açılışta tekrar otomatik kurulur.
