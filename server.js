var express = require('express');
var bodyParser = require('body-parser');
var session  = require('express-session');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });
var secrets = require('./secret');
var AWS = require('aws-sdk');
var fs = require('fs');

var app = express();
app.use(bodyParser.json());
app.use(session({
	secret: 'file uploads are funz'
}));
//app.use(multer);

var AWS_ACCESS_KEY = secrets.aws_access_key;
var AWS_SECRET_KEY = secrets.aws_access_secret;
var S3_BUCKET = 'node-file-upload-example';

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY
});

var s3 = new AWS.S3({params: {Bucket: S3_BUCKET}});

//cheap trick so as not to use db
var users = [];

//fake registration
app.post('/api/users', function(req, res) {
	users.push(req.body);
	req.body._id = new Date().getTime().toString();
	console.log(req.body);
	req.session.user = req.body;
	return res.status(201).end();
});

app.post('/api/users/me/avatar', upload.single('avatar'), function(req, res){

	console.log('file', req.file);

	//obligatory security measures here

	fs.readFile(req.file.path, function(err, data){

	  if (err){
	  	return res.status(500).end();
	  }

	  var filename = 'avatar-'+new Date().getTime().toString();

	  switch(req.file.mimetype) {
	  	case 'image/jpeg':
	  	filename += '.jpg';
	  	break;
	  }

	  var fileBuffer = fs.readFileSync(req.file.path);

		s3.putObject({
	    Bucket: S3_BUCKET,
	    Key: filename,
	    Body: data,
	    ACL: 'public-read',
	    ContentType: req.file.mimetype
	  }, function (perr, pres) {
		  if (perr) {
		    console.log("Error uploading data: ", perr);
		  } else {
		    console.log("Successfully uploaded data to myBucket/myKey");

		    //save reference to db

		    return res.status(200).end();
		  }
		});
	});
});

app.get('/api/users/me', function(req, res) {
	return res.json(req.session.user);
});

app.listen(8080);