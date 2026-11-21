import sqlite3
import os
from flask import g

# Database file path will be in the instance directory
DATABASE = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'database.db')

def get_db():
    """Get or open a database connection."""
    db = getattr(g, '_database', None)
    if db is None:
        # Ensure the directory exists
        db_dir = os.path.dirname(DATABASE)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
            
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

def init_db(app=None):
    """Initialize the database tables if they do not exist."""
    db_dir = os.path.dirname(DATABASE)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Progress table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            topic TEXT NOT NULL,
            quiz_score INTEGER NOT NULL, -- score percentage (0-100)
            attempts INTEGER DEFAULT 1,
            last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            UNIQUE(user_id, topic)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully.")
