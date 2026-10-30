from datetime import datetime, timezone
from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import aliased
from app.extensions import db

class Connection(db.Model):
    __tablename__ = 'connections'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), default='pending') # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('sender_id', 'receiver_id', name='uq_sender_receiver'),
    )

    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_connections', lazy='dynamic'))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('received_connections', lazy='dynamic'))

    @staticmethod
    def get_connection(user1_id, user2_id):
        return Connection.query.filter(
            ((Connection.sender_id == user1_id) & (Connection.receiver_id == user2_id)) |
            ((Connection.sender_id == user2_id) & (Connection.receiver_id == user1_id))
        ).first()

    @staticmethod
    def are_connected(user1_id, user2_id):
        conn = Connection.get_connection(user1_id, user2_id)
        return conn is not None and conn.status == 'accepted'

    @staticmethod
    def get_connected_user_ids(user_id):
        connections = Connection.query.filter(
            ((Connection.sender_id == user_id) | (Connection.receiver_id == user_id)),
            Connection.status == 'accepted'
        ).all()
        
        connected_ids = set()
        for conn in connections:
            if conn.sender_id == user_id:
                connected_ids.add(conn.receiver_id)
            else:
                connected_ids.add(conn.sender_id)
        return list(connected_ids)
