// create new audio context
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext;
var ambisonicsEncoders = [];
var objectGainNodes = [];
var ambisonicsRotator;
var audioListener = context.listener;
var binauralDecoder;
var audioElementsObjects;
var sourceNodesObjects;
const SPATIALIZATION_UPDATE_MS = 25;
var pause = true;
var isplaying = false;

audioElementsObjects = new Audio();
audioElementsObjects.src = './audio/Test.wav';
sourceNodesObjects = context.createMediaElementSource(audioElementsObjects); // load audio source via mediaElementAudioSourceNodes
objectGainNodes = context.createGain();

console.log(sourceNodesObjects);

sourceNodesObjects.connect(objectGainNodes);
objectGainNodes.connect(context.destination);

setInterval(function() {
    // console.log('Pause:' + pause);
    // console.log('PauseF:' + player.paused());
    if ((pause&&!player.paused())){
        console.log('Change');
        isplaying = !isplaying;
        pause = !pause;
        audioElementsObjects.play();
    }
}, SPATIALIZATION_UPDATE_MS);

