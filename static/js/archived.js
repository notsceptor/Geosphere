import * as THREE from 'three';

var scene, camera, renderer;
var globe, extraLayer, globeRotationSpeed = 0.005;
var extraLayerRotationSpeed = 0.0005; 
var isDragging = false;
var previousMousePosition = { x: 0, y: 0 };
var interactivePoints = [];
var popupBox;

var sun;
var sunRotationSpeed = 0.002;

const starsContainer = document.querySelector('.stars');

for (let i = 0; i < 300; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 5}s`;
    starsContainer.appendChild(star);
}

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 3;

  var spaceTexture = new THREE.TextureLoader().load("{{ url_for('static', filename='images/space.png') }}");
  var spaceGeometry = new THREE.SphereGeometry(10, 32, 32);
  var spaceMaterial = new THREE.MeshBasicMaterial({ map: spaceTexture, side: THREE.BackSide });
  var spaceSphere = new THREE.Mesh(spaceGeometry, spaceMaterial);
  scene.add(spaceSphere);

  var loader = new THREE.TextureLoader();

  var earthGeometry = new THREE.SphereGeometry(1, 32, 32);
  var earthMaterial = new THREE.MeshBasicMaterial({
    map: loader.load("/static/images/earth.jpg"),
    side: THREE.FrontSide,
  });
  globe = new THREE.Mesh(earthGeometry, earthMaterial);
  globe.geometry.rotateY(-Math.PI * 0.52);
  globe.renderOrder = 2;
  scene.add(globe);

  var sunGeometry = new THREE.SphereGeometry(5, 32, 32);
  var sunMaterial = new THREE.MeshBasicMaterial({
    map: loader.load("/static/images/sun.jpg"), 
    side: THREE.FrontSide,
  });
  sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.position.set(15, 0, 0);
  scene.add(sun);

  var extraLayerGeometry = new THREE.SphereGeometry(1.01, 32, 32);
  var extraLayerMaterial = new THREE.MeshBasicMaterial({ map: loader.load("{{ url_for('static', filename='images/clouds.jpg') }}"), transparent: true, opacity: 0.5 });
  extraLayer = new THREE.Mesh(extraLayerGeometry, extraLayerMaterial);
  scene.add(extraLayer);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mouseup', onMouseUp, false);
  document.addEventListener('mousemove', onMouseMove, false);

  window.addEventListener('resize', onWindowResize, true);
}

var markerNumbers = [];

function updateInteractivePoints() {
  for (var i = 0; i < interactivePoints.length; i++) {
    var point = interactivePoints[i];
    var originalPosition = point.userData.originalPosition.clone();
    originalPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), globe.rotation.y);
    originalPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), globe.rotation.x);
    point.position.copy(originalPosition);
  }
}

function createInteractivePoint() {
  var pointGeometry = new THREE.SphereGeometry(0.05, 32, 32);
  var pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  var point = new THREE.Mesh(pointGeometry, pointMaterial);

  var phi = Math.acos(Math.random() * 2 - 1);
  var theta = Math.random() * 2 * Math.PI;

  point.userData.originalPosition = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  );

  scene.add(point);
  interactivePoints.push(point);

  var markerNumber = interactivePoints.length;
  markerNumbers.push(markerNumber);

  return { point, markerNumber };
}

document.addEventListener('mousemove', onMouseMove, false);
document.addEventListener('click', onClick, false);

function createWeatherPopup(latitude, longitude, temperature, weatherDescription) {
  if (!popupBox) {
    popupBox = document.createElement('div');
    popupBox.id = 'weatherPopup';
    document.body.appendChild(popupBox);
  }

  popupBox.className = 'weather-popup';
  popupBox.innerHTML = `
    <div><strong>Location:</strong> ${latitude}, ${longitude}</div>
    <div><strong>Temperature:</strong> ${temperature.toFixed(2)} K</div>
    <div><strong>Weather:</strong> ${weatherDescription}</div>
  `;
  document.body.appendChild(popupBox);

  var lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0)
  ]);
  var lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  var line = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(line);

  var popupBox = updateWeatherPopup(latitude, longitude, temperature, weatherDescription);
}

function updatePopupPosition(intersects) {
  if (intersects.length > 0) {
    const [intersection] = intersects;
    const { point } = intersection;

    const screenPosition = point.clone().project(camera);

    const windowX = (screenPosition.x + 1) / 2 * window.innerWidth;
    const windowY = (-screenPosition.y + 1) / 2 * window.innerHeight;

    if (popupBox) {
      popupBox.style.left = `${windowX}px`;
      popupBox.style.top = `${windowY}px`;
    }
  }
}

function updateWeatherPopup(latitude, longitude, temperature, weatherDescription) {
  var popupBox = document.getElementById('weatherPopup');

  if (!popupBox) {
    popupBox = document.createElement('div');
    popupBox.id = 'weatherPopup';
    document.body.appendChild(popupBox);
  }

  popupBox.innerHTML = `
    <div><strong>Location:</strong> ${latitude}, ${longitude}</div>
    <div><strong>Temperature:</strong> ${temperature.toFixed(2)} C</div>
    <div><strong>Weather:</strong> ${weatherDescription}</div>
  `;

  popupBox.style.position = 'fixed';
  popupBox.style.top = '20px';
  popupBox.style.left = '20px';
  popupBox.style.background = 'rgba(255, 255, 255, 0.3)';
  popupBox.style.padding = '10px';
  popupBox.style.borderRadius = '10px';
  popupBox.style.fontFamily = 'Quicksand, sans-serif';

  return popupBox;
}


async function getWeatherData(latitude, longitude) {
  const apiKey = 'bef596d12f785aff7d562a0506c5b998';
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    console.log('Weather Data:', data);

    const temperature = data.main.temp;
    const weatherDescription = data.weather[0].description;

    createWeatherPopup(latitude, longitude, temperature, weatherDescription);
  } catch (error) {
    console.error('Error fetching weather data:', error);
  }
}

function onClick(event) {
  var mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  var intersects = raycaster.intersectObject(globe);

  if (intersects.length > 0) {
    var intersectedPoint = intersects[0].point;

    var worldCoordinates = globe.localToWorld(intersectedPoint.clone());

    var phi = Math.acos(worldCoordinates.y / globe.scale.y);
    var theta = Math.atan2(worldCoordinates.x, worldCoordinates.z);

    var latitude = (phi * 180) / Math.PI - 90;
    var longitude = (theta * 180) / Math.PI;

    var roundedLatitude = latitude.toFixed(2);
    var roundedLongitude = longitude.toFixed(2);

    getWeatherData(roundedLatitude, roundedLongitude);
    updatePopupPosition(intersects);
  }
}

function onMouseDown(event) {
  isDragging = true;
  previousMousePosition = { x: event.clientX, y: event.clientY };
}

function onMouseUp() {
  isDragging = false;
}

function onMouseMove(event) {
  var mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  var intersects = raycaster.intersectObjects(interactivePoints);

  if (intersects.length > 0) {
    intersects[0].object.material.color.set(0x000000);
  } else {
    for (var i = 0; i < interactivePoints.length; i++) {
      interactivePoints[i].material.color.set(0xff0000);
    }
  }

  if (!isDragging) return;

  var deltaX = event.clientX - previousMousePosition.x;
  var deltaY = event.clientY - previousMousePosition.y;

  globe.rotation.x += deltaY * 0.005;
  globe.rotation.y += deltaX * 0.005;

  extraLayer.rotation.copy(globe.rotation);

  previousMousePosition = { x: event.clientX, y: event.clientY };
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjection();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  var distance = 15;
  var angle = sunRotationSpeed;

  sun.position.x = Math.cos(angle) * distance;
  sun.position.z = Math.sin(angle) * distance;

  extraLayer.rotation.y += extraLayerRotationSpeed;
  updateInteractivePoints();
  renderer.render(scene, camera);
}