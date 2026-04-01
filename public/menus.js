const joinLobbyButton = document.getElementById("joinLobbyButton");
const createLobbyButton = document.getElementById("createLobbyButton");

const codeInput = document.getElementById("codeInput");
const startGameButton = document.getElementById("startGame"); 

const nameInput = document.getElementById("displayName");
const changeNameButton = document.getElementById("setDisplayName");

function joinLobby(joincode){
    ws.send(JSON.stringify({type: "joinLobby", code: joincode}))
}

joinLobbyButton.addEventListener("click", function() {
    joinLobby(codeInput.value);
});

createLobbyButton.addEventListener("click", function() {
    ws.send(JSON.stringify({type: "createLobby"}));
});

startGameButton.addEventListener("click", function(){
    ws.send(JSON.stringify({type: "startGame"}))
})
changeNameButton.addEventListener("click", function(){
    ws.send(JSON.stringify({type: "changeName", name: nameInput.value}))
})