var View = require('./View');

var apiFuncs = ['setup', 'render', 'cleanup'];

class DocumentationView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.on('init', this.init);
	}
	
	init(){
		
		// The API
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=Bela_8h",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				for (let item of apiFuncs){
					var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains('+item+'))'), 'APIDocs'+counter);
					li.appendTo($('#APIDocs'));
					counter += 1;
				}
			}
		});
		
		// The Audio Context
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=structBelaContext",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'contextDocs'+counter);
					li.appendTo($('#contextDocs'));
					counter += 1;
				});
			}
		});
		
		// Utilities
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=Utilities_8h",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'utilityDocs'+counter);
					li.appendTo($('#utilityDocs'));
					counter += 1;
				});
			}
		});
		
	}
	
}

module.exports = DocumentationView;

function docFunction(xml, func){
	var $m = $(xml).find('memberdef:has(name:contains('+func+'))');
	var out = $m.find('type').html() +' '+ $m.find('name').html() + $m.find('argsstring').html() +':\n';
	out += ($m.find('briefdescription > para').html() + '\n' + $m.find('detaileddescription > para').html());
	$('#'+func+'Docs').html(out);
}

function createlifrommemberdef($m, id){
	var li = $('<li></li>');
	li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
	li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html($m.find('name').html()));
	li.append($('<p></p>').html( ($m.find('briefdescription > para').html() || '') +' '+ ($m.find('detaileddescription > para').html() || '')));
	return li;
}