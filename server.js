/*
  WebSocket server initialization code adapted from NodeJS.org:
  https://nodejs.org/en/learn/getting-started/websocket

  WebSocket protocol defined in:
  RFC 6455 – The WebSocket Protocol (Fette & Melnikov, 2011)
  https://datatracker.ietf.org/doc/html/rfc6455

  WebSocket allows for persistent two-way communication between the client
  and server without the need for constant HTTP requests.
*/

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080, path: '/ws/' });

/*
  Using a server model as described in:
  Gaffer On Games – "What Every Programmer Needs To Know About Game Networking"
  https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/

  In this model:
  - The server owns the true game state
  - Clients only send input
  - Server distributes validated state updates

  This prevents client-side cheating and ensures synchronization.
*/

//stores active clients, numerical id in order of joining
const clients = new Map();
let nextId = 1;

//when ws connects
wss.on('connection', function connection(ws) {
  //server output
  console.log('Client connected');
  console.log("Number of clients: ", wss.clients.size);

  //increment id number for next user
  const clientId = nextId;

  updateLog("Client " + clientId + " joined the session.")

  nextId++;
  
  // initialize client state, generate random assigned color
  const randomColor = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  clients.set(ws, { x: 0, y: 0, color: randomColor, id: clientId });

  /*
    Data sending and retrieval code from NodeJS.org: 
    https://nodejs.org/en/learn/getting-started/websocket#basic-connection-and-message-handling
  */
  //perform when client sends data to server
  ws.on('message', function incoming(message) {
    const data = JSON.parse(message.toString()); //parse JSON string

    //client mouse update event
    if(data.type === "mousemove"){
      //update clients list with new info (player mouse position)
      const clientData = clients.get(ws);
      clientData.x = data.x;
      clientData.y = data.y;
    }
  });

  //close session, output to log
  ws.on('close', () => {
      clients.delete(ws);
      console.log(`Client disconnected: ${clientId}`);
        updateLog("Client " + clientId + " left the session.")
  });
  //ws.send('Welcome to WebSocket server');
});

//log updates (players join/leave), is shown to client
function updateLog(info){
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) { // Ensure the client is ready
      const data = JSON.stringify({type:"logupdate", message: info})
      client.send(data.toString());
    }
  });
}

/*
  Fixed timestep server loop (30 Hz)

  A fixed update rate ensures consistent simulation timing, reduces jitter, and is easier on the network.
*/

//send client updated player positions
function sendPositions(){
  const positions = [];

  clients.forEach((data) => {
    positions.push({
      id: data.id,
      x: data.x,
      y: data.y,
      color: data.color
    })
  })

  const message = JSON.stringify({
    type: "updatePositions",
    players: positions
  });

  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) { // Ensure the client is ready
      client.send(message.toString());
    }
  });

}

//game loop
setInterval(sendPositions, 1000 / 30);