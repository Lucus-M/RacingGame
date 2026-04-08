
function loadLevel(levelId){
    const fileData = require('./levels/' + levelId + '.json');

    const tiles = fileData.tiles;
    const chunks = fileData.chunk;
    const levelLayout = fileData.level;
    const layout = [];

    levelLayout.forEach(chunkId => {
        const chunkCopy = chunks[chunkId].map(row => row.slice());
        layout.push(chunkCopy);
    });

    return {
        tiles,
        layout,
    }
}

module.exports = { loadLevel };
