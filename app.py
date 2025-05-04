from flask import Flask, jsonify, render_template, request, redirect, url_for, flash, session
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature  
from werkzeug.security import generate_password_hash, check_password_hash

import sqlite3
import joblib
import numpy as np
from flask_dance.contrib.google import make_google_blueprint, google

app = Flask(__name__)
app.secret_key = 'your-secret-key'  # Replace with your actual secret key

# Initialize SQLite database (to create the table if not exists)
def init_db():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT,
        email TEXT
    )
    ''')
    conn.commit()
    conn.close()
# Google OAuth setup
google_bp = make_google_blueprint(
    client_id='your-client-id',  # Replace with your client ID
    client_secret='your-client-secret',  # Replace with your client secret
    redirect_to='google_login'
)
app.register_blueprint(google_bp, url_prefix='/google_login')

# Email Config (optional, not used directly here)
app.config.update(
    MAIL_SERVER='smtp.gmail.com',
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME='your-email@gmail.com',       # Replace with your email
    MAIL_PASSWORD='your-app-password'           # Replace with your app-specific password
)

mail = Mail(app)
s = URLSafeTimedSerializer(app.secret_key)

# Load ML models
price_model = joblib.load('price_model.pkl')
yield_model = joblib.load('yield_model.pkl')
scaler = joblib.load('scaler.pkl')

# In-memory users (for demo only, use a DB in production)
users = {
    'admin': {'password': generate_password_hash('1234'), 'email': 'admin@example.com'}
}

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        uname = request.form['username']
        pwd = request.form['password']
        user = get_user_by_username(uname)

        if user and check_password_hash(user[1], pwd):  # user[1] is the password field
            flash("✅ Login successful!")
            session['username'] = uname
            return redirect(url_for('index'))
        flash("❌ Invalid credentials")
    return render_template('login.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        if password != confirm_password:
            flash("❌ Passwords do not match.")
        elif get_user_by_username(username):
            flash("⚠️ Username already exists.")
        else:
            hashed_password = generate_password_hash(password)
            add_user(username, hashed_password, f'{username}@example.com')
            flash("✅ Account created successfully!")
            return redirect(url_for('login'))
    return render_template('signup.html')

def add_user(username, password, email):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', 
                   (username, password, email))
    conn.commit()
    conn.close()

def get_user_by_username(username):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    return user


@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        username = request.form['username']
        new_password = request.form['password']

        if username in users:
            users[username]['password'] = generate_password_hash(new_password)
            flash("✅ Password updated successfully!")
            return redirect(url_for('login'))
        else:
            flash("❌ Username not found.")
            return redirect(url_for('forgot_password'))

    return render_template('forgot-password.html')

@app.route('/reset/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        email = s.loads(token, salt='reset-salt', max_age=3600)
    except (SignatureExpired, BadSignature):
        return "❌ The reset link is invalid or expired."
    
    if request.method == 'POST':
        new_password = request.form['password']
        for uname, data in users.items():
            if data['email'] == email:
                users[uname]['password'] = generate_password_hash(new_password)
                flash("🔒 Password reset successful.")
                return redirect(url_for('login'))
    return render_template('reset-password.html')

@app.route('/index')
def index():
    if 'username' not in session:
        flash("⚠️ Please login to continue.")
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("✅ Logged out successfully!")
    return redirect(url_for('login'))

@app.route('/google_login')
def google_login():
    if google.authorized:
        user_info = google.get('/plus/v1/people/me')
        user_data = user_info.json()
        username = user_data['displayName']
        email = user_data['emails'][0]['value']
        users[username] = {'password': 'google-oauth', 'email': email}
        flash("✅ Google Login successful!")
        session['username'] = username
        return redirect(url_for('index'))
    return redirect(url_for('google_bp.login'))

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    try:
        temp = float(data['temperature'])
        rain = float(data['rainfall'])
        yield_val = float(data['yield'])

        input_data = np.array([[temp, rain, yield_val]])
        input_data_scaled = scaler.transform(input_data)

        price_prediction = price_model.predict(input_data_scaled)[0]
        yield_prediction = yield_model.predict(input_data_scaled)[0]

        return jsonify({
            'predicted_price': round(price_prediction, 2),
            'predicted_yield': round(yield_prediction, 2)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    init_db()
    app.run(debug=True)

