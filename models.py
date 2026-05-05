from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    score = db.Column(db.Integer, default=0)
    level = db.Column(db.String(20), default='Kolay')
    sessions = db.relationship('GameSession', backref='user', lazy=True)

class GameSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    inflation = db.Column(db.Float, nullable=False)
    unemployment = db.Column(db.Float, nullable=False)
    interest_rate = db.Column(db.Float, nullable=False)
    growth = db.Column(db.Float, nullable=False)
    exchange_rate = db.Column(db.Float, nullable=False)
    prediction = db.Column(db.String(50), nullable=False)
    true_state = db.Column(db.String(50), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
