import React, { useState } from 'react';
import io from 'socket.io-client';
import { useRef } from 'react';
import { useEffect } from 'react';
import Video from 'Components/Video';

const App = () => {

  const [socket, setSocket] = useState<SocketIOClient.Socket>();
  const [users, setUsers] = useState<Array<IWebRTCUser>>([]);

  let localVideoRef = useRef<HTMLVideoElement>(null);

  let sendPC: RTCPeerConnection;
  let receivePCs: any;
  
  const pc_config = {
    "iceServers": [
      // {
      //   urls: 'stun:[STUN_IP]:[PORT]',
      //   'credentials': '[YOR CREDENTIALS]',
      //   'username': '[USERNAME]'
      // },
      {
        urls : 'stun:stun.l.google.com:19302'
      }
    ]
  }

  useEffect(() => {
    let newSocket = io.connect('http://localhost:8080');
    let localStream: MediaStream;

    newSocket.on('getSenderAnswer', async (data: {sdp: RTCSessionDescription}) => {
      try {
        console.log('get sender answer');
        console.log(data.sdp);
        await sendPC.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } catch (error) {
        console.log(error);
      }
    });

    newSocket.on('getSenderCandidate', async(data: {candidate: RTCIceCandidateInit}) => {
      try {
        console.log('get sender candidate');
        await sendPC.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('candidate add success');
      } catch (error) {
        console.log(error);
      }
    });

    /*
    newSocket.on('getReceiverAnswer', (data) => {

    });

    newSocket.on('getReceiverCandidate', (data) => {

    });

    newSocket.on('userEnter', (data) => {

    });

    newSocket.on('userExit', (data) => {

    });
    */
    setSocket(newSocket);

    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: 240,
        height: 240
      }
    }).then(stream => {
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      localStream = stream;

      sendPC = createSenderPeerConnection(newSocket, localStream);
      createSenderOffer(newSocket);
    }).catch(error => {
      console.log(`getUserMedia error: ${error}`);
    });
  }, []);

  const createSenderOffer = async(newSocket: SocketIOClient.Socket) => {
    try {
      let sdp = await sendPC.createOffer({offerToReceiveAudio: true, offerToReceiveVideo: true});
      console.log('create sender offer success');
      sendPC.setLocalDescription(new RTCSessionDescription(sdp));

      newSocket.emit('senderOffer', {
        sdp,
        offerSendID: newSocket.id,
        roomID: '1234'
      });
    } catch (error) {
      console.log(error);
    }
  }

  const createSenderPeerConnection = (newSocket: SocketIOClient.Socket, localStream: MediaStream): RTCPeerConnection => {

    let pc = new RTCPeerConnection(pc_config);

    /*
    // add pc to peerConnections object
    pcs = {...pcs, [socketID]: pc};
    */

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('onicecandidate');
        newSocket.emit('senderCandidate', {
          candidate: e.candidate,
          candidateSendID: newSocket.id
        });
      }
    }

    pc.oniceconnectionstatechange = (e) => {
      console.log(e);
    }
    /*
    pc.ontrack = (e) => {
      console.log('ontrack success');
      setUsers(oldUsers => oldUsers.filter(user => user.id !== socketID));
      setUsers(oldUsers => [...oldUsers, {
        id: socketID,
        stream: e.streams[0]
      }]);
    }
    */
    pc.close = () => {
      console.log('pc closed');
      // alert('GONE')
    }

    if (localStream){
      console.log('localstream add');
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    } else {
      console.log('no local stream');
    }

    // return pc
    return pc;
  }

  return (
    <div>
        <video
          style={{
            width: 240,
            height: 240,
            margin: 5,
            backgroundColor: 'black'
          }}
          muted
          ref={ localVideoRef }
          autoPlay>
        </video>
        {users.map((user, index) => {
          return(
            <Video
              key={index}
              stream={user.stream}
            />
          );
        })}
      </div>
  );
}

export default App;