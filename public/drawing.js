
cvs.style.cursor = 'none';

const font = new Image()
const tinyfont = new Image();
const carSprite = new Image();
const rockSprite = new Image();
const mapPoint = new Image();
const positionBar = new Image();

//initialize text
tinyfont.onload = function() {
    ctx.drawImage(tinyfont, 16, 16);
}
tinyfont.src = "public/tinyfont.png"

font.onload = function() {
    ctx.drawImage(font, 16, 16);
}
font.src = "public/font.png";

//load car sprite
carSprite.onload = function() {
    ctx.drawImage(carSprite, 16, 16);
}
carSprite.src = "public/carnew.png";

//load rock sprite
rockSprite.onload = function() {
    ctx.drawImage(rockSprite, 16, 16);
}
rockSprite.src = "public/rock.png";

mapPoint.onload = function() {
    ctx.drawImage(mapPoint, 16, 16);
}
mapPoint.src = "public/mappoints.png";

positionBar.onload = function() {
    ctx.drawImage(positionBar, 16, 16);
}
positionBar.src = "public/positionBar.png";
/*
async function loadLevelImages(tiles) { 
    const promises = tiles.map((tile) => {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = reject;

            img.src = "levelTiles/" + tile.image + ".png";
        });
    });

    return await Promise.all(promises);
}
*/

let spriteSheet = new Image();
let tileWidth = 16;
let tileHeight = 16;
let tilesPerRow = 0;

function loadSpriteSheet(src, tw, th) {
    return new Promise((resolve, reject) => {
        spriteSheet.onload = () => {
            tileWidth = tw;
            tileHeight = th;
            tilesPerRow = Math.floor(spriteSheet.width / tileWidth);
            resolve();
        };

        spriteSheet.onerror = reject;
        spriteSheet.src = src;
    });
}

const S_WIDTH = 256; //gameplay screen width
const NL = '\n'; //new line character
const COLORS = [
    "#ff0000",
    "#639BFF",
    "#FBF236",
    "#00FF00",
    "#FF6700",
    "#FF00af",
    "#8c00b3",
    "#847387"
]; 

function drawObject(x, y, sprite, sx, sy, sw, sh, w, h) {
    // cropped & scaled

    if(sprite === undefined){
        return;
    }
    if (sx !== undefined) {
        ctx.drawImage(sprite, sx, sy, sw, sh, x, y, w, h);
        return;
    }

    // scaled only
    if (w !== undefined) {
        ctx.drawImage(sprite, x, y, w, h);
        return;
    }

    // default draw
    //console.log(sprite);
    ctx.drawImage(sprite, x, y);
}

function drawTile(tileId, x, y) {
    if (!spriteSheet || !spriteSheet.complete) return;

    const sx = (tileId % tilesPerRow) * tileWidth;
    const sy = Math.floor(tileId / tilesPerRow) * tileHeight;

    ctx.drawImage(
        spriteSheet,
        sx, sy, tileWidth, tileHeight,
        x, y, tileWidth, tileHeight
    );
}

//                string      int    int    bool  bool
function drawText(text, x, y, color, scale, tiny, backdrop) {
    let line = 0;
    let charpos = 0;
    let fontType = font;
    let fontWidth = 8;
    let fontOffset = 33;

    if(color === undefined){
        color = 0;
    }
    //console.log(color);
    if (tiny){
        fontType = tinyfont;
        fontWidth = 5;
        fontOffset = 55;
    } 

    [...text].forEach((char) => {
        const charcode = char.codePointAt(0);
        // newline (\n = 10 in unicode)
        if (charcode === 10) {
            charpos = 0;
            line++;
            return;
        }

        if (charcode >= 33 && charcode <= 126) {
            const drawnx = x + (charpos * fontWidth);
            const drawny = y + (line * 8);
            //console.log((charcode - fontOffset))
            ctx.drawImage(
                fontType,
                (charcode - fontOffset) * fontWidth, 
                fontWidth*color,
                fontWidth, 8,
                drawnx,
                drawny,
                fontWidth, 8
            );
        }
        charpos++;
    });
}

function drawMapPoint(x, player){
    //get player's completed percentage of track, multiply by relative screen height, reverse
    y = Math.floor((240 - ((player.ty/(levelLength + 256)) * 240)));
    //console.log(player.color);
    drawObject(x, y, mapPoint, player.color * 8, 0, 8, 8, 8, 8);
}

//write all race positions on right of screen
function racePosDisplay(){
    racePos.forEach((p, index) => {
        let name = "PLAYER";
        let color = 0;
        let placeColor = 0;

        if (p.id === player.id){ 
            name = player.name;
            color = player.color + 1;
            placeColor = color;
            
            drawObject(S_WIDTH + 16 + (8*2), 16*10 + (8 * index), mapPoint, player.color * 8, 0, 8, 8, 8, 8)

            //highlight player in list
            //ctx.fillStyle = COLORS[player.color];
            //ctx.fillRect(S_WIDTH + 16, 16*10 + (8 * index), 8 * 2, 8)
        }
        else { 
            opponent = opponents.find(opp => opp.id === p.id) 
            name = opponent.name;
            color = opponent.color + 1;
            placeColor = color;
        }

        let placeText = index+1 + "- ";
        playersNameList = name.padEnd(16, " ") + "\n";
                
        drawText(placeText, S_WIDTH + 16, 16*10 + (8 * index), placeColor);
        drawText(playersNameList, S_WIDTH + 16 + (3*8), 16*10 + (8 * index), color);
    });
}

function raceEndDisplay(){
    let playerPlaceText = " PLACE!";

    ctx.fillStyle = "black";
    ctx.fillRect(16, 16, S_WIDTH - 32, S_WIDTH - 32);

    ctx.strokeStyle = '#ffffff';

    ctx.lineWidth = 2;

    ctx.strokeRect(16, 16, S_WIDTH - 32, S_WIDTH - 32);

    //drawText(playerPlaceText, 16, 16, 0)

    finalPos.forEach((p, index) => {
        let color = 0;
        let placeText = index+1 + "- "

        if(index == 0){color = 3};
        if(index == 1){color = 8};
        if(index == 2){color = 5};
        playersNameList = p.name.padEnd(16, " ") + "\n";

        if(player.id == p.id){
            let suffix = "th";
            let text = "" + (index + 1);
            if(index == 0){suffix = "st"};
            if(index == 1){suffix = "nd"};
            if(index == 2){suffix = "rd"};

            text += suffix + " PLACE!";

            drawText(text, (S_WIDTH/2)-32, 32 + (8 * index), color);
        }


        placeText += playersNameList;
        drawText(placeText, (S_WIDTH/2)-64, 64 + (8 * index), color);

        drawText("<HIT R TO RETURN TO TITLE>", 24, 128+64, 4);

        console.log("finish");
    });
}

function overheatDisplay(){
    ctx.fillStyle = "black";
    ctx.fillRect(16, 16, S_WIDTH - 32, 32);

    ctx.strokeStyle = '#ffffff';

    ctx.lineWidth = 2;

    ctx.strokeRect(16, 16, S_WIDTH - 32, 32);
    
    drawText("OVERHEAT!", (S_WIDTH/2)-32, 24, 0);
}

//write all info on right of screen
function drawHUD(){  
    drawText("POS  PLAYER", S_WIDTH + 16, 16*9, 0, 1, true);
    drawText("---------", S_WIDTH + 16, (16*9)+8, 0);
    drawText("PLAYER-\n  " + player.name.padStart(8, " "), S_WIDTH + 16, 8);

    let lapText = "LAP- " + player.lap
    let lapColor = 0;
    if(player.revPastFinish && player.rev && player.speed != 0){
        lapText = "WRONG WAY!"
        lapColor = 1;
    }

    drawText( lapText, S_WIDTH + 16, 8*4, lapColor);
    drawText( "POSITION-\n  " + (Math.floor((player.ty/levelLength)*100) + "%").padStart(8, " "), S_WIDTH + 16, 8*7);

    let speedColor = 0;
    let speedText = "SPEED";

    if(player.xkey && !player.shift && !player.rev){
        speedColor = 5;
        speedText = "TURBO"
    }
    else if(player.speed >= 10 && !player.xkey){
        speedColor = 2;
    }
    else if((player.speed < 0 || player.rev)){
        speedText = "REV. ";
        speedColor = 3
    }
    else if(player.shift){
        speedColor = 8;
        speedText = "BREAK";
    }

    drawText( speedText + "-\n  " + (Math.round(Math.abs((player.speed))) * 20 + "Mph").padStart(8, " "), S_WIDTH + 16, 8*10, speedColor);

    racePosDisplay();

    drawHeatDisp();
    console.log(player.heat);
    console.log(player.overheat);
}

function drawHeatDisp(){
    ctx.fillStyle = "red";

    let barwidth = Math.max(0, Math.round(64 * (player.heat / player.maxheat)))

    drawText("HEAT-", S_WIDTH + 16, 8 * 13, 0);
    ctx.fillRect(S_WIDTH + 16, (16 * 7) + 1, barwidth, 6);
    drawText("[", S_WIDTH + 8, 16 * 7, 0);
    drawText("]", S_WIDTH + 16 + 64, 16 * 7, 0);
}

//draw each frame
function gameLoop(){
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    //if player exists
    if(player){
        //draw level tiles
        if(level.length > 0){
            level.forEach((row, y) => {
                row.forEach((tile, x) => {

                    const drawY = Math.floor(
                        ((y * 16) + (256 * ((player.ty / 256) - player.chunk))) - 256
                        - (BASE_OB - player.offsetBottom)
                    );

                    drawTile(tile, x * 16, drawY);
                });
            });
        }

        //draw rock obstacles
        obstacles.forEach(p => {
            let y = checkTrackPosition(p);

            drawObject(p.x, y, rockSprite)
        })
 
        //draw position bar on right
        drawObject(S_WIDTH, 8, positionBar);

        //draw each opponent
        opponents.forEach((p, index) => {
            if(p.gamestate == "playing"){
                let y = checkTrackPosition(p);

                drawObject(Math.round(p.tx), y, carSprite, 16*p.animationFrame, p.color*16, 16, 16, 16, 16);
                //ctx.fillText(p.name, p.x, y-15);

                //draw opponent's map point position
                drawMapPoint(S_WIDTH, p);
            }
        });

        //draw player's point on left position bar
        drawMapPoint(S_WIDTH, player)
        
        //draw each race position display
        drawHUD();
        
        drawObject(Math.round(player.tx), player.offsetBottom, carSprite, 16*player.animationFrame, player.color*16, 16, 16, 16, 16);
            //send mouse position to server
        if(mousePos.x !== prevMousePos.x){
            //console.log(mousePos.x + " " + prevMousePos.x);
            sendMousePos(mousePos);
        }
        
        //brake
        if(player.shift && player.speed != 0 && !screechSoundPlaying){
            screechSoundPlaying = true;
            playSound(sounds.get("screech"));
        }

        //stop brake sound
        else if((!player.shift || player.speed === 0) && screechSoundPlaying){
            screechSoundPlaying = false;
            stopSound(sounds.get("screech"));
        }
        //raceEndDisplay();
        if(player.gamestate == "finished") raceEndDisplay();
        if(player.overheat) overheatDisplay();
    }



    requestAnimationFrame(gameLoop);
}

//draw sprite with assigned color
gameLoop();