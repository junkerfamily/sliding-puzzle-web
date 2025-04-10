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
// Initialize Firebase auth and get user
let currentUser = null;
let authInitialized = false;
// Add a fallback mode flag
let usingLocalStorage = false;
let movesWithNumbers = 0;
let lastMoveHadNumbers = true; // Assuming numbers are on by defaul


document.addEventListener('DOMContentLoaded', () => {
    
    // Modal debugging - without redeclaring variables
    const historyModal = document.getElementById('history-modal');
    const closeBtn = historyModal.querySelector('.close');

    // Make sure we have the history button
    if (document.getElementById('show-history')) {
        document.getElementById('show-history').addEventListener('click', function() {
            console.log("🖱️ History button clicked");
            displayHistory();
            console.log("📊 Modal should be displayed now");
        });
    }

    // Add close button listener if not already present
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log("❌ Close button clicked");
            historyModal.style.display = 'none';
        });
    }

    // Close when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === historyModal) {
            console.log("❌ Clicked outside modal, closing");
            historyModal.style.display = 'none';
        }
    });

    // Add event listener for clear history button
    const clearHistoryButton = document.getElementById('clear-history');
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', function(event) {
            // Prevent event bubbling to avoid closing the modal
            event.stopPropagation();
            clearUserHistory();
        });
    }
    

    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    
    // Set up canvas
    canvas.width = tileSize * gridSize;
    canvas.height = tileSize * gridSize;
    
    // Add event listeners for game controls
    canvas.addEventListener('click', handleTileClick);
    document.getElementById('reset-game').addEventListener('click', resetGame);
    document.getElementById('solve-puzzle').addEventListener('click', solvePuzzle);
    
    // Set up checkbox for showing numbers
    const showNumbersCheckbox = document.getElementById('show-numbers');
    showNumbers = showNumbersCheckbox.checked; // Initialize with default value
    
    showNumbersCheckbox.addEventListener('change', function() {
        showNumbers = this.checked;
        lastMoveHadNumbers = showNumbers;
        console.log("Show numbers changed to:", showNumbers);
        
        // Save settings based on storage mode
        if (usingLocalStorage) {
            saveLocalSettings();
        } else {
            saveUserSettings();
        }

        // Redraw tiles without resetting the game
        redrawTilesWithCurrentSettings();

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
       
        console.log("Two empty tiles changed to:", useTwoEmptyTiles);
        
        if (moveCount > 0) {
            // Ask for confirmation
            const confirmed = confirm("Changing this setting will reset your current puzzle and move count. Continue?");
            
            if (!confirmed) {
                // If user cancels, revert the checkbox to its previous state
                this.checked = !this.checked;
                return;
            }
        }
        
        // User either confirmed or there was no puzzle in progress
        useTwoEmptyTiles = this.checked;
        
        // Save settings based on storage mode
        if (usingLocalStorage) {
            saveLocalSettings();
        } else {
            saveUserSettings();
        }
        // Reset the game with the new setting
        resetGame();
        
    });
    
    // Set up history button if it exists
    const historyButton = document.getElementById('show-history').addEventListener('click', function() {
        console.log("🖱️ History button clicked");
        displayHistory(); // Changed from displayUserHistory()
        console.log("📊 Modal should be displayed now");
    });

    // Set up modal close buttons if they exist
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Initialize move counter
    updateMoveCounter();
    
    // Initialize Firebase first

    console.log("Attempting to initialize Firebase...");
    initializeFirebase()
    .then(() => {
        console.log("Firebase initialized successfully with user:", currentUser.uid);
    })
    .catch((error) => {
        console.error("Failed to initialize Firebase:", error);
        usingLocalStorage = true;
        console.log("Falling back to localStorage mode");
        authInitialized = true;
        loadLocalSettings();
    });

   
    // Initialize with a blank state
    initializeBlankState();
    
    // Close modals when clicking outside of content
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Add beforeunload event to save state when user leaves
    window.addEventListener('beforeunload', function() {
        if (originalImage) {
            if (usingLocalStorage) {
                saveLocalSettings();
            } else if (currentUser) {
                saveUserSettings();
            }
        }
    });
    
    console.log("Game initialization complete. Using " + 
        (usingLocalStorage ? "localStorage for persistence" : "Firebase for cloud storage"));
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
    movesWithNumbers = 0; // Add this line
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

// Replace regenerateTilesWithNumberPreference() with this:
function regenerateTilesWithNumberPreference() {
    renderTiles({
        regenerateImages: true,
        preserveLayout: true,
        logDetails: true
    });
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
    movesWithNumbers = 0; // Add this line to reset the counter
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
    let secondEmptyPos = null;

    if (useTwoEmptyTiles) {
        secondEmptyPos = positions[positions.length - 2]; // Second empty position
        tiles.secondEmptyPos = secondEmptyPos; // Store in tiles object for tracking
    }

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

// Update the moveTile function to check for solution after move
// Enhanced moveTile function with completion detection
// Update the moveTile function to better track and log movesWithNumbers
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
        
        // Increment move counter
        moveCount++;
        
        // Track moves with numbers shown - add logging for debugging
        const numbersBefore = movesWithNumbers;
        if (showNumbers) {
            movesWithNumbers++;
            console.log(`✅ Numbers shown - incrementing movesWithNumbers: ${numbersBefore} -> ${movesWithNumbers}`);
        } else {
            console.log(`ℹ️ Numbers hidden - not incrementing movesWithNumbers: ${movesWithNumbers}`);
        }
        
        // Remember the state for the last move
        lastMoveHadNumbers = showNumbers;
        
        updateMoveCounter();
        drawTiles();
        
        // Check if puzzle is solved
        const solved = isSolved();
        console.log("🧩 Checking if puzzle is solved:", solved ? "YES!" : "No");
        
        if (solved) {
            // Log current state before saving
            console.log(`🎮 Puzzle solved: Total moves: ${moveCount}, Moves with numbers: ${movesWithNumbers}`);
            
            // Wait a brief moment for the UI to update before showing completion
            setTimeout(() => {
                alert(`Congratulations! You solved the puzzle in ${moveCount} moves!`);
                console.log("🎮 Puzzle solved naturally in", moveCount, "moves");
                console.log("🔢 With", movesWithNumbers, "moves showing numbers");
                saveGameCompletion();
            }, 100);
        }
    };
}




// Function to solve the puzzle
// Update the solvePuzzle function to save completion
// Function to solve the puzzle
function solvePuzzle() {
    // Save original movesWithNumbers count before resetting
    const originalMovesWithNumbers = movesWithNumbers;
    
    // Reset move counter
    moveCount = 0;
    
    // Preserve existing movesWithNumbers instead of resetting it
    // Only add 1 to the count if numbers are shown during auto-solve
    movesWithNumbers = originalMovesWithNumbers + (showNumbers ? 1 : 0);
    
    updateMoveCounter();
    
    if (!originalImage) {
        alert("Please load an image first!");
        return;
    }
    
    resetToSolvedState();
    
    // Save this completion to history WITH the autoSolved flag
    saveGameCompletion(true); // Pass true to indicate auto-solve
    
    // Show feedback
    alert("Puzzle solved automatically!");
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

// Modify the initializeFirebase function
function initializeFirebase() {
    console.log("Initializing Firebase authentication...");
    
    return new Promise((resolve, reject) => {
        // Check if already signed in
        if (firebase.auth().currentUser) {
            console.log("Already signed in:", firebase.auth().currentUser.uid);
            currentUser = firebase.auth().currentUser;
            resolve(currentUser);
            return;
        }
        
        firebase.auth().signInAnonymously()
            .then((userCredential) => {
                console.log("Anonymous authentication successful");
                currentUser = userCredential.user;
                console.log("User ID:", currentUser.uid);
                resolve(currentUser);
            })
            .catch((error) => {
                console.error("Authentication error:", error);
                reject(error);
            });
    });
}


  // Save game settings to Firestore
  function saveUserSettings() {
    if (!currentUser) return;
    
    firebase.firestore().collection('userSettings').doc(currentUser.uid).set({
      showNumbers: showNumbers,
      useTwoEmptyTiles: useTwoEmptyTiles,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => console.log("Settings saved"))
    .catch((error) => console.error("Error saving settings:", error));
  }
  
  // Load user settings from Firestore
  function loadUserData() {
    if (!currentUser) return;
    
    firebase.firestore().collection('userSettings').doc(currentUser.uid).get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          // Apply settings
          showNumbers = data.showNumbers;
          useTwoEmptyTiles = data.useTwoEmptyTiles;
          
          // Update UI to reflect loaded settings
          document.getElementById('show-numbers').checked = showNumbers;
          document.getElementById('two-empty-tiles').checked = useTwoEmptyTiles;
          
          console.log("User settings loaded");
        }
      })
      .catch((error) => console.error("Error loading settings:", error));
  }

  
// Add this function to puzzle.js
// Enhanced isSolved function with better logging
function isSolved() {
    console.log("🔍 Checking if puzzle is solved...");
    console.log("Current tiles state:", tiles);
    
    // For a 4x4 puzzle, check if all tiles are in order
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            // Skip checking the empty position(s)
            if (i === gridSize-1 && j === gridSize-1) {
                continue;
            }
            
            if (useTwoEmptyTiles && i === gridSize-1 && j === gridSize-2) {
                continue;
            }
            
            const position = `${i},${j}`;
            const expectedTileIdx = i * gridSize + j;
            
            // If any tile is out of place, puzzle is not solved
            if (tiles[position] !== expectedTileIdx) {
                console.log(`❌ Tile at ${position} is ${tiles[position]}, expected ${expectedTileIdx}`);
                return false;
            }
        }
    }
    
    console.log("✅ All tiles are in correct positions!");
    return true;
}


// Fallback function to save game data without image
// Simplified fallback function without imageId
function saveGameDataWithoutImage() {
    console.log("Saving game data without image...");
    
    firebase.firestore().collection('gameHistory').add({
        userId: currentUser.uid,
        showNumbers: showNumbers,
        twoEmptyTiles: useTwoEmptyTiles,
        moves: moveCount,
        date: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log("Game data saved without image");
    })
    .catch((error) => {
        console.error("Complete failure saving game data:", error);
    });
}


// Function to save settings to localStorage
function saveLocalSettings() {
    if (!usingLocalStorage) return;
    
    localStorage.setItem('puzzleSettings', JSON.stringify({
        showNumbers: showNumbers,
        useTwoEmptyTiles: useTwoEmptyTiles
    }));
}

// Function to load settings from localStorage
function loadLocalSettings() {
    if (!usingLocalStorage) return;
    
    const savedSettings = localStorage.getItem('puzzleSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            showNumbers = settings.showNumbers;
            useTwoEmptyTiles = settings.useTwoEmptyTiles;
            
            // Update UI
            document.getElementById('show-numbers').checked = showNumbers;
            document.getElementById('two-empty-tiles').checked = useTwoEmptyTiles;
        } catch (e) {
            console.error("Error parsing local settings:", e);
        }
    }
}

// Function to save game completion locally
function saveLocalGameCompletion() {
    if (!usingLocalStorage || !originalImage) return;
    
    // Get existing history or create new array
    let history = [];
    try {
        const savedHistory = localStorage.getItem('puzzleHistory');
        if (savedHistory) {
            history = JSON.parse(savedHistory);
        }
    } catch (e) {
        console.error("Error parsing local history:", e);
    }
    
    // Add new completion to history
    history.unshift({
        date: new Date().toISOString(),
        showNumbers: showNumbers,
        twoEmptyTiles: useTwoEmptyTiles,
        moves: moveCount
    });
    
    // Limit history to 10 items
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    
    // Save back to localStorage
    localStorage.setItem('puzzleHistory', JSON.stringify(history));
}



// Separate function for image upload
function saveImageThumbnail(imageId) {
    console.log("🖼️ Attempting to save image thumbnail for imageId:", imageId);
    
    // First, save the thumbnail image to Storage
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    try {
        // Scale the image to fit the thumbnail
        const size = Math.min(originalImage.width, originalImage.height);
        const offsetX = (originalImage.width - size) / 2;
        const offsetY = (originalImage.height - size) / 2;
        
        ctx.drawImage(
            originalImage, 
            offsetX, offsetY, size, size,
            0, 0, 100, 100
        );
        
        console.log("📏 Canvas prepared successfully");
        
        // Convert to blob
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error("❌ Failed to convert canvas to blob");
                return;
            }
            
            console.log("📦 Blob created, size:", Math.round(blob.size/1024), "KB");
            
            // Upload thumbnail to Firebase Storage
            const storageRef = firebase.storage().ref();
            const imageRef = storageRef.child(`thumbnails/${currentUser.uid}/${imageId}.jpg`);
            
            console.log("📤 Starting image upload to path:", `thumbnails/${currentUser.uid}/${imageId}.jpg`);
            
            imageRef.put(blob).then((snapshot) => {
                console.log("📤 Image uploaded successfully");
                return snapshot.ref.getDownloadURL();
            })
            .then((downloadURL) => {
                console.log("🔗 Got download URL:", downloadURL.substring(0, 50) + "...");
                
                // Update the existing document with the image URL
                return firebase.firestore().collection('gameHistory')
                    .where('userId', '==', currentUser.uid)
                    .where('imageId', '==', imageId)
                    .get()
                    .then((querySnapshot) => {
                        if (!querySnapshot.empty) {
                            // Update the first matching document
                            return querySnapshot.docs[0].ref.update({
                                imageUrl: downloadURL
                            });
                        }
                    });
            })
            .then(() => {
                console.log("🎉 Image URL added to history document");
                forceRefreshHistory(); // Add this line to refresh the history display
            })
            .catch((error) => {
                console.error("❌ Error in Firebase Storage:", error);
            });
        }, 'image/jpeg', 0.8);
    } catch (e) {
        console.error("❌ Error preparing canvas:", e);
    }
}

// Force refresh history after image upload completes
function forceRefreshHistory() {
    // Check if the modal is visible and refresh if it is
    const historyModal = document.getElementById('history-modal');
    if (historyModal && historyModal.style.display === 'block') {
      console.log("🔄 Forcing history refresh to show new thumbnails");
      displayHistory();
    }
  }

  // Single implementation of saveGameCompletion
  function saveGameCompletion(autoSolved = false) {
    console.log("🔍 Saving game completion, auto-solved:", autoSolved);
    
    if (usingLocalStorage) {
        console.log("Using localStorage mode");
        saveLocalGameCompletion();
        return;
    }
    
    if (!currentUser || !originalImage) {
        console.error("Cannot save: No user or image");
        return;
    }
    
    try {
        // Create a thumbnail (small) version
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = 50;
        thumbnailCanvas.height = 50;
        const thumbCtx = thumbnailCanvas.getContext('2d');
        
        // Create a larger version for viewing
        const largeCanvas = document.createElement('canvas');
        largeCanvas.width = 300;
        largeCanvas.height = 300;
        const largeCtx = largeCanvas.getContext('2d');
        
        const size = Math.min(originalImage.width, originalImage.height);
        const offsetX = (originalImage.width - size) / 2;
        const offsetY = (originalImage.height - size) / 2;
        
        // Draw thumbnail
        thumbCtx.drawImage(
            originalImage,
            offsetX, offsetY, size, size,
            0, 0, 50, 50
        );
        
        // Draw large image
        largeCtx.drawImage(
            originalImage,
            offsetX, offsetY, size, size,
            0, 0, 300, 300
        );
        
        // Keep both as data URLs - the original working approach
        const thumbnailDataUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.5);
        const largeImageDataUrl = largeCanvas.toDataURL('image/jpeg', 0.8);
        
        console.log("Saving to Firestore with thumbnailDataUrl and largeImageDataUrl");
        
        // Save to Firestore with both as data URLs
        firebase.firestore().collection('gameHistory').add({
            userId: currentUser.uid,
            thumbnailDataUrl: thumbnailDataUrl,
            largeImageDataUrl: largeImageDataUrl,
            showNumbers: showNumbers,
            twoEmptyTiles: useTwoEmptyTiles,
            moves: moveCount,
            movesWithNumbers: movesWithNumbers || 0,
            autoSolved: autoSolved,
            date: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            console.log("✅ Game completion saved successfully");
            forceRefreshHistory();
        })
        .catch((error) => {
            console.error("Error saving to Firestore:", error);
            saveGameDataWithoutImage();
        });
        
    } catch (e) {
        console.error("Error during image creation:", e);
        saveGameDataWithoutImage();
    }
}

// Add this fallback function for data URL storage
function saveGameCompletionWithDataUrl(thumbnailDataUrl, largeCanvas, autoSolved) {
    console.log("⚠️ Falling back to data URL storage for large image");
    
    const largeImageDataUrl = largeCanvas.toDataURL('image/jpeg', 0.8);
    
    firebase.firestore().collection('gameHistory').add({
        userId: currentUser.uid,
        thumbnailDataUrl: thumbnailDataUrl,
        largeImageDataUrl: largeImageDataUrl, // Use data URL as fallback
        showNumbers: showNumbers,
        twoEmptyTiles: useTwoEmptyTiles,
        moves: moveCount,
        movesWithNumbers: movesWithNumbers,
        autoSolved: autoSolved,
        date: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log("✅ Game completion saved with data URL fallback");
        forceRefreshHistory();
    })
    .catch((error) => {
        console.error("Error saving to Firestore:", error);
        saveGameDataWithoutImage();
    });
}

// Function to show the image viewer
// Function to show the image viewer
// In your showImageViewer function, update the details template
function showImageViewer(historyData) {
    console.log("Opening image viewer with data:", historyData);
    
    console.log("HISTORY DATA FULL DUMP:", historyData);
    console.log("Has movesWithNumbers?", historyData.movesWithNumbers !== undefined);
    console.log("Value:", historyData.movesWithNumbers);
    console.log("Auto solved?", historyData.autoSolved);
    
    
    const viewerModal = document.getElementById('image-viewer-modal');
    const fullSizeImage = document.getElementById('full-size-image');
    const viewerTitle = document.getElementById('image-viewer-title');
    const viewerDetails = document.getElementById('image-viewer-details');

    
    if (!viewerModal || !fullSizeImage) {
        console.error("Image viewer elements not found");
        return;
    }
    
    // Set the image source
    // Set the image source - check for both URL types
    if (historyData.largeImageUrl) {
        fullSizeImage.src = historyData.largeImageUrl;
    } else if (historyData.largeImageDataUrl) {
        fullSizeImage.src = historyData.largeImageDataUrl;
    } else {
        console.error("No large image available");
        return;
    }
    
    // Set the title and details
    let dateStr = 'Unknown date';
    try {
        dateStr = new Date(historyData.date.toDate()).toLocaleString();
    } catch (e) {
        console.error("Date parsing error:", e);
    }
    
    viewerTitle.textContent = `Completed Puzzle`;
    
    // Calculate percentage of moves with numbers if available (for manual solves)
    let numberMovesInfo = '';
    if (!historyData.autoSolved && historyData.movesWithNumbers !== undefined && historyData.moves > 0) {
        // Only calculate percentage for manually solved puzzles with valid move counts
        const percent = Math.round((historyData.movesWithNumbers / historyData.moves) * 100);
        numberMovesInfo = `
            <p><strong>Moves with Numbers:</strong> ${historyData.movesWithNumbers} (${percent}% of total)</p>
        `;
    } else if (historyData.autoSolved && historyData.movesWithNumbers > 0) {
        // For auto-solved puzzles, just show the count without percentage
        numberMovesInfo = `
            <p><strong>Moves with Numbers:</strong> ${historyData.movesWithNumbers}</p>
        `;
    }

    // Use consistent format with completion method highlighted
    viewerDetails.innerHTML = `
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Settings:</strong> ${historyData.showNumbers ? 'Numbers' : 'No Numbers'}, 
                                     ${historyData.twoEmptyTiles ? '2' : '1'} empty tiles</p>
        <p><strong>Completion:</strong> ${historyData.autoSolved ? 
            '<span style="color: #4a86e8;">Auto-Solved</span>' : 
            `Solved in ${historyData.moves} moves`}
        </p>
        ${numberMovesInfo}
    `;
    
    // Show the modal
    viewerModal.style.display = 'block';
    
    // Close button functionality
    const closeBtn = viewerModal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            viewerModal.style.display = 'none';
        };
    }
}


// Function to clear user history
function clearUserHistory() {
    if (!currentUser) {
        console.error("Cannot clear history: No user authenticated");
        return;
    }
    
    // Show confirmation dialog
    if (!confirm("Are you sure you want to delete all your puzzle history? This cannot be undone.")) {
        return; // User cancelled
    }
    
    console.log("🗑️ Clearing history for user:", currentUser.uid);
    
    // Get all history entries for this user
    firebase.firestore().collection('gameHistory')
        .where('userId', '==', currentUser.uid)
        .get()
        .then((querySnapshot) => {
            // Create a batch to delete all documents
            const batch = firebase.firestore().batch();
            
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            // Commit the batch
            return batch.commit();
        })
        .then(() => {
            console.log("✅ History cleared successfully");
            // Refresh the history display
            const historyData = document.getElementById('history-data');
            historyData.innerHTML = '<tr><td colspan="4">No puzzle history yet! Complete a puzzle to see your history.</td></tr>';
            
            // Show confirmation to user
            alert("Your puzzle history has been cleared.");
        })
        .catch((error) => {
            console.error("❌ Error clearing history:", error);
            alert("Failed to clear history: " + error.message);
        });
}

// Replace redrawTilesWithCurrentSettings() with this:
function redrawTilesWithCurrentSettings() {
    renderTiles({
        regenerateImages: true,
        preserveLayout: true
    });
}


function updateMoveCounter() {
    const counter = document.getElementById('move-counter');
    counter.textContent = `Moves: ${moveCount}`;
    
    // Add tooltip with additional info
    if (moveCount > 0) {
        const percentWithNumbers = Math.round((movesWithNumbers / moveCount) * 100);
        counter.title = `${movesWithNumbers} moves (${percentWithNumbers}%) with numbers shown`;
    } else {
        counter.title = '';
    }
}

// Add this function after updateMoveCounter

// Replace drawTiles() with this:
function drawTiles() {
    renderTiles({
        regenerateImages: false,
        preserveLayout: true
    });
}


/**
 * Unified function to handle tile drawing with different options
 * @param {Object} options Configuration options
 * @param {boolean} options.regenerateImages Whether to regenerate tile images (default: false)
 * @param {boolean} options.preserveLayout Whether to preserve current tile layout (default: true)
 * @param {boolean} options.logDetails Whether to log detailed information (default: false)
 */
function renderTiles(options = {}) {
    // Default options
    const config = {
        regenerateImages: false,
        preserveLayout: true,
        logDetails: false,
        ...options
    };
    
    if (config.logDetails) {
        console.log(`🧩 Rendering tiles with options:`, config);
    }
    
    // Exit early if no image or tiles
    if (!originalImage && config.regenerateImages) {
        console.log("No image to render");
        return;
    }
    
    if (!tileImages.length && !config.regenerateImages) {
        console.log("No tile images to draw");
        return;
    }
    
    const canvas = document.getElementById('puzzleCanvas');
    const ctx = canvas.getContext('2d');
    
    // Keep track of original tile positions if preserving layout
    const originalTileState = config.preserveLayout ? {...tiles} : {};
    const originalEmptyPos = config.preserveLayout ? [...emptyPos] : null;
    const originalSecondEmptyPos = config.preserveLayout && useTwoEmptyTiles && tiles.secondEmptyPos 
        ? [...tiles.secondEmptyPos] : null;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Regenerate tile images if needed
    if (config.regenerateImages) {
        tileImages = [];
        
        // Draw the full image to a temporary canvas
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = tileSize * gridSize;
        fullCanvas.height = tileSize * gridSize;
        const fullContext = fullCanvas.getContext('2d');
        
        // Calculate scaling to maintain aspect ratio
        const imageAspect = originalImage.width / originalImage.height;
        const canvasAspect = fullCanvas.width / fullCanvas.height;
        
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        if (imageAspect > canvasAspect) {
            // Image is wider
            drawHeight = fullCanvas.height;
            drawWidth = originalImage.width * (fullCanvas.height / originalImage.height);
            offsetX = (fullCanvas.width - drawWidth) / 2;
        } else {
            // Image is taller
            drawWidth = fullCanvas.width;
            drawHeight = originalImage.height * (fullCanvas.width / originalImage.width);
            offsetY = (fullCanvas.height - drawHeight) / 2;
        }
        
        // Draw the original image
        fullContext.drawImage(originalImage, offsetX, offsetY, drawWidth, drawHeight);
        
        // Create a temporary canvas for individual tiles
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tileSize;
        tempCanvas.height = tileSize;
        const tempContext = tempCanvas.getContext('2d');
        
        // Create tile images from the full canvas
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const tileIndex = i * gridSize + j;
                
                // Skip the last tile for a standard puzzle
                if (tileIndex === gridSize * gridSize - 1) continue;
                
                // Clear the temporary canvas
                tempContext.clearRect(0, 0, tileSize, tileSize);
                
                // Draw the portion of the image for this tile
                tempContext.drawImage(
                    fullCanvas, 
                    j * tileSize, i * tileSize, 
                    tileSize, tileSize, 
                    0, 0, tileSize, tileSize
                );
                
                // Add number if showNumbers is true
                if (showNumbers) {
                    const tileNumber = tileIndex + 1;
                    tempContext.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    tempContext.fillRect(5, 5, 30, 30);
                    tempContext.fillStyle = 'black';
                    tempContext.font = 'bold 16px Arial';
                    tempContext.textAlign = 'center';
                    tempContext.textBaseline = 'middle';
                    tempContext.fillText(tileNumber.toString(), 15, 15);
                }
                
                // Store the tile image
                tileImages.push(tempCanvas.toDataURL());
            }
        }
        
        if (config.logDetails) {
            console.log(`🧩 Generated ${tileImages.length} tile images`);
        }
    }
    
    // Restore the original game state if needed
    if (config.preserveLayout) {
        tiles = originalTileState;
        emptyPos = originalEmptyPos;
        if (originalSecondEmptyPos) {
            tiles.secondEmptyPos = originalSecondEmptyPos;
        }
    }
    
    // Draw each tile at its current position
    for (const [position, tileIdx] of Object.entries(tiles)) {
        // Skip the second empty position if present
        if (position === 'secondEmptyPos') continue;
        
        const [row, col] = position.split(',').map(Number);
        
        // Skip empty positions
        if (row === emptyPos[0] && col === emptyPos[1]) continue;
        if (useTwoEmptyTiles && 
            tiles.secondEmptyPos && 
            row === tiles.secondEmptyPos[0] && 
            col === tiles.secondEmptyPos[1]) continue;
        
        // Draw the tile at the correct position
        const img = new Image();
        img.src = tileImages[tileIdx];
        img.onload = () => {
            ctx.drawImage(img, col * tileSize, row * tileSize);
        };
    }
    
    if (config.logDetails) {
        console.log(`✅ Tiles rendered successfully`);
    }
}

/**
 * Unified function to load and display user history
 * @param {boolean} forceRefresh Whether to force-refresh data
 */
function displayHistory(forceRefresh = false) {
    console.log("📜 Loading and displaying user history...");
    
    const historyModal = document.getElementById('history-modal');
    const historyData = document.getElementById('history-data');
    
    if (!historyModal || !historyData) {
        console.error("❌ History modal elements not found");
        return;
    }
    
    // Show the modal
    historyModal.style.display = 'block';
    historyData.innerHTML = '<tr><td colspan="4">Loading history...</td></tr>';
    
    // Branch based on storage mode
    if (usingLocalStorage) {
        displayHistoryFromLocalStorage(historyData);
    } else {
        displayHistoryFromFirebase(historyData, forceRefresh);
    }
}

/**
 * Display history from Firebase
 * @param {HTMLElement} historyData - The element to populate with history
 * @param {boolean} forceRefresh - Whether to force a refresh from the source
 */
function displayHistoryFromFirebase(historyData, forceRefresh = false) {
    if (!currentUser) {
        console.error("❌ No user authenticated");
        historyData.innerHTML = '<tr><td colspan="4">Please wait, connecting to database...</td></tr>';
        return;
    }
    
    console.log("🔍 Loading history for user:", currentUser.uid);
    
    firebase.firestore().collection('gameHistory')
        .where('userId', '==', currentUser.uid)
        .orderBy('date', 'desc')
        .limit(10)
        .get()
        .then((querySnapshot) => {
            console.log("📊 History query completed, entries found:", querySnapshot.size);
            
            historyData.innerHTML = '';
            
            if (querySnapshot.empty) {
                historyData.innerHTML = '<tr><td colspan="4">No puzzle history yet! Complete a puzzle to see your history.</td></tr>';
                return;
            }
            
            // Process each history entry
            querySnapshot.forEach((doc) => {
                try {
                    console.log("📋 Processing history entry:", doc.id);
                    const data = doc.data();
                    
                    // Create row FIRST
                    const row = document.createElement('tr');
                    
                    // THEN add click event
                    row.style.cursor = 'pointer';
                    row.classList.add('clickable-row');
                    row.addEventListener('click', function() {
                        // Fix: Check for either storage method
                        if (data.largeImageUrl || data.largeImageDataUrl) {
                            showImageViewer(data);
                        } else {
                            console.log("No large image available for this entry");
                        }
                    });
                    
                    // Create thumbnail cell
                    const thumbnailCell = document.createElement('td');
                    const thumbnail = document.createElement('img');
                    
                    if (data.thumbnailDataUrl) {
                        thumbnail.src = data.thumbnailDataUrl;
                    } else {
                        thumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ij48L2NpcmNsZT48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIj48L3BvbHlsaW5lPjwvc3ZnPg==';
                    }
                    
                    thumbnail.width = 50;
                    thumbnail.height = 50;
                    thumbnail.style.objectFit = 'cover';
                    thumbnailCell.appendChild(thumbnail);
                    
                    // Create date cell
                    const dateCell = document.createElement('td');
                    if (data.date) {
                        try {
                            dateCell.textContent = new Date(data.date.toDate()).toLocaleDateString();
                        } catch (e) {
                            dateCell.textContent = 'Unknown date';
                        }
                    } else {
                        dateCell.textContent = 'Unknown date';
                    }
                    
                    // Create settings cell
                    const settingsCell = document.createElement('td');
                    settingsCell.textContent = `${data.showNumbers ? 'Numbers' : 'No Numbers'}, ${data.twoEmptyTiles ? '2' : '1'} empty`;
                    
                    // Create moves cell
                    const movesCell = document.createElement('td');
                    if (data.autoSolved) {
                        movesCell.innerHTML = '<span style="color: #4a86e8;">Auto-Mode</span>';
                    } else {
                        movesCell.textContent = data.moves || 'Unknown';
                    }
                    
                    // Add cells to row
                    row.appendChild(thumbnailCell);
                    row.appendChild(dateCell);
                    row.appendChild(settingsCell);
                    row.appendChild(movesCell);
                    
                    // Add row to table
                    historyData.appendChild(row);
                } catch (e) {
                    console.error("❌ Error processing history entry:", doc.id, e);
                }
            });
        })
        .catch((error) => {
            console.error("❌ Error fetching history:", error);
            historyData.innerHTML = '<tr><td colspan="4">Error loading history: ' + error.message + '</td></tr>';
        });
}

/**
 * Display history from localStorage
 * @param {HTMLElement} historyData - The element to populate with history
 */
function displayHistoryFromLocalStorage(historyData) {
    try {
        const savedHistory = localStorage.getItem('puzzleHistory');
        if (!savedHistory) {
            historyData.innerHTML = '<tr><td colspan="4">No puzzle history yet! Complete a puzzle to see your history.</td></tr>';
            return;
        }
        
        const history = JSON.parse(savedHistory);
        if (history.length === 0) {
            historyData.innerHTML = '<tr><td colspan="4">No puzzle history yet! Complete a puzzle to see your history.</td></tr>';
            return;
        }
        
        // Clear loading message
        historyData.innerHTML = '';
        
        // Add each history entry
        history.forEach(entry => {
            const row = document.createElement('tr');
            
            // Create thumbnail cell (placeholder)
            const thumbnailCell = document.createElement('td');
            const thumbnail = document.createElement('img');
            thumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ij48L2NpcmNsZT48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIj48L3BvbHlsaW5lPjwvc3ZnPg==';
            thumbnail.width = 50;
            thumbnail.height = 50;
            thumbnailCell.appendChild(thumbnail);
            
            // Create date cell
            const dateCell = document.createElement('td');
            try {
                dateCell.textContent = new Date(entry.date).toLocaleDateString();
            } catch (e) {
                dateCell.textContent = 'Unknown date';
            }
            
            // Create settings cell
            const settingsCell = document.createElement('td');
            settingsCell.textContent = `${entry.showNumbers ? 'Numbers' : 'No Numbers'}, ${entry.twoEmptyTiles ? '2' : '1'} empty`;
            
            // Create moves cell
            const movesCell = document.createElement('td');
            movesCell.textContent = entry.moves || 'Unknown';
            
            // Add cells to row
            row.appendChild(thumbnailCell);
            row.appendChild(dateCell);
            row.appendChild(settingsCell);
            row.appendChild(movesCell);
            
            // Add row to table
            historyData.appendChild(row);
        });
    } catch (e) {
        console.error("Error displaying local history:", e);
        historyData.innerHTML = '<tr><td colspan="4">Error loading history: ' + e.message + '</td></tr>';
    }
}
