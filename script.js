
    // 1. Initialize PixiJS Application
    const app = new PIXI.Application({
    resizeTo: window,
    backgroundColor: 0x050608,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

    document.getElementById('canvas-container').appendChild(app.view);

    // 2. Create Containers
    const worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    // Interactive stage for panning
    app.stage.interactive = true;
    app.stage.hitArea = new PIXI.Rectangle(-10000, -10000, 20000, 20000);

    // 3. Create Graphics layers
    const gridGraphics = new PIXI.Graphics();
    const orbitsGraphics = new PIXI.Graphics();
    const sunGraphics = new PIXI.Graphics();
    const planetsGraphics = new PIXI.Graphics();

    worldContainer.addChild(gridGraphics);
    worldContainer.addChild(orbitsGraphics);
    worldContainer.addChild(sunGraphics);
    worldContainer.addChild(planetsGraphics);

    // UI Tether Layer - Attached directly to stage (Screen Space)
    const tetherGraphics = new PIXI.Graphics();
    app.stage.addChild(tetherGraphics);

    // --- ORBITAL MECHANICS & DATA ---
    const J2000 = new Date('2000-01-01T12:00:00Z').getTime();
    const MS_PER_DAY = 86400000;

    let simTime = Date.now();
    let simRate = 1;

    // Real precise J2000 Orbital Elements & Relative Sizes
    // Real precise J2000 Orbital Elements & Stylized UI Moons
    const planets = {
        Sun:     { isSun: true, x: 0, y: 0, color: 0xffb000, radius: 45, stats: { cls: "G-TYPE STAR", mass: "1.99×10³⁰ kg", grav: "274 m/s²", orb: "Galactic Center" } },
        Mercury: { a: 0.387, e: 0.2056, n: 4.0923344, w: 77.456, M0: 174.794, color: 0xaaaaaa, radius: 0.8,   stats: { cls: "TERRESTRIAL", mass: "3.30×10²³ kg", grav: "3.7 m/s²", orb: "88 d" } },
        Venus:   { a: 0.723, e: 0.0068, n: 1.6021305, w: 131.533, M0: 50.446,  color: 0xffddaa, radius: 1.9, stats: { cls: "TERRESTRIAL", mass: "4.87×10²⁴ kg", grav: "8.9 m/s²", orb: "225 d" } },
        Earth:   { a: 1.000, e: 0.0167, n: 0.9856091, w: 102.938, M0: 357.527, color: 0x4488ff, radius: 2,   stats: { cls: "TERRESTRIAL", mass: "5.97×10²⁴ kg", grav: "9.8 m/s²", orb: "365.2 d" },
            moons: [{ name: "Luna", T: 27.32, dist: 25, r: 2.0, color: 0xaaaaaa, stats: "Mass: 7.3×10²² kg" }] },
        Mars:    { a: 1.524, e: 0.0934, n: 0.5240330, w: 336.041, M0: 19.413,  color: 0xff4422, radius: 1.1,   stats: { cls: "TERRESTRIAL", mass: "6.42×10²³ kg", grav: "3.7 m/s²", orb: "687 d" },
            moons: [{ name: "Phobos", T: 0.3, dist: 12, r: 1.2, color: 0x999999, stats: "Mass: 1.0×10¹⁶ kg" }, { name: "Deimos", T: 1.2, dist: 18, r: 1.0, color: 0x888888, stats: "Mass: 1.4×10¹⁵ kg" }] },
        Jupiter: { a: 5.203, e: 0.0484, n: 0.0830853, w: 14.331,  M0: 20.065,  color: 0xffaa77, radius: 22,   stats: { cls: "GAS GIANT", mass: "1.90×10²⁷ kg", grav: "23.1 m/s²", orb: "11.9 yr" },
            moons: [
                { name: "Io", T: 1.77, dist: 35, r: 1.5, color: 0xffffaa, stats: "Volcanic, Mass: 8.9×10²² kg" },
                { name: "Europa", T: 3.55, dist: 45, r: 1.3, color: 0xeeeeff, stats: "Icy Ocean, Mass: 4.8×10²² kg" },
                { name: "Ganymede", T: 7.15, dist: 55, r: 2.0, color: 0xbbbbbb, stats: "Largest, Mass: 1.4×10²³ kg" },
                { name: "Callisto", T: 16.69, dist: 65, r: 1.8, color: 0x888888, stats: "Cratered, Mass: 1.0×10²³ kg" }
            ]},
        Saturn:  { a: 9.555, e: 0.0539, n: 0.0334441, w: 93.057,  M0: 317.021, color: 0xead6b8, radius: 18,   stats: { cls: "GAS GIANT", mass: "5.68×10²⁶ kg", grav: "9.0 m/s²", orb: "29.5 yr" },
            moons: [
                { name: "Enceladus", T: 1.37, dist: 30, r: 1.2, color: 0xffffff, stats: "Ice Geysers, Mass: 1.0×10²⁰ kg" },
                { name: "Titan", T: 15.9, dist: 42, r: 2.2, color: 0xffcc55, stats: "Dense Atmo, Mass: 1.3×10²³ kg" }
            ]},
        Uranus:  { a: 19.218, e: 0.0473, n: 0.0117283, w: 173.005, M0: 141.050, color: 0x88ddff, radius: 8,   stats: { cls: "ICE GIANT", mass: "8.68×10²⁵ kg", grav: "8.7 m/s²", orb: "84.0 yr" },
            moons: [{ name: "Titania", T: 8.7, dist: 20, r: 1.5, color: 0xcccccc, stats: "Largest, Mass: 3.4×10²¹ kg" }] },
        Neptune: { a: 30.110, e: 0.0086, n: 0.0059811, w: 48.120,  M0: 256.228, color: 0x2244ff, radius: 7.6,   stats: { cls: "ICE GIANT", mass: "1.02×10²⁶ kg", grav: "11.0 m/s²", orb: "164.8 yr" },
            moons: [{ name: "Triton", T: -5.8, dist: 22, r: 1.5, color: 0xaaaaff, stats: "Retrograde, Mass: 2.1×10²² kg" }] }
    };

    // Initialize Hit Areas
    Object.keys(planets).forEach(key => {
    let p = planets[key];

    p.x = 0; p.y = 0; // State cache

        // Invisible interactive area for clicking
        const hit = new PIXI.Graphics();
        hit.beginFill(0x000000, 0.001);
        hit.drawCircle(0, 0, p.isSun ? 25 : 20); // Reduced Sun hit area
        hit.endFill();
        hit.interactive = true;
        hit.cursor = 'pointer';

    // Planet click listener - Drag vs Click logic
    let pointerDownPos = null;
    hit.on('pointerdown', (e) => {
    pointerDownPos = { x: e.data.global.x, y: e.data.global.y };
});

    hit.on('pointerup', (e) => {
    if (!pointerDownPos) return;

    // Calculate distance dragged
    const dx = e.data.global.x - pointerDownPos.x;
    const dy = e.data.global.y - pointerDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If the user moved the mouse less than 5 pixels, it's a click, not a drag.
    if (dist < 5) {
    trackingTarget = key;
    cameraFollowTarget = true; // Lock camera to planet
    camTargetScale = p.isSun ? 2.0 : 4.0; // Zoom in to LOD threshold
    openInfoPanel(key);
}
    pointerDownPos = null;
});

    hit.on('pointerupoutside', () => pointerDownPos = null);

    worldContainer.addChild(hit);
    p.hitGraphic = hit;
});

    function solveKepler(M, e) {
    let E = M;
    for (let i = 0; i < 5; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
}
    return E;
}

    function scaleDist(au) {
    return 120 * Math.log2(1 + au) + 80;
}

    // --- CAMERA ENGINE ---
    let camX = 0, camY = 0;
    let camTargetX = 0, camTargetY = 0;
    let camScale = 1;
    let camTargetScale = 1;

    let isDragging = false;
    let lastMouse = {x: 0, y: 0};
    let trackingTarget = null;
    let cameraFollowTarget = false;

    // UI Panel Logic
    const infoPanel = document.getElementById('info-panel');
    const moonsContainer = document.getElementById('moons-container');
    const moonsList = document.getElementById('moons-list');
    const btnToggleMoons = document.getElementById('btn-toggle-moons');

    // Toggle button event listener
    btnToggleMoons.addEventListener('click', () => {
        const isHidden = moonsList.style.display === 'none';
        moonsList.style.display = isHidden ? 'block' : 'none';
        btnToggleMoons.innerText = isHidden ? btnToggleMoons.dataset.collapseText : btnToggleMoons.dataset.expandText;
    });

    function openInfoPanel(key) {
        const planet = planets[key];
        const data = planet.stats;

        document.getElementById('info-title').innerText = key.toUpperCase();
        document.getElementById('info-class').innerText = data.cls || "--";
        document.getElementById('info-mass').innerText = data.mass || "--";
        document.getElementById('info-gravity').innerText = data.grav || "--";
        document.getElementById('info-orbit').innerText = data.orb || "--";

        // Handle Moons Dropdown
        if (planet.moons && planet.moons.length > 0) {
            moonsContainer.style.display = 'block';
            moonsList.style.display = 'none'; // Default to closed

            // Set up button text dynamically based on moon count
            btnToggleMoons.dataset.expandText = `+ MOONS (${planet.moons.length})`;
            btnToggleMoons.dataset.collapseText = `- MOONS (${planet.moons.length})`;
            btnToggleMoons.innerText = btnToggleMoons.dataset.expandText;

            // Generate HTML for each moon
            moonsList.innerHTML = planet.moons.map(m => `
                <div class="moon-row">
                    <div class="moon-name">${m.name.toUpperCase()}</div>
                    <div class="moon-stats">${m.stats}</div>
                </div>
            `).join('');
        } else {
            moonsContainer.style.display = 'none'; // Hide if no moons
        }

        infoPanel.classList.add('panel-open');
    }

    function closeInfoPanel() {
    infoPanel.classList.remove('panel-open');
}

    document.getElementById('btn-close-info').addEventListener('click', () => {
    trackingTarget = null;
    cameraFollowTarget = false;
    closeInfoPanel();
});

    // Background Pan Listeners
    app.stage.on('pointerdown', (e) => {
    isDragging = true;
    lastMouse = {x: e.data.global.x, y: e.data.global.y};
    cameraFollowTarget = false; // Break camera track, keep UI open
});

    app.stage.on('pointermove', (e) => {
    if(isDragging) {
    let dx = e.data.global.x - lastMouse.x;
    let dy = e.data.global.y - lastMouse.y;

    camTargetX -= dx / camScale;
    camTargetY -= dy / camScale;
    camX -= dx / camScale; // Snap immediate to prevent rubber-banding
    camY -= dy / camScale;

    lastMouse = {x: e.data.global.x, y: e.data.global.y};
}
});

    app.stage.on('pointerup', () => isDragging = false);
    app.stage.on('pointerupoutside', () => isDragging = false);

    // Scroll Zoom Listener
    app.view.addEventListener('wheel', (e) => {
    e.preventDefault();

    const zoomFactor = 1.15;
    const direction = e.deltaY > 0 ? -1 : 1;

    const mouseX = e.offsetX - app.screen.width / 2;
    const mouseY = e.offsetY - app.screen.height / 2;
    const worldX = mouseX / camScale + camX;
    const worldY = mouseY / camScale + camY;

    if (direction > 0) camTargetScale *= zoomFactor;
    else camTargetScale /= zoomFactor;

    // Calculate minimum zoom scale (Neptune 80% screen constraint)
    const maxRadius = scaleDist(planets.Neptune.a);
    const orbitDiameter = maxRadius * 2;
    const minScreenDimension = Math.min(app.screen.width, app.screen.height);
    const minZoomScale = (minScreenDimension * 0.8) / orbitDiameter;

    // Clamp Scale (Zoom Limits)
    camTargetScale = Math.max(minZoomScale, Math.min(camTargetScale, 15));

    // Only calculate manual cursor zooming and auto-centering if we ARE NOT locked to a planet
    if (!cameraFollowTarget) {
    // If we hit the absolute zoom out limit, snap back to center (the Sun)
    if (camTargetScale <= minZoomScale + 0.0001 && direction < 0) {
    camTargetX = 0;
    camTargetY = 0;
} else {
    // Adjust target pan to zoom into the cursor
    camTargetX = worldX - mouseX / camTargetScale;
    camTargetY = worldY - mouseY / camTargetScale;
}
}
}, {passive: false});


    // --- UI TIME BINDINGS ---
    const uiDate = document.getElementById('date-display');
    const uiRate = document.getElementById('rate-display');
    const btnPlay = document.getElementById('btn-play');

    const rates = [-100, -50, -30, -10, -1, 1, 10, 30, 50, 100, 200, 500];
    let rateIdx = 5; // Start at 1x
    let isPaused = false;

    function updateTimeUI() {
    if (isPaused) {
    btnPlay.innerText = "►";
    btnPlay.classList.remove('active');
    uiRate.innerText = "PAUSED";
} else {
    btnPlay.innerText = "■";
    btnPlay.classList.add('active');
    uiRate.innerText = `${rates[rateIdx]} D/S`;
}
}

    document.getElementById('btn-rewind').addEventListener('click', () => {
    if (rateIdx > 0) rateIdx--;
    isPaused = false;
    updateTimeUI();
});

    document.getElementById('btn-ff').addEventListener('click', () => {
    if (rateIdx < rates.length - 1) rateIdx++;
    isPaused = false;
    updateTimeUI();
});

    btnPlay.addEventListener('click', () => {
    isPaused = !isPaused;
    updateTimeUI();
});

    updateTimeUI(); // Initialize UI


    // 4. Drawing Logic (Static Backgrounds)
    function drawScene() {
    // --- DRAW ORBIT PATHS ---
    orbitsGraphics.clear();
    Object.values(planets).forEach(planet => {
    if (planet.isSun) return; // Sun has no orbit path to draw

    orbitsGraphics.lineStyle(1, planet.color, 0.25);
    const segments = 150;
    let isDrawing = true;

    for (let i = 0; i <= segments; i++) {
    const v = (i / segments) * 2 * Math.PI;
    const rAU = (planet.a * (1 - planet.e * planet.e)) / (1 + planet.e * Math.cos(v));
    const rScaled = scaleDist(rAU);
    const w_rad = planet.w * Math.PI / 180;
    const angle = v + w_rad;

    const x = rScaled * Math.cos(angle);
    const y = -rScaled * Math.sin(angle); // Applied negative Math.sin flip

    if (i === 0) orbitsGraphics.moveTo(x, y);
    else {
    if (isDrawing) orbitsGraphics.lineTo(x, y);
    else orbitsGraphics.moveTo(x, y);
    isDrawing = !isDrawing;
}
}
});
}

    drawScene();

    // 5. Animation Loop (Time, Physics, Camera, LOD)
    app.ticker.add((delta) => {
    // -- Time Engine --
    const realDeltaSec = app.ticker.deltaMS / 1000;
    const currentSimRate = isPaused ? 0 : rates[rateIdx];
    simTime += realDeltaSec * currentSimRate * MS_PER_DAY;

    const d = new Date(simTime);
    uiDate.innerText = d.toISOString().split('T')[0];
    const daysSinceJ2000 = (simTime - J2000) / MS_PER_DAY;

    // -- Camera Easing --
    if (trackingTarget && cameraFollowTarget) {
    camTargetX = planets[trackingTarget].x;
    camTargetY = planets[trackingTarget].y;
}

    // Enforce max zoom out limit dynamically (e.g. on window resize)
    const minScreenDim = Math.min(app.screen.width, app.screen.height);
    const absoluteMinZoom = (minScreenDim * 0.8) / (scaleDist(planets.Neptune.a) * 2);

    if (camTargetScale <= absoluteMinZoom) {
    camTargetScale = absoluteMinZoom;
}

    // Clamp Pan (Don't let user fly out past Neptune)
    const maxPanDist = 1200;
    const panDist = Math.sqrt(camTargetX*camTargetX + camTargetY*camTargetY);
    if (panDist > maxPanDist) {
    camTargetX = (camTargetX / panDist) * maxPanDist;
    camTargetY = (camTargetY / panDist) * maxPanDist;
}

    camX += (camTargetX - camX) * 0.1;
    camY += (camTargetY - camY) * 0.1;
    camScale += (camTargetScale - camScale) * 0.1;

    // Apply camera transforms
    worldContainer.scale.set(camScale);
    worldContainer.x = app.screen.width / 2 - camX * camScale;
    worldContainer.y = app.screen.height / 2 - camY * camScale;

    // --- DYNAMIC FRACTAL GRID ---
    gridGraphics.clear();

    const logScale = Math.log10(camScale);
    const level = Math.floor(logScale);
    const fract = logScale - level; // 0.0 to 1.0 (Zoom phase)

    // Minor step size in world coordinates (Base grid is 200 units at 1.0x scale)
    const minorStep = 200 * Math.pow(10, -level - 1);

    // Calculate visible world bounds based on camera position and zoom
    const halfW = app.screen.width / 2 / camScale;
    const halfH = app.screen.height / 2 / camScale;
    const worldLeft = camX - halfW;
    const worldRight = camX + halfW;
    const worldTop = camY - halfH;
    const worldBottom = camY + halfH;

    // Grid index boundaries for culling off-screen lines
    const startKx = Math.floor(worldLeft / minorStep);
    const endKx = Math.ceil(worldRight / minorStep);
    const startKy = Math.floor(worldTop / minorStep);
    const endKy = Math.ceil(worldBottom / minorStep);

    // Interpolate minor grid color from 0x1a2b3c to 0x2a3b4c to hide wrap-around pops
    const r = 26 + 16 * fract;
    const g = 43 + 16 * fract;
    const b = 60 + 16 * fract;
    const minorColor = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

    // Calculate alpha tiers based on zoom phase
    const minorAlpha = fract * 0.25;
    const majorAlpha = 0.25 + fract * 0.15;
    const macroAlpha = 0.4;

    // Keep line width consistently exactly 1px on screen regardless of container scaling
    const lineWidth = 1 / camScale;

    // Group lines by LOD tier to minimize style state changes
    const minorsX = [], majorsX = [], macrosX = [];
    for (let k = startKx; k <= endKx; k++) {
    if (k % 100 === 0) macrosX.push(k);
    else if (k % 10 === 0) majorsX.push(k);
    else minorsX.push(k);
}

    const minorsY = [], majorsY = [], macrosY = [];
    for (let k = startKy; k <= endKy; k++) {
    if (k % 100 === 0) macrosY.push(k);
    else if (k % 10 === 0) majorsY.push(k);
    else minorsY.push(k);
}

    // Helper to draw a batch of lines
    function drawLines(arrX, arrY, color, alpha) {
    if (alpha <= 0.01) return; // Cull invisible layers
    gridGraphics.lineStyle(lineWidth, color, alpha);

    for (let i = 0; i < arrX.length; i++) {
    const x = arrX[i] * minorStep;
    gridGraphics.moveTo(x, worldTop);
    gridGraphics.lineTo(x, worldBottom);
}
    for (let i = 0; i < arrY.length; i++) {
    const y = arrY[i] * minorStep;
    gridGraphics.moveTo(worldLeft, y);
    gridGraphics.lineTo(worldRight, y);
}
}

    // Draw grids from back to front
    drawLines(minorsX, minorsY, minorColor, minorAlpha);
    drawLines(majorsX, majorsY, 0x2a3b4c, majorAlpha);
    drawLines(macrosX, macrosY, 0x2a3b4c, macroAlpha);

        // -- Physics & Rendering --
        planetsGraphics.clear();
        sunGraphics.clear();

        Object.keys(planets).forEach(key => {
            const planet = planets[key];

            // 1. UNIVERSAL VISUAL SCALING (Fixes the Focus Jump)
            // Applied to ALL planets so they never "snap" when clicked.
            // 6 pixels ensures they remain visible dots when zoomed far out,
            // but smoothly transition to their true planet.radius when zoomed in.
            const minScreenRadius = 6;
            const displayRadius = Math.max(planet.radius, minScreenRadius / camScale);

            // 2. DYNAMIC HITBOX SCALING (Fixes the Zoom-In Click Issue)
            // The hitbox was originally drawn at 25 (Sun) or 20 (Planets).
            const baseHitRadius = planet.isSun ? 25 : 20;

            // The hitbox must be its default UI size (easy to click when zoomed out)
            // OR the actual size of the planet (covers the whole body when zoomed in).
            const requiredWorldRadius = Math.max(displayRadius, baseHitRadius / camScale);

            // Scale the invisible hit graphic to match
            planet.hitGraphic.scale.set(requiredWorldRadius / baseHitRadius);

            if (planet.isSun) {
                planet.hitGraphic.x = 0;
                planet.hitGraphic.y = 0;

                sunGraphics.beginFill(planet.color, 1.0);
                sunGraphics.drawCircle(0, 0, displayRadius);
                sunGraphics.endFill();
                return; // Skip orbital physics for the sun
            }

    if (planet.isSun) {
    planet.hitGraphic.x = 0;
    planet.hitGraphic.y = 0;

    sunGraphics.beginFill(planet.color, 1.0);
    sunGraphics.drawCircle(0, 0, displayRadius);
    sunGraphics.endFill();
    return; // Skip orbital physics for the sun
}

    // Calculate Mean Anomaly using precision Daily Motion (n)
    const n_rad = planet.n * Math.PI / 180;
    const M0_rad = planet.M0 * Math.PI / 180;

    // Calculate current M and normalize it using modulo (ensure safe loop if rewinding)
    let M_rad = (M0_rad + n_rad * daysSinceJ2000) % (2 * Math.PI);
    if (M_rad < 0) M_rad += 2 * Math.PI;

    const E = solveKepler(M_rad, planet.e);

    // Calculate True Anomaly (v)
    const y = Math.sqrt(1 + planet.e) * Math.sin(E / 2);
    const x = Math.sqrt(1 - planet.e) * Math.cos(E / 2);
    const v = 2 * Math.atan2(y, x);

    // Orbit path rotation
    const w_rad = planet.w * Math.PI / 180;
    let angle = v + w_rad;

    // Plot the coordinates (Notice the negative sign on the Y axis!)
    const au = planet.a * (1 - Math.pow(planet.e, 2)) / (1 + planet.e * Math.cos(v));
    const rScaled = scaleDist(au);

    const px = rScaled * Math.cos(angle);
    const py = -rScaled * Math.sin(angle);

    // Cache state for tracking
    planet.x = px;
    planet.y = py;

    // Sync Hit Graphic, scaling inversely to keep click target large
    planet.hitGraphic.x = px;
    planet.hitGraphic.y = py;

    // Planet Body - Solid Circle
    planetsGraphics.beginFill(planet.color, 1.0);
    planetsGraphics.drawCircle(px, py, displayRadius);
    planetsGraphics.endFill();
});

    // -- Level of Detail: Moons --
    // Alpha fades in smoothly between 2.0x and 3.5x Zoom Scale
    const lodAlpha = Math.max(0, Math.min(1, (camScale - 2.0) / 1.5));

    if (lodAlpha > 0) {
    Object.values(planets).forEach(planet => {
    if (planet.moons) {
    planet.moons.forEach(moon => {
    const moonAngle = (daysSinceJ2000 / moon.T) * Math.PI * 2;
    const mx = planet.x + Math.cos(moonAngle) * moon.dist;
    const my = planet.y - Math.sin(moonAngle) * moon.dist; // Flipped Y for moons too

    // Draw Moon Orbit
    planetsGraphics.lineStyle(1, moon.color, 0.4 * lodAlpha);
    const segments = 30;
    let isDrawing = true;
    for(let i=0; i<=segments; i++) {
    const v = (i/segments) * 2 * Math.PI;
    const cx = planet.x + Math.cos(v) * moon.dist;
    const cy = planet.y - Math.sin(v) * moon.dist; // Flipped Y
    if(i===0) planetsGraphics.moveTo(cx, cy);
    else if(isDrawing) planetsGraphics.lineTo(cx, cy);
    else planetsGraphics.moveTo(cx, cy);
    isDrawing = !isDrawing;
}

    // Draw Moon Body - Solid Circle
    planetsGraphics.beginFill(moon.color, lodAlpha);
    planetsGraphics.drawCircle(mx, my, moon.r);
    planetsGraphics.endFill();
});
}
});
}

    // -- UI Tether Line --
    tetherGraphics.clear();
    if (trackingTarget && infoPanel.classList.contains('panel-open')) {
    const planet = planets[trackingTarget];

    // Convert planet's world coordinates to screen coordinates
    const screenX = (planet.x * camScale) + worldContainer.x;
    const screenY = (planet.y * camScale) + worldContainer.y;

    // Target coordinates: Dynamically read the DOM rect of the HTML Info Panel
    const panelRect = infoPanel.getBoundingClientRect();
    const targetX = panelRect.left;
    const targetY = panelRect.top + (panelRect.height / 2);

    // Draw the dynamic tether (Amber colored)
    tetherGraphics.lineStyle(1.5, 0xffb000, 0.6);
    tetherGraphics.moveTo(screenX, screenY);

    // Create a cool angular "industrial" elbow joint for the line
    const elbowX = screenX + (targetX - screenX) * 0.4;
    tetherGraphics.lineTo(elbowX, screenY);
    tetherGraphics.lineTo(targetX, targetY);

    // Draw connection points
    tetherGraphics.beginFill(0xffb000, 0.8);
    tetherGraphics.drawCircle(screenX, screenY, 3); // Planet anchor
    tetherGraphics.drawRect(targetX - 2, targetY - 2, 4, 4); // Panel anchor
    tetherGraphics.endFill();
}
});

    // --- PROCEDURAL FILM GRAIN (WEBGL OVERLAY) ---
    function initFilmGrain() {
        const canvas = document.getElementById('true-grain-overlay');
        const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false });

        if (!gl) return; // Failsafe for older browsers

        // Resize canvas to match screen resolution
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        window.addEventListener('resize', resize);
        resize();

        // 1. Compile Shaders
        const vsSource = `
        attribute vec2 position;
        void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;

        // THE FIX: Updated Fragment Shader
        const fsSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;
        
        // Pseudo-random number generator
        float random(vec2 st) {
            // By adding u_time INSIDE the sine function, the noise twinkles randomly
            // without zooming, sliding, or resetting every second.
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233)) + u_time) * 43758.5453123);
        }
        
        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            float noise = random(st); 
            
            // Output grayscale noise
            gl_FragColor = vec4(vec3(noise), 1.0); 
        }
    `;

        function createShader(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        }

        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
        gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(program);
        gl.useProgram(program);

        // 2. Create a full-screen rectangle to draw the noise on
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0, -1.0,  1.0,  1.0
        ]), gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // 3. Connect variables to the shader
        const timeLoc = gl.getUniformLocation(program, "u_time");
        const resLoc = gl.getUniformLocation(program, "u_resolution");

        // 4. Render Loop (Updated for 24fps Grain)
        function render(time) {
            // Calculate the exact millisecond intervals for 24 FPS (approx 41.66ms)
            const fpsInterval = 1000 / 24;

            // "Step" the time. This forces the time value to jump in 24fps chunks
            const steppedTime = Math.floor(time / fpsInterval) * fpsInterval;

            // Pass the stepped time and screen size to the GPU
            gl.uniform1f(timeLoc, steppedTime * 0.001);
            gl.uniform2f(resLoc, canvas.width, canvas.height);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // THE FIX: Only call requestAnimationFrame once here!
            requestAnimationFrame(render);
        }

        // THE FIX: Only call requestAnimationFrame once here to start the loop!
        requestAnimationFrame(render);
    }

    // Start the grain generator
    initFilmGrain();
