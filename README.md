# Solar System Viewer

A high-performance, interactive astronomical visualization tool built with PixiJS. This application simulates the orbital mechanics of the solar system using real J2000 epoch data, presented through a retro-futuristic CRT interface.

## Features

- **Orbital Mechanics**: Precise calculation of planetary positions based on semi-major axis, eccentricity, mean longitude, and daily motion.
- **Interactive Camera**: Support for smooth panning, scroll-based zooming, and automated target tracking.
- **Dynamic Level of Detail**: Implements a fractal grid system and adaptive rendering for planetary moons and labels based on zoom depth.
- **Time Controls**: Variable simulation speeds ranging from real-time to high-speed time-lapses, including rewind and pause functionality.
- **Data Visualization**: Context-aware information panels providing technical specifications for each celestial body, including mass, gravity, and orbital periods.
- **Visual Effects**: Custom CSS-based CRT post-processing, including scanlines, grain, and a stylized amber-phosphor UI.

## Technical Stack

- **Rendering Engine**: PixiJS v7
- **Logic**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with backdrop filters and SVG noise textures

## Installation and Usage

1. Clone the repository to your local machine.
2. Ensure all three core files (`index.html`, `script.js`, `style.css`) are in the same directory.
3. Open `index.html` in any modern web browser.

No external dependencies or build steps are required as PixiJS is loaded via CDN.

## Controls

- **Left Click/Drag**: Pan across the solar system.
- **Scroll Wheel**: Zoom in and out.
- **Left Click on Planet**: Lock camera to the celestial body and open the information panel.
- **UI Buttons**: Adjust simulation speed and temporal direction.

## License

This project is licensed under the MIT License - see the [LICENSE] file for details.

Copyright (c) 2026 Maksim Sterkis
