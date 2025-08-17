
function showScreen(screenId, role) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const newScreen = document.getElementById(screenId);
    if (newScreen) {
        newScreen.classList.add('active');
    }

    if (role) {
        const roleLabel = document.getElementById('role-label');
        if (roleLabel) {
            roleLabel.textContent = role;
        }
    }
}
