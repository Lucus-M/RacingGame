const audioCtx = new AudioContext();
const sounds = new Map();

sounds.set("motor", {
    src: "./public/motor3.wav",
    loop: true,
    buffer: null,
    source: null,
    gainNode: null
});

sounds.set("offroad", {
    src: "./public/offroad2.wav",
    loop: true,
    buffer: null,
    source: null,
    gainNode: null
});

sounds.set("music", {
    src: "./public/musicTest.wav",
    loop: true,
    buffer: null,
    source: null,
    gainNode: null
});

sounds.set("music2", {
    src: "./public/musicTest2.wav",
    loop: true,
    buffer: null,
    source: null,
    gainNode: null
});

sounds.set("screech", {
    src: "./public/screech.wav",
    loop: true,
    buffer: null,
    source: null,
    gainNode: null
});

sounds.set("newLap", {
    src: "./public/newLap.wav",
    loop: false,
    buffer: null,
    source: null,
    gainNode: null
})

sounds.set("smash", {
    src: "./public/smash.wav",
    loop: false,
    buffer: null,
    source: null,
    gainNode: null
})

sounds.set("victory", {
    src: "./public/victory.mp3",
    loop: false,
    buffer: null,
    source: null,
    gainNode: null
})

async function loadSound(sound) {
    const res = await fetch(sound.src);
    const arrayBuffer = await res.arrayBuffer();
    sound.buffer = await audioCtx.decodeAudioData(arrayBuffer);

    sound.gainNode = audioCtx.createGain();
    sound.gainNode.connect(audioCtx.destination);
    sound.gainNode.gain.value = 0;

    sound.source = audioCtx.createBufferSource();
    sound.source.buffer = sound.buffer;
    sound.source.loop = sound.loop;

    sound.source.connect(sound.gainNode);
    sound.source.start();
}


function loadSounds(soundsMap) {
    soundsMap.forEach((sound) => {
        loadSound(sound);
    });
}

function updateEngineSound(speed) {
    const motor = sounds.get("motor");
    const offroad = sounds.get("offroad");

    const rate = 0.5 + Math.abs(speed) / 12;

    //console.log(player.overlapTile);

    motor.gainNode.gain.value = 1;
    //motor.gainNode.gain.value = speed <= 0 ? 0 : 1;
    offroad.source.playbackRate.value = 0.8;

    offroad.gainNode.gain.value = (player.overlapTile === "offroad" && speed != 0) ? 2 : 0;
    motor.source.playbackRate.value = rate;
}

function playSound(sound, vol){
    if(!vol) vol = 1
    sound.gainNode.gain.value = vol;
    resetSoundSmooth(sound);
}

function stopSound(sound){
    sound.gainNode.gain.value = 0;
}

function resetSoundSmooth(sound) {
    if (sound.source) {
        sound.gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0);

        setTimeout(() => {
            try { sound.source.stop(); } catch(e) {}

            const source = audioCtx.createBufferSource();
            source.buffer = sound.buffer;
            source.loop = sound.loop;

            source.connect(sound.gainNode);
            source.start();

            sound.source = source;

            sound.gainNode.gain.setTargetAtTime(1, audioCtx.currentTime, 0.02);
        }, 20);
    }
}
let soundsLoaded = false;

document.addEventListener("click", async () => {
    if (!soundsLoaded) {
        await loadSounds(sounds);
        soundsLoaded = true;
    }
});