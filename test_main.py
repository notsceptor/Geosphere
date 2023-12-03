import pytest
from main import app


@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


def test_home_route(client):
    response = client.get('/login')
    assert response.status_code == 200
    assert b'LOGIN' in response.data


def test_about_route(client):
    response = client.get('/about')
    assert response.status_code == 200
    assert b'ABOUT US' in response.data


def test_api_route(client):
    response = client.get('/api')
    assert response.status_code == 200
    assert b'API' in response.data