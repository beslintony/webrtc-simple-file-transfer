import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const CreateRoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(to right, #0072ff, #00c6ff);
`;

const CreateRoomMessage = styled.p`
  font-size: 18px;
  font-weight: bold;
  color: white;
  margin-bottom: 32px;
`;

const CreateRoomButton = styled.button`
  font-size: 24px;
  font-weight: bold;
  color: white;
  background: transparent;
  border: 2px solid white;
  border-radius: 8px;
  padding: 16px 32px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:active {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const CreateRoom = () => {
  const navigate = useNavigate();
  const words = ["apple", "banana", "orange", "pear", "grape", "strawberry"];
  const handleClick = () => {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomNumber = Math.floor(Math.random() * 10000);
    const roomName = `${randomWord}-${randomNumber}`;
    navigate(`/room/${roomName}`);
  };

  return (
    <CreateRoomContainer>
      <CreateRoomMessage>
        To transfer files, create a room by clicking the button below:
      </CreateRoomMessage>
      <CreateRoomButton onClick={handleClick}>Create room</CreateRoomButton>
    </CreateRoomContainer>
  );
};

export default CreateRoom;
