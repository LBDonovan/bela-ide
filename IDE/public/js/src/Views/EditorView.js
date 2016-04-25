var View = require('./View');

const uploadDelay = 50;

var uploadBlocked = false;

class EditorView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.editor = ace.edit('editor');
		ace.require("ace/ext/language_tools");
		
		// set syntax mode
		this.editor.session.setMode('ace/mode/c_cpp');
		this.editor.$blockScrolling = Infinity;
		
		// set theme
		this.editor.setTheme("ace/theme/github");
		
		// this function is called when the user modifies the editor
		this.editor.session.on('change', (e) => {
			//console.log('upload blocked', uploadBlocked);
			if (!uploadBlocked) this.editorChanged();
		});
		
		this.on('resize', () => this.editor.resize() );
		
	}
	
	editorChanged(){
		clearTimeout(this.uploadTimeout);
		this.uploadTimeout = setTimeout( () => this.emit('change', this.editor.getValue()), uploadDelay );
	}
	
	// model events
	_fileData(data, opts){
	
		if (data instanceof ArrayBuffer) data = String.fromCharCode.apply(null, new Uint8Array(data));
		
		// block upload
		uploadBlocked = true;
		
		// put the file into the editor
		this.editor.session.setValue(data, -1);
		
		// unblock upload
		uploadBlocked = false;
		
		// force a syntax check
		this.emit('change');
		
		// focus the editor
		this._focus(opts.focus);
	}
	_focus(data){

		if (data && data.line !== undefined && data.column !== undefined)
			this.editor.gotoLine(data.line, data.column);
			
		this.editor.focus();
	}
	_currentFileErrors(errors){

		// clear any error annotations on the ace editor
		this.editor.session.clearAnnotations();

		if (errors.length >= 1){		
			// errors exist!
			// annotate the errors in this file
			this.editor.session.setAnnotations(errors);
						
		}
	}	
	_IDESettings(data, key){
		console.log(data);
	}
}

module.exports = EditorView;