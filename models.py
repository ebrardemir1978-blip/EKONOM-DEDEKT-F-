from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    score = db.Column(db.Integer, default=0)
    level_id = db.Column(db.Integer, default=1) # 1: Kolay, 2: Orta, 3: Zor vs.
    stage_id = db.Column(db.Integer, default=1) # 1 to 5 per level
    total_time_spent = db.Column(db.Integer, default=0) # in seconds
    sessions = db.relationship('GameSession', backref='user', lazy=True)

class GameSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    level_id = db.Column(db.Integer, nullable=False)
    stage_id = db.Column(db.Integer, nullable=False)
    prediction = db.Column(db.String(50), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
