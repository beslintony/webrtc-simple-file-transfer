# Simple file transfer app

## How to set up

Install the dependencies of the client and server.

- First install the client dependencies.`

  ```(bash)
  cd client
  npm i
  ```

- Next go back the main folder

  ```(bash)
  cd ..
  ```

- Now install the server dependencies

  ```(bash)
  cd server
  npm i
  ```

- Next go back the main folder again and install the global dependencies. This will enable to run the server and client concurrently with the command `npm start`

  ```(bash)
  cd ..
  npm i
  npm start
  ```

- Alternatively, you could also start the server and client individually in separate terminals.

  - For Client:

    ```(bash)
    cd client
    npm start
    ```

  - For Server:

    ```(bash)
    cd server
    npm start
    ```

## Working With App

- Start the server and client and go to `http://localhost:3000`.
- Create a room by clicking on the button create a room.
- Join the room that was created by copying the url and pasting it on another browser tab.
- Select a file to share.
- Once the file has been select, one could sent the file to the other peer joined in the room.
- Once the file has been received, the user could download the file.
