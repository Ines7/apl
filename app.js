var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');

var app= express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

//mongoose.connect('mongodb://localhost/loginapp');
mongoose.connect('mongodb://ines:123456789@ds147974.mlab.com:47974/registrovanikorisnici');
var db = mongoose.connection;

korisnici = [];
connections = [];

//ukljucujemo fajlove koje koristimo kao routes
var routes = require('./routes/index');
var users = require('./routes/users');

// View Engine
//folder koji se zove wiews je zaduzem za izgled
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//public je folder u koji cemo postavljati slike, stylesheets ...
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.messages = req.flash('info');
  //console.log(res.locals.messages[0]);
  res.locals.user = req.user || null;
  next();
});

// Set Port
server.listen(process.env.PORT || 3000);
console.log('server running ...');

app.use('/', routes);
app.use('/users', users);

io.sockets.on('connection', function(socket){
    // push dodaje novi element na kraj liste
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);


    socket.on('disconnect',function(data){
        //splice dodaje ili brise elemente iz niza
        korisnici.splice(korisnici.indexOf(socket.username),1);
        updateUsernames();
        connections.splice(connections.indexOf(socket),1);
        console.log('Disconnected: %s sockets conected', connections.length);
    });
    //send message
    socket.on('send message', function(data){
        console.log(data);
        // poruku koja je primljena iz tekst polja salje nazad da se upise u chat
        io.sockets.emit('new message',{msg: data, korisnik: socket.username});

    });

    //new User
    //kada  se prijavi novi korisnik poziva se callback funkcija
    socket.on('new user', function(data,callback){
        callback(true);
        socket.username = data;
        korisnici.push(socket.username);
        updateUsernames();
    });
    //funkcija salje niz korisnika
    function updateUsernames(){
        io.sockets.emit('get users', korisnici)
    }
});


