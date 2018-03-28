const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const multer = require('multer')
const bodyParser = require('body-parser');
const cors = require('cors');
const socket = require('./socket-io-connection');
const socket_io = require('socket.io');
const killPorts = require('./killPorts');
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../mocks/images')));


const io = socket_io();
app.io = io;

app.use(cors({credentials: true, origin: 'http://localhost:3000'}));

socket.connect(io);

app.get('/', function(req, res) {
  res.send('Hello Seattle\n');
});

app.route('/api')
  .get((req,res) => {
    console.log("It works");
    res.json({message: 'xs'});
  });




const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'mocks/images/')
  },
  filename: function (req, file, cb) {
    console.log(file);

    if(/gif/g.test(file.mimetype)) {
      cb(null, file.fieldname + '-' + Date.now()+'.gif')
    } else if (/svg/g.test(file.mimetype)) {
      cb(null, file.fieldname + '-' + Date.now()+'.svg')
    }else {
      cb(null, file.fieldname + '-' + Date.now()+'.jpg')
    }
  }
})

const upload = multer({
  storage: storage,
  limits: {fileSize: 10000000, files: 1},
  fileFilter:  (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|svg|gif)$/)) {
      return callback(new Error('Only Images are allowed !'), false)
    }
    callback(null, true);
  },
  filename: (req, file, callback) => {
    callback(null, file.fieldname + '-' + Date.now());
  }
}).single('image');

app.post('/file-upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({message: err.message})
    } else {
      const fileName = req.file.filename;
      const path = `/mocks/images/${fileName}`;
      res.status(200).json({
        message: 'Image Uploaded Successfully !',
        fileName,
        path
      })
    }
  })
})










process.on('SIGINT', exitHandler.bind(null, {exit:true}));

async function exitHandler(options, err) {
  if (options.exit) {
    await killPorts();
  }
}



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
