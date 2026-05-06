//create socket
const ws = new WebSocket('wss://www.lucusdm.com/ws/'); 

let player;
let opponents = [];
let obstacles = [];
let levelImages = [];
let level = [];
let racePos = [];
let finalPos = [];
let levelLength = 1;
let host = 0;
let musicStarted = false;

//initialize canvas
const cvs = document.getElementById("gameScreen");
const ctx = cvs.getContext("2d");

const maxHeight = window.innerHeight * 0.92;

// find the largest integer scale that fits
const scale = maxHeight / cvs.height;

const BASE_OB = 215;

cvs.style.height = (cvs.height * scale) + "px";
cvs.style.width  = (cvs.width  * scale) + "px";

document.getElementById("joinScreen").style.display = "block";

//console.log(cvs.style.width);

//on connection creation-
ws.onopen = () => console.log("Connected to WebSocket");
ws.onmessage = (msg) => {
    //recieve updates from server
    const data = JSON.parse(msg.data);
    if(data.type === "updatePositions"){
        opponents = data.opponents;
        player = data.player;
        obstacles = data.obstacles;
        level = data.level;
        racePos = data.racePos;
        finalPos = data.finalPos;

        updateEngineSound(player.speed);

        if(player.id == host && !musicStarted){
            playSound(sounds.get("music"), 1.5);        
            musicStarted = true;
        }

        //console.log(racePos);
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

    if(data.type === "playerfinished"){
        stopSound(sounds.get("music"));
        playSound(sounds.get("victory"));
    }

    if (data.type === "startGame") {
        (async () => {
            levelTiles = data.tiles;
            levelLength = data.levelLength;

            await loadSpriteSheet(
                data.spriteSheet,
                data.tileWidth,
                data.tileHeight
            );

            //levelImages = await loadLevelImages(data.tiles);
            document.getElementById("joinScreen").style.display = "none";
            document.getElementById("lobbyScreen").style.display = "none";
            document.getElementById("gameScreen").style.display = "block";

            levelLength = data.levelLength;

            
            host = data.host;
        })();
    }

    if (data.type === "newLap") playSound(sounds.get("newLap"), 1.5);
    if (data.type === "collideObst") playSound(sounds.get("smash"));
}
//error message-
ws.onerror = (err) => console.error("WebSocket error:", err);
//websocket close-
ws.onclose = () => console.log("WebSocket closed");

let leftClick = false;
let middleClick = false;
let rightClick = false;

let screechSoundPlaying = false;

function mouse(event, boolean){
    if (event.button === 0) leftClick = boolean;   // left click
    if (event.button === 1) middleClick = boolean;
    if (event.button === 2) rightClick = boolean;  // right click

    ws.send(JSON.stringify({
        type: "mousedown",
        lc: leftClick,
        mc: middleClick,
        rc: rightClick
    }));
}

let leftkey = false;
let rightkey = false;
let zkey = false;
let xkey = false;
let shift = false;

function key(event, boolean){
    if (event.code === 'ArrowRight'){
        rightkey = boolean;
    }
    if (event.code === 'ArrowLeft'){
        leftkey = boolean;
    } 

    if (event.code === 'KeyZ') {
        zkey = boolean;
    }
    
    if (event.code === 'KeyX') { // FIXED
        xkey = boolean;
    }
    
    if (event.code === 'ShiftLeft') {
        shift = boolean;
    }
    
    ws.send(JSON.stringify({ 
        type: "key",
        rkey: rightkey,
        lkey: leftkey,
        zkey: zkey,
        xkey: xkey,
        shift: shift
    }));
}

//control event listeners
document.addEventListener('keydown', (event) => {
    if(event.code === 'KeyR' && player.gamestate == "finished"){
        window.location.reload();
    }

    key(event, true);
});

document.addEventListener('keyup', (event) => {
    if (event.code === 'Space' && !event.repeat) {
        ws.send(JSON.stringify({ type: "rev" }));
    }
    key(event, false);
})

cvs.addEventListener('mousedown', (event) => {
    mouse(event, true);
});

cvs.addEventListener('mouseup', (event) => {
    mouse(event, false);
});

let prevMousePos = {x: 0, y: 0};
let mousePos = {x: 0, y: 0};
cvs.addEventListener('mousemove', (event) => {
    if(mousePos){
        prevMousePos = mousePos;
    }
    mousePos = getCvsMousePos(event);
})

function getCvsMousePos(e){
    const cvspos = e.currentTarget.getBoundingClientRect();

    const posx = Math.round((e.clientX - cvspos.left) / scale);
    const posy = Math.round((e.clientY - cvspos.top) / scale);

    return {x: posx, y: posy}
}

function sendMousePos(mousePos){
    ws.send(JSON.stringify({type: "mousemove", x: mousePos.x, y: mousePos.y}))
}

let cameraY = 0;
function opponentCarPosition(y){
    diff = y - player.ty;
    return Math.floor(player.offsetBottom - diff);
}

function checkTrackPosition(p){
    ty = p.ty;
    if(player.chunk == (levelLength/256) - 1 && p.chunk == 0){
        ty += levelLength;
    }
    y = opponentCarPosition(ty);

    return y;
}


cvs.addEventListener('contextmenu', (e) => e.preventDefault());