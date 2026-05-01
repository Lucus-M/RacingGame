
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

        placeText = index+1 + "- ";
        playersNameList = name.padEnd(16, " ") + "\n";
                
        drawText(placeText, S_WIDTH + 16, 16*10 + (8 * index), placeColor);
        drawText(playersNameList, S_WIDTH + 16 + (3*8), 16*10 + (8 * index), color);
    });
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

    if(player.rc && !player.mc && !player.rev){
        speedColor = 5;
        speedText = "TURBO"
    }
    else if(player.speed >= 10 && !player.rc){
        speedColor = 2;
    }
    else if((player.speed < 0 || player.rev)){
        speedText = "REV. ";
        speedColor = 3
    }
    else if(player.mc){
        speedColor = 8;
        speedText = "BREAK";
    }

    drawText( speedText + "-\n  " + (Math.round(Math.abs((player.speed))) * 20 + "Mph").padStart(8, " "), S_WIDTH + 16, 8*10, speedColor);

    racePosDisplay();
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
                    //draw each level tile
                    drawObject(
                        x * 16,
                        Math.floor((((y * 16) + (256 * ((player.ty/256)-player.chunk))) - 256) - (BASE_OB - player.offsetBottom)),
                        levelImages[tile]
                    );
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
            let y = checkTrackPosition(p);

            drawObject(Math.round(p.tx), y, carSprite, 16*p.animationFrame, p.color*16, 16, 16, 16, 16);
            //ctx.fillText(p.name, p.x, y-15);

            //draw opponent's map point position
            drawMapPoint(S_WIDTH, p);
        });

        //draw player's point on left position bar
        drawMapPoint(S_WIDTH, player)
        
        //draw each race position display
        drawHUD();
        
        drawObject(Math.round(player.tx), player.offsetBottom, carSprite, 16*player.animationFrame, player.color*16, 16, 16, 16, 16);
    }

    //send mouse position to server
    if(mousePos.x !== prevMousePos.x){
        //console.log(mousePos.x + " " + prevMousePos.x);
        sendMousePos(mousePos);
    }
    
    //brake
    if(middleClick && player.speed != 0 && !screechSoundPlaying){
        screechSoundPlaying = true;
        playSound(sounds.get("screech"));
    }

    //stop brake sound
    else if((!middleClick || player.speed === 0) && screechSoundPlaying){
        screechSoundPlaying = false;
        stopSound(sounds.get("screech"));
    }

    requestAnimationFrame(gameLoop);
}

//draw sprite with assigned color
gameLoop();