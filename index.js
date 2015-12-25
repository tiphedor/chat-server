// Local packages

var User    = require('./models/users'),
	Message = require('./models/messages'),
	config  = require('./config');

// NPM packages 

var mongoose  = require('mongoose'),
    jwt       = require('jsonwebtoken'),
    sanitizer = require('sanitizer'),
    fs        = require('fs'),
    https     = require('https');

// SSL setup

var privateKey = fs.readFileSync('key.pem').toString();
var cert       = fs.readFileSync('cert.pem').toString();

var httpsSetup = {
	key:privateKey,
	cert:cert
};

var app = https.createServer(httpsSetup);
io = require('socket.io').listen(app);
app.listen(3000, '0.0.0.0');

mongoose.connect(config.database);




var clients = {};

/**
 * Checks the integrity and validity of a token, using the applciation secret. if token is ok, cb will be called. Otherwise, an error message will be sent to the specified socket, with the specified endpoint
 */
function checkToken(args, socket, endpoint, cb) {
	var token = args.token;
	if(token) {
		jwt.verify(token, config.secret, function(err, decoded) {
			if(err) {
				socket.emit(endpoint, {status:false, msg:"The supplied token is either invalid or expired. Please sign-in again."});
			} else {
				cb(decoded);
			}
			
		});
	} else {
		socket.emit(endpoint, {status:false, msg:"The supplied token is either invalid or expired. Please sign-in again."});
	}	
}

io.sockets.on('connection', function(socket) {

	// @NFP
	socket.on("ping", function(args) {
		socket.emit("pong");
	});

	// @NFP
	socket.on("ping-token", function(args) {
		checkToken(args, socket, "test-token", function(decoded) {
			socket.emit("test-token", "pong");
		});
	});

	socket.on('bind', function(args) {
		checkToken(args, socket, 'bind', function(decoded) {
			var username = decoded["user"].username;
			if(clients[username] == undefined)
				clients[username] = [];
			clients[username].push(socket);

			socket.emit('bind', {status:true});
			socket.username = username;
		});
	});

	socket.on('message', function(args) {
		checkToken(args, socket, 'message', function(decoded) {
			if(args.message == undefined || args.recipient == undefined) {
				socket.emit('message', {status:false, msg:'Invalid parameter count.'});
			} else {
				User.findOne({
					username:args.recipient	
				}, function(err, items) {
					if(err || !items) {
						socket.emit('message', {status:false, msg:'recipient don\'t exists.'});
					} else {
						args.message = sanitizer.escape(args.message);
						args.recipient = sanitizer.escape(args.recipient);
						var msgDetail = {
							author: decoded['user'].username,
							date: Date.now() / 1000 | 0,
							message: args.message,
							recipient: args.recipient
						};
						var m = new Message(msgDetail);
						m.save();

						if(clients[args.recipient] != undefined) {
							clients[args.recipient].forEach(function(item) {
								item.emit('message', msgDetail);
							});
						}
					}
				});
			}
		});
	});

	/**
	 * Pulls user's message history 
	 * @param {string} token - Users's auth token. @see auth 
	 * @param {string} userLimit - Optional: only fetches message between user and userLimit
	 * @param {integer} dateLimite - Optional: only fetches messages sent after dateLimite. Unix timestamp in seconds.
	 */
	socket.on('pull-history', function(args) {
		checkToken(args, socket, 'message', function(decoded) {
			var username = decoded["user"].username;
			Message.find({ $or:[ {'author':username}, {'recipient':username} ]}, function(err, items) {
				if(err) {
					console.log('pull-history error : ' + err);
					socket.emit('pull-history', {status:false, msg: 'An error has occured while executing your request. Please try again later.'});
				} else {
					socket.emit('pull-history', items);
				}
			});
		});
	});


	/**
	 * Authenticate a user with their crendentials. Returns an access token.
	 * @param {string} username
	 * @param {string} password
	 */
	socket.on("auth", function(args) {
		User.findOne({
			username:args.username	
		}, function(err, user) {
			if(err) throw err;

			if(!user) {
				socket.emit("auth", {status: false, msg:"Invalid username/password."});
			} else {
				if(user.password != args.password) { // Todo: hash
					socket.emit("auth", {status: false, msg:"Invalid username/password."});
				} else {
					var token = jwt.sign({user:user}, config.secret, {
						expiresIn: 86400
					});
					socket.emit("auth", {status: true, token:token});
					socket.username = args.username;
				}
			}
		});
	});

	/**
	 * Sign a user out
	 * @param {string} token
	 */
	socket.on('sign-out', function(args) {
		console.log('sign-out');
		// If user is signed in
		if(socket.username) {
			checkToken(args, socket, 'sign-out', function(decoded) {
				var username = decoded["user"].username;
				if(username == socket.username) {
					// 'Saul good
					socket.username = null;
					if(clients[username]) {
						clients[username].splice(clients[username].indexOf(socket), 1);
					}

					socket.emit('sign-out', {status:true, msg:'See ya!'});
				}
			});
		} else {
			// User is not signed in. That's an error at this point
			socket.emit('sign-out', {status: false, msg:'You\'re not currently signed-in.'});
		}
	});

	/**
	 * Registers a new user
	 * @param {string} username - String of lowercase / uppercase / numbers, 3-20 characters
	 * @param {string} password
	 * @param {string} email - A valid e-mail address
	 */
	 socket.on('sign-up', function() {
	 	// User is already signed in
	 	if(socket.username == undefined || socket.password == undefined || email == undefined) {
	 		socket.emit('sign-up', {status:false, msg:'Invalid paraeter count'});
	 	} else {
	 		var usernamePattern = new RegExp("^[a-zA-Z0-9]{3,20}$");
	 		var passwordPattern = new RegExp("/[a-zA-Z0-9!#$%&'()*+,-./:;=?@[\]^_`{|}~]{6,}$");

	 		if(!usernamePattern.test(args.username)) {
	 			socket.emit('sign-up', {status: false, msg: 'Username does not match the requirements.'});
	 		} else {
	 			if(!passwordPattern.match(args.password)) {
	 				socket.emit('sign-up', {status: false, msg: 'Password does not match the requirements.'});
	 			}
	 		}
	 	}
	 });
	
	socket.on('disconnect', function () {
		var username = socket.username; 
		if(username) {
			clients[username].splice(clients[username].indexOf(socket), 1);
		}
	});
});	


console.log("Server is listening for sockets on port " + config.listenPort);
