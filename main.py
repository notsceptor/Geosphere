from flask import Flask, jsonify, render_template, request, flash, redirect, url_for, session
import httpx
from wtforms import Form, StringField, PasswordField, validators
import asyncpg
import asyncio

app = Flask(__name__)
app.secret_key = b'#7a*9Xb$z1'

DATABASE_CONFIG = {
    'host': "db.dyvqjatgbyfwpbulbcej.supabase.co",
    'port': 5432,
    'database': "postgres",
    'user': "postgres",
    'password': "uGe0g7TX55W14zXb"
}

async def create_pool():
    return await asyncpg.create_pool(**DATABASE_CONFIG)

async def close_pool(pool):
    await pool.close()

class LoginForm(Form):
    username = StringField('Username', [validators.DataRequired()])
    password = PasswordField('Password', [validators.DataRequired()])

@app.route('/login', methods=['GET', 'POST'])
async def login():
    form = LoginForm(request.form)

    if request.method == 'POST' and form.validate():
        username = form.username.data
        password = form.password.data

        pool = await create_pool()
        db = await pool.acquire()

        try:
            result = await db.fetchrow("SELECT * FROM users WHERE username = $1 AND password = $2", username, password)

            if result:
                flash('Login successful!', 'success')
                session['logged_in'] = True
                session['username'] = username
                return render_template('index.html', username=username)
            else:
                flash('Login unsuccessful. Please check your username and password.', 'danger')
        finally:
            await pool.release(db)
            await close_pool(pool)

    return render_template('login.html', form=form)

@app.route('/dashboard')
async def dashboard():
    if not session.get('logged_in'):
        flash('Please log in first.', 'danger')
        return redirect(url_for('login'))
    
    return render_template("index.html")

@app.route('/get_weather', methods=["GET", "POST"])
async def get_weather():
    if not session.get('logged_in'):
        flash('Please log in first.', 'danger')
        return redirect(url_for('login'))

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
    if not session.get('logged_in'):
        flash('Please log in first.', 'danger')
        return redirect(url_for('login'))
    
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
    
@app.route('/add_city_to_favourites', methods=['POST'])
async def add_city_to_favourites_route():
    username = request.form.get('username')
    city_name = request.form.get('city_name')

    if not username or not city_name:
        return jsonify({'error': 'Username or city_name not provided'}), 400

    try:
        await add_city_to_favourites(username, city_name)
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

async def get_user_favourites(username):
    try:
        pool = await create_pool()
        db = await pool.acquire()

        result = await db.fetch("SELECT city_name FROM favourites WHERE username = $1", username)
        return [row['city_name'] for row in result]
    except Exception as e:
        print(str(e))
    finally:
        await pool.release(db)
        await close_pool(pool)

async def remove_favourites(username, city_name):
    try:
        pool = await create_pool()
        db = await pool.acquire()

        city_name = city_name.strip()

        existing_favourites = await db.fetchval(
            "SELECT city_name FROM favourites WHERE username = $1",
            username,
        )

        if not existing_favourites:
            raise ValueError("No favorites found for the user")

        current_favourites = existing_favourites.split(", ")

        if city_name not in current_favourites:
            raise ValueError(f"{city_name} is not in your favorites")

        current_favourites.remove(city_name)

        updated_favourites = ", ".join(current_favourites)
        await db.execute("UPDATE favourites SET city_name = $1 WHERE username = $2", updated_favourites, username)

        return True

    except Exception as e:
        print(str(e))
    finally:
        await pool.release(db)
        await close_pool(pool)

async def add_city_to_favourites(username, city_name):
    try:
        pool = await create_pool()
        db = await pool.acquire()

        existing_favourite = await db.fetchrow(
            "SELECT city_name FROM favourites WHERE username = $1 AND city_name = $2",
            username,
            city_name,
        )

        if existing_favourite:
            raise ValueError(f"{city_name} is already in your favourites")

        await db.execute("INSERT INTO favourites (username, city_name) VALUES ($1, $2)", username, city_name)
    except Exception as e:
        print(str(e))
    finally:
        await pool.release(db)
        await close_pool(pool)

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