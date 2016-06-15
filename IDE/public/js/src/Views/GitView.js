'use strict';
var View = require('./View');

class GitView extends View{

	constructor(className, models, settings){
		super(className, models, settings);		

		/*this.form = document.getElementById('beaglert-consoleForm');
		this.input = document.getElementById('beaglert-consoleInput');
		
		// console command line input events
		this.form.addEventListener('submit', (e) => {
			e.preventDefault();
			this.emit('input', this.input.value);
			this.input.value = '';
		});*/
	}
	
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func === 'commit'){
			this.commit();
			return;
		}
		var command = $element.data().command;
		this.emit('git-event', {func, command});
	}
	
	commit(){
	console.log('commit');
		var message = prompt('enter a commit message');
		this.emit('git-event', {func: 'command', command: 'commit -am "'+message+'"'});
	}
	
	_repoExists(exists){
		console.log('REPO', exists);
		if (exists){
			$('#repo').css('display', 'block');
			$('#noRepo').css('display', 'none');
		} else {
			$('#repo').css('display', 'none');
			$('#noRepo').css('display', 'block');
		}
	}
	_commits(commits, git){

		var commits = commits.split('\n');
		var current = git.currentCommit.trim();
		var branches = git.branches.split('\n');
		
		// fill commits menu
		var $commits = $('#commits');
		$commits.empty();

		var commit, hash, opt;
		for (var i=0; i<commits.length; i++){
			commit = commits[i].split(' ');
			if (commit.length > 2){
				hash = commit.pop().trim();
				opt = $('<option></option>').html(commit.join(' ')).data('hash', hash).appendTo($commits);
				if (hash === current){
					$(opt).attr('selected', 'selected');
				}
			} else {
				//$('<option></option>').html(commit).appendTo($commits);
				console.log('skipped commit', commit);
			}
		}
		
		// fill branches menu
		var $branches = $('#branches');
		$branches.empty();
		
		for (var i=0; i<branches.length; i++){
			if (branches[i]){
				opt = $('<option></option>').html(branches[i]).appendTo($branches);
				if (branches[i][0] === '*'){
					$(opt).attr('selected', 'selected');
				}
			}
		}
	}
	__stdout(text){
		this.emit('console', text);
	}
	__stderr(text){
		this.emit('console', text);
	}
	
}

module.exports = GitView;
