from flask import Flask, request, jsonify, session, render_template, redirect
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, GameSession

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ekonomi_dedektifi_secret_key_123'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ekonomi.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

def evaluate_economy(inflation, unemployment, interest, growth, exchange):
    if inflation >= 40:
        return "Hiperenflasyon", "Enflasyon oranları kontrolsüz yükseldiği için hiperenflasyon yaşanıyor."
    elif growth < 0 and unemployment >= 10:
        return "Kriz", "Büyüme negatif ve işsizlik çok yüksek, ekonomi tam bir krizde."
    elif growth <= 1 and unemployment >= 8:
        return "Durgunluk", "Ekonomik büyüme çok zayıf ve işsizlik yüksek. Durgunluk (Resesyon) yaşanıyor."
    else:
        return "Normal", "Veriler şu an için ekonomik felaket senaryolarını göstermiyor, normal işleyiş sürüyor."

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
    return jsonify({"success": True, "message": "Kayıt başarılı", "user": {"username": user.username, "score": user.score, "level": user.level}})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        return jsonify({"success": True, "user": {"username": user.username, "score": user.score, "level": user.level}})
    
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
    return jsonify({"username": user.username, "score": user.score, "level": user.level})

@app.route('/api/game/evaluate', methods=['POST'])
def play_game():
    if 'user_id' not in session:
        return jsonify({"error": "Lütfen önce giriş yapın"}), 401
        
    data = request.json
    user_id = session['user_id']
    user = User.query.get(user_id)
    
    prediction = data.get('prediction')
    inflation = float(data.get('inflation', 0))
    unemployment = float(data.get('unemployment', 0))
    interest = float(data.get('interest_rate', 0))
    growth = float(data.get('growth', 0))
    exchange = float(data.get('exchange_rate', 0))
    
    true_state, explanation = evaluate_economy(inflation, unemployment, interest, growth, exchange)
    is_correct = (prediction == true_state)
    
    if is_correct:
        user.score += 10
        msg = f"Doğru! Ekonomi bu durumda: {true_state}"
    else:
        user.score -= 5
        msg = f"Yanlış! Ekonominin gerçek durumu: {true_state}"
        
    # Level update simple logic
    if user.score >= 50:
        user.level = 'Orta'
    if user.score >= 100:
        user.level = 'Zor'
        
    game_session = GameSession(
        user_id=user.id,
        inflation=inflation,
        unemployment=unemployment,
        interest_rate=interest,
        growth=growth,
        exchange_rate=exchange,
        prediction=prediction,
        true_state=true_state,
        is_correct=is_correct
    )
    
    db.session.add(game_session)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "is_correct": is_correct,
        "message": msg,
        "explanation": explanation,
        "new_score": user.score,
        "new_level": user.level,
        "true_state": true_state
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
