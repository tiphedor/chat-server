var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Message', new Schema({ 
    author: String,
    date: Number,
    message: String,
    recipient: String
}));