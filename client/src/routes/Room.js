import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import { saveAs } from "file-saver";
import { useParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import Log from "../Log";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100vw;
  margin: auto;
  height: 100vh;
  background: linear-gradient(to right, #0072ff, #00c6ff);
`;

const Header = styled.h1`
  font-size: 32px;
  margin-bottom: 32px;
  color: white;
  text-align: center;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: calc(100% - 128px);
`;

const DropZone = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 400px;
  height: 400px;
  border: 2px dashed white;
  border-radius: 8px;
  color: white;
  font-size: 24px;
  font-weight: bold;
  margin: 16px;
`;

const Button = styled.button`
  font-size: 24px;
  font-weight: bold;
  color: white;
  background: transparent;
  border: 2px solid white;
  border-radius: 8px;
  padding: 16px 32px;
  cursor: pointer;
  margin: 16px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const UserList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 64px;
`;
const User = styled.li`
  font-size: 24px;
  color: white;
  margin: 0 8px;
`;

const ProgressBarContainer = styled.div`
  width: 80%;
  height: 20px;
  border: 1px solid black;
  border-radius: 10px;
  margin: 20px auto;
`;

const ProgressBar = styled.div.attrs((props) => ({
  style: {
    width: `${props.progress}%`,
  },
}))`
  height: 100%;
  background-color: red;
  border-radius: 10px;
`;

const Room = () => {
  const { roomID } = useParams();

  const [file, setFile] = useState();
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isFileReceived, setIsFileReceived] = useState(false);
  const [isReceivingData, setIsReceivingData] = useState(false);
  const [isFileSent, setIsFileSent] = useState(false);
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState([]);

  const dataChunks = useRef([]);
  const socket = useRef();
  const peer = useRef();
  const fileTransferred = useRef({});

  const SOCKET_EVENT = {
    JOIN_ROOM: "join_room",
    ROOM_FULL: "room_full",
    PEER_USER: "peer_user",
    SEND_SIGNAL: "send_signal",
    USER_JOINED: "user_joined",
    RESPONSE_SIGNAL: "response_signal",
    RESPONSE_SIGNAL_RECEIVED: "response_signal_received",
    DISCONNECTED: "disconnect",
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: "*",
    onDrop: (acceptedFiles) => {
      setFile(acceptedFiles[0]);
    },
  });

  useEffect(() => {
    socket.current = io.connect("/");
    socket.current.emit(SOCKET_EVENT.JOIN_ROOM, roomID);
    socket.current.on(SOCKET_EVENT.PEER_USER, (users) => {
      users && setUser(users);
      peer.current = initiatingPeer(users[0], socket.current.id);
      users[0] && log(`Initializing peer with user ${users[0]}`);
    });
    socket.current.on(SOCKET_EVENT.USER_JOINED, (payload) => {
      payload.socketID && setUser(payload.socketID);
      peer.current = joiningPeer(payload.signal, payload.socketID);
      log(`Initializing peer with user ${payload.socketID}`);
    });
    socket.current.on(SOCKET_EVENT.RESPONSE_SIGNAL_RECEIVED, (payload) => {
      peer.current.signal(payload.signal);
      payload.socketID && log(`Received signal from user ${payload.socketID}`);
      log(`Current peer info ${JSON.stringify(peer.current)}`);
    });
    socket.current.on(SOCKET_EVENT.ROOM_FULL, () => {
      alert("The room is currently full");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomID]);

  const initiatingPeer = (peerSocketID, socketID) => {
    const simplePeer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [],
      },
    });

    // Initialize bytesSent and bytesReceived to 0
    simplePeer.bytesSent = 0;
    simplePeer.bytesReceived = 0;

    // Add event listener to log signal exchange
    simplePeer.on("signal", (signal) => {
      log(
        `Sending signal to user ${socketID}\n Signal is: \n ${JSON.stringify(
          signal
        )} \n`
      );
      socket.current.emit(SOCKET_EVENT.SEND_SIGNAL, {
        peerSocketID: peerSocketID,
        socketID,
        signal,
      });
    });

    simplePeer.on("connect", () => {
      console.log("Peer connected from initiator");
      setIsConnected(true);
    });

    simplePeer.on("data", (data) => {
      log("Sending data:", data);
      handleReceiver(data);
    });

    simplePeer.on("close", (data) => {
      console.warn("onClose called in the initiating peer:", data);
    });

    simplePeer.on("error", (err) => console.error("error", err));
    return simplePeer;
  };

  const joiningPeer = (receivingSignal, socketID) => {
    const simplePeer = new Peer({
      initiator: false,
      trickle: false,
      config: {
        iceServers: [],
      },
    });

    receivingSignal &&
      log(
        `Receiving signal to user ${socketID}\n Signal is: \n ${JSON.stringify(
          receivingSignal
        )} \n`
      );

    // Initialize bytesSent and bytesReceived to 0
    simplePeer.bytesSent = 0;
    simplePeer.bytesReceived = 0;

    // Add event listener to log signal exchange
    simplePeer.on("signal", (signal) => {
      log(
        `Sending signal to user ${socketID}\n Signal is: \n ${JSON.stringify(
          signal
        )} \n`
      );
      socket.current.emit(SOCKET_EVENT.RESPONSE_SIGNAL, { signal, socketID });
    });

    simplePeer.on("connect", () => {
      console.log("Peer connected");
      setIsConnected(true);
    });

    simplePeer.on("data", (data) => {
      handleReceiver(data);
    });

    simplePeer.on("close", (data) => {
      console.warn("onClose called in the joining peer:", data);
    });

    simplePeer.on("error", (err) => console.error("error", err));

    simplePeer.signal(receivingSignal);
    return simplePeer;
  };

  const handleReceiver = (data) => {
    if (data.toString() === "EOF") {
      setIsFileReceived(true);
      log(`------- File received -------`);
    } else if (data.toString().includes("isFileMetaData")) {
      const metaFileData = JSON.parse(data);
      fileTransferred.current = metaFileData.metaData;
      log(`------ File meta data received -------`);
      log(`File name: ${fileTransferred.current.name}`);
      log(`File type: ${fileTransferred.current.type}`);
      log(`File size: ${fileTransferred.current.size} bytes`);
    } else {
      setIsReceivingData(true);
      dataChunks.current.push(data);
      peer.current.bytesReceived += data.byteLength;
      log(`${dataChunks.current.length} chunks received`);
    }
    log(`${peer.current.bytesReceived} bytes received`);

    // Set up an interval to update the progress of the file transfer
    const interval = setInterval(() => {
      // Calculate the progress of the file transfer
      const progress =
        (peer.current.bytesReceived / fileTransferred.current.size) * 100;

      // Update the progress bar with the calculated progress
      setProgress(progress);
    }, 100);
    // Clear the interval when the file transfer is complete
    peer.current.on("close", () => {
      clearInterval(interval);
    });
  };

  const handleSender = async () => {
    setIsFileSent(true);
    const fileMetaData = {
      metaData: {
        name: file.name,
        type: file.type,
        size: file.size,
      },
      fileData: "isFileMetaData",
    };
    peer.current.send(JSON.stringify(fileMetaData));
    log(`File Meta data send: ${JSON.stringify(fileMetaData)}`);
    let buffer = await file.arrayBuffer();
    const chunkSize = 16 * 1024;
    await delayChunk(buffer, chunkSize);
    peer.current.send("EOF");
  };

  async function delayChunk(buffer, chunkSize) {
    const startTime = Date.now();
    while (buffer.byteLength) {
      // calculate current data rate
      const dataRate =
        peer.current.bytesSent / ((Date.now() - startTime) / 1000);

      // calculate buffer delay based on current data rate and buffer amount
      const bufferDelay =
        (peer.current._channel.bufferedAmount / dataRate) * 500;

      // wait for buffer delay before sending next chunk
      await new Promise((resolve) => setTimeout(resolve, bufferDelay));
      const chunk = buffer.slice(0, chunkSize);
      buffer = buffer.slice(chunkSize, buffer.byteLength);
      peer.current.send(chunk);
      // Update bytesSent
      peer.current.bytesSent += chunk.byteLength;
      log(`${peer.current.bytesSent} bytes sent`);
    }
  }

  const createBlobFile = () => {
    if (isFileReceived) {
      const fileBlob = new Blob(dataChunks.current, {
        type: fileTransferred.current.type,
      });
      saveAs(fileBlob, fileTransferred.current.name);
      setIsFileReceived(false);
    }
  };

  const log = (message) => {
    setLogs((prevLogs) => [
      ...prevLogs,
      new Date().toLocaleString() + " " + message,
    ]);
  };

  return (
    <Container>
      <Header>File Transfer</Header>
      <Content>
        {isConnected ? (
          <>
            {!isFileSent && !isFileReceived && !isReceivingData && (
              <DropZone {...getRootProps()}>
                <input {...getInputProps()} />
                <p>Drag 'n' drop some files here</p>
              </DropZone>
            )}
            {isFileSent && !isFileReceived && (
              <div style={{ width: "10rem" }}>
                <p>Sending data...</p>
                {peer.current.bytesSent ?? 0 + " bytes sent"}
                <ProgressBarContainer>
                  <ProgressBar
                    progress={(peer.current.bytesSent / file.size) * 100}
                  />
                </ProgressBarContainer>
              </div>
            )}
            {isFileReceived && (
              <>
                <p>File received</p>
                <Button onClick={createBlobFile}>Download file</Button>
              </>
            )}
            {isReceivingData && (
              <div style={{ width: "10rem" }}>
                <p>Receiving data...</p>
                {peer.current.bytesReceived ?? 0 + " bytes received"}
                <ProgressBarContainer>
                  <ProgressBar progress={progress} />
                </ProgressBarContainer>
              </div>
            )}
            {!isFileSent && !isFileReceived && file && (
              <Button onClick={handleSender}>Send file</Button>
            )}

            <UserList>
              <User key={user}>{user}</User>
              is joined with you in the room
            </UserList>
          </>
        ) : (
          <p>Waiting for other peer to join...</p>
        )}
      </Content>
      <Log logs={logs} />
    </Container>
  );
};

export default Room;
