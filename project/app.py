import os
from flask import Flask, render_template, session, redirect, url_for
from dotenv import load_dotenv
from database import init_db, get_db

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Flask Secret Key
app.secret_key = os.getenv("SECRET_KEY", "cyber_security_learning_assistant_default_key")

# Import Blueprints
from blueprints.auth import auth_bp
from blueprints.ai import ai_bp
from blueprints.tools import tools_bp

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(ai_bp, url_prefix='/ai')
app.register_blueprint(tools_bp, url_prefix='/tools')

# DB Teardown Connection Close
@app.teardown_appcontext
def close_db_connection(exception):
    db = getattr(Flask, '_database', None)
    if db is not None:
        db.close()

# Main Page Route
@app.route('/')
def index():
    return render_template('index.html')

# Initialize DB on Startup
with app.app_context():
    init_db()

if __name__ == '__main__':
    # Use standard host and port for Flask development
    app.run(host='127.0.0.1', port=5000, debug=True)
