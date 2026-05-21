from flask import Flask, request, jsonify, session, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, GameSession

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ekonomi_dedektifi_secret_key_123'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ekonomi_v2.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# JSON format for Scenarios and Levels
SCENARIOS = {
    1: { # Kolay Seviye
        "name": "Kolay",
        "stages": [
            {
                "id": 1,
                "data": {"inflation": 2.5, "unemployment": 4.5, "interest_rate": 5.0, "growth": 3.0, "exchange_rate": 15.0},
                "true_state": "Normal",
                "country": "Örnek Ülke: ABD / Avrupa'daki gelişmiş ülkelerin refah dönemi.",
                "explanation": "Faiz oranları dengeli, büyüme istikrarlı ve işsizlik çok düşük. Enflasyon hedef seviyelerde (genelde %2-3). Bu sağlıklı bir ekonomidir."
            },
            {
                "id": 2,
                "data": {"inflation": 4.0, "unemployment": 9.5, "interest_rate": 1.0, "growth": -1.5, "exchange_rate": 16.0},
                "true_state": "Durgunluk",
                "country": "Örnek Ülke: Japonya'nın Kayıp On Yılları veya 2008 Küresel Krizi Sonrası Avrupa.",
                "explanation": "Büyüme negatif ve işsizlik yüksek seyrediyor. Tüketim azaldığı için durgunluk (resesyon) yaşanıyor. Merkez Bankası teşvik için faizi %1'e indirmiş."
            },
            {
                "id": 3,
                "data": {"inflation": 130.0, "unemployment": 8.0, "interest_rate": 60.0, "growth": 1.5, "exchange_rate": 850.0},
                "true_state": "Hiperenflasyon",
                "country": "Örnek Ülke: Arjantin veya Zimbabve.",
                "explanation": "Enflasyon kontrol edilemez bir hızla artıyor! Tüm fiyatlar günlük değişiyor. Ülkede devasa bir devalüasyon (yerel paranın değer kaybı) yaşanıyor, alınan maaş o ay bitmeden pul oluyor."
            },
            {
                "id": 4,
                "data": {"inflation": 18.0, "unemployment": 14.5, "interest_rate": 25.0, "growth": -4.0, "exchange_rate": 45.0},
                "true_state": "Kriz",
                "country": "Örnek Ülke: 2001 Türkiye Ekonomik Krizi.",
                "explanation": "Büyüme %4 küçülmüş (Çok şiddetli). İşten çıkarmalar hat safhada (%14.5). Şok bir döviz fırlaması ve ani faiz yükselişleri şirketleri batırmış."
            },
            {
                "id": 5,
                "data": {"inflation": 5.0, "unemployment": 5.5, "interest_rate": 10.0, "growth": 7.0, "exchange_rate": 20.0},
                "true_state": "Normal",
                "country": "Örnek Ülke: Çin'in veya Türkiye'nin hızlı büyüme yılları.",
                "explanation": "Normal ekonominin hızlı büyüyen bir evresi. %7 büyüme harika bir rakam, üretimin canlı olduğunu ve yatırımların karşılık bulduğunu gösteriyor."
            }
        ]
    },
    2: { # Orta Seviye
        "name": "Orta",
        "stages": [
            {
                "id": 1,
                "data": {"inflation": 45.0, "unemployment": 10.0, "interest_rate": 15.0, "growth": 2.0, "exchange_rate": 25.0},
                "true_state": "Kriz",
                "country": "Örnek Ülke: Türkiye (Faiz Sebep-Enflasyon Sonuç Dönemi).",
                "explanation": "Faizler enflasyona göre çok düşük (%15'e karşı %45 enflasyon). Bu durum döviz kurunun patlamasına sebep olur ve ithal malları inanılmaz pahalılaştırarak gizli bir krize iter."
            },
            {
                "id": 2,
                "data": {"inflation": 1.0, "unemployment": 3.0, "interest_rate": -0.5, "growth": 0.5, "exchange_rate": 110.0},
                "true_state": "Durgunluk",
                "country": "Örnek Ülke: Japonya.",
                "explanation": "Durgunluğun farklı bir boyutu: Deflasyon tehlikesi. İnsanlar 'yarın nasılsa daha ucuzlayacak' diyerek para harcamıyor. Merkez Bankası faizi eksiye (-) düşürse bile tüketim artmıyor."
            },
            {
                "id": 3,
                "data": {"inflation": 12.0, "unemployment": 15.0, "interest_rate": 8.0, "growth": -2.5, "exchange_rate": 10.0},
                "true_state": "Kriz",
                "country": "Örnek Ülke: İspanya / Yunanistan Kiralık Borç Krizi Dönemi.",
                "explanation": "Ülke feci şekilde daralıyor ve her 6 kişiden biri işsiz. İşsizlik ve büyüme verileri krizin varlığını gösteren en temel iki negatif makroekonomik indikatördür."
            },
            {
                "id": 4,
                "data": {"inflation": 3.0, "unemployment": 4.0, "interest_rate": 4.5, "growth": 2.5, "exchange_rate": 1.1},
                "true_state": "Normal",
                "country": "Örnek Ülke: Günümüz ABD Yönetimi Sonrası Dönem.",
                "explanation": "Makroekonomik dengeler tam kapasiteye ulaşmış durumda. Tüketim ile üretim birbirini mükemmel destekliyor."
            },
            {
                "id": 5,
                "data": {"inflation": 25000.0, "unemployment": 25.0, "interest_rate": 90.0, "growth": -10.0, "exchange_rate": 4000.0},
                "true_state": "Hiperenflasyon",
                "country": "Örnek Ülke: 1920'ler Almanya (Weimar Cumhuriyeti) veya Venezuela.",
                "explanation": "Çok ağır hiperenflasyon ve ekonomik çöküş. İnsanlar bir ekmek almak için çuvallarla para taşımak zorunda kalıyor. Üretim veya maaş kalmadı."
            }
        ]
    },
    3: { # Zor Seviye
        "name": "Zor",
        "stages": [
            {
                "id": 1,
                "data": {"inflation": -2.0, "unemployment": 12.0, "interest_rate": 0.0, "growth": -5.0, "exchange_rate": 1.0},
                "true_state": "Kriz",
                "country": "Örnek Ülke: 1929 Büyük Buhranı.",
                "explanation": "Soru şaşırtmacalı: Enflasyon yok (Deflasyon var). Ancak işsizlik devasa ve koca bir ülke eksi (-)5 küçülmüş! Büyük bir finansal krizdeyiz."
            },
            {
                "id": 2,
                "data": {"inflation": 25.0, "unemployment": 7.0, "interest_rate": 50.0, "growth": 1.0, "exchange_rate": 35.0},
                "true_state": "Durgunluk",
                "country": "Örnek Ülke: Brezilya veya Gelişmekte olan ülke Stagflasyonu.",
                "explanation": "Stagflasyon! Enflasyon yüksek kalırken, yüksek faiz nedeniyle yatırım yapılmıyor ve büyüme bitme noktasına geliyor (+1%). Yeni iş olanakları da durdu."
            },
            {
                "id": 3,
                "data": {"inflation": 85.0, "unemployment": 11.0, "interest_rate": 30.0, "growth": 4.5, "exchange_rate": 28.0},
                "true_state": "Normal",
                "country": "Örnek Ülke: Yüksek Enflasyonlu Ama İşleyen Ülke. (Örn: Geçmişteki bazı Türkiye yıllari).",
                "explanation": "Zor Soru! Enflasyon 85 yüksek olsa da hiper boyutunda değil; ve büyüme devam ediyor! Sistem zar zor dönüyor ama bir felaket/kriz veya durgunluk çöküşü henüz yok. Yani 'Yeni Normal'."
            },
            {
                "id": 4,
                "data": {"inflation": 500.0, "unemployment": 18.0, "interest_rate": 120.0, "growth": -8.0, "exchange_rate": 600.0},
                "true_state": "Hiperenflasyon",
                "country": "Örnek Ülke: Macaristan (II. Dünya Savaşı Sonrası) başlangıç aşaması.",
                "explanation": "Enflasyon kontrolü kaybetti, para değersiz ve üretim felç. Hiperenflasyon döngüsünün tam göbeği."
            },
            {
                "id": 5,
                "data": {"inflation": 6.5, "unemployment": 6.5, "interest_rate": 5.5, "growth": 5.0, "exchange_rate": 1.5},
                "true_state": "Normal",
                "country": "Örnek Ülke: Bir İngiltere / Kanada Sıçrama Dönemi.",
                "explanation": "Hafif enflasyonist ortam üreticinin işine gelip büyütmeyi desteklemiş. Mükemmel bir altın oran seviyesi."
            }
        ]
    }
}

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Kullanıcı adı zaten alınmış"}), 400
    
    user = User(username=username, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    
    session['user_id'] = user.id
    return jsonify({"success": True, "user": get_user_data(user)})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        return jsonify({"success": True, "user": get_user_data(user)})
    
    return jsonify({"error": "Geçersiz kullanıcı adı veya şifre"}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({"success": True})

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    user = User.query.get(user_id)
    if not user:
        session.pop('user_id', None)
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(get_user_data(user))

def get_user_data(user):
    level_name = SCENARIOS[user.level_id]['name'] if user.level_id in SCENARIOS else "Oyun Bitti"
    return {
        "username": user.username, 
        "score": user.score, 
        "level_name": level_name,
        "level_id": user.level_id,
        "stage_id": user.stage_id
    }

@app.route('/api/game/case', methods=['GET'])
def get_case():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    user = User.query.get(session['user_id'])
    if not user:
        session.pop('user_id', None)
        return jsonify({"error": "Unauthorized"}), 401
    
    if user.level_id > 3:
        return jsonify({"game_over": True, "message": "Tüm bölümleri tamamladınız! Harika bir Ekonomi Dedektifi oldunuz."})
        
    level_data = SCENARIOS[user.level_id]
    # find stage
    stage_data = next((s for s in level_data["stages"] if s["id"] == user.stage_id), None)
    
    if not stage_data:
        return jsonify({"error": "Bölüm verisi bulunamadı."}), 404
        
    return jsonify({
        "level_name": level_data["name"],
        "stage_id": user.stage_id,
        "data": stage_data["data"]
    })

@app.route('/api/game/evaluate', methods=['POST'])
def evaluate_case():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    user = User.query.get(session['user_id'])
    if not user:
        session.pop('user_id', None)
        return jsonify({"error": "Unauthorized"}), 401
    if user.level_id > 3:
        return jsonify({"error": "Oyun bitti."}), 400
        
    prediction = request.json.get('prediction')
    
    level_data = SCENARIOS[user.level_id]
    stage_data = next((s for s in level_data["stages"] if s["id"] == user.stage_id), None)
    
    if not stage_data:
        return jsonify({"error": "Senaryo bulunamadı"}), 400
        
    true_state = stage_data["true_state"]
    is_correct = (prediction == true_state)
    
    if is_correct:
        user.score += 20
        msg_title = f"Doğru! Ekonomi bu durumda: {true_state}"
    else:
        user.score -= 5
        msg_title = f"Yanlış! Ekonominin gerçek durumu: {true_state}"
        
    explanation = stage_data["explanation"]
    country_example = stage_data["country"]
    
    # Save log
    game_session = GameSession(
        user_id=user.id,
        level_id=user.level_id,
        stage_id=user.stage_id,
        prediction=prediction,
        is_correct=is_correct
    )
    db.session.add(game_session)
    
    # Check progression
    level_up = False
    game_finished = False
    
    if is_correct:
        user.stage_id += 1
        if user.stage_id > 5:
            user.stage_id = 1
            user.level_id += 1
            level_up = True
            
        if user.level_id > 3:
            game_finished = True
    
    db.session.commit()
    
    new_user_data = get_user_data(user)
    
    return jsonify({
        "success": True,
        "is_correct": is_correct,
        "msg_title": msg_title,
        "explanation": explanation,
        "country": country_example,
        "true_state": true_state,
        "level_up": level_up,
        "game_finished": game_finished,
        "user_data": new_user_data
    })

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    users = User.query.order_by(User.score.desc()).limit(10).all()
    leaderboard_data = []
    for u in users:
        level_name = SCENARIOS[u.level_id]['name'] if u.level_id in SCENARIOS else "Oyun Bitti"
        leaderboard_data.append({
            "username": u.username,
            "score": u.score,
            "level_name": level_name,
            "stage_id": u.stage_id
        })
    return jsonify({"success": True, "leaderboard": leaderboard_data})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
