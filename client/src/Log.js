import styled from "styled-components";

const Logs = styled.div`
  width: 90%;
  height: 200px;
  overflow-y: scroll;
  margin: auto;
  background-color: #ccc;
  font-family: monospace;
  padding: 10px;
`;

const Log = ({ logs }) => {
  return (
    <Logs>
      {logs.map((log, index) => (
        <li key={index}>{log}</li>
      ))}
    </Logs>
  );
};

export default Log;
