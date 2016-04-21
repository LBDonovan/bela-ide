var View = require('./View');

var syntaxCheckBlocked = false;

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
			if (!syntaxCheckBlocked) this.emit('change', this.editor.getValue());
		});
		
		this.on('resize', () => this.editor.resize() );
		
	}
	
	// model events
	_fileData(data){
	
		if (data instanceof ArrayBuffer) data = String.fromCharCode.apply(null, new Uint8Array(data));
		
		// block syntax check
		syntaxCheckBlocked = true;
		
		// put the file into the editor
		this.editor.session.setValue(data, -1);
		
		// unblock syntax check
		syntaxCheckBlocked = false;
		
		// force a syntax check
		this.emit('change');
		
		// focus the editor
		this.editor.focus();
	}
	
}

module.exports = EditorView;