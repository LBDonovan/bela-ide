var View = require('./View');

class EditorView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.editor = ace.edit('editor');
		this.editor.session.setMode('ace/mode/c_cpp');
		this.editor.$blockScrolling = Infinity
		this.editor.setTheme('ace/theme/github');
		
		this.on('resize', () => this.editor.resize() );
	}
	
	// model events
	_fileData(data){
	console.log('putting file');
		// put the file into the editor
		this.editor.session.setValue(data, -1);
		this.editor.focus();
	}
	
}

module.exports = EditorView;