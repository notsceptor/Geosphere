import * as THREE from 'three';

var scene, camera, renderer;
var globe, extraLayer, globeRotationSpeed = 0.005;
var extraLayerRotationSpeed = 0.0005; 
var isDragging = false;
var previousMousePosition = {
  x: 0,
  y: 0
};

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 3;

  // Create a sphere for the space background
  var spaceTexture = new THREE.TextureLoader().load('space.png');
  var spaceGeometry = new THREE.SphereGeometry(10, 32, 32);
  var spaceMaterial = new THREE.MeshBasicMaterial({ map: spaceTexture, side: THREE.BackSide });
  var spaceSphere = new THREE.Mesh(spaceGeometry, spaceMaterial);
  scene.add(spaceSphere);

  // Create the Earth
  var loader = new THREE.TextureLoader();
  var earthGeometry = new THREE.SphereGeometry(1, 32, 32);
  var earthMaterial = new THREE.MeshBasicMaterial({ map: loader.load('earth.jpg') });
  globe = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(globe);

  // Create the extra layer
  var extraLayerGeometry = new THREE.SphereGeometry(1.01, 32, 32); // Slightly larger radius
  var extraLayerMaterial = new THREE.MeshBasicMaterial({
    map: loader.load('clouds.jpg'), // Replace with the path to your extra layer image
    transparent: true,
    opacity: 0.5, // Adjust the opacity as needed
  });
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

function onMouseDown(event) {
  isDragging = true;
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
}

function onMouseUp() {
  isDragging = false;
}

function onMouseMove(event) {
  if (!isDragging) return;

  var deltaX = event.clientX - previousMousePosition.x;
  var deltaY = event.clientY - previousMousePosition.y;

  globe.rotation.x += deltaY * 0.005;
  globe.rotation.y += deltaX * 0.005;

  extraLayer.rotation.copy(globe.rotation);

  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjection();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  // Rotate the extra layer slowly
  extraLayer.rotation.y += extraLayerRotationSpeed;
  renderer.render(scene, camera);
}
