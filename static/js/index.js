import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(16.5, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('globe-container').appendChild(renderer.domElement);

const createSphere = (radius, segments, texturePath, materialOptions = {}) => {
  const geometry = new THREE.SphereGeometry(radius, segments, segments);
  const texture = new THREE.TextureLoader().load(texturePath);
  const material = new THREE.MeshPhongMaterial({ map: texture, ...materialOptions });
  return new THREE.Mesh(geometry, material);
};

const starGeometry = new THREE.BufferGeometry()
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff })

const starVertices = []
for (let i = 0; i < 100000; i++) {
  const x  = (Math.random() - 0.5) * 2000
  const y = (Math.random() - 0.5) * 2000
  const z = -Math.random() * 3000
  starVertices.push(x, y, z)
}

starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3))

const stars = new THREE.Points(starGeometry, starMaterial)
scene.add(stars)

const earthTexture = new THREE.TextureLoader().load('/static/images/earth.jpg');
earthTexture.wrapS = THREE.RepeatWrapping;
earthTexture.offset.x = -1475 / ( 2 * Math.PI );
const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture, color: 0xffffff });

const globe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 64), earthMaterial);
globe.position.set(0, 0, 0);
scene.add(globe);

var light = new THREE.DirectionalLight(0xffffff, 5);
light.position.set(-3, 3, 2);
scene.add(light);
scene.add(new THREE.AmbientLight(0xd3d3d3, 0.85));

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const infoBox = document.getElementById('info-box');
infoBox.classList.add('hidden');

const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);

  if (!isEnlarged) {
    globe.rotation.y += 0.001;
  }
};

window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let isEnlarged = false;
let isDragging = false;
const previousMousePosition = { x: 0, y: 0 };

window.addEventListener('click', onClick);

function onClick(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0 && intersects[0].object === globe) {
    const clickedPosition = intersects[0].point.clone();
    globe.worldToLocal(clickedPosition);

    const latLon = convertWorldToLatLon(clickedPosition);

    console.log(clickedPosition)

    const direction = clickedPosition.clone().sub(globe.position).normalize();
    const angleOffsetHorizontal = Math.atan2(direction.x, direction.z);
    const angleOffsetVertical = Math.asin(direction.y);

    const ray = new THREE.Raycaster(camera.position, clickedPosition.clone().sub(camera.position).normalize());
    const globeIntersects = ray.intersectObject(globe);

    var latDeg;

    if (globeIntersects.length > 0) {
      const localIntersection = globe.worldToLocal(globeIntersects[0].point);
      const latitude = Math.asin(localIntersection.y / globe.geometry.parameters.radius);

      latDeg = THREE.MathUtils.radToDeg(latitude);

      console.log('Latitude:', latDeg, 'Longitude:', latLon.lon);
    }

    if (!event.altKey) {
      gsap.to(globe.rotation, 1, { y: -angleOffsetHorizontal, x: angleOffsetVertical });
    }

    if (!isEnlarged && !event.altKey) {
      if (isEnlarged) {
        removeMarkers();
      }

      addMarker(clickedPosition);

      getCountryCode(latDeg, latLon.lon, clickedPosition)
        .then(countryCode => {
          if (countryCode) {
            console.log('Country Code:', countryCode);
          } else {
            console.log('Unable to fetch country code.');
          }
        });

      getWeatherDetails(latDeg, latLon.lon) 
        .then(data => {
          console.log(data)
        })
    };

    const cameraPositionZ = isEnlarged && !event.altKey ? 5 : 3.5;
    const globePositionX = isEnlarged && !event.altKey ? 0 : 0.5;

    if (!event.altKey) {
      gsap.to(camera.position, 0.75, { z: cameraPositionZ, onUpdate: updateAspect });
      gsap.to(globe.position, 0.75, { x: globePositionX });

      toggleInfoBox(!isEnlarged);
      fadeHowToUseMenu(isEnlarged);
      isEnlarged = !isEnlarged;
    }
  }
}

function dragGlobe(event) {
  if (!isEnlarged){
    if (!isDragging) {
      isDragging = true;
      previousMousePosition.x = event.clientX;
      previousMousePosition.y = event.clientY;
    } else {
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };

      globe.rotation.y += deltaMove.x * 0.0025;
      globe.rotation.x += deltaMove.y * 0.0025;

      previousMousePosition.x = event.clientX;
      previousMousePosition.y = event.clientY;
    }
  }
}

window.addEventListener('mousedown', event => {
  if (event.altKey) {
    dragGlobe(event);
  }
});

window.addEventListener('mousemove', event => {
  if (isDragging) {
    dragGlobe(event);
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

function popupPageLoad() {
  gsap.set(globe.scale, { x: 0.01, y: 0.01, z: 0.01 });
  gsap.set(globe.rotation, { x: 0, y: 0, z: 0 });

  gsap.to(globe.scale, { x: 1, y: 1, z: 1, duration: 2.75, ease: 'elastic.out(1, 0.5)' });
  gsap.to(globe.rotation, { y: Math.PI * 2, duration: 3, ease: 'power4.out' });
}

document.addEventListener('DOMContentLoaded', popupPageLoad);
document.addEventListener('DOMContentLoaded', fadeHowToUseMenu(!isEnlarged));

function toggleInfoBox(show) {
  const leftValue = show ? '0' : '-100%';
  gsap.to(infoBox, 0.5, { left: leftValue, ease: 'power2.' + (show ? 'out' : 'in') });
  infoBox.classList.toggle('hidden', !show);

  if (!show) {
    removeMarkers();
  }
}

function getCountryCode(lat, lon, clickedPosition) {

  const delta = 5; 
  const nearbyCoordinates = [
    { lat: lat - delta, lon: lon },
    { lat: lat + delta, lon: lon },
    { lat: lat, lon: lon - delta },
    { lat: lat, lon: lon + delta },
  ];

  const apiRequests = nearbyCoordinates.map(coord => {
    const apiUrl = `http://api.geonames.org/countryCodeJSON?lat=${coord.lat}&lng=${coord.lon}&radius=100&username=sceptor`;
    return fetch(apiUrl)
      .then(response => response.json())
      .then(data => data.countryCode)
      .catch(error => {
        console.error('Error fetching country code:', error);
        return null;
      });
  });

  return Promise.all(apiRequests)
    .then(countryCodes => {
      console.log(countryCodes)
      const validCountryCode = countryCodes.find(code => code !== undefined);
      return validCountryCode || null; 
    })
    .catch(error => {
      console.error('Error fetching country code:', error);
      return null;
    });
}

function getWeatherDetails(lat, lon) {
  const url = `/get_weather?lat=${lat}&lon=${lon}`;
  return fetch(url)
    .then(response => response.json())
    .then(data => data)
    .catch(error => {
      console.error('Error fetching weather detials:', error);
      return null;
    });
}

function convertWorldToLatLon(worldPosition) {
  const phi = Math.acos(worldPosition.y / 0.5);
  const theta = Math.atan2(worldPosition.x, worldPosition.z);

  let lat = (Math.PI / 2 - phi) * (180 / Math.PI);
  let lon = (theta) * (180 / Math.PI);

  const correctionFactor = Math.cos(phi);
  lat *= correctionFactor;

  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;

  return { lat, lon };
}


function updateAspect() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function fadeHowToUseMenu(isEnlarged) {
  const howToUseMenu = document.getElementById('how-to-use-menu');

  if (!isEnlarged){
    gsap.to(howToUseMenu, { opacity: 0, duration: 0.5, onComplete: () => {
    howToUseMenu.classList.add('hidden');
  }});
  } if (isEnlarged){
    howToUseMenu.classList.remove('hidden');
    gsap.to(howToUseMenu, { opacity: 1, duration: 0.5 });
  }
}




const markers = [];

// Function to add a marker at a specific position with a pop-up animation
function addMarker(position) {
  const markerGeometry = new THREE.RingGeometry(0.03, 0.04, 32); // Create a ring geometry
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x0377fc, side: THREE.DoubleSide, transparent: true }); // Bright blue color

  const marker = new THREE.Mesh(markerGeometry, markerMaterial); // Create the marker
  marker.position.copy(position); // Position the marker at the clicked position
  marker.lookAt(globe.position); // Make the marker face the globe's center

  // Rotate the marker to align with the globe's surface UV
  const normal = marker.position.clone().normalize();
  marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  marker.scale.set(0.01, 0.01, 0.01); // Set initial scale to zero

  globe.add(marker); // Add the marker to the globe
  markers.push(marker); // Store the marker

  // Pop-up animation for the marker
  gsap.to(marker.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.7)' });
}

// Function to remove all markers from the globe with a pop-out animation
function removeMarkers() {
  markers.forEach(marker => {
    // Pop-out animation for the marker before removing it
    gsap.to(marker.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.5, ease: 'back.in(1.7)', onComplete: () => {
      globe.remove(marker); // Remove marker from the globe after animation
    } });
  });
  markers.length = 0; // Clear markers array
}

function recalculateCoordinates() {
  const direction = new THREE.Vector3();
  const latLon = {};

  globe.localToWorld(direction.set(0, 0, -1));
  latLon = convertWorldToLatLon(direction);

  return latLon;
}

animate();

