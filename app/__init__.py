import os
from flask import Flask
from app.config import Config
from app.extensions import db, migrate, login_manager, mail, csrf

def create_app(config_class=Config):
    flask_app = Flask(__name__)
    flask_app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(flask_app)
    migrate.init_app(flask_app, db)
    login_manager.init_app(flask_app)
    mail.init_app(flask_app)
    csrf.init_app(flask_app)

    # Setup user loader
    from app.models.user import User
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.main import main_bp
    from app.routes.posts import posts_bp
    from app.routes.stories import stories_bp
    from app.routes.explore import explore_bp
    from app.routes.connections import connections_bp
    from app.routes.notifications import notifications_bp
    from app.routes.profile import profile_bp

    flask_app.register_blueprint(auth_bp)
    flask_app.register_blueprint(main_bp)
    flask_app.register_blueprint(posts_bp)
    flask_app.register_blueprint(stories_bp)
    flask_app.register_blueprint(explore_bp)
    flask_app.register_blueprint(connections_bp)
    flask_app.register_blueprint(notifications_bp)
    flask_app.register_blueprint(profile_bp)

    # Create upload directories and tables
    with flask_app.app_context():
        import app.models  # ensure models are registered
        db.create_all()
        upload_folder = flask_app.config.get('UPLOAD_FOLDER', 'app/static/uploads')
        for category in ['posts', 'stories', 'profiles']:
            os.makedirs(os.path.join(upload_folder, category), exist_ok=True)

    return flask_app
