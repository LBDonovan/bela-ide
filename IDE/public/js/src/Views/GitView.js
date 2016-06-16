'use strict';
var View = require('./View');

class GitView extends View{

	constructor(className, models, settings){
		super(className, models, settings);		

		this.$form = $('#gitForm');
		this.$input = $('#gitInput');

		// git input events
		this.$form.on('submit', (e) => {
			e.preventDefault();
			this.emit('git-event', {
				func: 'command', 
				command: this.$input.val()
			});
			this.$input.val('');
		});
	}
	
	buttonClicked($element, e){
		var func = $element.data().func;
		if (this[func]){
			this[func]();
			return;
		}
		var command = $element.data().command;
		this.emit('git-event', {func, command});
	}
	
	selectChanged($element, e){
		this.emit('git-event', {
			func: 'command',
			command: 'checkout ' + ($("option:selected", $element).data('hash') || $("option:selected", $element).val())
		});
	}
	
	commit(){
		var message = prompt('enter a commit message');
		this.emit('git-event', {func: 'command', command: 'commit -am "'+message+'"'});
	}
	branch(){
		var message = prompt('enter a name for the new branch');
		this.emit('git-event', {func: 'command', command: 'checkout -b '+message});
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
	__commits(commits, git){

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
				if (commit !== ['']) console.log('skipped commit', commit);
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
	__stdout(text, git){
		this.emit('console', text);
	}
	__stderr(text){
		this.emit('console', text);
	}
	
}

module.exports = GitView;
