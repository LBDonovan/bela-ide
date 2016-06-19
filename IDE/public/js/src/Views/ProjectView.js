var View = require('./View');

class ProjectView extends View {
	
	constructor(className, models){
		super(className, models);
	}
	
	// UI events
	selectChanged($element, e){
		//console.log($element.prop('id'));
		//if ($element.prop('id') === 'projects'){
			this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.val()})
		//} else if ($element.prop('id') === 'examples'){
			//this.emit('message', 'example-event', {func: $element.data().func, example: $element.val()})
		//}
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
			this.emit('message', 'project-event', {func, newProject: sanitise(name)})
		}
	}
	saveAs(func){
		var name = prompt("Enter the name of the new project");
		if (name !== null){
			this.emit('message', 'project-event', {func, newProject: sanitise(name)})
		}
	}
	deleteProject(func){
		var cont = confirm("This can't be undone! Continue?");
		if (cont){
			this.emit('message', 'project-event', {func})
		}
	}
	cleanProject(func){
		this.emit('message', 'project-event', {func});
	}
	
	// model events
	_projectList(projects, data){

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
		
		if (data && data.currentProject) this._currentProject(data.currentProject);
		
	}
	_exampleList(examples){
	
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
	_currentProject(project){
	
		// unselect currently selected project
		$('#projects').find('option').filter(':selected').attr('selected', '');
		
		if (project === 'exampleTempProject'){
			// select no project
			$('#projects').val($('#projects > option:first').val())
		} else {
			// select new project
			$('#projects option[value="'+project+'"]').attr('selected', 'selected');
			// unselect currently selected example
			$('#examples').val($('#examples > option:first').val())
		}
		
		// set download link
		$('#downloadLink').attr('href', '/download?project='+project);
	}
	
}

module.exports = ProjectView;

// replace all non alpha-numeric chars other than '-' and '.' with '_'
function sanitise(name){
	return name.replace(/[^a-zA-Z0-9\.\-]/g, '_');
}