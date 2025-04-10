// This file contains the logic for the sliding puzzle game

const tileSize = 100; // Size of each tile in pixels
const gridSize = 4;   // 4x4 grid
let tiles = {};
let emptyPos = [3, 3]; // Initial empty position (bottom-right)
let tileImages = [];

// Process uploaded image
function processUploadedImage(img) {
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match the puzzle size
    canvas.width = tileSize * gridSize;
    canvas.height = tileSize * gridSize;
    
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Resize the image to a square while maintaining aspect ratio
    const size = Math.min(img.width, img.height);
    const offsetX = (img.width - size) / 2;
    const offsetY = (img.height - size) / 2;
    
    // Draw the resized image onto the canvas
    context.drawImage(
        img, 
        offsetX, offsetY, size, size, // Source rectangle
        0, 0, canvas.width, canvas.height // Destination rectangle
    );
    
    // Clear previous tile images and create new ones
    tileImages = [];
    splitImage(canvas);
}

// Update the splitImage function to add numbers to each tile
function splitImage(canvas) {
    tileImages = []; // Clear previous tiles
    const context = canvas.getContext('2d');
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const tileIndex = i * gridSize + j;
            
            // Skip the last tile (bottom-right) as it will be empty
            if (tileIndex === gridSize * gridSize - 1) continue;
            
            const x = j * tileSize;
            const y = i * tileSize;
            
            // Create a separate canvas for each tile
            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = tileSize;
            tileCanvas.height = tileSize;
            const tileContext = tileCanvas.getContext('2d');
            
            // Draw the portion of the image for this tile
            tileContext.drawImage(canvas, x, y, tileSize, tileSize, 0, 0, tileSize, tileSize);
            
            // Add the number on the tile
            const tileNumber = tileIndex + 1; // Numbers 1-15
            
            // Add a semi-transparent background for the number to ensure visibility
            tileContext.fillStyle = 'rgba(255, 255, 255, 0.7)';
            tileContext.fillRect(5, 5, 30, 30);
            
            // Add the number
            tileContext.font = 'bold 20px Arial';
            tileContext.fillStyle = 'black';
            tileContext.textAlign = 'center';
            tileContext.textBaseline = 'middle';
            tileContext.fillText(tileNumber.toString(), 20, 20);
            
            // Store the tile image
            tileImages.push(tileCanvas.toDataURL());
        }
    }
    
    resetGame();
}

// Update the resetGame function to handle the numbered tiles
function resetGame() {
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Initialize the tiles object
    tiles = {};
    
    // Create positions and shuffle them
    const positions = [];
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            positions.push([i, j]);
        }
    }
    shuffleArray(positions);
    
    // The last position will be the empty tile
    emptyPos = positions[positions.length - 1];
    
    // Draw all tiles except the empty one
    for (let idx = 0; idx < positions.length - 1; idx++) {
        const pos = positions[idx];
        const [i, j] = pos;
        const key = `${i},${j}`;
        
        // The tileIdx is the index in tileImages
        const tileIdx = idx;
        tiles[key] = tileIdx;
        
        const img = new Image();
        img.src = tileImages[tileIdx];
        img.onload = () => {
            context.drawImage(img, j * tileSize, i * tileSize);
        };
    }
}

// Update the resetToSolvedState function for the solver
function resetToSolvedState() {
    // Clear the canvas
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a solved state
    const solvedTiles = {};
    let count = 0;
    
    // Animate placing each tile in the correct position
    function placeNextTile() {
        if (count >= gridSize * gridSize - 1) {
            // All tiles placed
            isSolving = false;
            const solveButton = document.getElementById('solve-puzzle');
            solveButton.textContent = "Solve Puzzle";
            solveButton.disabled = false;
            
            // Update the game state
            tiles = solvedTiles;
            emptyPos = [gridSize-1, gridSize-1]; // Bottom right is empty
            return;
        }
        
        const row = Math.floor(count / gridSize);
        const col = count % gridSize;
        const img = new Image();
        img.src = tileImages[count];
        
        img.onload = () => {
            // Draw this tile in its correct position
            context.drawImage(img, col * tileSize, row * tileSize);
            
            // Store in solved state
            solvedTiles[`${row},${col}`] = count;
            
            // Move to next tile
            count++;
            setTimeout(placeNextTile, 100);
        };
        
        img.onerror = () => {
            // Skip this tile if image fails to load
            count++;
            setTimeout(placeNextTile, 100);
        };
    }
    
    // Start the animation
    placeNextTile();
}
// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Handle tile click
function handleTileClick(event) {
    const canvas = document.getElementById('puzzleCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / tileSize);
    const y = Math.floor((event.clientY - rect.top) / tileSize);
    const clickedPos = `${y},${x}`;
    
    if (tiles[clickedPos] !== undefined && isAdjacent(clickedPos)) {
        moveTile(clickedPos);
    }
}

// Check if position is adjacent to empty space
function isAdjacent(clickedPos) {
    const [y1, x1] = clickedPos.split(",").map(Number);
    const [y2, x2] = emptyPos;
    return (Math.abs(y1 - y2) === 1 && x1 === x2) || (Math.abs(x1 - x2) === 1 && y1 === y2);
}

// Move tile to empty position
function moveTile(clickedPos) {
    const tileIdx = tiles[clickedPos];
    delete tiles[clickedPos];
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    
    // Draw the tile at the empty position
    const img = new Image();
    img.src = tileImages[tileIdx];
    img.onload = () => {
        context.drawImage(img, emptyPos[1] * tileSize, emptyPos[0] * tileSize);
        
        // Update tiles object and empty position
        tiles[`${emptyPos[0]},${emptyPos[1]}`] = tileIdx;
        
        // Clear the previous position (now the new empty spot)
        context.clearRect(
            parseInt(clickedPos.split(',')[1]) * tileSize, 
            parseInt(clickedPos.split(',')[0]) * tileSize, 
            tileSize, 
            tileSize
        );
        
        emptyPos = [parseInt(clickedPos.split(',')[0]), parseInt(clickedPos.split(',')[1])];
    };
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    
    // Setup canvas
    canvas.width = tileSize * gridSize;
    canvas.height = tileSize * gridSize;
    
    // Add event listeners
    canvas.addEventListener('click', handleTileClick);
    document.getElementById('reset-game').addEventListener('click', resetGame);
    
    // Connect the Load Image button to the hidden file input
    document.getElementById('load-image').addEventListener('click', function() {
        document.getElementById('image-upload').click();
    });
    
    // Handle image upload
    document.getElementById('image-upload').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.src = e.target.result;
                img.onload = function() {
                    processUploadedImage(img);
                };
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Initialize with default background
    context = canvas.getContext('2d');
    context.fillStyle = '#cccccc';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '20px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.fillText('Upload an image to start', canvas.width/2, canvas.height/2);
});

// Add these functions to your puzzle.js file

// These variables are already declared above
// let solutionMoves = [];
// let isSolving = false;

// This event listener is already added above
// document.addEventListener('DOMContentLoaded', () => {
//     // Add solve button handler
//     document.getElementById('solve-puzzle').addEventListener('click', solvePuzzle);
// });

// Function to solve the puzzle
function solvePuzzle() {
    if (isSolving) return; // Don't start solving if already in progress
    
    // First check if we have a puzzle loaded
    if (Object.keys(tiles).length === 0) {
        alert("Please load an image first!");
        return;
    }
    
    isSolving = true;
    
    // For simplicity, we'll just reset the puzzle to solved state
    // In a real implementation, you would use A* search or another algorithm
    // to find the optimal solution path from current state
    
    // Store current state
    const currentTiles = {...tiles};
    const currentEmptyPos = [...emptyPos];
    
    // Show solving in progress
    const solveButton = document.getElementById('solve-puzzle');
    solveButton.textContent = "Solving...";
    solveButton.disabled = true;
    
    // Generate a series of moves to solve the puzzle
    generateSolutionMoves(currentTiles, currentEmptyPos);
    
    // Execute the solution moves with animation
    executeSolutionMoves();
}

// Generate moves to solve the puzzle
function generateSolutionMoves(currentTiles, currentEmptyPos) {
    solutionMoves = [];
    
    // For this demo, we'll use a simple approach:
    // Reset to solved state and capture the moves we would make to scramble
    // Then reverse those moves to find our solution
    
    // First, we'll create a solved state
    const solvedState = {};
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            if (index < gridSize * gridSize - 1) {
                solvedState[`${i},${j}`] = index;
            }
        }
    }
    
    // Find some sample moves based on current position of empty space
    // This is a simplified solution - a real implementation would
    // use pathfinding to determine optimal moves
    
    // For demo purposes, we'll make some random legal moves
    // In reality, you would implement A* search or similar
    const [emptyY, emptyX] = currentEmptyPos;
    
    // Try to move each adjacent tile
    const directions = [
        [-1, 0], // Up
        [1, 0],  // Down
        [0, -1], // Left
        [0, 1]   // Right
    ];
    
    // Create 10 sample moves for demonstration
    for (let i = 0; i < 10; i++) {
        // Choose a random direction
        const randomDir = Math.floor(Math.random() * directions.length);
        const [dy, dx] = directions[randomDir];
        const newY = emptyY + dy;
        const newX = emptyX + dx;
        
        // Check if valid move
        if (newY >= 0 && newY < gridSize && newX >= 0 && newX < gridSize) {
            const tilePos = `${newY},${newX}`;
            if (currentTiles[tilePos] !== undefined) {
                solutionMoves.push(tilePos);
                
                // Update tracking variables for next iteration
                const tempTileIdx = currentTiles[tilePos];
                delete currentTiles[tilePos];
                currentTiles[`${emptyY},${emptyX}`] = tempTileIdx;
                currentEmptyPos[0] = newY;
                currentEmptyPos[1] = newX;
            }
        }
    }
    
    // Reverse the moves for solution
    solutionMoves.reverse();
}

// Execute solution moves with animation
function executeSolutionMoves() {
    if (solutionMoves.length === 0) {
        // Finished solving
        isSolving = false;
        const solveButton = document.getElementById('solve-puzzle');
        solveButton.textContent = "Solve Puzzle";
        solveButton.disabled = false;
        return;
    }
    
    const movePos = solutionMoves.shift();
    
    // Use the existing moveTile function with a callback
    const originalMoveTile = moveTile;
    moveTile = function(clickedPos) {
        const tileIdx = tiles[clickedPos];
        delete tiles[clickedPos];
        const canvas = document.getElementById('puzzleCanvas');
        const context = canvas.getContext('2d');
        
        const img = new Image();
        img.src = tileImages[tileIdx];
        img.onload = () => {
            context.drawImage(img, emptyPos[1] * tileSize, emptyPos[0] * tileSize);
            tiles[`${emptyPos[0]},${emptyPos[1]}`] = tileIdx;
            context.clearRect(
                parseInt(clickedPos.split(',')[1]) * tileSize, 
                parseInt(clickedPos.split(',')[0]) * tileSize, 
                tileSize, 
                tileSize
            );
            emptyPos = [parseInt(clickedPos.split(',')[0]), parseInt(clickedPos.split(',')[1])];
            
            // Continue with next move after a delay
            setTimeout(executeSolutionMoves, 300);
        };
    };
    
    // Make the move
    moveTile(movePos);
    
    // Restore original function when done
    if (solutionMoves.length === 0) {
        moveTile = originalMoveTile;
    }
}


// Add these functions to your puzzle.js file

// Array to store solution moves
let solutionMoves = [];
let isSolving = false;

// Add event listener for solve button in the DOMContentLoaded section
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    // Add solve button handler
    document.getElementById('solve-puzzle').addEventListener('click', solvePuzzle);
});

// Function to solve the puzzle
function solvePuzzle() {
    if (isSolving) return; // Don't start solving if already in progress
    
    // First check if we have a puzzle loaded
    if (Object.keys(tiles).length === 0) {
        alert("Please load an image first!");
        return;
    }
    
    isSolving = true;
    
    // Show solving in progress
    const solveButton = document.getElementById('solve-puzzle');
    solveButton.textContent = "Solving...";
    solveButton.disabled = true;
    
    // For this simplified version, we'll just reset to original layout
    resetToSolvedState();
}


// For a more complex implementation, you could add a real solver using A* search
// But this simplified version just resets to the original state with animation


