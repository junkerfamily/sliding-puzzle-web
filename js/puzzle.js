// This file contains the logic for the sliding puzzle game

const tileSize = 100; // Size of each tile in pixels
const gridSize = 4;   // 4x4 grid
let tiles = {};
let emptyPos = [3, 3]; // Initial empty position (bottom-right)
let tileImages = [];
let showNumbers = true;
let originalImage = null; // Store the original image for regenerating tiles
let moveCount = 0; // Track number of moves made
let useTwoEmptyTiles = false;


// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    
    // Set up canvas
    canvas.width = tileSize * gridSize;
    canvas.height = tileSize * gridSize;
    
    // Add event listeners
    canvas.addEventListener('click', handleTileClick);
    document.getElementById('reset-game').addEventListener('click', resetGame);
    document.getElementById('solve-puzzle').addEventListener('click', solvePuzzle);
    
    // Set up checkbox for showing numbers
    const showNumbersCheckbox = document.getElementById('show-numbers');
    showNumbers = showNumbersCheckbox.checked; // Initialize with default value
    
    showNumbersCheckbox.addEventListener('change', function() {
        showNumbers = this.checked;
        console.log("Show numbers changed to:", showNumbers);
        
        // If we have an image loaded, regenerate tiles
        if (originalImage) {
            regenerateTilesWithNumberPreference();
        }
    });
    
    // Set up file upload
    const loadImageButton = document.getElementById('load-image');
    const imageUploadInput = document.getElementById('image-upload');
    
    loadImageButton.addEventListener('click', function() {
        imageUploadInput.click();
    });
    
    imageUploadInput.addEventListener('change', function(event) {
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
    
    // Set up checkbox for two empty tiles
    const twoEmptyTilesCheckbox = document.getElementById('two-empty-tiles');
    useTwoEmptyTiles = twoEmptyTilesCheckbox.checked; // Initialize with default value
    
    twoEmptyTilesCheckbox.addEventListener('change', function() {
        useTwoEmptyTiles = this.checked;
        console.log("Two empty tiles changed to:", useTwoEmptyTiles);
        
        // Reset the game to apply the new setting
        if (originalImage) {
            resetGame();
        }
    });
    
    // Initialize move counter
    updateMoveCounter();
    
    // Initialize with a blank state
    initializeBlankState();
});

// Initialize with a blank state
function initializeBlankState() {
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    context.fillStyle = '#cccccc';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '20px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.fillText('Upload an image to start', canvas.width/2, canvas.height/2);
}

// Process uploaded image
function processUploadedImage(img) {
    // Reset move counter
    moveCount = 0;
    updateMoveCounter();
    
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    
    // Store the original image for later use
    originalImage = img;
    
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image to fit the canvas
    const size = Math.min(img.width, img.height);
    const offsetX = (img.width - size) / 2;
    const offsetY = (img.height - size) / 2;
    
    context.drawImage(
        img, 
        offsetX, offsetY, size, size, // Source rectangle
        0, 0, canvas.width, canvas.height // Destination rectangle
    );
    
    // Split the image into tiles
    createTilesFromCanvas(canvas);
}

// Regenerate tiles with current number preference
function regenerateTilesWithNumberPreference() {
    // Redraw the original image and create new tiles
    if (!originalImage) return;
    
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the original image
    const size = Math.min(originalImage.width, originalImage.height);
    const offsetX = (originalImage.width - size) / 2;
    const offsetY = (originalImage.height - size) / 2;
    
    context.drawImage(
        originalImage, 
        offsetX, offsetY, size, size, // Source rectangle
        0, 0, canvas.width, canvas.height // Destination rectangle
    );
    
    // Store current tile layout and empty position
    const currentTileLayout = {...tiles};
    const currentEmptyPos = [...emptyPos];
    console.log("Current empty position:", currentEmptyPos);
    
    // Create new tiles with current number preference
    // But don't reset the game yet
    tileImages = [];
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tileSize;
    tempCanvas.height = tileSize;
    const tempContext = tempCanvas.getContext('2d');
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const tileIndex = i * gridSize + j;
            
            // Skip the last tile (bottom-right) as it will be empty
            if (tileIndex === gridSize * gridSize - 1) continue;
            
            const x = j * tileSize;
            const y = i * tileSize;
            
            // Clear the temporary canvas
            tempContext.clearRect(0, 0, tileSize, tileSize);
            
            // Draw the portion of the image for this tile
            tempContext.drawImage(canvas, x, y, tileSize, tileSize, 0, 0, tileSize, tileSize);
            
            // Add the number on the tile if showNumbers is true
            if (showNumbers) {
                const tileNumber = tileIndex + 1; // Numbers 1-15
                
                // Add a semi-transparent background for the number
                tempContext.fillStyle = 'rgba(255, 255, 255, 0.7)';
                tempContext.fillRect(5, 5, 30, 30);
                
                // Add the number
                tempContext.font = 'bold 20px Arial';
                tempContext.fillStyle = 'black';
                tempContext.textAlign = 'center';
                tempContext.textBaseline = 'middle';
                tempContext.fillText(tileNumber.toString(), 20, 20);
            }
            
            // Store the tile image
            tileImages.push(tempCanvas.toDataURL());
        }
    }
    
    // Now redraw the tiles in their current positions
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw tiles in their current positions
    tiles = {};
    for (const [position, tileIdx] of Object.entries(currentTileLayout)) {
        const [y, x] = position.split(',').map(Number);
        
        // Skip drawing at the empty position
        if (y === currentEmptyPos[0] && x === currentEmptyPos[1]) {
            continue;
        }
        
        tiles[position] = tileIdx;
        
        const img = new Image();
        img.src = tileImages[tileIdx];
        img.onload = () => {
            context.drawImage(img, x * tileSize, y * tileSize);
        };
    }
    
    // Restore empty position
    emptyPos = currentEmptyPos;
    console.log("Empty position restored to:", emptyPos);
}

// Split image into tiles
function createTilesFromCanvas(canvas) {
    tileImages = []; // Clear previous tiles
    const context = canvas.getContext('2d');
    
    // Create a temporary canvas for preparing tiles
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tileSize;
    tempCanvas.height = tileSize;
    const tempContext = tempCanvas.getContext('2d');
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const tileIndex = i * gridSize + j;
            
            // Skip the last tile (bottom-right) as it will be empty
            if (tileIndex === gridSize * gridSize - 1) continue;
            
            const x = j * tileSize;
            const y = i * tileSize;
            
            // Clear the temporary canvas
            tempContext.clearRect(0, 0, tileSize, tileSize);
            
            // Draw the portion of the image for this tile
            tempContext.drawImage(canvas, x, y, tileSize, tileSize, 0, 0, tileSize, tileSize);
            
            // Add the number on the tile if showNumbers is true
            if (showNumbers) {
                const tileNumber = tileIndex + 1; // Numbers 1-15
                
                // Add a semi-transparent background for the number
                tempContext.fillStyle = 'rgba(255, 255, 255, 0.7)';
                tempContext.fillRect(5, 5, 30, 30);
                
                // Add the number
                tempContext.font = 'bold 20px Arial';
                tempContext.fillStyle = 'black';
                tempContext.textAlign = 'center';
                tempContext.textBaseline = 'middle';
                tempContext.fillText(tileNumber.toString(), 20, 20);
            }
            
            // Store the tile image
            tileImages.push(tempCanvas.toDataURL());
        }
    }
    
    resetGame();
}

// Reset game
// Update the resetGame function to handle two empty tiles
function resetGame() {
    // Reset move counter
    moveCount = 0;
    updateMoveCounter();
    
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
    
    // Set number of empty tiles based on checkbox
    const emptyTileCount = useTwoEmptyTiles ? 2 : 1;
    
    // Store empty positions
    emptyPos = positions[positions.length - 1]; // First empty position
    let secondEmptyPos = useTwoEmptyTiles ? positions[positions.length - 2] : null; // Second empty position (if needed)
    
    // Draw all tiles except the empty ones
    for (let idx = 0; idx < positions.length - emptyTileCount; idx++) {
        const pos = positions[idx];
        const [i, j] = pos;
        const key = `${i},${j}`;
        
        // Store tile position and draw it
        tiles[key] = idx;
        
        const img = new Image();
        img.src = tileImages[idx];
        img.onload = () => {
            context.drawImage(img, j * tileSize, i * tileSize);
        };
    }
    
    // If using two empty tiles, store the second one
    if (useTwoEmptyTiles && secondEmptyPos) {
        // Add a property to track the second empty position
        tiles.secondEmptyPos = secondEmptyPos;
    }
}


// Update move counter display
function updateMoveCounter() {
    document.getElementById('move-counter').textContent = `Moves: ${moveCount}`;
}

// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Handle tile click
// Update handleTileClick to support two empty tiles
function handleTileClick(event) {
    const canvas = document.getElementById('puzzleCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / tileSize);
    const y = Math.floor((event.clientY - rect.top) / tileSize);
    const clickedPos = `${y},${x}`;
    
    // Check if adjacent to either empty position
    if (tiles[clickedPos] !== undefined && 
        (isAdjacent(clickedPos, emptyPos) || 
         (useTwoEmptyTiles && tiles.secondEmptyPos && isAdjacent(clickedPos, tiles.secondEmptyPos)))) {
        
        // Determine which empty position we're moving to
        let targetEmptyPos = emptyPos;
        if (useTwoEmptyTiles && tiles.secondEmptyPos && isAdjacent(clickedPos, tiles.secondEmptyPos)) {
            targetEmptyPos = tiles.secondEmptyPos;
        }
        
        moveTile(clickedPos, targetEmptyPos);
    }
}



// Check if position is adjacent to empty space
// Update isAdjacent to accept a specific empty position
function isAdjacent(clickedPos, emptyPosition) {
    const [y1, x1] = clickedPos.split(",").map(Number);
    const [y2, x2] = emptyPosition;
    return (Math.abs(y1 - y2) === 1 && x1 === x2) || (Math.abs(x1 - x2) === 1 && y1 === y2);
}

// Update moveTile to accept a specific target empty position
function moveTile(clickedPos, targetEmptyPos) {
    const tileIdx = tiles[clickedPos];
    delete tiles[clickedPos];
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    
    // Draw the tile at the empty position
    const img = new Image();
    img.src = tileImages[tileIdx];
    img.onload = () => {
        // Draw the tile in its new position
        context.drawImage(img, targetEmptyPos[1] * tileSize, targetEmptyPos[0] * tileSize);
        
        // Update tiles object
        tiles[`${targetEmptyPos[0]},${targetEmptyPos[1]}`] = tileIdx;
        
        // Clear the previous position (now the new empty spot)
        context.clearRect(
            parseInt(clickedPos.split(',')[1]) * tileSize, 
            parseInt(clickedPos.split(',')[0]) * tileSize, 
            tileSize, 
            tileSize
        );
        
        // If we moved to the second empty position, update it
        if (useTwoEmptyTiles && tiles.secondEmptyPos && 
            targetEmptyPos[0] === tiles.secondEmptyPos[0] && targetEmptyPos[1] === tiles.secondEmptyPos[1]) {
            tiles.secondEmptyPos = [parseInt(clickedPos.split(',')[0]), parseInt(clickedPos.split(',')[1])];
        } else {
            // Otherwise update the main empty position
            emptyPos = [parseInt(clickedPos.split(',')[0]), parseInt(clickedPos.split(',')[1])];
        }
        
        // Increment move counter and update display
        moveCount++;
        updateMoveCounter();
    };
}

// Function to solve the puzzle
function solvePuzzle() {
    // Reset move counter
    moveCount = 0;
    updateMoveCounter();
    
    if (!originalImage) {
        alert("Please load an image first!");
        return;
    }
    
    resetToSolvedState();
}

// Reset to solved state
function resetToSolvedState() {
    // Clear the canvas
    const canvas = document.getElementById('puzzleCanvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a solved state
    const solvedTiles = {};
    
    // Determine how many tiles to skip (empty positions)
    const emptyTileCount = useTwoEmptyTiles ? 2 : 1;
    
    // Place tiles in order
    let tileIdx = 0;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            // Skip if we've placed enough tiles
            if (tileIdx >= gridSize * gridSize - emptyTileCount) {
                continue;
            }
            
            const key = `${i},${j}`;
            solvedTiles[key] = tileIdx;
            
            // Draw the tile
            const img = new Image();
            img.src = tileImages[tileIdx];
            img.onload = () => {
                context.drawImage(img, j * tileSize, i * tileSize);
            };
            
            tileIdx++;
        }
    }
    
    // Update game state
    tiles = solvedTiles;
    
    // Set empty positions - bottom right corner(s)
    if (useTwoEmptyTiles) {
        emptyPos = [gridSize-1, gridSize-1]; // Bottom right
        tiles.secondEmptyPos = [gridSize-1, gridSize-2]; // Next to bottom right
    } else {
        emptyPos = [gridSize-1, gridSize-1]; // Just bottom right
    }
}
