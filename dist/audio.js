"use strict";

var audioElementsObjects = [];
var GainNodes = [];
var sourceNodesObjects = [];
var a = [];
var overlay = false;
var delay = 0;
var synccounter = 0;
var waiting = false;
var isSync = false;

window.onload = function () {

    // Check if is IOS 13 when page loads.
    if ( window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === 'function' ){
  
        // Everything here is just a lazy banner. You can do the banner your way.
        const banner = document.createElement('div')
        //const banner = document.getElementById('banner');
        const video = document.getElementById('footer');
        banner.innerHTML = `<div style="z-index: 1; position: absolute; width: 100%; background-color:#000; color: #fff"><p style="padding: 10px">Click here to enable DeviceMotion</p></div>`
        banner.onclick = ClickRequestDeviceMotionEvent // You NEED to bind the function into a onClick event. An artificial 'onClick' will NOT work.
        document.querySelector('body').appendChild(banner);
        video.insertBefore(banner,video.childNodes[0]);
    }
  }
  
  
  function ClickRequestDeviceMotionEvent () {
    window.DeviceMotionEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('devicemotion',
            () => { console.log('DeviceMotion permissions granted.') },
            (e) => { throw e }
        )} else {
          console.log('DeviceMotion permissions not granted.')
        }
      })
      .catch(e => {
        console.error(e)
      })
  }

const IR_PATH = './decodingFilters/';
var decodingFiltersLoaded = false;
const SPATIALIZATION_UPDATE_MS = 25;
var opusSupport = [];
var normalAudio = true;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var videoToLoad = [];
if(urlParams.has('video')){
     videoToLoad = urlParams.get('video');
} else{
     videoToLoad = 'DemoVideo';
}
console.log(videoToLoad);

document.getElementById('videojs-panorama-player').setAttribute('poster','./assets/' + videoToLoad + '.jpg');

var player = window.player;
var volumeMaster = player.volume();
player.src('./assets/' + videoToLoad + '.mp4');
this.audioElement = new Audio();

if (isMobile() && this.audioElement.canPlayType('audio/ogg; codecs="opus"') === '') {
    normalAudio = true;
} else {
    if (this.audioElement.canPlayType('audio/ogg; codecs="opus"') === '') {
        normalAudio = true;
    } else {
        normalAudio = false;
    }
}

 if (normalAudio) {
    var soundEffect = new Audio();
    soundEffect.src = './assets/' + videoToLoad + '.flac';
    soundEffect.autoload = true;
    console.log(soundEffect);
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext;
    console.log(this.context);
    var context = this.context;
    unlockAudioContext(this.context);
    function unlockAudioContext(audioCtx) {
        if (context.state !== 'suspended') return;
        const b = document.body;
        const events = ['touchstart','touchend', 'mousedown','keydown'];
        events.forEach(e => b.addEventListener(e, unlock, false));
        function unlock() { audioCtx.resume().then(clean); }
        function clean() { events.forEach(e => b.removeEventListener(e, unlock)); console.log(audioCtx.state)}
      }

    var allAudio = true;
    //soundEffect.load();
    //soundEffect2.load();
    // soundEffect2.src = './assets/' + videoToLoad + '90.mp3';
    // const audio1 = new Audio();
    // audio1.src = './assets/' + videoToLoad + '.mp3';
    
     this.audioNode = context.createMediaElementSource(soundEffect);

    this.audioNode.channelCount = 4;

    // this.context.createGain();
    // console.log(this.context.state); // running
    function loadsoundSource(){
        soundEffect.load();
    }

    async function loadaudio() {
        document.getElementById('overlay').style.display = "block";
        overlay = true;
        await loadsoundSource();
    }

    var tapped = function() {
        if(allAudio) {
            //player.controls(false);
            loadaudio();
            allAudio = false;
            console.log('AudioContext playback resumed successfully');
        }
    };

    // // document.querySelector('button').addEventListener('click', function () {
    // //     context.resume().then(() => {
    // //         console.log('AudioContext playback resumed successfully');
    // //     });
    // // });

    document.body.addEventListener('touchstart', tapped, false);

    this.order = 1;

    this.rotator = new ambisonics.sceneRotator(this.context, this.order);
    var rotator = this.rotator;
    console.log(this.rotator);
    this.decoder = new ambisonics.binDecoder(this.context, this.order);
    var binauralDecoder = this.decoder;
    // let loaderFilters = new ambisonics.HOAloader(context, this.order, IR_PATH + 'mls_o' + this.order + '.wav', (buffer) => {
    //     this.decoder.updateFilters(buffer);
    //     decodingFiltersLoaded = true;
    // });
    // loaderFilters.load();

    var assignSample2Filters = function(decodedBuffer) {
        decoder.updateFilters(decodedBuffer);
    }
    function loadSample(url, doAfterLoading) {
        var fetchSound = new XMLHttpRequest(); // Load the Sound with XMLHttpRequest
        fetchSound.open("GET", url, true); // Path to Audio File
        fetchSound.responseType = "arraybuffer"; // Read as Binary Data
        fetchSound.onload = function() {
            context.decodeAudioData(fetchSound.response, doAfterLoading, console.log('Error'));
        }
        fetchSound.send();
    };
    loadSample(IR_PATH + 'mls_o1_01-04ch.wav', assignSample2Filters);

    // this.audioNode.connect(this.rotator.in);
    // this.rotator.out.connect(this.decoder.in);
    // this.decoder.out.connect(context.destination);

    // this.audioNode.connect(this.rotator.in)
    // this.rotator.out.connect(this.decoder.in);
    // this.decoder.out.connect(context.destination);
    //this.audioNode.connect(context.destination);

    this.mtx = numeric.identity(4);
    var request = new XMLHttpRequest();
    var url = './dist/DecoderStereo.json';
    request.open("GET",url,false);
    request.send(null);
    var jsonData = JSON.parse(request.responseText);
    for (let i=0; i<4; i++){
        this.mtx[i] = jsonData.Decoder.Matrix[i];
    }

    var mtx = this.mtx;


    var Decoder = [];
    Decoder.in = this.context.createChannelSplitter(4);
    Decoder.out = this.context.createChannelMerger(4);
    this.gain = new Array(4);
    this.filter = new Array(4);
    this.nCh = 4;
    var NOut = 2;
    for (var row = 0; row < this.nCh; row++) {
        this.gain[row] = new Array(this.nCh);
        this.filter[row] = context.createBiquadFilter();
        for (var col = 0; col < this.nCh; col++) {
            this.gain[row][col] = this.context.createGain();
            if (col>= NOut){
                this.gain[row][col].gain.value = 0;
            } else{
                this.gain[row][col].gain.value = this.mtx[row][col];
            }
            if (row>= NOut){
                this.gain[row][col].gain.value = 0;
            } else{
                this.gain[row][col].gain.value = this.mtx[row][col];
            }
            
            if (row == 3){
                this.filter[row].type = "lowpass";
            }else{
                this.filter[row].type = "highpass";
            }
            this.filter[row].frequency.setValueAtTime(100, context.currentTime);
            Decoder.in.connect(this.gain[row][col],col,0);
            this.gain[row][col].connect(this.filter[row]).connect(Decoder.out, 0, row);
        }
    }

    var gain = this.gain;
    var filter = this.filter;

    // context.destination.channelCount = 2;
    // this.context.destination.channelInterpretation = "discrete";
    context = this.context;
    this.audioNode.connect(this.rotator.in);
    this.rotator.out.connect(Decoder.in);
    Decoder.out.connect(this.context.destination);
    

    // } else{
    //     this.sourceNode.connect(this.rotator.in);
    //     this.rotator.out.connect(this.decoder.in);
    //     this.decoder.out.connect(this.masterGain);
    //     this.masterGain.connect(this.context.destination);

    // }

    var select = document.getElementById("Decoder");
    select.onchange = function(){
        if(select.selectedIndex == 1){
            rotator.out.disconnect();
            Decoder.out.disconnect();

            rotator.out.connect(binauralDecoder.in);
            binauralDecoder.out.connect(context.destination);
        }else if(select.selectedIndex == 0){
            rotator.out.disconnect();
            Decoder.out.disconnect();
            
            rotator.out.connect(Decoder.in);
            Decoder.out.connect(context.destination);
        }
    };
    
    var holdonplay = false;
    player.on("play", function () {
        console.log("Play");
        if (player.currentTime() == 0){
            holdonplay = true;
        }
        else {
            soundEffect.play();
            holdonplay = false;
        }
    });

    player.on("pause", function () {
        soundEffect.pause();
        update2 = false;
    });

    player.on("seeked", function () {
        soundEffect.currentTime = this.currentTime();
    });


    player.on("volumechange", function () {
        if (this.muted())
        soundEffect.volume = 0;
        else
        soundEffect.volume = this.volume();
    });

    setInterval(function () {
        rotator.yaw = -THETA * 180. / Math.PI +180;
        rotator.pitch = PHI * 180. / Math.PI -90;
        rotator.updateRotMtx();
        // let currentTime = player.currentTime();
        // if(currentTime > 0 && !update){
        //     soundEffect.currentTime = currentTime;
        //     console.log('Update proceeded!');
        //     console.log(soundEffect.readyState);
        //     update = true;
        // }
        if(soundEffect.readyState == 4 && overlay) {
            document.getElementById('overlay').style.display = "none";
            overlay = false;
        }
        let currentTime = soundEffect.currentTime;
        if(currentTime > 0 && !update){
            player.currentTime(currentTime);
            player.controls(true);
            console.log('Update proceeded!');
            console.log(soundEffect.readyState);
            update = true;
        }
        let currentTime2 = player.currentTime();
        if(currentTime > 0 && !update2){
            soundEffect.currentTime = currentTime2;
            player.controls(true);
            console.log('Update proceeded!');
            console.log(soundEffect.readyState);
            update2 = true;
        }
        if (holdonplay && player.currentTime() > 0) {
            soundEffect.play();
            holdonplay = false;
        }
        
    }, SPATIALIZATION_UPDATE_MS);


} else {
    player.controls(false);
    opusSupport = true;
    // create new audio context
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext;
    console.log(this.context);
    var context = this.context;
    var update = false;
    var update2 = true;

    //this.playbackEventHandler = new PlaybackEventHandler(this.context);

    // create as many audio players as we need for max order
    this.sourceNode = this.context.createMediaElementSource(this.audioElement);

    this.audioPlayer = dashjs.MediaPlayer().create();
    this.audioPlayer.initialize(this.audioElement);
    this.audioPlayer.setAutoPlay(false);
    this.audioPlayer.attachSource("./assets/" + videoToLoad + ".mpd");
    let scope = this;

    this.order = 3;

    // initialize ambisonic rotator
    this.rotator = new ambisonics.sceneRotator(this.context, this.order);
    var rotator = this.rotator;
    console.log(this.rotator);

    this.decoder = new ambisonics.binDecoder(this.context, this.order);
    var binauralDecoder = this.decoder;
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
    let maxChannel = context.destination.maxChannelCount;
    context.destination.maxChannel = 6;
    console.log(maxChannel);

    // if (maxChannel >= 6){
        // Decoder
    this.mtx = numeric.identity(this.sourceNode.channelCount);
    var request = new XMLHttpRequest();
    var url = './dist/DecoderStereo.json';
    request.open("GET",url,false);
    request.send(null);
    var jsonData = JSON.parse(request.responseText);
    for (let i=0; i<16; i++){
        this.mtx[i] = jsonData.Decoder.Matrix[i];
    }

    var mtx = this.mtx;


    var Decoder = [];
    Decoder.in = this.context.createChannelSplitter(this.sourceNode.channelCount);
    Decoder.out = this.context.createChannelMerger(this.sourceNode.channelCount);
    this.gain = new Array(this.sourceNode.channelCount);
    this.filter = new Array(this.sourceNode.channelCount);
    this.nCh = this.sourceNode.channelCount;
    var NOut = 2;
    for (var row = 0; row < this.nCh; row++) {
        this.gain[row] = new Array(this.nCh);
        this.filter[row] = context.createBiquadFilter();
        for (var col = 0; col < this.nCh; col++) {
            this.gain[row][col] = this.context.createGain();
            if (col>= NOut){
                this.gain[row][col].gain.value = 0;
            } else{
                this.gain[row][col].gain.value = this.mtx[row][col];
            }
            if (row>= NOut){
                this.gain[row][col].gain.value = 0;
            } else{
                this.gain[row][col].gain.value = this.mtx[row][col];
            }
            
            if (row == 3){
                this.filter[row].type = "lowpass";
            }else{
                this.filter[row].type = "highpass";
            }
            this.filter[row].frequency.setValueAtTime(100, context.currentTime);
            Decoder.in.connect(this.gain[row][col],col,0);
            this.gain[row][col].connect(this.filter[row]).connect(Decoder.out, 0, row);
        }
    }

    if(maxChannel >= 6){
        let select = document.getElementById("Decoder");
        var option = document.createElement('option');
        option.text = option.value = '5.1 Surround';
        select.add(option, 3);
        this.mtx2 = numeric.identity(this.sourceNode.channelCount);
        var request2 = new XMLHttpRequest();
        var url2 = './dist/Decoder.json';
        request2.open("GET",url2,false);
        request2.send(null);
        var jsonData2 = JSON.parse(request2.responseText);
        for (let i=0; i<16; i++){
            this.mtx2[i] = jsonData2.Decoder.Matrix[i];
        }
    
        var mtx2 = this.mtx2;
    
    
        var Decoder2 = [];
        Decoder2.in = this.context.createChannelSplitter(this.sourceNode.channelCount);
        Decoder2.out = this.context.createChannelMerger(this.sourceNode.channelCount);
        this.gain2 = new Array(this.sourceNode.channelCount);
        this.filter2 = new Array(this.sourceNode.channelCount);
        this.nCh2 = this.sourceNode.channelCount;
        NOut = 6;
        for (let row = 0; row < this.nCh; row++) {
            this.gain2[row] = new Array(this.nCh);
            this.filter2[row] = context.createBiquadFilter();
            for (let col = 0; col < this.nCh; col++) {
                this.gain2[row][col] = this.context.createGain();
                if (col>= NOut){
                    this.gain2[row][col].gain.value = 0;
                } else{
                    this.gain2[row][col].gain.value = this.mtx2[row][col];
                }
                if (row>= NOut){
                    this.gain2[row][col].gain.value = 0;
                } else{
                    this.gain2[row][col].gain.value = this.mtx2[row][col];
                }
                
                if (row == 3){
                    this.filter2[row].type = "lowpass";
                }else{
                    this.filter2[row].type = "highpass";
                }
                this.filter2[row].frequency.setValueAtTime(100, context.currentTime);
                Decoder2.in.connect(this.gain2[row][col],col,0);
                this.gain2[row][col].connect(this.filter2[row]).connect(Decoder2.out, 0, row);
            }
        }

    }
    var gain = this.gain;
    var filter = this.filter;

    context.destination.channelCount = 2;
    this.context.destination.channelInterpretation = "discrete";
    context = this.context;
    this.sourceNode.connect(this.rotator.in);
    this.rotator.out.connect(Decoder.in);
    Decoder.out.connect(this.masterGain);
    // this.rotator.out.connect(this.decoder.in);
    // this.decoder.out.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    

    // } else{
    //     this.sourceNode.connect(this.rotator.in);
    //     this.rotator.out.connect(this.decoder.in);
    //     this.decoder.out.connect(this.masterGain);
    //     this.masterGain.connect(this.context.destination);

    // }

    var select = document.getElementById("Decoder");
    select.onchange = function(){
        if(select.selectedIndex == 1){
            rotator.out.disconnect();
            if (typeof Decoder2 != "undefined") {
                Decoder2.out.disconnect();
             }
            Decoder.out.disconnect();
            context.destination.channelCount = 2;

            rotator.out.connect(binauralDecoder.in);
            binauralDecoder.out.connect(Master);
        }else if(select.selectedIndex == 0){
            rotator.out.disconnect();
            Decoder.out.disconnect();
            context.destination.channelCount = 2;
            if (typeof Decoder2 != "undefined") {
                Decoder2.out.disconnect();
             }
            
            rotator.out.connect(Decoder.in);
            Decoder.out.connect(Master);
        }else if(select.selectedIndex == 2){
            context.destination.channelCount = 6;
            rotator.out.disconnect();
            Decoder.out.disconnect();
            rotator.out.connect(Decoder2.in);
            Decoder2.out.connect(Master);
        }
    };
    

    this.audioSetupComplete = true;
    player.controls(true);

    var audioPlayer = this.audioPlayer;

    player.on("play", function () {
        console.log("Play");
        audioPlayer.play();
        // camera.lookAt(this.camera.target);
    });

    player.on("pause", function () {
        audioPlayer.pause();
        update = false;
        synccounter = 0;
        isSync = false;
    });

    player.on("seeked", function () {
        player.addClass("vjs-seeking");
        let work = async () => {
            await sleep(10);
            waiting = true;
            movie.pause();
            audioElementsObjects.pause();
            await sleep(1500);
            let time = movie.currentTime();
            audioPlayer.getVideoElement().currentTime = time;
            //movie.currentTime(audioElementsObjects.currentTime);
            movie.removeClass("vjs-seeking");
            waiting = false;
            movie.play();
            //audioElementsObjects.play();
            synccounter = 0;
            isSync = false;
            }
        work();
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
        rotator.yaw = -THETA * 180. / Math.PI +180;
        rotator.pitch = PHI * 180. / Math.PI -90;
        rotator.updateRotMtx();
        // let currentTime = player.currentTime();
        // if(currentTime > 0 && !update){
        //     audioPlayer.getVideoElement().currentTime = currentTime;
        //     console.log('Update proceeded!');
        //     update = true;
        // }

    }, SPATIALIZATION_UPDATE_MS);

    setInterval(function() {
        delay = player.currentTime()-audioPlayer.getVideoElement().currentTime;
        if(synccounter < 10){
            if((!isSync && player.currentTime() > 0 || Math.abs(player.currentTime()-audioPlayer.getVideoElement().currentTime)>0.07) && audioPlayer.isReady() && player.readyState() == 4){
                audioPlayer.getVideoElement().currentTime = audioPlayer.getVideoElement().currentTime+delay;
                console.log('Sync!');
                isSync = true;
                synccounter = synccounter + 1;
        }
        } else if (synccounter == 10) {
            audioPlayer.getVideoElement().currentTime = audioPlayer.getVideoElement().currentTime+delay;
            synccounter = synccounter + 1;
            //document.getElementById("syncerror").innerHTML = "<span style='color: red;'>Error: Your Browser is not able to sync audio and video automatically. Please press pause and play!</span>";
        }
    }, 10);

    document.querySelector('button').addEventListener('click', function () {
        context.resume().then(() => {
            console.log('AudioContext playback resumed successfully');
        });
    });

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
     }

}