var View = require('./View');

var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];

class FileView extends View {
	
	constructor(className, models){
		super(className, models);
	}
	
	// UI events
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	newFile(func){
		var name = prompt("Enter the name of the new file");
		if (name !== null){
			this.emit('message', 'project-event', {func, newFile: name})
		}
	}
	uploadFile(func){
		//TODO this requires a hack
	}
	renameFile(func){
		var name = prompt("Enter the new name of the file");
		if (name !== null){
			this.emit('message', 'project-event', {func, newFile: name})
		}
	}
	deleteFile(func){
		var cont = confirm("This can't be undone! Continue?");
		if (cont){
			this.emit('message', 'project-event', {func})
		}
	}
	openFile(e){
		this.emit('message', 'project-event', {func: 'openFile', fileName: $(e.currentTarget).html()})
	}
	
	// model events
	_fileList(files, data){

		var $files = $('#fileList')
		$files.empty();

		var headers = [];
		var sources = [];
		var resources = [];
		
		for (let i=0; i<files.length; i++){
			
			let ext = files[i].split('.')[1];
			
			if (sourceIndeces.indexOf(ext) !== -1){
				sources.push(files[i]);
			} else if (headerIndeces.indexOf(ext) !== -1){
				headers.push(files[i]);
			} else if (files[i]){
				resources.push(files[i]);
			}
			
		}
		
		headers.sort();
		sources.sort();
		resources.sort();
				
		if (headers.length){
			$('<li></li>').html('Headers:').appendTo($files);
		}
		for (let i=0; i<headers.length; i++){
			$('<li></li>').addClass('sourceFile').html(headers[i]).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (sources.length){
			$('<li></li>').html('Sources:').appendTo($files);
		}
		for (let i=0; i<sources.length; i++){
			$('<li></li>').addClass('sourceFile').html(sources[i]).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (resources.length){
			$('<li></li>').html('Resources:').appendTo($files);
		}
		for (let i=0; i<resources.length; i++){
			$('<li></li>').addClass('sourceFile').html(resources[i]).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (data && data.fileName) this._fileName(data.fileName);
	}
	_fileName(file){

		// select the opened file in the file manager tab
		$('.selectedFile').removeClass('selectedFile');
		$('#fileList>li').each(function(){
			if ($(this).html() === file){
				$(this).addClass('selectedFile');
			}
		});
	}
	
}

module.exports = FileView;