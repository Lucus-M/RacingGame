

const { loadLevel } = require('./levels.js');

const TILE_SIZE = 16;
const CHUNK_SIZE = 256;

const TOP_SPEED = 10;
const TURBO_SPEED = 13; 
const BASE_OB = 215; //offset bottom default

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080, path: '/ws/' });

const lobbies = new Map(); //lobbies to join with an 8 digit code
const clients = new Map(); //client connection corresponding to each player (key: clientid)
const players = new Map(); //player information (key: clientid)

const level = loadLevel("beach");

let nextId = 1;
console.log(process.cwd());

wss.on('connection', (ws) => {
  console.log('Client connected');
  console.log("Number of clients:", wss.clients.size);

  //increment client id each time new player joins
  const clientId = nextId;
  nextId++;

  //new client, identified by client id, with connection identifier
  clients.set(clientId, ws)
  
  //player data, identified by id
  players.set(clientId, {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    lc: false,
    mc: false,
    rc: false,
    rev: false,
    id: clientId,
    name: "Player",
    lobby: "none",
    speed: 0,
    chunk: 0,
    racePos: 0,
    color: 0,
    lap: 1,
    yRace: 0,
    offsetBottom: BASE_OB,
    overlapTile: "",
    collideWithObst: false, 
    collideWithOpponent: false, 
    animationFrame: 0,
    animationTimer: 0,
    revPastFinish: true,
    starting: true
  })

  //player data
  const player = players.get(clientId);

  ws.send(JSON.stringify({
    type: "init",
    id: clientId,
  }));

  //when server recieves message from client
  ws.on('message', (message) => {
    const data = JSON.parse(message.toString()); //parse JSON string

    if (!player) return;

    //client mouse update event
    if(data.type === "mousemove"){
      player.x = Math.max(0, Math.min(240, data.x - 8));
      player.y = data.y - 8;
    }
    //acceleration
    if(data.type === "mousedown"){
      player.lc = data.lc; //mouse up/down
      player.mc = data.mc;
      player.rc = data.rc;
    }

    if(data.type === "rev"){
      player.rev = !player.rev; //reverse
    }

    //lobby handling
    if(data.type === "createLobby"){
      createLobby(clientId);
    }
    if (data.type === "joinLobby") {
      joinLobby(data.code, clientId)
    }
    if (data.type === "startGame") {
      console.log("game start!");
      startGame(lobbies.get(player.lobby), clientId);
    }
    if (data.type === "changeName") {
      player.name = data.name;
      console.log(player.name);
      if (player.lobby !== "none") sendLobbyInfo(lobbies.get(player.lobby));
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    players.delete(clientId);
    leaveLobby(player.lobby, clientId)

    console.log(`Client disconnected: ${clientId}`);
  });
})

//create a new lobby
function createLobby(clientId){
  const ws = clients.get(clientId);
  const code = generateJoinCode();

  lobbies.set(code, {
    code: code,
    players: [],
    host: clientId,
    gameState: "joinScreen",
    obstacles: [],
    nextY: 300,
    level: "beach",
    racePos: [],
    colorOrder: [],
  });

  const lobby = lobbies.get(code);

  //init obstacles
  
  for(let i = 0; i <= level.layout.length; i++){
    newObstacle(lobby);
  }

  ws.send(JSON.stringify({
    type: "lobbyCreated",
    code: code
  }));

  console.log(lobbies.get(code).code);
  joinLobby(lobbies.get(code).code, clientId);
}

//generate random 8 digit code
function generateJoinCode(){
  const randomCode = Math.floor(Math.random() * 100000).toString().padStart(4, '0');
  return randomCode;
}

//join a lobby
function joinLobby(code, clientId){
  const ws = clients.get(clientId);
  const player = players.get(clientId);
  const lobby = lobbies.get(code);

  if (!lobby || lobby.gameState === "playing") return;

  lobby.players.push(clientId);
  lobby.colorOrder.push(clientId);

  player.lobby = lobby.code;

  ws.send(JSON.stringify({
    type: "lobbyJoined",
    player: clientId,
    lobby: lobby
  }))

  console.log(lobby.players);
  sendLobbyInfo(lobby);
}

//leave a lobby
function leaveLobby(code, clientId) {
  const lobby = lobbies.get(code);
  if (!lobby) return;

  lobby.players = lobby.players.filter(id => id !== clientId);
  lobby.colorOrder = lobby.colorOrder.filter(id => id !== clientId);

  //if host leaves, lobby is deleted
  if(clientId === lobby.host){
    lobbies.delete(code);
  }

  console.log(lobby.players);
  sendLobbyInfo(lobby)
}

function newObstacle(lobby){
  lobby.obstacles.push({
    x: Math.floor(Math.random() * ((256/2 - (127/2)) - 191 + 1)) + 191,
    ty: lobby.nextY,
    chunk: Math.floor(lobby.nextY/256)
  })
  lobby.nextY += Math.floor(Math.random() * (375 - 127 + 1)) + 127;
}

function collideObst(player, lobby){
  //checks until it finds a collision
  return lobby.obstacles.some(obst =>
    player.tx < obst.x + 16 &&
    player.tx + 16 > obst.x &&
    player.ty < obst.ty + 16 &&
    player.ty + 16 > obst.ty
  );
}

function collidePlayer(player, opponent){
  return player.tx < opponent.tx + 16 &&
    player.tx + 16 > opponent.tx &&
    player.ty < opponent.ty + 16 &&
    player.ty + 16 > opponent.ty
}

//start the game
function startGame(lobby, clientId){
  //console.log(clientId + " " + lobby.host + lobby.gameState);
  //
  if(lobby.gameState === "playing" || clientId !== lobby.host) return;
  
  //change game state to playing
  lobby.gameState = "playing";

  let tyStart = level.layout.length * 255;
  //tell each client in lobby to start game
  lobby.players.forEach((clientId) =>{
    lobby.racePos.push(clientId);

    player = players.get(clientId);
    
    player.ty = tyStart; 
    player.color = lobby.colorOrder.findIndex(id => id === clientId);

    //console.log(player.color);
    const ws = clients.get(clientId);

    tyStart -= 24;
    ws.send(JSON.stringify({
      type: "startGame",
      lobby: lobby,
      tiles: level.tiles,
      levelLength: level.layout.length * 256,
    }))
  })
}

function checkRacePos(lobby){
  const playerPos = [];

  lobby.players.forEach((clientId) => {
    const ws = clients.get(clientId);
    const player = players.get(clientId);

    //const yRace = player.ty + ((player.lap-1) * (level.layout.length * 256));
    //player.yRace = yRace;
    playerPos.push({id: clientId, pos: player.ty, lap: player.lap, revPastFinish: player.revPastFinish});
  });

  playerPos.sort((a, b) => b.pos - a.pos);
  playerPos.sort((a, b) => b.lap - a.lap);
  playerPos.sort((a, b) => a.revPastFinish - b.revPastFinish);

  lobby.racePos = playerPos;
}

//send all player info to each client in lobby
function sendLobbyInfo(lobby){
  const message = JSON.stringify({
    type: "lobbyInfo",
    lobby: lobby
  });

  lobby.players.forEach((clientId) =>{
    const ws = clients.get(clientId);
    ws.send(message);
  })
}

function newLap(player, addsub){
    player.lap += addsub;

    //console.log(player.id);
    const ws = clients.get(player.id);

    ws.send(JSON.stringify({
      type: "newLap",
    }));
}

function getNextChunk(chunkPos){
  const totalChunks = level.layout.length;

  let nextChunkPos = chunkPos + 1;
  if (nextChunkPos >= totalChunks) {
    nextChunkPos = 0;
  }

  return nextChunkPos;
}

function getPrevChunk(chunkPos){
  const totalChunks = level.layout.length;

  let prevChunkPos = chunkPos - 1;
  if (chunkPos == 0){
      prevChunkPos = totalChunks - 1;
  }

  return prevChunkPos;
}

function sendLevelData(player) {
  const totalChunks = level.layout.length;
  const totalLength = totalChunks * 256;

  if (player.prevTy === undefined) {
    player.prevTy = player.ty;
  }

  // Reverse through finish (ty = 0 going negative)
  if (player.speed < 0 && player.prevTy >= 0 && player.ty < 0) {
    player.revPastFinish = true;
    //player.lap = 0;
  }

  if (player.speed >= 0 && player.prevTy < totalLength && player.ty >= totalLength) {
    if (!player.revPastFinish) {
      newLap(player, 1);
    }
    player.revPastFinish = false; // reset either way
  }
  if (player.ty < 0) {
    player.ty = totalLength + player.ty;
  }

  if (player.ty >= totalLength) {
    player.ty = player.ty - totalLength;
  }

  let chunkPos = Math.floor(player.ty / 256);
  chunkPos = ((chunkPos % totalChunks) + totalChunks) % totalChunks;

  let nextChunkPos = getNextChunk(chunkPos);
  let prevChunkPos = getPrevChunk(chunkPos);
  //console.log(nextChunkPos + " " + chunkPos + " " + prevChunkPos);

  player.chunk = chunkPos;

  player.prevTy = player.ty;

  return [
    ...level.layout[nextChunkPos],
    ...level.layout[chunkPos],
    ...level.layout[prevChunkPos],
  ];
}

//send all player positions to each client
function sendPositions(lobby, playersList) {
  const allPlayers = [...playersList.values()];

  lobby.players.forEach((clientId) => {
    //differentiate between player and opponents for each client
    const ws = clients.get(clientId);
    const player = playersList.get(clientId);

    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    //players list without the selected client
    const opponents = allPlayers.filter(p => p.id !== clientId);

    sendLevelData(player);
    ws.send(JSON.stringify({
      type: "updatePositions",
      opponents,
      player,
      obstacles: lobby.obstacles,
      level: sendLevelData(player),
      racePos: lobby.racePos
    }));
  });
}

function getCollidedTile(player){
  // center of player
  const playerXOffset = player.tx + 8;
  const playerYOffset = player.ty + 41;

  // tile X
  const tileX = Math.floor(playerXOffset / TILE_SIZE);

  // convert to chunk-relative Y
  const relativeY = playerYOffset - (player.chunk * CHUNK_SIZE);

  // tile Y (flipped)
  let tileY = Math.floor((CHUNK_SIZE - relativeY) / TILE_SIZE);

  // clamp properly
  tileY = Math.max(0, Math.min(15, tileY));

  return { x: tileX, y: tileY };
}

function handleAnimation(player){
  if(player.animationTimer >= 100){
    player.animationFrame ^= 1;
    player.animationTimer = 0;
  }
  player.animationTimer += Math.abs(player.speed) * 10;
}

function getPlayersInLobby(lobby) {
  return lobby.players
    .map(id => players.get(id))
    .filter(p => p !== undefined);
}

function groupPlayersByChunk(playersMap) {
  const chunkMap = new Map();

  playersMap.forEach((player) => {
    if (!chunkMap.has(player.chunk)) {
      chunkMap.set(player.chunk, []);
    }

    chunkMap.get(player.chunk).push(player);
  });

  return chunkMap;
}

function frame(lobby){
  const playersList = new Map();
  const lobbyplayers = getPlayersInLobby(lobby);
  const chunkMap = groupPlayersByChunk(lobbyplayers);
  lobby.players.forEach((playerId) =>{
    const player = players.get(playerId);

    //get all players in player's chunk except player
    const playersInChunk = (chunkMap.get(player.chunk) || []).filter(p => p.id !== playerId);
    playersInChunk.sort((a, b) => a.ty - b.ty);
    
    //player data for each player in lobby
    playersList.set(playerId, player);

    let accRate = 0.5;

    let targetSpeed = TOP_SPEED;
    let targetOffsetBottom = BASE_OB;
    let obAccRate = 1;

    let xaccRate = (player.x-player.tx)/2;

    if(player.starting){
      if(player.speed == targetSpeed){
        accRate = 0.5
        player.starting = false;
      }
      else{
        accRate = 0.125;
      }
    }

    if(player.tx != player.x){
      player.tx += xaccRate;
    }

    //left click - normal acceleration
    if(player.lc && !player.mc){
      targetOffsetBottom = BASE_OB - 20;
    }

    //right click - turbo speed
    if(player.rc && !player.mc){
      targetSpeed = TURBO_SPEED;
      targetOffsetBottom = BASE_OB - 30;
    }
   
    if(player.rev){
      targetSpeed = -(targetSpeed /= 2)
      targetOffsetBottom = BASE_OB - 55;
    }

    //let go of mouse/break
    if(!player.lc && !player.rc || player.mc) targetSpeed = 0;

    if(player.targetSpeed = 0 && (player.speed > -accRate)){
      player.speed = 0;
      accRate = 0;
    }

    const collidedTile = getCollidedTile(player);
    let tileValue = 0;    
    if(collidedTile && collidedTile.x !== undefined && collidedTile.y !== undefined){
      tileValue = level.layout[player.chunk][collidedTile.y][collidedTile.x];
      player.overlapTile = level.tiles[tileValue].type;
    }

    //player offroad
    if(tileValue >= 0 && level.tiles[tileValue].type == "offroad"){
      targetSpeed = Math.round(targetSpeed / 3);
      accRate = 1;
    }

    let mousedown = (player.rc || player.lc);

    if(level.tiles[tileValue].type == "offroad" && Math.trunc(player.speed) == 0 && !mousedown){
      player.speed = 0;
      accRate = 0;
    }

    //console.log(Math.trunc(player.speed))
    
    if(player.mc && targetSpeed == 0 && player.speed != 0){ 
      accRate = 1;

      //prevent jitter
      if((player.speed <= 0 && !player.rev) || (player.speed >= 0 && player.rev)){
        player.speed = 0;
        accRate = 0;
      }
    }
    //object collision
    if(collideObst(player, lobby) && !player.collideWithObst && player.speed != 0){
      player.collideWithObst = true;
      player.speed = Math.round(-((player.speed / 1.5)+1));
      clients.get(player.id).send(JSON.stringify({
        type: "collideObst",
      }));
    }
    else if(player.collideWithObst && player.speed < 2 && player.speed > -2){
      player.speed = 0;
      targetSpeed = 0;
    }
    if(!collideObst(player, lobby)){
      player.collideWithObst = false;
    }

    playersInChunk.forEach((opponent) => {
      //console.log(opponent);
      const collide = collidePlayer(player, opponent);
      const toggleCol = (player.collideWithPlayer && opponent.collideWithPlayer)
      if(collide && !toggleCol){
        player.collideWithPlayer = true;
        opponent.collideWithPlayer = true;

        let prevSpeed = player.speed;
        player.speed += (opponent.speed + 1);
        opponent.speed = -(prevSpeed + 1);

        player.speed = Math.max(-TURBO_SPEED, Math.min(TURBO_SPEED, player.speed));
        opponent.speed = Math.max(-TURBO_SPEED, Math.min(TURBO_SPEED, opponent.speed));

        [clients.get(player.id), clients.get(opponent.id)].forEach((ws) => {
          if (ws) {
            ws.send(JSON.stringify({
              type: "collideObst",
            }));
          }
        });
        
      }

      if(!collide){
        player.collideWithPlayer = false;
        opponent.collideWithPlayer = false;
      }
    });

    //acceleration/deceleration (gradually change car's speed to target speed)
    if(player.speed != targetSpeed && !(player.mc && accRate == 0)){
      player.speed += (Math.sign(targetSpeed - (player.speed)) * accRate);
      player.offsetBottom += Math.sign(targetOffsetBottom - player.offsetBottom) * obAccRate;
    }

    handleAnimation(player);
    player.ty += player.speed;
  });
  
  checkRacePos(lobby);
  //broadcast game state to all clients
  sendPositions(lobby, playersList);
}

function gameLoop(){
  lobbies.forEach((lobby) => {
    //only run if game is started
    if(lobby.gameState === "playing") frame(lobby);
  });
}



setInterval(gameLoop, 1000 / 30);