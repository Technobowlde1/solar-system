
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

    // Real precise J2000 Orbital Elements
    const planets = {
    Sun:     { isSun: true, x: 0, y: 0, color: 0xffb000, radius: 35, stats: { cls: "G-TYPE STAR", mass: "1.99×10³⁰ kg", grav: "274 m/s²", orb: "Galactic Center" } },
    Mercury: { a: 0.387, e: 0.2056, n: 4.0923344, w: 77.456, M0: 174.794, color: 0xaaaaaa, radius: 2,   stats: { cls: "TERRESTRIAL", mass: "3.30×10²³ kg", grav: "3.7 m/s²", orb: "88 d" } },
    Venus:   { a: 0.723, e: 0.0068, n: 1.6021305, w: 131.533, M0: 50.446,  color: 0xffddaa, radius: 3.5, stats: { cls: "TERRESTRIAL", mass: "4.87×10²⁴ kg", grav: "8.9 m/s²", orb: "225 d" } },
    Earth:   { a: 1.000, e: 0.0167, n: 0.9856091, w: 102.938, M0: 357.527, color: 0x4488ff, radius: 4,   stats: { cls: "TERRESTRIAL", mass: "5.97×10²⁴ kg", grav: "9.8 m/s²", orb: "365.2 d" }, moons: [{ T: 27.32, dist: 25, r: 2.5, color: 0xaaaaaa }] },
    Mars:    { a: 1.524, e: 0.0934, n: 0.5240330, w: 336.041, M0: 19.413,  color: 0xff4422, radius: 3,   stats: { cls: "TERRESTRIAL", mass: "6.42×10²³ kg", grav: "3.7 m/s²", orb: "687 d" }, moons: [{ T: 0.3, dist: 12, r: 1.2, color: 0x999999 }, { T: 1.2, dist: 18, r: 1.0, color: 0x888888 }] },
    Jupiter: { a: 5.203, e: 0.0484, n: 0.0830853, w: 14.331,  M0: 20.065,  color: 0xffaa77, radius: 7,   stats: { cls: "GAS GIANT", mass: "1.90×10²⁷ kg", grav: "23.1 m/s²", orb: "11.9 yr" } },
    Saturn:  { a: 9.555, e: 0.0539, n: 0.0334441, w: 93.057,  M0: 317.021, color: 0xead6b8, radius: 6,   stats: { cls: "GAS GIANT", mass: "5.68×10²⁶ kg", grav: "9.0 m/s²", orb: "29.5 yr" } },
    Uranus:  { a: 19.218, e: 0.0473, n: 0.0117283, w: 173.005, M0: 141.050, color: 0x88ddff, radius: 5,   stats: { cls: "ICE GIANT", mass: "8.68×10²⁵ kg", grav: "8.7 m/s²", orb: "84.0 yr" } },
    Neptune: { a: 30.110, e: 0.0086, n: 0.0059811, w: 48.120,  M0: 256.228, color: 0x2244ff, radius: 5,   stats: { cls: "ICE GIANT", mass: "1.02×10²⁶ kg", grav: "11.0 m/s²", orb: "164.8 yr" } }
};

    // Initialize Hit Areas
    Object.keys(planets).forEach(key => {
    let p = planets[key];

    p.x = 0; p.y = 0; // State cache

    // Invisible interactive area for clicking
    const hit = new PIXI.Graphics();
    hit.beginFill(0x000000, 0.001);
    hit.drawCircle(0, 0, p.isSun ? 40 : 20); // Larger hit area for the sun
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

    function openInfoPanel(key) {
    const data = planets[key].stats;
    document.getElementById('info-title').innerText = key.toUpperCase();
    document.getElementById('info-class').innerText = data.cls || "--";
    document.getElementById('info-mass').innerText = data.mass || "--";
    document.getElementById('info-gravity').innerText = data.grav || "--";
    document.getElementById('info-orbit').innerText = data.orb || "--";
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
    sunGraphics.clear(); // Clear Sun here now so it can be animated smoothly

    Object.keys(planets).forEach(key => {
    const planet = planets[key];

    // Keep hitgraphic scaled correctly regardless of if it's the Sun or a planet
    planet.hitGraphic.scale.set(1 / camScale);

    // Determine radius directly relative to current smoothed camera zoom
    let displayRadius = planet.radius;
    if (trackingTarget === key && camScale < 2.0) {
    // Smoothly and directly scale up the planet as we zoom out (camScale decreases)
    // At 2.0x zoom, multiplier is 1.0. At 1.0x zoom, multiplier is 2.0.
    let zoomMult = 1.0 + (2.0 - camScale);
    displayRadius = planet.radius * zoomMult;
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