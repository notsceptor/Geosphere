import pytest
from main import app


@pytest.fixture
def client():
    with app.test_client() as client:
        yield client

def test_login(client):
    data = {'username': 'admin', 'password': 'admin'}
    
    response = client.post('/login', data=data)

    assert response.status_code == 200
    assert b'Logged in as' in response.data


def test_login_invalid_credentials(client):
    data = {'username': 'invalid_user', 'password': 'invalid_password'}
    
    response = client.post('/login', data=data)

    assert response.status_code == 200
    assert b'Your details are incorrect' in response.data


def test_signup(client):
    data = {'username': 'new_user', 'password': 'new_password', 'email': 'new_user@example.com'}
    
    response = client.post('/signup', data=data, follow_redirects=True)

    assert response.status_code == 200
    assert b'Logged in as' in response.data


def test_signup_existing_user(client):
    data = {'username': 'admin', 'password': 'admin', 'email': 'test@gmail.com', 'phone_number': '1234567890'}
    
    response = client.post('/signup', data=data)

    assert response.status_code == 200
    assert b'Username or email is already taken' in response.data


def test_logout(client):
    response = client.get('/logout')

    assert response.status_code == 302
    assert response.headers['Location'] == '/dashboard'