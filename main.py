from flask import Flask, jsonify, render_template, request, flash, redirect, url_for, session
import httpx
from wtforms import Form, StringField, PasswordField, validators
import sqlite3

app = Flask(__name__)
app.secret_key = b'#7a*9Xb$z1'

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

class LoginForm(Form):
    username = StringField('Username', [validators.DataRequired()])
    password = PasswordField('Password', [validators.DataRequired()])

class SignupForm(Form):
    username = StringField('Username', [validators.DataRequired()])
    password = PasswordField('Password', [validators.DataRequired()])
    email = StringField('Email', [validators.DataRequired(), validators.Email()])
    phone_number = StringField('Phone Number (optional)', [validators.Optional()])

@app.route('/login', methods=['GET', 'POST'])
async def login():
    form = LoginForm(request.form)
    error_message = None 

    if request.method == 'POST' and form.validate():
        username = form.username.data
        password = form.password.data

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, password))
        result = cur.fetchone()
        conn.close()

        if result:
            session['logged_in'] = True
            session['username'] = username
            return render_template('index.html', username=username)
        else:
            error_message = 'Your details are incorrect'

    return render_template('login.html', form=form, error_message=error_message)

@app.route('/signup', methods=["GET", "POST"])
async def signup():
    form = SignupForm(request.form)
    error_message = None

    if request.method == 'POST' and form.validate():
        username = form.username.data
        password = form.password.data
        email = form.email.data
        phone_number = form.phone_number.data

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = ? OR email = ?", (username, email))
        existing_user = cur.fetchone()

        if existing_user:
            error_message = 'Username or email is already taken'
        else:
            cur.execute("INSERT INTO users (username, password, email, phone_number) VALUES (?, ?, ?, ?)",
                        (username, password, email, phone_number))
            conn.commit()
            conn.close()

            session['logged_in'] = True
            session['username'] = username
            return render_template('index.html', username=username)

    return render_template('signup.html', form=form, error_message=error_message)

@app.route('/about')
async def about():
    return render_template('about.html')

@app.route('/api')
async def api():
    return render_template('api.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('dashboard')) 

@app.route('/')
async def index():
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
async def dashboard():
    error_message = None;

    if not session.get('logged_in'):
        error_message = "You are not logged in"
        return render_template('login.html', error_message=error_message)

    username = session.get('username')

    if not username:
        error_message = "You are not logged in"
        return render_template('login.html', error_message=error_message)
    
    return render_template('index.html', username=username)

@app.route('/get_weather', methods=["GET", "POST"])
async def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    if not lat and lon:
        return jsonify({'error': 'Coordinates not found'}), 400

    try:
        weather_details = await get_weather_details(lat, lon)
        country_code = await get_country_code(lat, lon)

        weather_details.update(country_code)

        return jsonify(weather_details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/search_city', methods=['GET'])
async def search_city():
    city = request.args.get('city_name')

    if not city:
        return jsonify({'error': 'City name not provided'}), 400
    
    try:
        city_data = await perform_city_search(city)

        if city_data:
            city_coords = {'latitude': city_data[0]['lat'], 'longitude': city_data[0]['lon']}
            return jsonify(city_coords)
        else:
            return jsonify({'error': 'City not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/add_to_favourites', methods=['POST'])
async def add_city_to_favourites_route():
    username = request.args.get('username')
    city_name = request.args.get('city_name')

    if not username or not city_name:
        return jsonify({'error': 'Username or city_name not provided'}), 400

    try:
        await add_to_favourites(username, city_name)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/get_user_favourites', methods=['GET', 'POST'])
async def get_user_favourites_route():
    username = request.args.get('username')
    try:
        result = await get_user_favourites(username)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/remove_favourites', methods=['GET', 'POST'])
async def remove_favourites_route():
    username = request.args.get('username')
    city_name = request.args.get('city_name')
    try:
        result = await remove_favourites(username, city_name)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_user_favourites(username):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT city_name FROM favourites WHERE username = ?", (username,))
        result = cur.fetchall()
        return [row['city_name'] for row in result]
    except Exception as e:
        print(str(e))
    finally:
        conn.close()


def remove_favourites(username, city_name):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        city_name = city_name.strip()

        cur.execute("SELECT city_name FROM favourites WHERE username = ?", (username,))
        existing_favourites = cur.fetchone()

        if not existing_favourites:
            raise ValueError("No favorites found for the user")

        current_favourites = existing_favourites['city_name'].split(", ")

        if city_name not in current_favourites:
            raise ValueError(f"{city_name} is not in your favorites")

        current_favourites.remove(city_name)

        updated_favourites = ", ".join(current_favourites)
        cur.execute("UPDATE favourites SET city_name = ? WHERE username = ?", (updated_favourites, username))
        conn.commit()

        return True

    except Exception as e:
        print(str(e))
    finally:
        conn.close()

def add_to_favourites(username, city_name):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        city_name = city_name.strip()

        cur.execute("SELECT username FROM favourites WHERE username = ?", (username,))
        user_exists = cur.fetchone()

        cur.execute("SELECT city_name FROM favourites WHERE username = ?", (username,))
        existing_favourites = cur.fetchone()

        if not user_exists:
            cur.execute("INSERT INTO favourites (username, city_name) VALUES (?, ?)", (username, city_name))
            conn.commit()
            return True

        if user_exists:
            current_favourites = existing_favourites['city_name'].split(", ") if existing_favourites else []

            if city_name in current_favourites:
                raise ValueError(f"{city_name} is already in your favorites")

            current_favourites.append(city_name)

            updated_favourites = ", ".join(current_favourites)
            cur.execute("UPDATE favourites SET city_name = ? WHERE username = ?", (updated_favourites, username))
            conn.commit()

        return True

    except Exception as e:
        print(str(e))
    finally:
        conn.close()

def create_tables():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            email TEXT NOT NULL,
            phone_number TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS favourites (
            username TEXT NOT NULL,
            city_name TEXT NOT NULL,
            PRIMARY KEY (username, city_name)
        )
    """)
    conn.commit()
    conn.close()

async def get_weather_details(lat, lon):
    weather_api_url = f'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid=bef596d12f785aff7d562a0506c5b998'
    
    async with httpx.AsyncClient() as client:
        response = await client.get(weather_api_url)
        data = response.json()

    return data

async def get_country_code(lat, lon):
    country_api_url = f'http://api.geonames.org/countryCodeJSON?lat={lat}&lng={lon}&radius=100&username=sceptor'

    async with httpx.AsyncClient() as client:
        response = await client.get(country_api_url)
        data = response.json()

    return data

async def perform_city_search(city):
    geocode_api = f'http://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid=bef596d12f785aff7d562a0506c5b998'

    async with httpx.AsyncClient() as client:
        response = await client.get(geocode_api)
        data = response.json()

    return data

if __name__ == '__main__':
    app.run(debug=True)
    create_tables()
