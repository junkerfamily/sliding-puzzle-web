# Sliding Puzzle Web Application

This project is a single-page web application that implements a sliding puzzle game using HTML, CSS, and JavaScript. The game allows users to load their own images and play a classic 4x4 sliding puzzle.

## Project Structure

```
sliding-puzzle-web
├── src
│   ├── js
│   │   ├── app.js          # Main JavaScript file to initialize the game and handle user interactions
│   │   └── puzzle.js       # Contains the logic for the sliding puzzle game
│   ├── css
│   │   └── styles.css      # Styles for the application
│   ├── assets
│   │   └── default-image.jpg # Default image for the puzzle tiles
│   └── index.html          # Main HTML document for the application
├── package.json             # Configuration file for npm
└── README.md                # Documentation for the project
```

## Getting Started

To run the sliding puzzle web application, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd sliding-puzzle-web
   ```

2. **Install dependencies** (if any):
   ```bash
   npm install
   ```

3. **Open the application**:
   Open `src/index.html` in your web browser to start playing the sliding puzzle game.

## Features

- Load custom images to create your own sliding puzzle.
- Reset the game to start over.
- Interactive tile movement by clicking adjacent tiles.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.