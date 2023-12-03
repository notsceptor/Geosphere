import pytest
from main import app


@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


def test_get_weather_route(client):
    response = client.get('/get_weather?lat=35&lon=139')
    assert response.status_code == 200
    assert b'lat' in response.data

def test_get_city_route(client):
    response = client.get('/search_city?city_name=London')
    print(response.data)
    assert response.status_code == 200