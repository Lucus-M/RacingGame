/*
  WebSocket server implementation using the ws library:
  https://github.com/websockets/ws

  Underlying protocol defined in:
  RFC 6455 – The WebSocket Protocol (Fette & Melnikov, 2011)
  https://datatracker.ietf.org/doc/html/rfc6455

  WebSockets provide persistent, full-duplex communication over TCP,
  reducing overhead compared to HTTP polling for real-time applications.
*/

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080, path: '/ws/' });

/*
  Data structures:

  Map is used for O(1) average lookup time.
  (Cormen et al., "Introduction to Algorithms", Hash Tables)

  These Maps separate concerns:
  - lobbies → session management
  - clients → network connections
  - players → game state
*/

const lobbies = new Map(); //lobbies to join with an 8 digit code
const clients = new Map(); //client connection corresponding to each player (key: clientid)
const players = new Map(); //player information (key: clientid)

let nextId = 1;

wss.on('connection', (ws) => {
  console.log('Client connected');
  console.log("Number of clients:", wss.clients.size);

  //increment client id each time new player joins
  const clientId = nextId;
  nextId++;

  //new client, identified by client id, with connection identifier
  clients.set(clientId, ws)
  
  /*
    Authoritative server model:
    Server stores true player state, not the client.

    Reference:
    Gaffer On Games – Multiplayer Networking Model
    https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/
  */
  //player data, identified by id
  players.set(clientId, {
    x: 0,
    y: 0,
    ty: 0,
    id: clientId,
    name: "Player-" + clientId,
    lobby: "none",
    speed: 0
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
      player.x = data.x;
      player.y = data.y;
    }
    //acceleration
    if(data.type === "mousedown"){
      player.md = data.md; //mouse up/down
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
    if (data.type = "changeName") {
      player.name = data.name;
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

/*
  Lobby creation system:

  Uses randomly generated join codes,
  similar to private match systems in online games.

  Random code generation ensures low collision probability
  (Birthday paradox considerations for large player counts).
*/
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
    nextY: 100 
  });

  const lobby = lobbies.get(code);

  //init obstacles
  for(let i = 0; i <= 200; i++){
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
  const randomCode = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return randomCode;
}

/*
  Lobby join logic ensures:
  - Lobby exists
  - Game not already started

  This is basic state validation logic.
*/
//join a lobby
function joinLobby(code, clientId){
  const ws = clients.get(clientId);
  const player = players.get(clientId);
  const lobby = lobbies.get(code);

  if (!lobby || lobby.gameState === "playing") return;

  lobby.players.push(clientId);
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

  //if host leaves, lobby is deleted
  if(clientId === lobby.host){
    lobbies.delete(code);
  }

  console.log(lobby.players);
  sendLobbyInfo(lobby)
}

function newObstacle(lobby){
  lobby.obstacles.push({
    x: Math.floor(Math.random() * (1225 - 675 + 1)) + 675,
    y: lobby.nextY
  })
  lobby.nextY += Math.floor(Math.random() * (500 - 200 + 1)) + 200;
}

/*
  Axis-Aligned Bounding Box (AABB) collision detection.

  This is a standard technique in 2D games:
  https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection

  Efficient because it avoids expensive geometry calculations.
*/
function collideObst(player, lobby){
  //checks until it finds a collision
  return lobby.obstacles.some(obst =>
    player.x < obst.x + 64 &&
    player.x + 64 > obst.x &&
    player.ty < obst.y + 64 &&
    player.ty + 64 > obst.y
  );
}

/*
  Broadcast lobby state to all players.
  This is a server to client synchronization step.
*/
//start the game
function startGame(lobby, clientId){
  console.log(clientId + " " + lobby.host + lobby.gameState);
  //
  if(lobby.gameState === "playing" || clientId !== lobby.host) return;
  
  //change game state to playing
  lobby.gameState = "playing";

  let tyStart = 0;
  //tell each client in lobby to start game
  lobby.players.forEach((clientId) =>{
    players.get(clientId).ty = tyStart; 
    tyStart -= 10;

    const ws = clients.get(clientId);
    ws.send(JSON.stringify({
      type: "startGame",
      lobby: lobby
    }))
  })
}

/*
  Broadcast lobby state to all players.
  This is a server → client synchronization step.
*/
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

/*
  State synchronization:

  Each client receives:
  - Their own player state
  - Opponent states
  - Obstacles

  This reduces client-side filtering work.
*/
//send all player positions to each client
function sendPositions(lobby, playersList) {
  const allPlayers = [...playersList.values()];

  lobby.players.forEach((clientId) => {
    //differentiate between player and opponents for each client
    const ws = clients.get(clientId);
    const player = playersList.get(clientId);

    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const opponents = allPlayers.filter(p => p.id !== clientId);

    ws.send(JSON.stringify({
      type: "updatePositions",
      opponents,
      player,
      obstacles: lobby.obstacles
    }));
  });
}


/*
  Game simulation step (fixed timestep).

  Based on:
  "Fix Your Timestep!" – Glenn Fiedler
  https://gafferongames.com/post/fix_your_timestep/

  Fixed updates ensure:
  - Consistent physics
  - Predictable gameplay
*/
function frame(lobby){
  const playersList = new Map();
  lobby.players.forEach((playerId) =>{
    const player = players.get(playerId);
    //player data for each player in lobby
    playersList.set(playerId, player);

    //base target speed
    let targetSpeed = 26;
    
    //if player is on grass
    if(player.x <= 675 || player.x >= 675+550){
      targetSpeed = 8;
    }

    //let go of mouse
    if(!player.md){
      targetSpeed = 0;
    }

    //acceleration/deceleration (gradually change car's speed to target speed)
    if(player.speed < targetSpeed){
      player.speed += 0.5;
    }
    else if(player.speed > targetSpeed){
      player.speed -= 2;
    }

    //object collision
    if(collideObst(player, lobby)){
      player.speed = 0;
    }

    //move car
    player.ty += player.speed;
  });

  //broadcast game state to all clients
  sendPositions(lobby, playersList);
}

/*
  Main game loop:
  Iterates through all active lobbies.
*/
function gameLoop(){
  lobbies.forEach((lobby) => {
    //only run if game is started
    if(lobby.gameState === "playing") frame(lobby);
  });
}

/*
  30 Hz update rate:
  Standard for real-time multiplayer games.

  Tradeoff:
  - Lower bandwidth than 60 Hz
  - Still smooth with interpolation on client
*/
setInterval(gameLoop, 1000 / 30);