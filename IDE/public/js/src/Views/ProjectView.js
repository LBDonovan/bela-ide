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
		$('#overlay').css({"display": "inline"});
		$('#new-project-popup').css({"display": "inline", "z-index": "9999"});
		// var name = prompt("Enter the name of the new project");
		// var file_name = $('input').attr(value);
		console.log("new file button has been clicked");
		// if (file_name !== null){
		// 	this.emit('message', 'project-event', {func, newProject: sanitise(file_name)})
		// 	console.log(file_name);
		// }
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
	_exampleList(examplesDir){
	
		/*var $examples = $('#examples');
		$examples.empty();
		
		// add an empty option to menu and select it
		var opt = $('<option></option>').attr({'value': '', 'selected': 'selected'}).html('--Examples--').appendTo($examples);
		
		// fill project menu with examples
		for (let i=0; i<examples.length; i++){
			if (examples[i] && examples[i] !== 'undefined' && examples[i] !== 'exampleTempProject' && examples[i][0] !== '.'){
				var opt = $('<option></option>').attr('value', examples[i]).html(examples[i]).appendTo($examples);
			}
		}*/
		
		console.log(examplesDir);

		var $examples = $('#examples');
		$examples.empty();

		if (!examplesDir.length) return;

		for (let item of examplesDir){
			let ul = $('<ul></ul>').html(item.name+':');
			for (let child of item.children){
				$('<li></li>').addClass('sourceFile').html(child).appendTo(ul)
					.on('click', (e) => {
						this.emit('message', 'project-event', {
							func: 'openExample',
							currentProject: item.name+'/'+child
						});
						$('.selectedExample').removeClass('selectedExample');
						$(e.target).addClass('selectedExample');
					});
			}
			ul.appendTo($examples);
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
	
	subDirs(dir){
		var ul = $('<ul></ul>').html(dir.name+':');
		for (let child of dir.children){
			if (!child.dir)
				$('<li></li>').addClass('sourceFile').html(child.name).data('file', (dir.dirPath || dir.name)+'/'+child.name).appendTo(ul);
			else {
				child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
				ul.append(this.subDirs(child));
			}
		}
		return ul;
	}
	
}

module.exports = ProjectView;

// replace all non alpha-numeric chars other than '-' and '.' with '_'
function sanitise(name){
	return name.replace(/[^a-zA-Z0-9\.\-]/g, '_');
}