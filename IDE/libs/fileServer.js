var express = require('express'); 
var fs = require('fs');
var archiver = require('archiver');
var mime = require('mime');

var app = express();
var http = require('http').Server(app);

function listen(port){
	http.listen(port, function(){
		console.log('listening on port '+port);
	});
}

app.use(express.static('public'));	//path to IDE index.html

app.get('/download', function(req, res){

	if (req.query.project){
		if (req.query.file){
		
			var file = '/root/Bela/projects/'+req.query.project+'/'+req.query.file;
			res.setHeader('Content-disposition', 'attachment; filename='+req.query.file);
			res.setHeader('Content-type', mime.lookup(file));
			
			fs.createReadStream(file).pipe(res);
			
		} else {
		
			res.setHeader('Content-disposition', 'attachment; filename='+req.query.project+'.zip');
			res.setHeader('Content-type', 'application/zip');
	
			var archive = archiver('zip');
			archive.pipe(res);
			archive.directory('/root/Bela/projects/'+req.query.project, req.query.project, {name: req.query.project+'.zip'});
			archive.finalize();
		}
	}
	
});

module.exports = {
	http: http,
	start: listen
}