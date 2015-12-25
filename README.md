# chat-server

Chat server based on mongodb, Socket.IO and SSL. Provide a "rest-like" API interface to interract with the database (auth, account creation, ...) and a more classic socket-based message exchange. 

## Prerequisite

  - NodeJS + NPM 
  - OpenSSL

## Installation

Clone and install :

    git clone https://github.com/tiphedor/chat-server.git
    cd chat-server
    npm install 
    
Then, you'll need a private key and certificate. In production, a valid SSL cert is mandatory, in developement tho, a self-signed one is fine. You can create one using the following command : 

    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem

At this point you're ready, start the server with :

    node index.js
    
And that's it !

## Usage 

@todo
