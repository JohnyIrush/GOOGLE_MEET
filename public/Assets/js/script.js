$(function () {
    $(document).on("click", ".join-meeting", function() {
        $('.enter-code').focus();
    })

    $(document).on("click", ".join-action", function() {
        var join_value = $('.enter-code').val();
        var meetingUrl = window.location.origin + "?meetingID="+join_value
        window.location = meetingUrl
    })

    $(document).on("click", ".new-meeting", function() {
        var eight_d_value = Math.floor(Math.random() * 10000000)
        var meetingUrl = window.location.origin + "?meetingID="+eight_d_value
        window.location = meetingUrl
    })
})


// app js

var AppProcess = (function(){

    var peers_connection_ids = [];
    var peers_connection = [];
    var remote_vid_stream = [];
    var remote_aud_stream = [];
    var local_div;
    var serverProcess;
    var audio;
    var isAudioMute = true;
    var rtp_aud_senders = true;
    var video_states = {
        None: 0,
        Camera: 1,
        ScreenShare: 2
    }

    var video_st = video_states.None;
    var videoCamTrack;

    async function _init(SDP_function, my_connid) {
        serverProcess = SDP_function;
        my_connection_id = my_connid;
        eventProcess();
        local_div = document.getElementById("localVideoPlayer")
    }
    
    function eventProcess() {
        $("#micMuteUnmute").on("click", async function() {
            if (audio) {
                await loadAudio();
            }

            if (!audio) 
            {
                alert("Audio permission has not been granted");   
                return; 
            }

            if (isAudioMute) {
                audio.enabled = true;
                $(this).html('<span><i class="fas fa-microphone"></i></span>')
                updateMediaSenders(audio, rtp_aud_senders);
            }
            else
            {
                audio.enabled = false;
                $(this).html('<span><i class="fas fa-microphone-slash"></i></span>')
                removeMediaSenders(rtp_aud_senders);
            }
            isAudioMute = !isAudioMute;
        })

        $("#videoCamOnOff").on("click", async function() {
            //alert("video toggle")
            if (video_st ==   video_states.Camera) {
                await videoProcess(video_states.None)
                alert("video toggle camera off")
            }else{
                await videoProcess(video_states.Camera)
                alert("video toggle camera")
            }
        })

        $("#btnScreenShareOnOff").on("click", async function() {
            if (video_st ==   video_states.ScreenShare) {
                await videoProcess(video_states.None)
            }else{
                await videoProcess(video_states.ScreenShare)
            }
        })
    }

    async function videoProcess(newVideoState) {
        try {
          vstream = null;  
          console.log("newVideoState", newVideoState, video_states.Camera)
          if (newVideoState == video_states.Camera) {
            vstream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 1920,
                    height: 1080
                },
                audio: false
            })

           // alert("set webcam")
            //console.log("video tracks", vstream)
          } else if(newVideoState == video_st.ScreenShare){
            vstream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: 1920,
                    height: 1080
                },
                audio: false
            })
          }
          console.log("video tracks", vstream.getVideoTracks())
          if (vstream && vstream.getVideoTracks().length > 0) {
            videoCamTrack = vstream.getAudioTracks()[0]
            if (videoCamTrack)
            {
                local_div.srcObject =  new MediaStream([videoCamTrack])
                //alert("video cam found")
            }
          }
        } catch (error) {
            console.log(error)
            return;
        }

        video_st = newVideoState
    }
    var iceConfiguration = {
        iceServers: [
           { urls: "stun:stun.l.google:19302"},
           { urls: "stun:stun.l.google:19302"},
        ]
    }

    //set new connection
    function setConnection(connId) {
        /**
        * A WebRTC connection between the local computer and
        * a remote peer. It provides methods to connect to a 
        * remote peer, maintain and monitor the connection, 
        * and close the connection once it's no longer needed.
        */
        var connection = new RTCPeerConnection(iceConfiguration); // rtcp connection object

        connection.onnegotiationneeded = async function(event) {
            await setOffer(connId);
        }

        connection.onicecandidate = function(event) {
            if (event.candidate) {
                serverProcess(JSON.stringify({icecandidate: event.candidate}), connId)
            }
        }
        //fired when there is available track in connection
        connection.ontrack = function(event) {
            if (!remote_vid_stream(connId)) {
                remote_vid_stream[connId] = new MediaStream();
            }

            if (!remote_audio_stream(connId)) {
                remote_vid_stream[connId] = new MediaStream();
            }

            if (event.track.kind = "video"){
                remote_vid_stream[connId]
                .getVideoTracks()
                .forEach((t) => remote_vid_stream[connId].removeTrack(t));
                remote_vid_stream[connId],this.addTrack(event.track);
                var remoteVideoPlayer = document.getElementById("v_"+connId)
                remoteVideoPlayer.srcObject = null;
                remoteVideoPlayer.srcObject = remote_vid_stream[connId];
                remoteVideoPlayer.load();
            } 
            else if(event.track.kind == "audio")
            {
                remote_aud_stream[connId]
                .getAudioTracks()
                .forEach((t) => remote_aud_stream[connId].removeTrack(t));
                remote_aud_stream[connId],this.addTrack(event.track);
                var remoteAudioPlayer = document.getElementById("a_"+connId)
                remoteAudioPlayer.srcObject = null;
                remoteAudioPlayer.srcObject = remote_aud_stream[connId];
                remoteAudioPlayer.load();
            }
        }

        peers_connection_ids[connId] = connId;
        peers_connection[connId] = connection;

        return connection;
    }

    async function setOffer(connId)
    {
        var connection = peers_connection[connId]
        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer)
        serverProcess(JSON.stringify({
            offer: connection.setLocalDescription
        }), connId)
    }

    //sdp process
    async function SDPProcess(message, from_connid) {
        message  = JSON.parse(message);
    
        if (message.answer)
        {
            await peers_connection[from_connid].setRemoteDescription(new  
                RTCSessionDescription(message.answer))
        }
        else if (message.offer)
        {
            if (!peers_connection[from_connid]) {
                await setConnection(from_connid);
            }
            await peers_connection[from_connid].setLocalDescription(new 
                RTCSessionDescription(message.offer))
            var answer = await peers_connection[from_connid].createAnswer()
            await peers_connection[from_connid].setLocalDescription(answer)
            serverProcess(JSON.stringify({ // send to whom sent us an offer
                answer: answer
            }), from_connid)
        }
        else if(message.icecandidate)
        {
            if (!peers_connection[from_connid])
            {
                  await setConnection(from_connid)  
            }
            try {
                await peers_connection[from_connid].addIceCandidate(message.icecandidate)
            } catch (error) {
                console.log(error)
            }
        }
    }

    return {
        setNewConnection: async function(connId) { // access setNewConnection method
            await setConnection(connId);
        },
        init: async function(SDP_function, my_connid) {
            await _init(SDP_function, my_connid);
        },
        processClientFunc: async function(data, from_connid) {
            await  SDPProcess(data, from_connid);
        }
    }
})();

var myApp = (function(){

    var socket = null;
    var user_id = "";

    var meetingid = "";

    function init(uid, mid)
    {
        user_id = uid;
        meetingid = mid;
        $("#meetingContainer").show();
        $("#me h2").text(user_id + "(Me)");
        event_process_for_signaling_server();
    }

    var socket = null; // socket.io access

    //event process for signaling server
    function event_process_for_signaling_server() {
        socket = io.connect(); //connection esta

        // send data to other users 
        var SDP_function  = function(data) {
            socket.emit("SDPProcess", { // send to server
                message: data,
                to_connid: to_connid
            })
        }

        // client side socket.io connection
        socket.on("connect", ()=>{
            //alert("socket connected to client side")

            if(socket.connected) // check user if connected
            {
                AppProcess.init(SDP_function, socket.id);
                if (user_id != "" && meetingid != "") {
                    socket.emit("userconnect", {
                        displayName: user_id,
                        meetingid: meetingid
                    })
                }
            }
        })

        // inform other users connection
        socket.on("inform_others_about_me", function(data) {
            addUser(data.other_user_id, data.connId) // add new user to the conference
            AppProcess.setNewConnection(data.connId) // set webrtc connection
        })

        // listen for other users connection
        socket.on("inform_me_about_other_user", function(other_users) {

            if (other_users) {
               for (let i = 0; i < other_users.length; i++) {
                //const element = other_users[i];
                addUser(other_users[i].user_id, other_users[i].connectionId) // add new user to the conference
                AppProcess.setNewConnection(other_users[i].connectionId) // set webrtc connection
               } 
            }
        })
        socket.on("SDPProcess", async function(data) {
            await AppProcess.processClientFunc(data.message, data.from.connid)
        })

    }

    // add new users interface template in the conference
    function addUser(other_user_id, connId) {
        var newDivId = $("#otherTemplate").clone(); // clone the interface

        newDivId = newDivId.attr("id", connId).addClass("other")
        newDivId.find("h2").text(other_user_id)
        newDivId.find("video").attr("id", "v_" + connId)
        newDivId.find("audio").attr("id", "a_" + connId)
        newDivId.show()
        alert("add User")
        $("#divUsers").append(newDivId)
    }
    
   return {
    _init: function(uid, mid) {
        init(uid, mid)
    }
   } 
})();




