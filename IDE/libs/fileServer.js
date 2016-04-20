var express = require('express'); 
var fs = require('fs');
//var archiver = require('archiver');

var app = express();
var http = require('http').Server(app);

function listen(port){
	http.listen(port, function(){
		console.log('listening on port '+port);
	});
}

app.use(express.static('public'));	//path to IDE index.html

/*app.get('/download', function(req, res){

	console.log('hi'); 
	console.log(settings.global.project);
	
	//var file = '/root/BeagleRT/projects/'+req.params.project+'/source/render.cpp';

	res.setHeader('Content-disposition', 'attachment; filename='+settings.global.project+'.zip');
	res.setHeader('Content-type', 'application/zip');
	
	var archive = archiver('zip');
	archive.pipe(res);
	archive.directory('/root/node/projects/'+settings.global.project, settings.global.project, {name: settings.global.project+'.zip'});
	archive.finalize();

	//var filestream = fs.createReadStream(file);
	//filestream.pipe(res);
	
});*/

module.exports = {
	http: http,
	start: listen
}