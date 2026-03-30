//initialize canvas
const cvs = document.getElementById("gameScreen");
const ctx = cvs.getContext("2d");

ctx.imageSmoothingEnabled = false; // For modern browsers
ctx.webkitImageSmoothingEnabled = false; // For WebKit
ctx.mozImageSmoothingEnabled = false; // For Firefox
let sprite = new Image();

//create socket
const ws = new WebSocket('wss://www.lucusdm.com/ws/'); 

let player;
let opponents = [];

//on connection creation-
ws.onopen = () => console.log("Connected to WebSocket");
ws.onmessage = (msg) => {
    //recieve updates from server
    const data = JSON.parse(msg.data);
    if(data.type === "updatePositions"){
        opponents = data.opponents;
        player = data.player;
        console.log(player);
    }
    
    if(data.type === "clientPos"){
        player = data.player;
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
        console.log("joined")
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

//load sprite image
sprite.onload = function() {
    //initialize
    ctx.drawImage(sprite, 16, 16);
}
sprite.src = "public/car.png";

let mousedown = false;

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

function opponentCarPosition(y){
    diff = y - player.ty;
    return 800 - diff;
}

function gameLoop(){
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = "#6a6c7a";
    ctx.fillRect(1900/2 - (550/2), 0, 550, 1075);

    opponents.forEach(p => {
        drawCar(p.x, opponentCarPosition(p.ty), p.color);
    });

    if(player) drawCar(player.x, 800, player.color);

    requestAnimationFrame(gameLoop);
}

//draw sprite with assigned color
function drawCar(x, y, color) {
    // Draw the original image first
    ctx.drawImage(sprite, x - (32), y, 64, 64);
}

gameLoop();
