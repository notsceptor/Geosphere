const starsContainer = document.querySelector('.stars');

for (let i = 0; i < 300; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 5}s`;
    starsContainer.appendChild(star);
}

document.getElementById("nav").addEventListener("click", toggleSidePanel);
document.getElementById("nav-rtn").addEventListener("click", toggleSidePanel); 

window.addEventListener('load', () => {
    const title = document.querySelector('.title h1');
    const loginContainer = document.querySelector('.login-container');

    setTimeout(() => {
        title.style.opacity = '1';
    }, 1000);
    setTimeout(() => {
        loginContainer.style.opacity = '1';
    }, 2000);
});

function toggleSidePanel() {
  const sidePanel = document.getElementById('sidePanel');
  sidePanel.style.left = sidePanel.style.left === "0px" ? "-300px" : "0px";
}