//initialize canvas
const cvs = document.getElementById("gamescreen");
const ctx = cvs.getContext("2d");

/*
  Disabling image smoothing preserves pixel-art sharpness.
  MDN Canvas API documentation:
  https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
*/
ctx.imageSmoothingEnabled = false; // For modern browsers
ctx.webkitImageSmoothingEnabled = false; // For WebKit
ctx.mozImageSmoothingEnabled = false; // For Firefox
let sprite = new Image();

//create socket
// #Using socket creation code found at: 
// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

/*
  WebSocket API defined by W3C:
  https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

  WebSocket allows for persistent two-way communication between the client
  and server without the need for constant HTTP requests.
*/
const ws = new WebSocket('wss://www.lucusdm.com/ws/'); 

/*
  Client receives player state updates from server.
  This separation of render loop (client) and simulation loop (server)
  follows modern multiplayer architecture design.
*/
//on connection creation-
ws.onopen = () => console.log("Connected to WebSocket");
//when client recieves data from server-
ws.onmessage = (msg) => {
    //console.log("Message from server:", JSON.parse(msg.data));

    //recieve updates from server
    const data = JSON.parse(msg.data);
    if(data.type === "updatePositions"){
        players = data.players;
    }
    if(data.type === "logupdate"){
        document.getElementById("log").innerText += data.message + "\n";
    }
}
//error message-
ws.onerror = (err) => console.error("WebSocket error:", err);
//websocket close-
ws.onclose = () => console.log("WebSocket closed");

//load sprite image
sprite.onload = function() {
    //initialize
    ctx.drawImage(sprite, 16, 16);
}
sprite.src = "public/myface.png";

/*
  Mouse input is transmitted to server.
  This implements an input-based networking model rather than 
  state replication from the client (reduces cheating risk).
*/
document.addEventListener('mousemove', (event) => {
    const posx = event.clientX;
    const posy = event.clientY;
    //send data to server
    ws.send(JSON.stringify({type: "mousemove", x: posx, y: posy}))
})

let players = [];

/*
  Client-side render loop using requestAnimationFrame.
  MDN documentation:
  https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame

  requestAnimationFrame synchronizes rendering with browser refresh rate,
  typically 60 FPS, improving performance and reducing unnecessary CPU usage.
*/
function gameLoop(){
    //ctx.clearRect(0, 0, cvs.width, cvs.height);
    players.forEach(p => {
        drawTintedCar(p.x, p.y, p.color);
    });

    requestAnimationFrame(gameLoop);
}

//draw sprite with assigned color
function drawTintedCar(x, y, color) {
    // Draw the original image first
    ctx.drawImage(sprite, x, y, 32, 32);

    // Set composite to 'source-atop' to only tint non-transparent pixels
    ctx.fillStyle = "#" + color;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillRect(x, y, 32, 32);

    // Reset composite
    ctx.globalCompositeOperation = 'source-over';
}

gameLoop();
