
"use strict";
const IR_PATH = './decodingFilters/';
var decodingFiltersLoaded = false;
const SPATIALIZATION_UPDATE_MS = 25;
var opusSupport = [];
var normalAudio = true;

if (isMobile()) {
    normalAudio = true;
} else {
    this.audioElement = new Audio();
    if (this.audioElement.canPlayType('audio/ogg; codecs="opus"') === '') {
        normalAudio = true;
    } else {
        normalAudio = false;
    }
}

if (normalAudio) {
    var player = window.player;
    const soundEffect = new Audio();
    var allAudio = true;
    soundEffect.src = './assets/audio2.mp3';
    var tapped = function() {
        if(allAudio) {
            soundEffect.play()
            soundEffect.pause()
            soundEffect.currentTime = 0
            allAudio = false;
        }};

    document.body.addEventListener('touchstart', tapped, false)

    
    player.on("play", function () {
        console.log("Play");
        soundEffect.play();
    });

    player.on("pause", function () {
        soundEffect.pause();
        update = false;
    });

    player.on("seeked", function () {
        let currTime = this.currentTime();
        soundEffect.currentTime = currTime;
    });

    player.on("volumechange", function () {
        if (this.muted())
            soundEffect.volume = 0;
        else
            soundEffect.volume = this.volume();
    });

    setInterval(function () {
        let currentTime = player.currentTime();
        if(currentTime > 0 && !update){
            soundEffect.currentTime = currentTime;
            console.log('Update proceeded!');
            update = true;
        }

    }, SPATIALIZATION_UPDATE_MS);


} else {
    opusSupport = true;
    // create new audio context
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext;
    console.log(this.context);
    var context = this.context;
    var update = false;

    //this.playbackEventHandler = new PlaybackEventHandler(this.context);

    // create as many audio players as we need for max order
    this.sourceNode = this.context.createMediaElementSource(this.audioElement);

    this.audioPlayer = dashjs.MediaPlayer().create();
    this.audioPlayer.initialize(this.audioElement);
    this.audioPlayer.setAutoPlay(false);
    this.audioPlayer.attachSource("./assets/audio2.mpd");
    let scope = this;

    this.order = 3;

    // initialize ambisonic rotator
    this.rotator = new ambisonics.sceneRotator(this.context, this.order);
    var rotator = this.rotator;
    console.log(this.rotator);

    this.decoder = new ambisonics.binDecoder(this.context, this.order);
    let loaderFilters = new ambisonics.HOAloader(context, this.order, IR_PATH + 'mls_o' + this.order + '.wav', (buffer) => {
        this.decoder.updateFilters(buffer);
        decodingFiltersLoaded = true;
    });
    loaderFilters.load();
    console.log(this.decoder);

    this.masterGain = this.context.createGain();
    var Master = this.masterGain;
    this.masterGain.gain.value = 1.0;

    this.sourceNode.channelCount = (this.order + 1) * (this.order + 1);

    this.sourceNode.connect(this.rotator.in);
    this.rotator.out.connect(this.decoder.in);
    this.decoder.out.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    this.audioSetupComplete = true;

    var audioPlayer = this.audioPlayer;

    var player = window.player;

    player.on("play", function () {
        console.log("Play");
        audioPlayer.play();
    });

    player.on("pause", function () {
        audioPlayer.pause();
        update = false;
    });

    player.on("seeked", function () {
        let currTime = this.currentTime();
        audioPlayer.getVideoElement().currentTime = currTime;
    })

    player.on("volumechange", function () {
        if (!masterGain)
            return;

        if (this.muted())
            masterGain.gain.value = 0;
        else
            masterGain.gain.value = this.volume();
    });

    setInterval(function () {
        rotator.yaw = THETA * 180. / Math.PI;
        rotator.pitch = PHI * 180. / Math.PI;
        rotator.updateRotMtx();
        let currentTime = player.currentTime();
        if(currentTime > 0 && !update){
            audioPlayer.getVideoElement().currentTime = currentTime;
            console.log('Update proceeded!');
            update = true;
        }

    }, SPATIALIZATION_UPDATE_MS);

    document.querySelector('button').addEventListener('click', function () {
        context.resume().then(() => {
            console.log('AudioContext playback resumed successfully');
        });
    });

}