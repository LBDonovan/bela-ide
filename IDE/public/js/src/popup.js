var overlay	= $('#overlay');
var parent	= $('#popup');
var content	= $('#popup-content');
var titleEl	= parent.find('h1');
var subEl	= parent.find('p');
var formEl	= parent.find('form');

module.exports = {
	
	show(){
		overlay.addClass('active');
		parent.addClass('active');
		content.find('input[type=text]').first().trigger('focus');
	},
	
	hide(){
		overlay.removeClass('active');
		parent.removeClass('active');
		titleEl.empty();
		subEl.empty();
		formEl.empty();
	},
	
	find: selector => content.find(selector),
	
	title: text => titleEl.text(text),
	subtitle: text => subEl.text(text),
	formEl: html => formEl.html(html),
	
	append: child => content.append(child),
	
	form: formEl
	
};