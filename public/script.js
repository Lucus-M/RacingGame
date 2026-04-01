

//initialize canvas
const cvs = document.getElementById("gameScreen");
const ctx = cvs.getContext("2d");

/*
  Disabling image smoothing preserves crisp pixel rendering.

  Reference:
  MDN Canvas API - imageSmoothingEnabled
  https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled

  This is especially important in 2D games to avoid blur artifacts.
*/
ctx.imageSmoothingEnabled = false; // For modern browsers
ctx.webkitImageSmoothingEnabled = false; // For WebKit
ctx.mozImageSmoothingEnabled = false; // For Firefox
let carSprite = new Image();
let rockSprite = new Image();

/*
  WebSocket client API:
  https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

  WebSockets allow persistent bidirectional communication,
  reducing latency compared to HTTP polling.

  Protocol defined in:
  RFC 6455 - The WebSocket Protocol
  https://datatracker.ietf.org/doc/html/rfc6455
*/
//create socket
const ws = new WebSocket('wss://www.lucusdm.com/ws/'); 

let player;
let opponents = [];
let obstacles = [];

/*
  Client receives authoritative state updates from server.

  This follows the "authoritative server model":
  - Server computes game state
  - Client renders it

  Reference:
  Glenn Fiedler - Multiplayer Networking Model
  https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/
*/
//on connection creation-
ws.onopen = () => console.log("Connected to WebSocket");
ws.onmessage = (msg) => {
    //recieve updates from server
    /*
      State synchronization:
      Server sends full game state snapshot each tick.

      This approach is known as "state replication"
      in distributed systems.
    */
    const data = JSON.parse(msg.data);
    if(data.type === "updatePositions"){
        opponents = data.opponents;
        player = data.player;
        obstacles = data.obstacles;
        console.log(obstacles);
    }

    if(data.type === "lobbyJoined"){
        console.log("joined")
        document.getElementById("joinScreen").style.display = "none";
        document.getElementById("lobbyScreen").style.display = "block";

        document.getElementById("codeDisplay").innerText = data.lobby.code;
        if(data.lobby.host === data.player){
            document.getElementById("startGame").style.display = "block";
        }
    }

    if(data.type === "lobbyInfo"){
        document.getElementById("numofplayers").innerText = data.lobby.players.length;
    }

    if(data.type === "startGame"){
        document.getElementById("joinScreen").style.display = "none";
        document.getElementById("lobbyScreen").style.display = "none";
        document.getElementById("gameScreen").style.display = "block";
    }
}
//error message-
ws.onerror = (err) => console.error("WebSocket error:", err);
//websocket close-
ws.onclose = () => console.log("WebSocket closed");

/*
  Image loading:

  The Image() constructor loads external resources asynchronously.
  Rendering should only occur after onload fires.

  Reference:
  MDN - HTMLImageElement
  https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
*/
//load sprite image
carSprite.onload = function() {
    //initialize
    ctx.drawImage(carSprite, 16, 16);
}
carSprite.src = "public/car.png";

rockSprite.onload = function() {
    //initialize
    ctx.drawImage(rockSprite, 16, 16);
}
rockSprite.src = "public/rock.png";

let mousedown = false;

/*
  Input handling:

  Mouse events are captured and sent to server.

  This implements an "input-driven networking model"
  where:
  - Client sends input
  - Server computes results

  Reduces cheating and ensures consistency.
*/
//control event listeners
cvs.addEventListener('mousedown', () => {
    mousedown = true;
    ws.send(JSON.stringify({type: "mousedown", md: mousedown}))
})
cvs.addEventListener('mouseup', () => {
    mousedown = false;
    ws.send(JSON.stringify({type: "mousedown", md: mousedown}))
})

cvs.addEventListener('mousemove', (event) => {
    const posx = event.clientX;
    const posy = event.clientY;
    //send data to server
    ws.send(JSON.stringify({type: "mousemove", x: posx, y: posy}))
})

/*
  Coordinate transformation:

  Converts world coordinates (server) into screen coordinates (client).

  This is a basic camera transform where:
  - Player is fixed on screen
  - World moves relative to player

  Common technique in 2D games:
  "camera-relative rendering"
*/
function opponentCarPosition(y){
    diff = y - player.ty;
    return 800 - diff;
}

const leftRoad = 1900/2 - (550/2);
const roadhWidth = 550;

//draw each frame
function gameLoop(){
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = "#6a6c7a";
    ctx.fillRect(1900/2 - (550/2), 0, 550, 1075);

    /*
      Render obstacles:

      Rendering order matters:
      - Background first
      - Objects next
      - Player last (for visibility)
    */
    obstacles.forEach(p => {
        drawObject(p.x, opponentCarPosition(p.y), rockSprite)
    })

    opponents.forEach(p => {
        drawObject(p.x, opponentCarPosition(p.ty), carSprite);
    });

    if(player) drawObject(player.x, 800, carSprite);

    //loop
    requestAnimationFrame(gameLoop);
}

//draw sprite with assigned color
function drawObject(x, y, sprite) {
    // Draw the original image first
    ctx.drawImage(sprite, x - (32), y, 64, 64);
}

gameLoop();
