'use strict';

const baseURL = "http://127.0.0.1:5001/"
let remoteVideo = document.querySelector('#remoteVideo');
let mediaPipeHands;
let mediaPipeCamera;
let otherUser;
let remoteRTCMessage;

let iceCandidatesFromCaller = [];
let peerConnection;
let remoteStream;
let localStream;

let callInProgress = false;
//event from html
function call() {
    let userToCall = document.getElementById("callName").value;
    otherUser = userToCall;
    createPeerConnection();
    beReady()
        .then(bool => {
            processCall(userToCall)
        })
}

//event from html
function answer() {
    //do the event firing

    beReady()
        .then(bool => {
            processAccept();
        })

    document.getElementById("answer").style.display = "none";
}

let pcConfig = {
    "iceServers":
        [
            {
                "url": "TURNS:freeturn.net:5349",
                "username": "free",
                "credential": "free"
            }
        ]
};

// Set up audio and video regardless of what devices are present.
let sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
};

/////////////////////////////////////////////

let socket;
let callSocket;
function connectSocket() {
    let ws_scheme = window.location.protocol == "https:" ? "wss://" : "ws://";
    console.log(ws_scheme);

    callSocket = new WebSocket(
        ws_scheme
        + window.location.host
        + '/ws/call/'
    );

    callSocket.onopen = event =>{
    //let's send myName to the socket
        callSocket.send(JSON.stringify({
            type: 'login',
            data: {
                name: myName
            }
        }));
    }
    
    callSocket.onmessage = (e) =>{
        let response = JSON.parse(e.data);
        console.log("Message received from server:", response);
        // console.log(response);

        let type = response.type;

        if(type == 'connection') {
            console.log(response.data.message)
        }

        if(type == 'call_received') {
            // console.log(response);
            onNewCall(response.data)
        }

        if(type == 'call_answered') {
            onCallAnswered(response.data);
        }

        if(type == 'ICEcandidate') {
            onICECandidate(response.data);
        }
        if (type == 'chat_message') {
            displayMessage(response.data.message, 'received');
            console.log("Received message: ", response.data.message);
        }
    };

    const onNewCall = (data) =>{
        //when other called you
        //show answer button

        otherUser = data.caller;
        remoteRTCMessage = data.rtcMessage

        // document.getElementById("profileImageA").src = baseURL + callerProfile.image;
        document.getElementById("callerName").innerHTML = otherUser;
        document.getElementById("call").style.display = "none";
        document.getElementById("answer").style.display = "block";
    }

    const onCallAnswered = (data) =>{
        //when other accept our call
        remoteRTCMessage = data.rtcMessage
        peerConnection.setRemoteDescription(new RTCSessionDescription(remoteRTCMessage));

        document.getElementById("calling").style.display = "none";

        console.log("Call Started. They Answered");
        // console.log(pc);

        callProgress()
    }

    const onICECandidate = (data) =>{
        // console.log(data);
        console.log("GOT ICE candidate");

        let message = data.rtcMessage

        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });

        if (peerConnection) {
            console.log("ICE candidate Added");
            peerConnection.addIceCandidate(candidate);
        } else {
            console.log("ICE candidate Pushed");
            iceCandidatesFromCaller.push(candidate);
        }

    }

}

/**
 * 
 * @param {Object} data 
 * @param {number} data.name - the name of the user to call
 * @param {Object} data.rtcMessage - the rtc create offer object
 */
// var btnSendMsg = document.querySelector('#btn-send-msg');
// var messagelist = document.querySelector('#message-list');
// var messageInput = document.querySelector ('#msg');
// btnSendMsg.addEventListener('click', SendMsgOnClick);

function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    if (message && peerConnection.dataChannel.readyState === "open") {
        peerConnection.dataChannel.send(message);
        console.log("Data Channel State:", peerConnection.dataChannel.readyState);
        displayMessage(message, 'sent');
        console.log("done connect");
        chatInput.value = '';
    } else {
        console.log("Data Channel is not open or message is empty.");
    }
}
function displayMessage(message, type) {
    const li = document.createElement("li");
    li.textContent = type === 'sent' ? `Me: ${message}` : `Stranger: ${message}`;
    console.log(li.textContent)
    document.querySelector("#message-list").appendChild(li);
    console.log("done display");
}

function sendCall(data) {
    //to send a call
    console.log("Send Call");

    // socket.emit("call", data);
    callSocket.send(JSON.stringify({
        type: 'call',
        data
    }));

    document.getElementById("call").style.display = "none";
    // document.getElementById("profileImageCA").src = baseURL + otherUserProfile.image;
    document.getElementById("otherUserNameCA").innerHTML = otherUser;
    document.getElementById("calling").style.display = "block";
}



/**
 * 
 * @param {Object} data 
 * @param {number} data.caller - the caller name
 * @param {Object} data.rtcMessage - answer rtc sessionDescription object
 */
function answerCall(data) {
    //to answer a call
    // socket.emit("answerCall", data);
    callSocket.send(JSON.stringify({
        type: 'answer_call',
        data
    }));
    callProgress();
}

/**
 * 
 * @param {Object} data 
 * @param {number} data.user - the other user //either callee or caller 
 * @param {Object} data.rtcMessage - iceCandidate data 
 */
function sendICEcandidate(data) {
    //send only if we have caller, else no need to
    console.log("Send ICE candidate");
    // socket.emit("ICEcandidate", data)
    callSocket.send(JSON.stringify({
        type: 'ICEcandidate',
        data
    }));

}
const localVideo = document.getElementsByClassName('localVideo')[0];
const out3 = document.getElementsByClassName('output_video')[0];
const controlsElement3 = document.getElementsByClassName('control3')[0];
const canvasCtx3 = out3.getContext('2d');
let landmarksBuffer = [];
let sendingLandmarks = false;

function saveData(data) {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dat.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

let lastResult = '';
function onResultsHands(results){
    canvasCtx3.save();
    canvasCtx3.clearRect(0, 0, out3.width, out3.height);
    canvasCtx3.drawImage(
        results.image, 0, 0, out3.width, out3.height);
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';
            const landmarks = results.multiHandLandmarks[index];

            if (!isRightHand) {
                const normalizedLandmarks = makeLandmarkTimestep(landmarks);
                analyzeSignLanguage(normalizedLandmarks);
            }

            drawConnectors(
                canvasCtx3, landmarks, HAND_CONNECTIONS,
                { color: isRightHand ? '#00FF00' : '#FF0000' }),
            drawLandmarks(canvasCtx3, landmarks, {
                color: isRightHand ? '#00FF00' : '#FF0000',
                fillColor: isRightHand ? '#FF0000' : '#00FF00',
            });
        }
    }
    canvasCtx3.restore();
}
function makeLandmarkTimestep(landmarks) {
    const baseX = landmarks[0].x;
    const baseY = landmarks[0].y;
    const baseZ = landmarks[0].z;

    const centerX = landmarks.reduce((sum, lm) => sum + lm.x, 0) / landmarks.length;
    const centerY = landmarks.reduce((sum, lm) => sum + lm.y, 0) / landmarks.length;
    const centerZ = landmarks.reduce((sum, lm) => sum + lm.z, 0) / landmarks.length;

    const distances = landmarks.slice(1).map(lm => Math.sqrt((lm.x - centerX) ** 2 + (lm.y - centerY) ** 2 + (lm.z - centerZ) ** 2));
    const scaleFactors = distances.map(dist => 1.0 / dist);

    const normalizedLandmarks = [
        0.0, 0.0, 0.0, landmarks[0].visibility
    ];

    for (let i = 1; i < landmarks.length; i++) {
        const lm = landmarks[i];
        const scaleFactor = scaleFactors[i - 1];
        normalizedLandmarks.push((lm.x - baseX) * scaleFactor);
        normalizedLandmarks.push((lm.y - baseY) * scaleFactor);
        normalizedLandmarks.push((lm.z - baseZ) * scaleFactor);
        normalizedLandmarks.push(lm.visibility);
    }

    console.log(`Length of normalizedLandmarks: ${normalizedLandmarks.length}`);
    return normalizedLandmarks;
}
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.1/${file}`;
}});

hands.onResults(onResultsHands);

const camera = new Camera(localVideo, {
    onFrame: async () => {
        await hands.send({image: localVideo});
    },
    width: 480,
    height: 480
});
camera.start();

// camera.onCameraStarted = () => {
//     localVideo.srcObject = camera.video.srcObject;
// };



new ControlPanel(controlsElement3, {
    selfieMode: false,
    maxNumHands: 2,
    minDetectionConfidence: 0.8,
    minTrackingConfidence: 0.8
  })
  .add([
    new StaticText({title: 'MediaPipe Hands'}),
    new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
    new Slider(
        {title: 'Max Number of Hands', field: 'maxNumHands', range: [1, 4], step: 1}),
    new Slider({
      title: 'Min Detection Confidence',
      field: 'minDetectionConfidence',
      range: [0, 1],
      step: 0.01
    }),
    new Slider({
      title: 'Min Tracking Confidence',
      field: 'minTrackingConfidence',
      range: [0, 1],
      step: 0.01
    }),
  ])
  .on(options => {
    localVideo.classList.toggle('selfie', options.selfieMode);
    hands.setOptions(options);
});
function beReady() {
    return new Promise((resolve, reject) => {
        if (camera && camera.video && camera.video.srcObject) {
            localVideo.srcObject = camera.video.srcObject;
            localStream = camera.video.srcObject;
            navigator.mediaDevices.getUserMedia({
                audio: true
            })
            .then(audioStream => {
                localStream = new MediaStream([...camera.video.srcObject.getTracks(), ...audioStream.getTracks()]);
                localVideo.srcObject = localStream;

                createConnectionAndAddStream().then(resolve).catch(reject);
            })
            .catch(error => {
                reject(error);
            });
        } else {
            reject(new Error("Camera is not ready or srcObject is not available"));
        }
    });
}



async function analyzeSignLanguage(normalizedLandmarks) {
    landmarksBuffer.push(normalizedLandmarks);
    if (landmarksBuffer.length === 7 ) {
        sendingLandmarks = true;
        const dataToSend = [...landmarksBuffer];
        console.log(dataToSend);
        
        landmarksBuffer = [];

        try {
            const response = await fetch('http://localhost:5001/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });

            const result = await response.json();
            if (result && result.best_class && result.best_class !== 'undefine lb' && lastResult !== result.best_class) {
                appendResult(result.best_class); 
                lastResult = result.best_class;
            } else {
                console.error('Error from server:', result.error, result.details);
            }
        } catch (error) {
            console.error('Failed to send data to server:', error);
        } finally {
            sendingLandmarks = false;
        }
    }
}

function appendResult(newResult) {
    const chatInput = document.getElementById("chat-input");
    const currentText = chatInput.value;
    chatInput.value = currentText ? `${currentText}${newResult}` : newResult; // Ghép kết quả mới với kết quả hiện tại
}

function checkLastResult() {
    lastResult = '';
}

function sendLandmarksToAPI(landmarksBuffer) {
    return fetch('http://127.0.0.1:5001/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(landmarksBuffer)
    })
    .then(response => response.json())
    .catch(error => {
        console.error('API Error:', error);
        throw error;
    });
}



function createConnectionAndAddStream() {
    return new Promise((resolve, reject) => {
        try {
            createPeerConnection();
            peerConnection.addStream(localStream);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}


function processCall(userName) {
    peerConnection.createOffer((sessionDescription) => {
        peerConnection.setLocalDescription(sessionDescription);
        sendCall({
            name: userName,
            rtcMessage: sessionDescription
        })
    }, (error) => {
        console.log("Error");
    });
}

function processAccept() {

    peerConnection.setRemoteDescription(new RTCSessionDescription(remoteRTCMessage));
    peerConnection.createAnswer((sessionDescription) => {
        peerConnection.setLocalDescription(sessionDescription);

        if (iceCandidatesFromCaller.length > 0) {
            //I am having issues with call not being processed in real world (internet, not local)
            //so I will push iceCandidates I received after the call arrived, push it and, once we accept
            //add it as ice candidate
            //if the offer rtc message contains all thes ICE candidates we can ingore this.
            for (let i = 0; i < iceCandidatesFromCaller.length; i++) {
                //
                let candidate = iceCandidatesFromCaller[i];
                console.log("ICE candidate Added From queue");
                try {
                    peerConnection.addIceCandidate(candidate).then(done => {
                        console.log(done);
                    }).catch(error => {
                        console.log(error);
                    })
                } catch (error) {
                    console.log(error);
                }
            }
            iceCandidatesFromCaller = [];
            console.log("ICE candidate queue cleared");
        } else {
            console.log("NO Ice candidate in queue");
        }

        answerCall({
            caller: otherUser,
            rtcMessage: sessionDescription
        })

    }, (error) => {
        console.log("Error");
    })
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
    try {
        peerConnection = new RTCPeerConnection(pcConfig);
        peerConnection.dataChannel = peerConnection.createDataChannel("chat");

        setupDataChannelEvents(peerConnection.dataChannel);

        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;
        console.log('RTCPeerConnnection and Data Channel created');
    } catch (e) {
        console.error('Failed to create PeerConnection or Data Channel, exception:', e);
    }
}

function setupDataChannelEvents(dataChannel) {
    dataChannel.onopen = function() {
        console.log("Data Channel is open");
    };

    dataChannel.onclose = function() {
        console.log("Data Channel is closed");
    };

    dataChannel.onerror = function(error) {
        console.error("Data Channel Error:", error);
    };

    dataChannel.onmessage = function(event) {
        console.log("Received Data Channel message:", event.data);
        displayMessage(event.data, 'received'); 
    };
    peerConnection.ondatachannel = function(event) {
        peerConnection.dataChannel = event.channel;
        setupDataChannelEvents(peerConnection.dataChannel);
    };
}




function handleIceCandidate(event) {
    // console.log('icecandidate event: ', event);
    if (event.candidate) {
        console.log("Local ICE candidate");
        // console.log(event.candidate.candidate);

        sendICEcandidate({
            user: otherUser,
            rtcMessage: {
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }
        })

    } else {
        console.log('End of candidates.');
    }
}

function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
}
function showElement(elementId) {
    document.getElementById(elementId).classList.remove('hidden');
    document.getElementById(elementId).classList.add('visible');
}

function hideElement(elementId) {
    document.getElementById(elementId).classList.remove('visible');
    document.getElementById(elementId).classList.add('hidden');
}

function login() {
    let userName = document.getElementById('userNameInput').value;
    myName = userName;
    hideElement('userName');
    showElement('call');

    document.getElementById('nameHere').innerHTML = userName;
    showElement('userInfo');

    connectSocket();
}

window.onbeforeunload = function () {
    if (callInProgress) {
        stop();
    }
};


function stop() {
    localStream.getTracks().forEach(track => track.stop());
    callInProgress = false;
    peerConnection.close();
    peerConnection = null;
    document.getElementById("call").style.display = "block";
    document.getElementById("answer").style.display = "none";
    document.getElementById("inCall").style.display = "none";
    document.getElementById("calling").style.display = "none";
    document.getElementById("endVideoButton").style.display = "none"
    otherUser = null;
}

function callProgress() {

    document.getElementById("videos").style.display = "block";
    document.getElementById("otherUserNameC").innerHTML = otherUser;
    document.getElementById("inCall").style.display = "block";

    callInProgress = true;
}