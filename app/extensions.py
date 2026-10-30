from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_mail import Mail
from flask_wtf.csrf import CSRFProtect

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
mail = Mail()
csrf = CSRFProtect()

login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

from datetime import datetime, timezone

def utc_now():
    """Return timezone-naive UTC datetime for seamless SQLAlchemy DateTime compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
