var View = require('./View');

class ProjectView extends View {
	
	constructor(className, models){
		super(className, models);
	}
	
	// UI events
	selectChanged($element, e){
		this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.val()})
	}
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	newProject(func){
		var name = prompt("Enter the name of the new project");
		if (name !== null){
			this.emit('message', 'project-event', {func, newProject: name})
		}
	}
	saveAs(func){
		var name = prompt("Enter the name of the new project");
		if (name !== null){
			this.emit('message', 'project-event', {func, newProject: name})
		}
	}
	deleteProject(func){
		var cont = confirm("This can't be undone! Continue?");
		if (cont){
			this.emit('message', 'project-event', {func})
		}
	}
	
	// model events
	modelChanged(data, changedKeys){
		for (let value of changedKeys){
			if (this[value]){
				this[value](data[value]);
			}
		}
	}
	
	projectList(projects){
	
		var $projects = $('#projects');
		$projects.empty();
		
		// add an empty option to menu and select it
		var opt = $('<option></option>').attr({'value': '', 'selected': 'selected'}).html('--Projects--').appendTo($projects);

		// fill project menu with projects
		for (let i=0; i<projects.length; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				var opt = $('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
			}
		}
		
	}
	exampleList(examples){
	
		var $examples = $('#examples');
		$examples.empty();
		
		// add an empty option to menu and select it
		var opt = $('<option></option>').attr({'value': '', 'selected': 'selected'}).html('--Examples--').appendTo($examples);
		
		// fill project menu with examples
		for (let i=0; i<examples.length; i++){
			if (examples[i] && examples[i] !== 'undefined' && examples[i] !== 'exampleTempProject' && examples[i][0] !== '.'){
				var opt = $('<option></option>').attr('value', examples[i]).html(examples[i]).appendTo($examples);
			}
		}
		
	}
	currentProject(project){
		if (project !== 'exampleTempProject'){
			// unselect currently selected project
			$('#projects').find('option').filter(':selected').attr('selected', '');
			// select new project
			$('#projects option[value="'+project+'"]').attr('selected', 'selected');
			// unselect currently selected example
			$('#examples').find('option').filter(':selected').attr('selected', '');
			// select no example
			$('#examples option:first-child').attr('selected', 'selected');
		}
	}
	
}

module.exports = ProjectView;