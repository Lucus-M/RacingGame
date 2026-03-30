const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080, path: '/ws/' });

const lobbies = new Map(); //lobbies to join with an 8 digit code
const clients = new Map(); //client corresponding to each player (key: clientid)
const players = new Map(); ///player information (key: clientid)
let nextId = 1;

wss.on('connection', (ws) => {
  console.log('Client connected');
  console.log("Number of clients:", wss.clients.size);

  const clientId = nextId;
  nextId++;

  clients.set(clientId, ws)

  players.set(clientId, {
    x: 0,
    y: 0,
    ty: 0,
    id: clientId,
    lobby: "none"
  })

  const player = players.get(clientId);

  ws.send(JSON.stringify({
    type: "init",
    id: clientId,
  }));

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString()); //parse JSON string

    if (!player) return;

    //client mouse update event
    if(data.type === "mousemove"){
      player.x = data.x;
      player.y = data.y;
    }
    if(data.type === "mousedown"){
      player.md = data.md; //mouse up/down
    }
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
  });

  ws.on('close', () => {
    clients.delete(clientId);
    players.delete(clientId);
    leaveLobby(player.lobby, clientId)

    console.log(`Client disconnected: ${clientId}`);
  });
})

function createLobby(clientId){
  const ws = clients.get(clientId);
  const code = generateJoinCode();

  lobbies.set(code, {
    code: code,
    players: [],
    host: clientId,
    gameState: "joinScreen"
  });

  ws.send(JSON.stringify({
    type: "lobbyCreated",
    code: code
  }));

  console.log(lobbies.get(code).code);
  joinLobby(lobbies.get(code).code, clientId);
}

function generateJoinCode(){
  const randomCode = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return randomCode;
}

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

function leaveLobby(code, clientId) {
  const lobby = lobbies.get(code);
  if (!lobby) return;

  lobby.players = lobby.players.filter(id => id !== clientId);

  if(clientId === lobby.host){
    lobbies.delete(code);
  }

  console.log(lobby.players);
  sendLobbyInfo(lobby)
}

function startGame(lobby, clientId){
  console.log(clientId + " " + lobby.host + lobby.gameState);
  if(lobby.gameState === "playing" || clientId !== lobby.host) return;
  
  lobby.gameState = "playing";

  lobby.players.forEach((clientId) =>{
    const ws = clients.get(clientId);
    ws.send(JSON.stringify({
      type: "startGame",
      lobby: lobby
    }))
  })
}

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

function sendPlayerPos(clientId) {
  const ws = clients.get(clientId);
  const data = players.get(clientId);

  if (!ws || ws.readyState !== WebSocket.OPEN || !data) return;

  const player = {
    id: data.id,
    x: data.x,
    y: data.y,
    ty: data.ty,
    color: data.color
  }

  ws.send(JSON.stringify({
    type: "clientPos",
    player: player
  }));
}

function sendPositions(lobby, playersList) {
  const allPlayers = [...playersList.values()];

  lobby.players.forEach((clientId) => {
    const ws = clients.get(clientId);
    const player = playersList.get(clientId);

    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const opponents = allPlayers.filter(p => p.id !== clientId);

    ws.send(JSON.stringify({
      type: "updatePositions",
      opponents,
      player
    }));
  });
}

function gameLoop(){
  lobbies.forEach((lobby) => {
    if(lobby.gameState == "playing"){
      const playersList = new Map();
      lobby.players.forEach((playerId) =>{
        const player = players.get(playerId);
        //players in the lobby
        playersList.set(playerId, player);

        if(player.md){
          player.ty += 25;
        }
      });

      sendPositions(lobby, playersList);
    }
  });
}

setInterval(gameLoop, 1000 / 30);