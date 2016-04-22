var gulp = require('gulp');
var sftp = require('gulp-sftp');
var cache = require('gulp-cached');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var livereload = require('gulp-livereload');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');

var host = '192.168.1.2';
var user = 'root';
var pass = 'a';
var remotePath = '/root/BeagleRT/IDE/';

gulp.task('default', ['killnode', 'browserify', 'upload', 'restartnode', 'watch']);

gulp.task('watch', ['killnode', 'browserify', 'upload', 'restartnode'], function(){

	livereload.listen();
	
	// when the node.js source files change, kill node, upload the files and restart node
	gulp.watch(['../IDE/index.js', '../IDE/libs/**'], ['killnode', 'upload', 'restartnode']);
	
	// when the browser js changes, browserify it
	gulp.watch(['../IDE/public/js/src/**'], ['browserify']);
	
	// when the browser sources change, upload them without killing node
	gulp.watch(['../IDE/public/**', '!../IDE/public/js/bundle.js.map', '!../IDE/public/js/src/**', '!../IDE/public/js/ace/**'], ['upload-no-kill']);
	
	// watch all IDE files (except ace and node_modules) and upload them when changed
	//gulp.watch(['../IDE/**', '!../IDE/public/js/ace/**', '!../IDE/node_modules/**'], ['upload']);
	
	// watch the node.js files and kill the node process when they change
	//gulp.watch(['../IDE/index.js/', '../IDE/libs/**'], ['killnode']);
	
});

gulp.task('upload', ['killnode', 'browserify'], () => {
	return gulp.src(['../IDE/**', '!../IDE/public/js/src/**', '!../IDE/node_modules/**', '!../IDE/public/js/ace/**'])
		.pipe(cache('IDE'))
		.pipe(sftp({host, user, pass, remotePath}));
});

gulp.task('upload-no-kill', () => {
	return gulp.src(['../IDE/**', '!../IDE/public/js/src/**', '!../IDE/node_modules/**', '!../IDE/public/js/ace/**'])
		.pipe(cache('IDE'))
		.pipe(sftp({host, user, pass, remotePath}))
		.on('end', () => {
			livereload.reload();
		});
});

gulp.task('nodemodules', ['upload-nodemodules', 'rebuild-nodemodules']);

gulp.task('upload-nodemodules', () => {
	return gulp.src(['../IDE/node_modules/**'])
		.pipe(cache('IDE'))
		.pipe(sftp({host, user, pass, remotePath: remotePath+'node_modules/'}));
});

gulp.task('rebuild-nodemodules', ['upload-nodemodules'], (callback) => {

	console.log('rebuilding node modules');

	var ssh = spawn('ssh', [user+'@'+host, 'cd', remotePath+';', 'npm', 'rebuild']);
	
	ssh.stdout.setEncoding('utf8');
	ssh.stdout.on('data', function(data){
		process.stdout.write(data);
	});
	
	ssh.stderr.setEncoding('utf8');
	ssh.stderr.on('data', function(data){
		process.stdout.write('error: '+data);
	});
	
	ssh.on('exit', function(){
		callback();
	});
	
});

gulp.task('killnode', (callback) => {
	exec('ssh '+user+'@'+host+' "pkill node"', (err) => {
		if (err) console.log('unable to stop node');
		callback(); // finished task
	});
});

gulp.task('startnode', startNode);
gulp.task('restartnode', ['upload'], startNode);

gulp.task('browserify', () => {
    return browserify('../IDE/public/js/src/main.js', { debug: true })
    	.transform(babelify)
        .bundle()
        .on('error', function(error){
    		console.error(error);
    		this.emit('end');
    	})
        .pipe(source('bundle.js'))
        .pipe(buffer())
		.pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('../IDE/public/js/'));
});

function startNode(callback){
	var ssh = spawn('ssh', [user+'@'+host, 'cd', remotePath+';', 'node', '--harmony-destructuring', '/root/BeagleRT/IDE/index.js']);
	
	ssh.stdout.setEncoding('utf8');
	ssh.stdout.on('data', function(data){
		process.stdout.write(data);
	});
	
	ssh.stderr.setEncoding('utf8');
	ssh.stderr.on('data', function(data){
		process.stdout.write('error: '+data);
	});
	
	ssh.on('exit', function(){
		
	});
	livereload.reload();
	callback();
}