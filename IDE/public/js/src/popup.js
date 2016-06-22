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
		content.find('input').first().trigger('focus');
	},
	
	hide(){
		overlay.removeClass('active');
		parent.removeClass('active');
	},
	
	find: selector => content.find(selector),
	
	title: text => titleEl.html(text),
	subtitle: text => subEl.html(text),
	formEl: text => formEl.html(text),
	
	append: child => content.append(child),
	
	form: formEl
	
};