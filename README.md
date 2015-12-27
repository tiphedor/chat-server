# chat-server

Chat server based on mongodb, Socket.IO and SSL. Provide a "rest-like" API interface to interract with the database (auth, account creation, ...) and a more classic socket-based message exchange protocol. 

## Prerequisite

  - NodeJS + NPM 
  - OpenSSL (if using self-singed certificate)

## Installation

Clone and install :

    git clone https://github.com/tiphedor/chat-server.git
    cd chat-server
    npm install 
    
Then, you'll need a private key and certificate. In production, a valid SSL cert is mandatory, in developement tho, a self-signed one is fine. You can create one using the following command : 

    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
    
## Configuration

The config is located in config.js :

````
module.exports = {
    'secret': 'That's secret.',
    'database': 'mongodb://localhost:27017/chat',
    'listenPort': 3000
};
````

* secret: random, long string. This is use to encrypt tokens, so it should be kept - you guessed it - secret. (Todo: use keypair)
* database: mongo URL to your database
* listenPort: port socket.io should be listening to. Default is 3000

## Running the server : 

    node index.js
    
And that's it !

## Usage 

@todo
