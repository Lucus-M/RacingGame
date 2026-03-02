//initialize canvas
const cvs = document.getElementById("gamescreen");
const ctx = cvs.getContext("2d");

//image smoothing
ctx.imageSmoothingEnabled = false; // For modern browsers
ctx.webkitImageSmoothingEnabled = false; // For WebKit
ctx.mozImageSmoothingEnabled = false; // For Firefox
let sprite = new Image();

//create socket
// #Using socket creation code found at: 
// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

// on server side url is redirected to localhost
const ws = new WebSocket('wss://www.lucusdm.com/ws/'); 

//manage connection
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

//mouse move event, send position to server
document.addEventListener('mousemove', (event) => {
    const posx = event.clientX;
    const posy = event.clientY;
    //send data to server
    ws.send(JSON.stringify({type: "mousemove", x: posx, y: posy}))
})

let players = [];

//redraw screen per frame
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
